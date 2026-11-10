<?php

namespace App\Http\Controllers\Api\V1\Officer;

use App\Enums\ReportStatus;
use App\Enums\Urgency;
use App\Exceptions\ConflictException;
use App\Http\Controllers\Controller;
use App\Http\Requests\CompleteReportRequest;
use App\Http\Requests\ProgressRequest;
use App\Http\Resources\OfficerReportDetailResource;
use App\Http\Resources\OfficerReportItemResource;
use App\Models\Report;
use App\Services\ReportWorkflow;
use App\Services\TicketService;
use App\Services\UploadService;
use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    /**
     * GET /api/v1/officer/queue
     * Antrean laporan berstatus menunggu_penanganan yang belum diambil petugas.
     */
    public function queue(Request $request): JsonResponse
    {
        $request->validate([
            'sort'     => ['nullable', 'string', 'in:urgency,newest'],
            'category' => ['nullable', 'string', Rule::exists('categories', 'slug')],
            'page'     => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Report::query()
            ->where('status', ReportStatus::MENUNGGU_PENANGANAN->value)
            ->whereNull('handler_id');

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        $sort = $request->input('sort', 'urgency');
        if ($sort === 'newest') {
            $query->orderBy('verified_at', 'desc')->orderBy('id', 'desc');
        } else {
            $query->orderByRaw(Urgency::sqlWeightCase('urgency').' DESC')
                ->orderBy('verified_at', 'asc')
                ->orderBy('id', 'asc');
        }

        $perPage   = min(max((int) $request->input('per_page', 6), 1), 50);
        $paginator = $query->paginate($perPage);

        $items = array_map(
            fn (Report $report) => (new OfficerReportItemResource($report, false))->resolve($request),
            $paginator->items()
        );

        return ApiResponse::success($items, 'OK', 200, [
            'current_page' => $paginator->currentPage(),
            'last_page'    => $paginator->lastPage(),
            'per_page'     => $paginator->perPage(),
            'total'        => $paginator->total(),
        ]);
    }

    /**
     * GET /api/v1/officer/my-reports
     * Daftar laporan yang ditangani oleh petugas yang sedang login.
     */
    public function myReports(Request $request): JsonResponse
    {
        $request->validate([
            'status'   => ['nullable', 'string', 'in:diproses,selesai'],
            'page'     => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Report::query()
            ->where('handler_id', $request->user()->id)
            ->whereIn('status', [
                ReportStatus::DIPROSES->value,
                ReportStatus::SELESAI->value,
            ]);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $query->orderBy('taken_at', 'desc')->orderBy('id', 'desc');

        $perPage   = min(max((int) $request->input('per_page', 6), 1), 50);
        $paginator = $query->paginate($perPage);

        $items = array_map(
            fn (Report $report) => (new OfficerReportItemResource($report, true))->resolve($request),
            $paginator->items()
        );

        return ApiResponse::success($items, 'OK', 200, [
            'current_page' => $paginator->currentPage(),
            'last_page'    => $paginator->lastPage(),
            'per_page'     => $paginator->perPage(),
            'total'        => $paginator->total(),
        ]);
    }

    /**
     * GET /api/v1/officer/reports/{ticket_id}
     * Detail laporan untuk petugas sesuai aturan akses PRD 5.2.
     */
    public function show(Request $request, string $ticket_id): JsonResponse
    {
        $report = $this->findByTicketOrFail($ticket_id, [
            'events.actor',
            'verifier',
            'rejecter',
            'handler',
        ]);

        $status = $report->status instanceof ReportStatus
            ? $report->status
            : ReportStatus::from((string) $report->status);

        // Status menunggu_verifikasi atau ditolak -> 404 bagi petugas
        if (in_array($status, [ReportStatus::MENUNGGU_VERIFIKASI, ReportStatus::DITOLAK], true)) {
            abort(404);
        }

        // Laporan diproses / selesai milik petugas lain -> 403
        if (
            in_array($status, [ReportStatus::DIPROSES, ReportStatus::SELESAI], true)
            && (int) $report->handler_id !== (int) $request->user()->id
        ) {
            throw new AuthorizationException('Laporan ini ditangani oleh petugas lain.');
        }

        return ApiResponse::success(
            (new OfficerReportDetailResource($report))->resolve($request)
        );
    }

    /**
     * POST /api/v1/officer/reports/{ticket_id}/take
     * Ambil laporan dari antrean (update atomik).
     */
    public function take(Request $request, string $ticket_id, ReportWorkflow $workflow): JsonResponse
    {
        $report  = $this->findByTicketOrFail($ticket_id);
        $updated = $workflow->take($report, $request->user());

        return ApiResponse::success(
            (new OfficerReportDetailResource($updated))->resolve($request),
            'Laporan berhasil diambil.'
        );
    }

    /**
     * POST /api/v1/officer/reports/{ticket_id}/progress
     * Tambah catatan progres oleh petugas yang menangani.
     */
    public function progress(
        ProgressRequest $request,
        string $ticket_id,
        ReportWorkflow $workflow
    ): JsonResponse {
        $report  = $this->findByTicketOrFail($ticket_id);
        $updated = $workflow->addProgress($report, $request->user(), $request->validated('note'));

        return ApiResponse::success(
            (new OfficerReportDetailResource($updated))->resolve($request),
            'Pembaruan progres berhasil disimpan.'
        );
    }

    /**
     * POST /api/v1/officer/reports/{ticket_id}/complete
     * Selesaikan laporan dengan catatan dan foto bukti penanganan.
     */
    public function complete(
        CompleteReportRequest $request,
        string $ticket_id,
        UploadService $uploadService,
        ReportWorkflow $workflow
    ): JsonResponse {
        $report = $this->findByTicketOrFail($ticket_id);

        if ((int) $report->handler_id !== (int) $request->user()->id) {
            throw new AuthorizationException('Hanya petugas yang menangani laporan ini yang dapat menyelesaikan laporan.');
        }

        $status = $report->status instanceof ReportStatus
            ? $report->status
            : ReportStatus::from((string) $report->status);

        if ($status !== ReportStatus::DIPROSES) {
            throw new ConflictException('Laporan hanya dapat diselesaikan saat berstatus diproses.');
        }

        $photoPath = $uploadService->storeCompletionPhoto($request->file('photo'));

        $updated = $workflow->complete(
            $report,
            $request->user(),
            $request->validated('notes'),
            $photoPath
        );

        return ApiResponse::success(
            (new OfficerReportDetailResource($updated))->resolve($request),
            'Laporan berhasil diselesaikan.'
        );
    }

    /**
     * @param  array<int, string>  $with
     */
    private function findByTicketOrFail(string $ticketId, array $with = []): Report
    {
        $normalized = TicketService::normalize($ticketId);

        if (! $normalized) {
            abort(404);
        }

        $query = Report::query();
        if ($with !== []) {
            $query->with($with);
        }

        return $query->where('ticket_id', $normalized)->firstOrFail();
    }
}
