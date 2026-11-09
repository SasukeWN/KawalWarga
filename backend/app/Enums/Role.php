<?php

namespace App\Enums;

enum Role: string
{
    case ADMIN   = 'admin';
    case PETUGAS = 'petugas';

    public function label(): string
    {
        return match ($this) {
            self::ADMIN   => 'Admin',
            self::PETUGAS => 'Petugas',
        };
    }
}
