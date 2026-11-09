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
        $adminPassword   = (string) env('DEMO_ADMIN_PASSWORD', 'password123');
        $officerPassword = (string) env('DEMO_OFFICER_PASSWORD', 'password123');

        User::updateOrCreate(
            ['email' => 'admin@kawalwarga.test'],
            [
                'name'     => 'Nadia Putri',
                'password' => Hash::make($adminPassword),
                'role'     => Role::ADMIN->value,
                'position' => 'Admin verifikator',
            ]
        );

        User::updateOrCreate(
            ['email' => 'budi@kawalwarga.test'],
            [
                'name'     => 'Budi Santoso',
                'password' => Hash::make($officerPassword),
                'role'     => Role::PETUGAS->value,
                'position' => 'Petugas lapangan',
            ]
        );
    }
}
