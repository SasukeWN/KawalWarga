<?php

namespace App\Enums;

enum EventType: string
{
    case SUBMITTED = 'submitted';
    case VERIFIED  = 'verified';
    case REJECTED  = 'rejected';
    case TAKEN     = 'taken';
    case PROGRESS  = 'progress';
    case COMPLETED = 'completed';

    public function label(): string
    {
        return match ($this) {
            self::SUBMITTED => 'Laporan diterima',
            self::VERIFIED  => 'Laporan siap ditangani',
            self::REJECTED  => 'Laporan ditolak',
            self::TAKEN     => 'Petugas mulai menangani',
            self::PROGRESS  => 'Pembaruan dari petugas',
            self::COMPLETED => 'Selesai ditangani',
        };
    }
}
