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
}
