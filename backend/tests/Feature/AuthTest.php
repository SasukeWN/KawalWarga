<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(UserSeeder::class);
    }

    public function test_login_succeeds_with_valid_credentials_and_returns_contract_format(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'admin@kawalwarga.test',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Login berhasil.',
                'data'    => [
                    'token_type' => 'Bearer',
                    'user'       => [
                        'name'     => 'Nadia Putri',
                        'email'    => 'admin@kawalwarga.test',
                        'role'     => 'admin',
                        'position' => 'Admin verifikator',
                    ],
                ],
            ]);

        $this->assertNotEmpty($response->json('data.token'));
        $this->assertIsInt($response->json('data.user.id'));
    }

    public function test_login_fails_with_401_on_invalid_password_or_email(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email'    => 'admin@kawalwarga.test',
            'password' => 'salah-password',
        ])->assertStatus(401)
            ->assertExactJson([
                'success' => false,
                'message' => 'Email atau password salah.',
            ]);

        $this->postJson('/api/v1/auth/login', [
            'email'    => 'tidakada@kawalwarga.test',
            'password' => 'password123',
        ])->assertStatus(401)
            ->assertExactJson([
                'success' => false,
                'message' => 'Email atau password salah.',
            ]);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/v1/auth/me')
            ->assertStatus(401)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_me_returns_authenticated_user_profile(): void
    {
        $admin = User::where('email', 'admin@kawalwarga.test')->firstOrFail();
        $token = $admin->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/auth/me')
            ->assertStatus(200)
            ->assertExactJson([
                'success' => true,
                'message' => 'OK',
                'data'    => [
                    'id'       => $admin->id,
                    'name'     => 'Nadia Putri',
                    'email'    => 'admin@kawalwarga.test',
                    'role'     => 'admin',
                    'position' => 'Admin verifikator',
                ],
            ]);
    }

    public function test_role_middleware_blocks_wrong_role_with_403_envelope(): void
    {
        $admin   = User::where('email', 'admin@kawalwarga.test')->firstOrFail();
        $officer = User::where('email', 'budi@kawalwarga.test')->firstOrFail();

        $adminToken   = $admin->createToken('admin-token')->plainTextToken;
        $officerToken = $officer->createToken('officer-token')->plainTextToken;

        // Petugas mengakses /admin/* mendapat 403
        $this->withHeader('Authorization', 'Bearer '.$officerToken)
            ->getJson('/api/v1/admin/ping')
            ->assertStatus(403)
            ->assertJson([
                'success' => false,
            ]);

        $this->app['auth']->forgetGuards();

        // Admin mengakses /officer/* mendapat 403
        $this->withHeader('Authorization', 'Bearer '.$adminToken)
            ->getJson('/api/v1/officer/ping')
            ->assertStatus(403)
            ->assertJson([
                'success' => false,
            ]);

        $this->app['auth']->forgetGuards();

        // Role yang sesuai mendapat 200
        $this->withHeader('Authorization', 'Bearer '.$adminToken)
            ->getJson('/api/v1/admin/ping')
            ->assertStatus(200);

        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', 'Bearer '.$officerToken)
            ->getJson('/api/v1/officer/ping')
            ->assertStatus(200);
    }

    public function test_logout_deletes_current_token(): void
    {
        $admin = User::where('email', 'admin@kawalwarga.test')->firstOrFail();
        $token = $admin->createToken('logout-test')->plainTextToken;

        $this->assertDatabaseCount('personal_access_tokens', 1);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/auth/logout')
            ->assertStatus(200)
            ->assertExactJson([
                'success' => true,
                'message' => 'Logout berhasil.',
                'data'    => null,
            ]);

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
