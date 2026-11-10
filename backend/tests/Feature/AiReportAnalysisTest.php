<?php

namespace Tests\Feature;

use App\Enums\Category;
use App\Enums\ReportStatus;
use App\Enums\Urgency;
use App\Models\Report;
use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpClientRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AiReportAnalysisTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('uploads');
        config([
            'services.gemini.api_key' => 'test-gemini-key',
            'services.gemini.model'   => 'gemini-test-flash',
            'services.gemini.timeout' => 12,
        ]);
    }

    public function test_submit_report_analyzes_with_gemini_detects_duplicates_and_never_sends_phone(): void
    {
        // Buat laporan kandidat duplikat berjarak ~50m dari (-6.2088, 106.8456)
        $existing = Report::create([
            'ticket_id'   => 'ADU-198',
            'title'       => 'Lubang jalan membesar, rawan kecelakaan',
            'description' => 'Lubang besar di depan Jl. Melati No. 14 membahayakan pengendara.',
            'photo_path'  => 'reports/existing.jpg',
            'latitude'    => -6.2084, // ~45 meter
            'longitude'   => 106.8456,
            'status'      => ReportStatus::MENUNGGU_PENANGANAN,
            'category'    => Category::JALAN_RUSAK,
            'urgency'     => Urgency::DARURAT,
            'ai_status'   => 'done',
        ]);

        // Buat laporan lain yang jauh (> 1 km), tidak boleh masuk kandidat
        Report::create([
            'ticket_id'   => 'ADU-150',
            'title'       => 'Laporan jauh',
            'description' => 'Laporan di lokasi jauh.',
            'photo_path'  => 'reports/far.jpg',
            'latitude'    => -6.2500,
            'longitude'   => 106.9000,
            'status'      => ReportStatus::MENUNGGU_PENANGANAN,
            'ai_status'   => 'done',
        ]);

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'title'                => 'Jalan berlubang di Jl. Melati',
                                        'category'             => 'jalan_rusak',
                                        'urgency'              => 'tinggi',
                                        'summary'              => 'Lubang jalan di kawasan permukiman berisiko bagi pengendara saat hujan.',
                                        'duplicate_ticket_ids' => ['#adu-198', 'ADU-150', 'ADU-999'],
                                    ]),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $response = $this->post('/api/v1/reports', [
            'description'    => 'Ada lubang cukup dalam di depan Jl. Melati No. 12 yang tertutup air saat hujan.',
            'latitude'       => -6.2088,
            'longitude'      => 106.8456,
            'address_text'   => 'Jl. Melati No. 12',
            'photo'          => UploadedFile::fake()->image('lubang.jpg', 600, 400),
            'reporter_phone' => '081299998888',
        ]);

        $response->assertStatus(201);

        // Pastikan nomor telepon TIDAK PERNAH dikirim ke Gemini
        Http::assertSent(function (HttpClientRequest $req): bool {
            $body = $req->body();

            return ! str_contains($body, '081299998888')
                && ! str_contains($body, '6281299998888')
                && str_contains($body, 'ADU-198')
                && ! str_contains($body, 'ADU-150');
        });

        $report = Report::where('id', '!=', $existing->id)
            ->where('ticket_id', '!=', 'ADU-150')
            ->firstOrFail();

        $this->assertSame('done', $report->ai_status);
        $this->assertSame('Jalan berlubang di Jl. Melati', $report->title);
        $this->assertSame('jalan_rusak', $report->ai_category);
        $this->assertSame(Urgency::TINGGI, $report->ai_urgency);
        $this->assertSame('jalan_rusak', $report->category);
        $this->assertSame(Urgency::TINGGI, $report->urgency);
        $this->assertSame(
            'Lubang jalan di kawasan permukiman berisiko bagi pengendara saat hujan.',
            $report->ai_summary
        );

        // Hanya ADU-198 yang disimpan di report_duplicates; ADU-150 (jauh) & ADU-999 (tidak ada) dibuang
        $this->assertCount(1, $report->duplicates);
        $dup = $report->duplicates->first();
        $this->assertSame($existing->id, $dup->duplicate_of_id);
        $this->assertGreaterThan(0, $dup->distance_m);
        $this->assertLessThanOrEqual(150, $dup->distance_m);
        $this->assertStringContainsString('Lokasi berdekatan', $dup->reason);
    }

    public function test_invalid_enum_values_and_long_strings_from_ai_are_sanitized(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'title'                => str_repeat('A', 120),
                                        'category'             => 'bencana_alien',
                                        'urgency'              => 'super_kritis',
                                        'summary'              => str_repeat('B', 300),
                                        'duplicate_ticket_ids' => [],
                                    ]),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $this->post('/api/v1/reports', [
            'description' => 'Laporan dengan keluaran enum AI yang tidak dikenal untuk diuji.',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'photo'       => UploadedFile::fake()->image('foto.jpg'),
        ])->assertStatus(201);

        $report = Report::firstOrFail();
        $this->assertSame('done', $report->ai_status);
        $this->assertSame(70, mb_strlen($report->title));
        $this->assertSame(220, mb_strlen((string) $report->ai_summary));
        $this->assertNull($report->ai_category);
        $this->assertNull($report->ai_urgency);
        $this->assertNull($report->category);
        $this->assertNull($report->urgency);
    }

    public function test_gemini_error_429_or_500_falls_back_gracefully_and_still_returns_201(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response(['error' => 'Quota exceeded'], 429),
        ]);

        $description = 'Lampu penerangan jalan umum di depan gang padam total sejak kemarin malam.';

        $this->post('/api/v1/reports', [
            'description' => $description,
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'photo'       => UploadedFile::fake()->image('lampu.jpg'),
        ])->assertStatus(201);

        $report = Report::firstOrFail();
        $this->assertSame('failed', $report->ai_status);
        $this->assertSame(mb_substr($description, 0, 60), $report->title);
        $this->assertNull($report->category);
        $this->assertNull($report->urgency);
    }

    public function test_admin_can_reanalyze_report_via_endpoint(): void
    {
        $this->seed(UserSeeder::class);
        $admin = User::where('email', 'admin@kawalwarga.test')->firstOrFail();
        $token = $admin->createToken('admin')->plainTextToken;

        $report = Report::create([
            'ticket_id'   => 'ADU-204',
            'title'       => 'Judul fallback awal',
            'description' => 'Tumpukan sampah menghalangi jalan warga di Jl. Anggrek.',
            'photo_path'  => 'reports/204.jpg',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'status'      => ReportStatus::MENUNGGU_VERIFIKASI,
            'ai_status'   => 'failed',
        ]);

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'title'                => 'Sampah menghalangi jalan di Jl. Anggrek',
                                        'category'             => 'sampah',
                                        'urgency'              => 'tinggi',
                                        'summary'              => 'Tumpukan sampah mengganggu akses jalan lingkungan.',
                                        'duplicate_ticket_ids' => [],
                                    ]),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $res = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/admin/reports/ADU-204/reanalyze');

        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data'    => [
                    'status'     => 'done',
                    'summary'    => 'Tumpukan sampah mengganggu akses jalan lingkungan.',
                    'category'   => 'sampah',
                    'urgency'    => 'tinggi',
                    'duplicates' => [],
                ],
            ]);
    }
}
