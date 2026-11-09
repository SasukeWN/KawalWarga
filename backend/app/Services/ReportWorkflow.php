<?php

namespace App\Services;

use App\Enums\EventType;
use App\Enums\ReportStatus;
use App\Models\Report;
use App\Models\ReportEvent;
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
}
