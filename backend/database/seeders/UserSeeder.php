<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@kawalwarga.test'],
            [
                'name'     => 'Nadia Putri',
                'password' => Hash::make('password123'),
                'role'     => Role::ADMIN->value,
                'position' => 'Admin verifikator',
            ]
        );

        User::updateOrCreate(
            ['email' => 'budi@kawalwarga.test'],
            [
                'name'     => 'Budi Santoso',
                'password' => Hash::make('password123'),
                'role'     => Role::PETUGAS->value,
                'position' => 'Petugas lapangan',
            ]
        );
    }
}
