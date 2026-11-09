<?php

namespace App\Services;

use App\Enums\Category;
use App\Enums\EventType;
use App\Enums\ReportStatus;
use App\Enums\Urgency;
use App\Exceptions\ConflictException;
use App\Models\Report;
use App\Models\ReportEvent;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReportWorkflow
{
    /**
     * Normalisasi nomor telepon ke format 62xxxxxxxxxx.
     */
    public static function normalizePhone(?string $phone): ?string
    {
        if ($phone === null || trim($phone) === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone);
        if (! $digits) {
            return null;
        }

        if (str_starts_with($digits, '0')) {
            return '62'.substr($digits, 1);
        }

        if (str_starts_with($digits, '620')) {
            return '62'.substr($digits, 3);
        }

        if (str_starts_with($digits, '8')) {
            return '62'.$digits;
        }

        return $digits;
    }

    /**
     * Buat laporan baru beserta ticket_id dan event timeline "submitted" dalam satu transaksi.
     *
     * @param  array<string, mixed>  $data
     */
    public function submit(array $data, string $photoPath): Report
    {
        return DB::transaction(function () use ($data, $photoPath): Report {
            $description   = trim((string) $data['description']);
            $fallbackTitle = mb_substr($description, 0, 60);

            $report = Report::create([
                'title'          => $fallbackTitle,
                'description'    => $description,
                'photo_path'     => $photoPath,
                'latitude'       => (float) $data['latitude'],
                'longitude'      => (float) $data['longitude'],
                'address_text'   => isset($data['address_text']) && trim((string) $data['address_text']) !== ''
                    ? trim((string) $data['address_text'])
                    : null,
                'reporter_phone' => self::normalizePhone($data['reporter_phone'] ?? null),
                'status'         => ReportStatus::MENUNGGU_VERIFIKASI,
                'ai_status'      => 'pending',
            ]);

            $report->update([
                'ticket_id' => TicketService::format($report->id),
            ]);

            ReportEvent::create([
                'report_id'   => $report->id,
                'event'       => EventType::SUBMITTED,
                'title'       => EventType::SUBMITTED->label(),
                'description' => 'Laporan masuk dan menunggu verifikasi admin.',
                'actor_id'    => null,
                'created_at'  => $report->created_at ?? now(),
            ]);

            return $report->fresh();
        });
    }

    /**
     * Setujui laporan (transisi menunggu_verifikasi -> menunggu_penanganan).
     */
    public function approve(
        Report $report,
        User $admin,
        Category|string $category,
        Urgency|string $urgency,
        ?string $note = null
    ): Report {
        return DB::transaction(function () use ($report, $admin, $category, $urgency, $note): Report {
            $locked = Report::whereKey($report->id)->lockForUpdate()->firstOrFail();

            $currentStatus = $locked->status instanceof ReportStatus
                ? $locked->status
                : ReportStatus::from((string) $locked->status);

            if ($currentStatus !== ReportStatus::MENUNGGU_VERIFIKASI) {
                throw new ConflictException('Laporan hanya dapat disetujui saat berstatus menunggu verifikasi.');
            }

            $categoryValue = $category instanceof Category ? $category->value : $category;
            $urgencyValue  = $urgency instanceof Urgency ? $urgency->value : $urgency;
            $now           = now();

            $locked->update([
                'category'          => $categoryValue,
                'urgency'           => $urgencyValue,
                'verified_by'       => $admin->id,
                'verified_at'       => $now,
                'verification_note' => $note !== null && trim($note) !== '' ? trim($note) : null,
                'status'            => ReportStatus::MENUNGGU_PENANGANAN,
            ]);

            ReportEvent::create([
                'report_id'   => $locked->id,
                'event'       => EventType::VERIFIED,
                'title'       => EventType::VERIFIED->label(),
                'description' => 'Admin menyetujui laporan. Menunggu Penanganan.',
                'actor_id'    => $admin->id,
                'created_at'  => $now,
            ]);

            return $locked->fresh([
                'events.actor',
                'duplicates.duplicateOf',
                'verifier',
                'rejecter',
                'handler',
            ]);
        });
    }

    /**
     * Tolak laporan (transisi menunggu_verifikasi -> ditolak).
     */
    public function reject(Report $report, User $admin, string $reason): Report
    {
        return DB::transaction(function () use ($report, $admin, $reason): Report {
            $locked = Report::whereKey($report->id)->lockForUpdate()->firstOrFail();

            $currentStatus = $locked->status instanceof ReportStatus
                ? $locked->status
                : ReportStatus::from((string) $locked->status);

            if ($currentStatus !== ReportStatus::MENUNGGU_VERIFIKASI) {
                throw new ConflictException('Laporan hanya dapat ditolak saat berstatus menunggu verifikasi.');
            }

            $now = now();

            $locked->update([
                'rejection_reason' => trim($reason),
                'rejected_by'      => $admin->id,
                'rejected_at'      => $now,
                'status'           => ReportStatus::DITOLAK,
            ]);

            ReportEvent::create([
                'report_id'   => $locked->id,
                'event'       => EventType::REJECTED,
                'title'       => EventType::REJECTED->label(),
                'description' => 'Laporan tidak dapat diteruskan.',
                'actor_id'    => $admin->id,
                'created_at'  => $now,
            ]);

            return $locked->fresh([
                'events.actor',
                'duplicates.duplicateOf',
                'verifier',
                'rejecter',
                'handler',
            ]);
        });
    }
}
