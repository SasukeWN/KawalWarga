<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\Urgency;
use App\Http\Controllers\Controller;
use App\Http\Requests\ApproveReportRequest;
use App\Http\Requests\ListReportsRequest;
use App\Http\Requests\RejectReportRequest;
use App\Http\Resources\AdminReportDetailResource;
use App\Http\Resources\AdminReportListResource;
use App\Models\Report;
use App\Services\ReportWorkflow;
use App\Services\TicketService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    /**
     * GET /api/v1/admin/reports
     * Daftar laporan untuk antrean verifikasi dan riwayat laporan.
     */
    public function index(ListReportsRequest $request): JsonResponse
    {
        $query = Report::query();

        if ($request->filled('search')) {
            $normalized = TicketService::normalize((string) $request->input('search'));
            if ($normalized) {
                $query->where('ticket_id', $normalized);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('urgency')) {
            $query->where('urgency', $request->input('urgency'));
        }

        if ($request->filled('from')) {
            $from = Carbon::parse((string) $request->input('from'), 'Asia/Jakarta')->startOfDay();
            $query->where('created_at', '>=', $from);
        }

        if ($request->filled('to')) {
            $to = Carbon::parse((string) $request->input('to'), 'Asia/Jakarta')->endOfDay();
            $query->where('created_at', '<=', $to);
        }

        $sort = $request->input('sort', 'newest');
        if ($sort === 'oldest') {
            $query->orderBy('created_at', 'asc')->orderBy('id', 'asc');
        } elseif ($sort === 'urgency') {
            $query->orderByRaw(Urgency::sqlWeightCase('urgency').' DESC')
                ->orderBy('created_at', 'desc')
                ->orderBy('id', 'desc');
        } else {
            $query->orderBy('created_at', 'desc')->orderBy('id', 'desc');
        }

        $perPage   = min(max((int) $request->input('per_page', 8), 1), 50);
        $paginator = $query->paginate($perPage);

        $items = AdminReportListResource::collection($paginator->items())->resolve($request);

        return ApiResponse::success($items, 'OK', 200, [
            'current_page' => $paginator->currentPage(),
            'last_page'    => $paginator->lastPage(),
            'per_page'     => $paginator->perPage(),
            'total'        => $paginator->total(),
        ]);
    }

    /**
     * GET /api/v1/admin/reports/{ticket_id}
     * Detail lengkap laporan untuk admin.
     */
    public function show(Request $request, string $ticket_id): JsonResponse
    {
        $report = $this->findByTicketOrFail($ticket_id, [
            'events.actor',
            'duplicates.duplicateOf',
            'verifier',
            'rejecter',
            'handler',
        ]);

        return ApiResponse::success(
            (new AdminReportDetailResource($report))->resolve($request)
        );
    }

    /**
     * POST /api/v1/admin/reports/{ticket_id}/approve
     * Setujui laporan dan ubah status menjadi menunggu_penanganan.
     */
    public function approve(
        ApproveReportRequest $request,
        string $ticket_id,
        ReportWorkflow $workflow
    ): JsonResponse {
        $report = $this->findByTicketOrFail($ticket_id);

        $updated = $workflow->approve(
            $report,
            $request->user(),
            $request->validated('category'),
            $request->validated('urgency'),
            $request->validated('note')
        );

        return ApiResponse::success(
            (new AdminReportDetailResource($updated))->resolve($request),
            'Laporan berhasil disetujui.'
        );
    }

    /**
     * POST /api/v1/admin/reports/{ticket_id}/reject
     * Tolak laporan dengan alasan wajib.
     */
    public function reject(
        RejectReportRequest $request,
        string $ticket_id,
        ReportWorkflow $workflow
    ): JsonResponse {
        $report = $this->findByTicketOrFail($ticket_id);

        $updated = $workflow->reject(
            $report,
            $request->user(),
            $request->validated('reason')
        );

        return ApiResponse::success(
            (new AdminReportDetailResource($updated))->resolve($request),
            'Laporan berhasil ditolak.'
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
