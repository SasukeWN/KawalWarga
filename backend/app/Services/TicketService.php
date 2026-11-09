<?php

namespace App\Services;

class TicketService
{
    /**
     * Format ID numerik menjadi ID tiket standar (minimal 3 digit), contoh: ADU-001, ADU-204.
     */
    public static function format(int $id): string
    {
        return 'ADU-'.str_pad((string) $id, 3, '0', STR_PAD_LEFT);
    }

    /**
     * Normalisasi berbagai bentuk input ID tiket (#adu-204, ADU-204, 204, #adu-0204)
     * menjadi format kanonik ADU-204. Mengembalikan null jika input tidak valid.
     */
    public static function normalize(string $input): ?string
    {
        $cleaned = strtoupper((string) preg_replace('/[#\s]+/', '', $input));

        if ($cleaned === '') {
            return null;
        }

        if (preg_match('/^\d+$/', $cleaned)) {
            $digits = $cleaned;
        } elseif (preg_match('/^ADU-?(\d+)$/', $cleaned, $matches)) {
            $digits = $matches[1];
        } else {
            return null;
        }

        $trimmed = ltrim($digits, '0');
        if ($trimmed === '') {
            return null;
        }

        return 'ADU-'.str_pad($trimmed, 3, '0', STR_PAD_LEFT);
    }
}
