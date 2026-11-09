<?php

namespace App\Enums;

enum Category: string
{
    case JALAN_RUSAK = 'jalan_rusak';
    case SAMPAH      = 'sampah';
    case LAMPU_MATI  = 'lampu_mati';

    public function label(): string
    {
        return match ($this) {
            self::JALAN_RUSAK => 'Jalan Rusak',
            self::SAMPAH      => 'Sampah',
            self::LAMPU_MATI  => 'Lampu Mati',
        };
    }
}
