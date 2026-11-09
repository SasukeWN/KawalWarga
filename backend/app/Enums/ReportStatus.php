<?php

namespace App\Enums;

enum ReportStatus: string
{
    case MENUNGGU_VERIFIKASI = 'menunggu_verifikasi';
    case MENUNGGU_PENANGANAN = 'menunggu_penanganan';
    case DIPROSES            = 'diproses';
    case SELESAI             = 'selesai';
    case DITOLAK             = 'ditolak';

    public function label(): string
    {
        return match ($this) {
            self::MENUNGGU_VERIFIKASI => 'Menunggu Verifikasi',
            self::MENUNGGU_PENANGANAN => 'Menunggu Penanganan',
            self::DIPROSES            => 'Diproses',
            self::SELESAI             => 'Selesai',
            self::DITOLAK             => 'Ditolak',
        };
    }
}
