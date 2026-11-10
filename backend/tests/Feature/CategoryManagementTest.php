<?php

namespace Tests\Feature;

use App\Enums\ReportStatus;
use App\Models\Report;
use App\Models\ReportCategory;
use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpClientRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CategoryManagementTest extends TestCase
{
    use RefreshDatabase;

    protected string $adminToken;

    protected string $officerToken;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.url' => 'http://localhost:8000']);
        $this->seed(UserSeeder::class);

        $this->adminToken   = User::where('email', 'admin@kawalwarga.test')->firstOrFail()->createToken('a')->plainTextToken;
        $this->officerToken = User::where('email', 'budi@kawalwarga.test')->firstOrFail()->createToken('o')->plainTextToken;
    }

    private function admin(): array
    {
        return ['Authorization' => 'Bearer '.$this->adminToken, 'Accept' => 'application/json'];
    }

    private function makeReport(array $overrides = []): Report
    {
        return Report::create(array_merge([
            'ticket_id'    => 'ADU-900',
            'title'        => 'Laporan uji',
            'description'  => 'Deskripsi laporan uji kategori dinamis.',
            'photo_path'   => 'reports/x.jpg',
            'latitude'     => -6.2088,
            'longitude'    => 106.8456,
            'status'       => ReportStatus::MENUNGGU_VERIFIKASI,
            'ai_status'    => 'done',
        ], $overrides));
    }

    public function test_public_categories_returns_only_active_categories_in_order(): void
    {
        ReportCategory::where('slug', 'sampah')->update(['is_active' => false]);

        $res = $this->getJson('/api/v1/categories');

        $res->assertOk()->assertJsonPath('success', true);
        $values = collect($res->json('data'))->pluck('value')->all();
        $this->assertSame(['jalan_rusak', 'lampu_mati'], $values);
        $this->assertSame('Jalan Rusak', $res->json('data.0.label'));

        // Dengan ?all=1, kategori nonaktif tetap dikembalikan (berguna untuk filter petugas)
        $allRes = $this->getJson('/api/v1/categories?all=1');
        $allRes->assertOk();
        $allValues = collect($allRes->json('data'))->pluck('value')->all();
        $this->assertSame(['jalan_rusak', 'sampah', 'lampu_mati'], $allValues);

        // Petugas dengan token auth dapat mengakses /api/v1/categories tanpa 403
        $officerRes = $this->getJson('/api/v1/categories?all=1', [
            'Authorization' => 'Bearer '.$this->officerToken,
        ]);
        $officerRes->assertOk()->assertJsonPath('success', true);
    }

    public function test_admin_can_create_category_with_generated_slug(): void
    {
        $res = $this->postJson('/api/v1/admin/categories', [
            'label'       => 'Banjir & Genangan',
            'description' => 'Genangan air di jalan.',
        ], $this->admin());

        $res->assertStatus(201)
            ->assertJsonPath('data.value', 'banjir_genangan')
            ->assertJsonPath('data.label', 'Banjir & Genangan')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.reports_count', 0);

        $public = collect($this->getJson('/api/v1/categories')->json('data'))->pluck('value')->all();
        $this->assertContains('banjir_genangan', $public);
    }

    public function test_create_category_rejects_duplicate_name_and_short_label(): void
    {
        $this->postJson('/api/v1/admin/categories', ['label' => 'jalan rusak'], $this->admin())
            ->assertStatus(409);

        $this->postJson('/api/v1/admin/categories', ['label' => 'ab'], $this->admin())
            ->assertStatus(422)
            ->assertJsonValidationErrors('label');
    }

    public function test_category_management_requires_admin_role(): void
    {
        $this->getJson('/api/v1/admin/categories')->assertStatus(401);

        $this->postJson('/api/v1/admin/categories', ['label' => 'Pohon Tumbang'], [
            'Authorization' => 'Bearer '.$this->officerToken,
        ])->assertStatus(403);
    }

    public function test_admin_can_rename_and_deactivate_category_but_not_the_last_active_one(): void
    {
        $this->putJson('/api/v1/admin/categories/sampah', ['label' => 'Sampah Liar'], $this->admin())
            ->assertOk()
            ->assertJsonPath('data.label', 'Sampah Liar')
            ->assertJsonPath('data.value', 'sampah');

        $this->putJson('/api/v1/admin/categories/sampah', ['is_active' => false], $this->admin())
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->putJson('/api/v1/admin/categories/lampu_mati', ['is_active' => false], $this->admin())
            ->assertOk();

        // jalan_rusak sekarang satu-satunya yang aktif
        $this->putJson('/api/v1/admin/categories/jalan_rusak', ['is_active' => false], $this->admin())
            ->assertStatus(409);
    }

    public function test_delete_is_blocked_when_category_is_used_and_allowed_when_unused(): void
    {
        $this->makeReport(['category' => 'sampah']);

        $this->deleteJson('/api/v1/admin/categories/sampah', [], $this->admin())
            ->assertStatus(409);

        $this->postJson('/api/v1/admin/categories', ['label' => 'Pohon Tumbang'], $this->admin())
            ->assertStatus(201);

        $this->deleteJson('/api/v1/admin/categories/pohon_tumbang', [], $this->admin())
            ->assertOk();

        $this->assertDatabaseMissing('categories', ['slug' => 'pohon_tumbang']);
    }

    public function test_reporter_can_choose_active_category_and_it_becomes_initial_effective_category(): void
    {
        Storage::fake('uploads');

        $this->postJson('/api/v1/admin/categories', ['label' => 'Pohon Tumbang'], $this->admin())->assertStatus(201);

        $res = $this->post('/api/v1/reports', [
            'description' => 'Pohon besar tumbang menutup separuh jalan di depan sekolah dasar.',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'category'    => 'pohon_tumbang',
            'photo'       => UploadedFile::fake()->image('a.jpg', 600, 400)->size(300),
        ], ['Accept' => 'application/json']);

        $res->assertStatus(201);

        $report = Report::where('ticket_id', $res->json('data.ticket_id'))->firstOrFail();
        $this->assertSame('pohon_tumbang', $report->reporter_category);
        $this->assertSame('pohon_tumbang', $report->category);
        $this->assertSame('Pohon Tumbang', $report->category_label);

        // Admin melihat nilai efektif = pilihan pelapor
        $this->getJson('/api/v1/admin/reports/'.$report->ticket_id, $this->admin())
            ->assertOk()
            ->assertJsonPath('data.category', 'pohon_tumbang')
            ->assertJsonPath('data.category_label', 'Pohon Tumbang');
    }

    public function test_submit_rejects_unknown_or_inactive_category(): void
    {
        Storage::fake('uploads');
        ReportCategory::where('slug', 'sampah')->update(['is_active' => false]);

        foreach (['tidak_ada', 'sampah'] as $slug) {
            $this->post('/api/v1/reports', [
                'description' => 'Deskripsi laporan yang cukup panjang untuk lolos validasi.',
                'latitude'    => -6.2088,
                'longitude'   => 106.8456,
                'category'    => $slug,
                'photo'       => UploadedFile::fake()->image('a.jpg', 600, 400)->size(300),
            ], ['Accept' => 'application/json'])
                ->assertStatus(422)
                ->assertJsonValidationErrors('category');
        }
    }

    public function test_submit_without_category_remains_valid(): void
    {
        Storage::fake('uploads');

        $this->post('/api/v1/reports', [
            'description' => 'Deskripsi laporan tanpa memilih kategori sama sekali.',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'photo'       => UploadedFile::fake()->image('a.jpg', 600, 400)->size(300),
        ], ['Accept' => 'application/json'])->assertStatus(201);
    }

    public function test_admin_can_approve_with_new_category_and_it_shows_in_summary_and_track(): void
    {
        $this->postJson('/api/v1/admin/categories', ['label' => 'Pohon Tumbang'], $this->admin())->assertStatus(201);
        $this->makeReport(['ticket_id' => 'ADU-901']);

        $this->postJson('/api/v1/admin/reports/ADU-901/approve', [
            'category' => 'pohon_tumbang',
            'urgency'  => 'tinggi',
        ], $this->admin())->assertOk()->assertJsonPath('data.category_label', 'Pohon Tumbang');

        $this->postJson('/api/v1/admin/reports/ADU-901/approve', [
            'category' => 'tidak_ada',
            'urgency'  => 'tinggi',
        ], $this->admin())->assertStatus(422)->assertJsonValidationErrors('category');

        $this->getJson('/api/v1/reports/track/ADU-901')
            ->assertOk()
            ->assertJsonPath('data.category', 'pohon_tumbang')
            ->assertJsonPath('data.category_label', 'Pohon Tumbang');

        $today = now('Asia/Jakarta')->toDateString();
        $summary = $this->getJson("/api/v1/admin/dashboard/summary?from={$today}&to={$today}", $this->admin())
            ->assertOk();

        $byCategory = collect($summary->json('data.by_category'))->keyBy('category');
        $this->assertSame('Pohon Tumbang', $byCategory['pohon_tumbang']['label']);
        $this->assertSame(1, $byCategory['pohon_tumbang']['count']);
    }

    public function test_ai_prompt_lists_admin_defined_categories_and_accepts_new_slug(): void
    {
        Storage::fake('uploads');
        config([
            'services.gemini.api_key' => 'test-key',
            'services.gemini.model'   => 'gemini-test',
        ]);

        $this->postJson('/api/v1/admin/categories', ['label' => 'Pohon Tumbang'], $this->admin())->assertStatus(201);

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [[
                    'content' => ['parts' => [['text' => json_encode([
                        'title'                => 'Pohon tumbang menutup jalan',
                        'category'             => 'pohon_tumbang',
                        'urgency'              => 'darurat',
                        'summary'              => 'Pohon tumbang menghalangi jalan.',
                        'duplicate_ticket_ids' => [],
                    ])]]],
                ]],
            ], 200),
        ]);

        $res = $this->post('/api/v1/reports', [
            'description' => 'Pohon besar tumbang menutup separuh jalan di depan sekolah dasar.',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'photo'       => UploadedFile::fake()->image('a.jpg', 600, 400)->size(300),
        ], ['Accept' => 'application/json'])->assertStatus(201);

        Http::assertSent(function (HttpClientRequest $req): bool {
            $system = $req->data()['systemInstruction']['parts'][0]['text'] ?? '';

            return str_contains($system, 'pohon_tumbang') && str_contains($system, 'jalan_rusak');
        });

        $report = Report::where('ticket_id', $res->json('data.ticket_id'))->firstOrFail();
        $this->assertSame('pohon_tumbang', $report->ai_category);
        $this->assertSame('pohon_tumbang', $report->category);
    }
}
