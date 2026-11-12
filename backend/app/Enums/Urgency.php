<?php

namespace App\Enums;

enum Urgency: string
{
    case RENDAH  = 'rendah';
    case SEDANG  = 'sedang';
    case TINGGI  = 'tinggi';
    case DARURAT = 'darurat';

    public function label(): string
    {
        return match ($this) {
            self::RENDAH  => 'Rendah',
            self::SEDANG  => 'Sedang',
            self::TINGGI  => 'Tinggi',
            self::DARURAT => 'Darurat',
        };
    }

    /**
     * Bobot urutan prioritas (darurat > tinggi > sedang > rendah).
     */
    public function weight(): int
    {
        return match ($this) {
            self::DARURAT => 4,
            self::TINGGI  => 3,
            self::SEDANG  => 2,
            self::RENDAH  => 1,
        };
    }

    /**
     * Ekspresi SQL CASE untuk pengurutan urgensi di query builder.
     */
    public static function sqlWeightCase(string $column = 'urgency'): string
    {
        return "CASE {$column} WHEN 'darurat' THEN 4 WHEN 'tinggi' THEN 3 WHEN 'sedang' THEN 2 WHEN 'rendah' THEN 1 ELSE 0 END";
    }

    /**
     * Target waktu penanganan (SLA) dalam jam:
     * - Darurat: 24 jam (1 hari)
     * - Tinggi: 72 jam (3 hari)
     * - Sedang: 168 jam (7 hari)
     * - Rendah: 336 jam (14 hari)
     */
    public function slaHours(): int
    {
        return match ($this) {
            self::DARURAT => 24,
            self::TINGGI  => 72,
            self::SEDANG  => 168,
            self::RENDAH  => 336,
        };
    }

    /**
     * Target waktu penanganan (SLA) dalam hari.
     */
    public function slaDays(): int
    {
        return intdiv($this->slaHours(), 24);
    }

    /**
     * Label manusiawi target SLA.
     */
    public function slaLabel(): string
    {
        return match ($this) {
            self::DARURAT => '24 Jam',
            self::TINGGI  => '3 Hari',
            self::SEDANG  => '7 Hari',
            self::RENDAH  => '14 Hari',
        };
    }
}
