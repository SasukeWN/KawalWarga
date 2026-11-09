<?php

namespace Tests\Feature;

use App\Enums\Category;
use App\Enums\ReportStatus;
use App\Enums\Urgency;
use App\Models\Report;
use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected string $adminToken;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.url' => 'http://localhost:8000']);
        $this->seed(UserSeeder::class);

        $this->admin      = User::where('email', 'admin@kawalwarga.test')->firstOrFail();
        $this->adminToken = $this->admin->createToken('admin')->plainTextToken;
    }

    public function test_dashboard_summary_counts_correctly_and_respects_date_filter(): void
    {
        // Dalam periode 2026-11-01 s.d. 2026-11-08
        $this->createSampleReport('ADU-001', ReportStatus::MENUNGGU_VERIFIKASI, Category::JALAN_RUSAK, '2026-11-02T10:00:00+07:00');
        $this->createSampleReport('ADU-002', ReportStatus::MENUNGGU_PENANGANAN, Category::JALAN_RUSAK, '2026-11-03T11:00:00+07:00');
        $this->createSampleReport('ADU-003', ReportStatus::DIPROSES, Category::SAMPAH, '2026-11-05T14:00:00+07:00');
        $this->createSampleReport('ADU-004', ReportStatus::SELESAI, Category::LAMPU_MATI, '2026-11-06T15:00:00+07:00');
        $this->createSampleReport('ADU-005', ReportStatus::DITOLAK, null, '2026-11-08T18:00:00+07:00');

        // Di luar periode (bulan sebelumnya)
        $this->createSampleReport('ADU-006', ReportStatus::SELESAI, Category::JALAN_RUSAK, '2026-10-15T10:00:00+07:00');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->getJson('/api/v1/admin/dashboard/summary?from=2026-11-01&to=2026-11-08');

        $response->assertStatus(200)
            ->assertExactJson([
                'success' => true,
                'message' => 'OK',
                'data'    => [
                    'period'      => [
                        'from' => '2026-11-01',
                        'to'   => '2026-11-08',
                    ],
                    'totals'      => [
                        'all'                 => 5,
                        'menunggu_verifikasi' => 1,
                        'menunggu_penanganan' => 1,
                        'diproses'            => 1,
                        'selesai'             => 1,
                        'ditolak'             => 1,
                    ],
                    'by_category' => [
                        ['category' => 'jalan_rusak', 'label' => 'Jalan Rusak', 'count' => 2],
                        ['category' => 'sampah', 'label' => 'Sampah', 'count' => 1],
                        ['category' => 'lampu_mati', 'label' => 'Lampu Mati', 'count' => 1],
                    ],
                ],
            ]);
    }

    public function test_dashboard_map_excludes_menunggu_verifikasi(): void
    {
        $this->createSampleReport('ADU-204', ReportStatus::MENUNGGU_VERIFIKASI, Category::JALAN_RUSAK, '2026-11-08T10:00:00+07:00');
        $this->createSampleReport('ADU-198', ReportStatus::DIPROSES, Category::JALAN_RUSAK, '2026-11-08T09:00:00+07:00');
        $this->createSampleReport('ADU-176', ReportStatus::SELESAI, Category::SAMPAH, '2026-11-07T09:00:00+07:00');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->getJson('/api/v1/admin/dashboard/map?from=2026-11-01&to=2026-11-08');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.ticket_id', 'ADU-198')
            ->assertJsonPath('data.0.status', 'diproses')
            ->assertJsonPath('data.0.category_label', 'Jalan Rusak')
            ->assertJsonPath('data.1.ticket_id', 'ADU-176');

        $ticketIds = array_column($response->json('data'), 'ticket_id');
        $this->assertNotContains('ADU-204', $ticketIds);
    }

    public function test_dashboard_ai_insight_fallback_works_when_ai_fails_and_caches_result(): void
    {
        config([
            'services.gemini.api_key' => 'test-key',
            'services.gemini.model'   => 'gemini-test',
        ]);

        $this->createSampleReport('ADU-001', ReportStatus::MENUNGGU_VERIFIKASI, Category::JALAN_RUSAK, '2026-11-08T10:00:00+07:00');
        $this->createSampleReport('ADU-002', ReportStatus::MENUNGGU_PENANGANAN, Category::JALAN_RUSAK, '2026-11-08T09:00:00+07:00');
        $this->createSampleReport('ADU-003', ReportStatus::SELESAI, Category::SAMPAH, '2026-11-07T09:00:00+07:00');
        $this->createSampleReport('ADU-004', ReportStatus::SELESAI, Category::JALAN_RUSAK, '2026-11-06T09:00:00+07:00');

        // Paksa Gemini gagal 500
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response(['error' => 'Server error'], 500),
        ]);

        $res = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->getJson('/api/v1/admin/dashboard/ai-insight?from=2026-11-01&to=2026-11-08');

        $res->assertStatus(200)
            ->assertJsonPath('data.based_on_total', 4)
            ->assertJsonPath('data.period.from', '2026-11-01')
            ->assertJsonPath('data.period.to', '2026-11-08')
            ->assertJsonCount(3, 'data.bullets');

        $bullets = $res->json('data.bullets');
        $this->assertStringContainsString('Jalan Rusak mendominasi: 3 laporan (75%)', $bullets[0]);
        $this->assertStringContainsString('1 laporan masih dalam alur penanganan', $bullets[1]);
        $this->assertStringContainsString('2 laporan telah selesai (50%)', $bullets[2]);

        $this->assertDatabaseCount('ai_insights', 1);
    }

    public function test_dashboard_ai_insight_regenerate_forces_new_generation(): void
    {
        config([
            'services.gemini.api_key' => 'test-key',
            'services.gemini.model'   => 'gemini-test',
        ]);

        $this->createSampleReport('ADU-001', ReportStatus::SELESAI, Category::JALAN_RUSAK, '2026-11-08T10:00:00+07:00');

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'bullets' => [
                                            'Poin AI 1 dari Gemini.',
                                            'Poin AI 2 dari Gemini.',
                                            'Poin AI 3 dari Gemini.',
                                        ],
                                    ]),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $res = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson('/api/v1/admin/dashboard/ai-insight/regenerate', [
                'from' => '2026-11-01',
                'to'   => '2026-11-08',
            ]);

        $res->assertStatus(200)
            ->assertJsonPath('data.bullets.0', 'Poin AI 1 dari Gemini.')
            ->assertJsonPath('data.based_on_total', 1);
    }

    private function createSampleReport(
        string $ticketId,
        ReportStatus $status,
        ?Category $category,
        string $createdAt
    ): Report {
        return Report::create([
            'ticket_id'   => $ticketId,
            'title'       => "Laporan {$ticketId}",
            'description' => "Deskripsi laporan {$ticketId} untuk pengujian dashboard.",
            'photo_path'  => "reports/{$ticketId}.jpg",
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'status'      => $status,
            'category'    => $category,
            'urgency'     => Urgency::SEDANG,
            'ai_status'   => 'done',
            'created_at'  => Carbon::parse($createdAt),
            'updated_at'  => Carbon::parse($createdAt),
        ]);
    }
}
