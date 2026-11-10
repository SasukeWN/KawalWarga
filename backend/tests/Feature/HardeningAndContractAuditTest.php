<?php

namespace Tests\Feature;

use App\Enums\Category;
use App\Enums\ReportStatus;
use App\Enums\Urgency;
use App\Models\Report;
use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class HardeningAndContractAuditTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $officer;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.url' => 'http://localhost:8000']);
        $this->seed(UserSeeder::class);

        $this->admin   = User::where('email', 'admin@kawalwarga.test')->firstOrFail();
        $this->officer = User::where('email', 'budi@kawalwarga.test')->firstOrFail();
    }

    public function test_rate_limiters_enforce_limits_on_reports_chatbot_and_login(): void
    {
        Storage::fake('uploads');
        Http::fake([
            '*' => Http::response([
                'candidates' => [
                    ['content' => ['parts' => [['text' => '{"reply":"Halo warga."}']]]],
                ],
            ], 200),
        ]);

        // 1. Rate limit login: 10 req/menit/IP -> ke-11 mendapat 429
        RateLimiter::clear('login');
        for ($i = 1; $i <= 10; $i++) {
            $res = $this->postJson('/api/v1/auth/login', [
                'email'    => 'admin@kawalwarga.test',
                'password' => 'wrong-password',
            ]);
            $this->assertSame(401, $res->status());
        }
        $this->postJson('/api/v1/auth/login', [
            'email'    => 'admin@kawalwarga.test',
            'password' => 'wrong-password',
        ])->assertStatus(429)
            ->assertJson([
                'success' => false,
            ]);

        // 2. Rate limit chatbot: 10 req/menit/IP -> ke-11 mendapat 429
        for ($i = 1; $i <= 10; $i++) {
            $this->postJson('/api/v1/chatbot', [
                'message' => "Pesan ke-{$i}",
            ])->assertStatus(200);
        }
        $this->postJson('/api/v1/chatbot', [
            'message' => 'Pesan ke-11 melebihi batas',
        ])->assertStatus(429)
            ->assertJson([
                'success' => false,
            ]);

        // 3. Rate limit reports: 5 req/menit/IP -> ke-6 mendapat 429
        for ($i = 1; $i <= 5; $i++) {
            $this->postJson('/api/v1/reports', [
                'description' => "Laporan pengujian rate limit nomor ke-{$i} dengan deskripsi cukup panjang.",
                'latitude'    => -6.2088,
                'longitude'   => 106.8456,
                'photo'       => UploadedFile::fake()->image("foto-{$i}.jpg", 300, 300),
            ])->assertStatus(201);
        }
        $this->postJson('/api/v1/reports', [
            'description' => 'Laporan ke-6 dalam satu menit harus ditolak oleh rate limiter.',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'photo'       => UploadedFile::fake()->image('foto-6.jpg', 300, 300),
        ])->assertStatus(429)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_app_debug_false_hides_exception_details_and_stack_trace_on_500(): void
    {
        Route::get('/api/v1/_test_crash_500', function () {
            throw new \RuntimeException('SECRET_INTERNAL_STACK_MESSAGE_999');
        });

        config(['app.debug' => false]);

        $response = $this->getJson('/api/v1/_test_crash_500');

        $response->assertStatus(500)
            ->assertExactJson([
                'success' => false,
                'message' => 'Terjadi kesalahan pada server. Silakan coba lagi.',
            ]);

        $this->assertStringNotContainsString('SECRET_INTERNAL_STACK_MESSAGE_999', $response->getContent());
        $this->assertStringNotContainsString('trace', $response->getContent());
    }

    public function test_list_endpoints_do_not_suffer_from_n_plus_1_queries(): void
    {
        for ($i = 1; $i <= 20; $i++) {
            Report::create([
                'ticket_id'   => sprintf('ADU-%03d', $i),
                'title'       => "Laporan Uji #{$i}",
                'description' => "Deskripsi laporan uji ke-{$i} yang cukup panjang.",
                'photo_path'  => "reports/test-{$i}.jpg",
                'latitude'    => -6.2088,
                'longitude'   => 106.8456,
                'status'      => $i <= 10 ? ReportStatus::MENUNGGU_PENANGANAN : ReportStatus::DIPROSES,
                'category'    => Category::JALAN_RUSAK,
                'urgency'     => Urgency::TINGGI,
                'ai_status'   => 'done',
                'verified_by' => $this->admin->id,
                'verified_at' => now()->subMinutes(30),
                'handler_id'  => $i <= 10 ? null : $this->officer->id,
                'taken_at'    => $i <= 10 ? null : now()->subMinutes(10),
            ]);
        }

        // 1. GET /admin/reports
        DB::enableQueryLog();
        DB::flushQueryLog();
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/reports?per_page=15')
            ->assertStatus(200);
        $this->assertLessThanOrEqual(4, count(DB::getQueryLog()));

        // 2. GET /officer/queue
        DB::flushQueryLog();
        $this->actingAs($this->officer, 'sanctum')
            ->getJson('/api/v1/officer/queue?per_page=10')
            ->assertStatus(200);
        $this->assertLessThanOrEqual(4, count(DB::getQueryLog()));

        // 3. GET /officer/my-reports
        DB::flushQueryLog();
        $this->actingAs($this->officer, 'sanctum')
            ->getJson('/api/v1/officer/my-reports?per_page=10')
            ->assertStatus(200);
        $this->assertLessThanOrEqual(4, count(DB::getQueryLog()));

        // 4. GET /admin/dashboard/map
        DB::flushQueryLog();
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/dashboard/map')
            ->assertStatus(200);
        $this->assertLessThanOrEqual(3, count(DB::getQueryLog()));
        DB::disableQueryLog();
    }

    public function test_full_end_to_end_workflow_matches_api_contract_v1_1(): void
    {
        Storage::fake('uploads');
        Http::fake([
            '*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'title'                => 'Jalan berlubang di Jl. Melati',
                                        'category'             => 'jalan_rusak',
                                        'urgency'              => 'tinggi',
                                        'summary'              => 'Lubang jalan membahayakan pengendara.',
                                        'duplicate_ticket_ids' => [],
                                    ]),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        // 1. Warga kirim laporan
        $submitRes = $this->postJson('/api/v1/reports', [
            'description'    => 'Ada lubang cukup dalam di depan Jl. Melati No. 12. Saat hujan membahayakan pengendara.',
            'latitude'       => -6.2088,
            'longitude'      => 106.8456,
            'address_text'   => 'Jl. Melati No. 12',
            'reporter_phone' => '081234567890',
            'photo'          => UploadedFile::fake()->image('jalan.jpg', 600, 400),
        ])->assertStatus(201);

        $ticketId = $submitRes->json('data.ticket_id');
        $this->assertSame('ADU-001', $ticketId);

        // 2. Admin approve laporan
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/reports/{$ticketId}/approve", [
                'category' => 'jalan_rusak',
                'urgency'  => 'darurat',
                'note'     => 'Amankan area terlebih dahulu.',
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'menunggu_penanganan')
            ->assertJsonPath('data.verification.urgency', 'darurat');

        // 3. Petugas take laporan
        $this->app['auth']->forgetGuards();
        $this->actingAs($this->officer, 'sanctum')
            ->postJson("/api/v1/officer/reports/{$ticketId}/take")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'diproses')
            ->assertJsonPath('data.handler.name', 'Budi Santoso');

        // 4. Petugas tambah progres
        $this->actingAs($this->officer, 'sanctum')
            ->postJson("/api/v1/officer/reports/{$ticketId}/progress", [
                'note' => 'Material aspal dingin sedang disiapkan di lokasi.',
            ])
            ->assertStatus(200);

        // 5. Warga lacak saat diproses (latest_update tampil, tanpa bocor nomor telepon/AI)
        $trackInProgress = $this->getJson("/api/v1/reports/track/{$ticketId}")
            ->assertStatus(200)
            ->json('data');

        $this->assertSame('diproses', $trackInProgress['status']);
        $this->assertSame('Material aspal dingin sedang disiapkan di lokasi.', $trackInProgress['latest_update']['note']);
        $this->assertArrayNotHasKey('reporter_phone', $trackInProgress);
        $this->assertArrayNotHasKey('ai', $trackInProgress);

        // 6. Petugas selesaikan laporan
        $this->actingAs($this->officer, 'sanctum')
            ->postJson("/api/v1/officer/reports/{$ticketId}/complete", [
                'notes' => 'Lubang jalan sudah ditambal dengan aspal dingin dan dipadatkan.',
                'photo' => UploadedFile::fake()->image('selesai.jpg', 600, 400),
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'selesai')
            ->assertJsonPath('data.completion.notes', 'Lubang jalan sudah ditambal dengan aspal dingin dan dipadatkan.');

        // 7. Warga lacak setelah selesai
        $trackDone = $this->getJson("/api/v1/reports/track/{$ticketId}")
            ->assertStatus(200)
            ->json('data');

        $this->assertSame('selesai', $trackDone['status']);
        $this->assertSame('Selesai', $trackDone['status_label']);
        $this->assertNotNull($trackDone['completion']['photo_url']);
        $this->assertSame('Budi Santoso', $trackDone['completion']['completed_by']['name']);
        $this->assertCount(5, $trackDone['timeline']);
    }

    public function test_submitting_report_when_gemini_api_key_is_empty_or_broken_falls_back_cleanly_with_201_and_ai_failed(): void
    {
        Storage::fake('uploads');
        config([
            'services.gemini.api_key' => '', // API key kosong
            'services.gemini.model'   => 'gemini-test',
        ]);

        $description = 'Jalan berlubang cukup parah di depan balai warga dan belum pernah ditangani.';
        $response = $this->post('/api/v1/reports', [
            'description'    => $description,
            'latitude'       => -6.2088,
            'longitude'      => 106.8456,
            'address_text'   => 'Jl. Warga No. 1',
            'photo'          => UploadedFile::fake()->image('rusak.jpg'),
            'reporter_phone' => '081234567890',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'menunggu_verifikasi');

        $ticketId = $response->json('data.ticket_id');
        $report   = Report::where('ticket_id', $ticketId)->firstOrFail();

        $this->assertSame('failed', $report->ai_status);
        $this->assertSame(mb_substr($description, 0, 60), $report->title);
        $this->assertNull($report->category);
        $this->assertNull($report->urgency);

        // Chatbot juga merespons dengan fallback saat AI mati
        $chatRes = $this->postJson('/api/v1/chatbot', [
            'message' => 'Cek laporan saya ' . $ticketId,
        ]);
        $chatRes->assertStatus(200);
        $this->assertNotEmpty($chatRes->json('data.reply'));
    }

    public function test_concurrent_take_requests_only_one_succeeds_and_other_gets_409(): void
    {
        $report = Report::create([
            'ticket_id'   => 'ADU-777',
            'title'       => 'Tiang lampu tumbang',
            'description' => 'Tiang lampu miring dan hampir tumbang di perempatan jalan.',
            'photo_path'  => 'reports/777.jpg',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'status'      => ReportStatus::MENUNGGU_PENANGANAN,
            'category'    => Category::LAMPU_MATI,
            'urgency'     => Urgency::DARURAT,
            'ai_status'   => 'done',
            'verified_by' => $this->admin->id,
            'verified_at' => now()->subMinutes(15),
        ]);

        $otherOfficer = User::factory()->create([
            'role'     => 'petugas',
            'position' => 'Petugas cadangan',
        ]);

        // Petugas 1 (Budi) mengambil laporan -> Sukses 200
        $res1 = $this->actingAs($this->officer, 'sanctum')
            ->postJson("/api/v1/officer/reports/{$report->ticket_id}/take");

        $res1->assertStatus(200)
            ->assertJsonPath('data.status', 'diproses')
            ->assertJsonPath('data.handler.name', 'Budi Santoso');

        // Petugas 2 (Other) mencoba mengambil laporan yang sama -> 409 Conflict
        $this->app['auth']->forgetGuards();
        $res2 = $this->actingAs($otherOfficer, 'sanctum')
            ->postJson("/api/v1/officer/reports/{$report->ticket_id}/take");

        $res2->assertStatus(409)
            ->assertJson([
                'success' => false,
                'message' => 'Laporan sudah diambil petugas lain.',
            ]);
    }
}
