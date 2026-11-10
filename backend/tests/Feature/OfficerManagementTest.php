<?php

namespace Tests\Feature;

use App\Enums\ReportStatus;
use App\Enums\Role;
use App\Models\Report;
use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class OfficerManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $officer;

    protected string $adminToken;

    protected string $officerToken;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.url' => 'http://localhost:8000']);
        $this->seed(UserSeeder::class);

        $this->admin        = User::where('email', 'admin@kawalwarga.test')->firstOrFail();
        $this->officer      = User::where('email', 'budi@kawalwarga.test')->firstOrFail();
        $this->adminToken   = $this->admin->createToken('admin-test')->plainTextToken;
        $this->officerToken = $this->officer->createToken('officer-test')->plainTextToken;
    }

    private function adminHeaders(): array
    {
        return [
            'Authorization' => 'Bearer '.$this->adminToken,
            'Accept'        => 'application/json',
        ];
    }

    private function officerHeaders(): array
    {
        return [
            'Authorization' => 'Bearer '.$this->officerToken,
            'Accept'        => 'application/json',
        ];
    }

    public function test_admin_can_view_officers_list_and_summary(): void
    {
        // Buat laporan untuk petugas budi
        Report::create([
            'ticket_id'   => 'ADU-701',
            'title'       => 'Tugas uji 1',
            'description' => 'Deskripsi',
            'photo_path'  => 'reports/701.jpg',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'status'      => ReportStatus::DIPROSES,
            'handler_id'  => $this->officer->id,
            'ai_status'   => 'done',
        ]);

        $res = $this->getJson('/api/v1/admin/officers', $this->adminHeaders());

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'summary' => ['total', 'active', 'suspended'],
                    'officers' => [
                        '*' => [
                            'id',
                            'name',
                            'email',
                            'position',
                            'is_active',
                            'tasks_in_progress_count',
                            'tasks_completed_count',
                            'created_at',
                        ],
                    ],
                ],
            ]);

        $this->assertGreaterThanOrEqual(1, $res->json('data.summary.total'));
        $this->assertGreaterThanOrEqual(1, $res->json('data.summary.active'));
    }

    public function test_admin_can_create_new_officer_with_email_and_password(): void
    {
        $payload = [
            'email'    => 'andi.lapangan@kawalwarga.id',
            'password' => 'secret123',
            'name'     => 'Andi Prasetyo',
            'position' => 'Petugas Patroli Wilayah',
        ];

        $res = $this->postJson('/api/v1/admin/officers', $payload, $this->adminHeaders());

        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.email', 'andi.lapangan@kawalwarga.id')
            ->assertJsonPath('data.name', 'Andi Prasetyo')
            ->assertJsonPath('data.position', 'Petugas Patroli Wilayah')
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('users', [
            'email'     => 'andi.lapangan@kawalwarga.id',
            'role'      => Role::PETUGAS->value,
            'is_active' => true,
        ]);

        // Petugas baru dapat login
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email'    => 'andi.lapangan@kawalwarga.id',
            'password' => 'secret123',
        ]);

        $loginRes->assertOk()->assertJsonPath('success', true);
    }

    public function test_create_officer_validates_inputs(): void
    {
        // Email duplikat
        $this->postJson('/api/v1/admin/officers', [
            'email'    => 'budi@kawalwarga.test',
            'password' => 'secret123',
        ], $this->adminHeaders())
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        // Password pendek
        $this->postJson('/api/v1/admin/officers', [
            'email'    => 'baru@kawalwarga.test',
            'password' => '123',
        ], $this->adminHeaders())
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');

        // Email invalid
        $this->postJson('/api/v1/admin/officers', [
            'email'    => 'bukan-email',
            'password' => 'secret123',
        ], $this->adminHeaders())
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_admin_can_suspend_and_unsuspend_officer(): void
    {
        // 1. Tangguhkan akun petugas
        $suspendRes = $this->patchJson("/api/v1/admin/officers/{$this->officer->id}/status", [
            'is_active' => false,
        ], $this->adminHeaders());

        $suspendRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('users', [
            'id'        => $this->officer->id,
            'is_active' => false,
        ]);

        // 2. Petugas yang ditangguhkan TIDAK DAPAT login
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email'    => $this->officer->email,
            'password' => 'password123',
        ]);

        $loginRes->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Akun Anda telah ditangguhkan. Silakan hubungi admin.');

        // 3. Token lama dicabut saat akun ditangguhkan
        auth()->forgetGuards();
        $accessRes = $this->getJson('/api/v1/officer/queue', [
            'Authorization' => 'Bearer '.$this->officerToken,
            'Accept'        => 'application/json',
        ]);

        $accessRes->assertStatus(401);

        // 4. Admin mengaktifkan kembali akun petugas
        $activateRes = $this->patchJson("/api/v1/admin/officers/{$this->officer->id}/status", [
            'is_active' => true,
        ], $this->adminHeaders());

        $activateRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_active', true);

        // 5. Petugas dapat login kembali setelah diaktifkan
        $loginAgain = $this->postJson('/api/v1/auth/login', [
            'email'    => $this->officer->email,
            'password' => 'password123',
        ]);

        $loginAgain->assertOk()->assertJsonPath('success', true);
    }

    public function test_officer_can_view_profile_and_update_password(): void
    {
        // 1. Lihat profil
        $profileRes = $this->getJson('/api/v1/officer/profile', $this->officerHeaders());

        $profileRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.email', $this->officer->email);

        // 2. Gagal jika current password salah
        $failRes = $this->putJson('/api/v1/officer/profile/password', [
            'current_password'      => 'wrongpass',
            'password'              => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ], $this->officerHeaders());

        $failRes->assertStatus(422)
            ->assertJsonValidationErrors('current_password');

        // 3. Gagal jika password confirmation tidak cocok
        $mismatchRes = $this->putJson('/api/v1/officer/profile/password', [
            'current_password'      => 'password123',
            'password'              => 'newpassword123',
            'password_confirmation' => 'berbeda',
        ], $this->officerHeaders());

        $mismatchRes->assertStatus(422)
            ->assertJsonValidationErrors('password');

        // 4. Sukses ganti password
        $successRes = $this->putJson('/api/v1/officer/profile/password', [
            'current_password'      => 'password123',
            'password'              => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ], $this->officerHeaders());

        $successRes->assertOk()->assertJsonPath('success', true);

        // 5. Login dengan password baru berhasil
        $newLogin = $this->postJson('/api/v1/auth/login', [
            'email'    => $this->officer->email,
            'password' => 'newpassword123',
        ]);

        $newLogin->assertOk()->assertJsonPath('success', true);
    }

    public function test_officer_management_requires_admin(): void
    {
        $this->getJson('/api/v1/admin/officers')->assertStatus(401);

        $this->getJson('/api/v1/admin/officers', $this->officerHeaders())->assertStatus(403);
    }
}
