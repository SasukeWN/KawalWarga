<?php

namespace Tests\Feature;

use App\Enums\Category;
use App\Enums\EventType;
use App\Enums\ReportStatus;
use App\Enums\Urgency;
use App\Models\Report;
use App\Models\ReportEvent;
use App\Services\Ai\ChatbotService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpClientRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ChatbotTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.gemini.api_key' => 'test-gemini-key',
            'services.gemini.model'   => 'gemini-test-flash',
            'services.gemini.timeout' => 12,
        ]);
    }

    public function test_chatbot_extracts_ticket_id_returns_ticket_card_and_never_sends_phone(): void
    {
        $report = Report::create([
            'ticket_id'      => 'ADU-891',
            'title'          => 'Jalan berlubang di Jl. Melati',
            'description'    => 'Ada lubang cukup dalam di depan Jl. Melati No. 12.',
            'photo_path'     => 'reports/891.jpg',
            'latitude'       => -6.2088,
            'longitude'      => 106.8456,
            'address_text'   => 'Jl. Melati No. 12',
            'reporter_phone' => '6281234567890',
            'status'         => ReportStatus::DIPROSES,
            'category'       => Category::JALAN_RUSAK,
            'urgency'        => Urgency::DARURAT,
            'ai_status'      => 'done',
        ]);

        ReportEvent::create([
            'report_id'   => $report->id,
            'event'       => EventType::PROGRESS,
            'title'       => 'Pembaruan dari petugas',
            'description' => 'Budi menyiapkan perbaikan jalan di Jl. Melati No. 12.',
            'note'        => 'Budi menyiapkan perbaikan jalan di Jl. Melati No. 12.',
            'created_at'  => now(),
        ]);

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => 'Laporan #ADU-891 sedang ditangani. Budi menyiapkan perbaikan jalan di Jl. Melati No. 12.',
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $response = $this->postJson('/api/v1/chatbot', [
            'message' => 'Cek laporan saya #adu-891',
            'history' => [
                ['role' => 'assistant', 'content' => 'Halo! Kirim ID tiket untuk mengecek laporan Anda.'],
            ],
        ]);

        $response->assertStatus(200)
            ->assertExactJson([
                'success' => true,
                'message' => 'OK',
                'data'    => [
                    'reply'   => 'Laporan #ADU-891 sedang ditangani. Budi menyiapkan perbaikan jalan di Jl. Melati No. 12.',
                    'tickets' => [
                        [
                            'ticket_id'    => 'ADU-891',
                            'title'        => 'Jalan berlubang di Jl. Melati',
                            'status'       => 'diproses',
                            'status_label' => 'Diproses',
                        ],
                    ],
                ],
            ]);

        Http::assertSent(function (HttpClientRequest $req): bool {
            return ! str_contains($req->body(), '6281234567890');
        });
    }

    public function test_chatbot_handles_unknown_ticket_id_gracefully(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => 'Maaf, tiket #ADU-999 tidak ditemukan. Pastikan kembali nomor tiket Anda.',
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $response = $this->postJson('/api/v1/chatbot', [
            'message' => 'Bagaimana status #ADU-999?',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.tickets', [])
            ->assertJsonPath('data.reply', 'Maaf, tiket #ADU-999 tidak ditemukan. Pastikan kembali nomor tiket Anda.');
    }

    public function test_chatbot_phone_lookup_returns_max_3_tickets_and_redacts_phone_from_ai_prompt(): void
    {
        foreach ([1, 2, 3, 4] as $num) {
            Report::create([
                'ticket_id'      => sprintf('ADU-%03d', $num),
                'title'          => "Laporan ke-{$num}",
                'description'    => "Deskripsi rahasia laporan ke-{$num}.",
                'photo_path'     => "reports/{$num}.jpg",
                'latitude'       => -6.2088,
                'longitude'      => 106.8456,
                'reporter_phone' => '6281277778888',
                'status'         => ReportStatus::MENUNGGU_PENANGANAN,
                'ai_status'      => 'done',
                'created_at'     => now()->subMinutes(10 - $num),
            ]);
        }

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                ['text' => 'Berikut 3 laporan terbaru yang ditemukan.'],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $res = $this->postJson('/api/v1/chatbot', [
            'message' => 'Saya lupa ID tiket, nomor WA saya 0812-7777-8888',
        ]);

        $res->assertStatus(200)
            ->assertJsonCount(3, 'data.tickets')
            ->assertJsonPath('data.tickets.0.ticket_id', 'ADU-004')
            ->assertJsonPath('data.tickets.1.ticket_id', 'ADU-003')
            ->assertJsonPath('data.tickets.2.ticket_id', 'ADU-002');

        // Pastikan nomor telepon (baik format 08 maupun 62) TIDAK PERNAH ada di prompt ke AI
        Http::assertSent(function (HttpClientRequest $req): bool {
            $body = $req->body();

            return ! str_contains($body, '0812-7777-8888')
                && ! str_contains($body, '081277778888')
                && ! str_contains($body, '6281277778888')
                && ! str_contains($body, 'Deskripsi rahasia');
        });
    }

    public function test_chatbot_returns_200_with_fallback_reply_and_found_tickets_when_ai_fails(): void
    {
        Report::create([
            'ticket_id'   => 'ADU-204',
            'title'       => 'Jalan berlubang di Jl. Melati',
            'description' => 'Deskripsi jalan berlubang.',
            'photo_path'  => 'reports/204.jpg',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'status'      => ReportStatus::MENUNGGU_VERIFIKASI,
            'ai_status'   => 'done',
        ]);

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response(['error' => 'Unavailable'], 503),
        ]);

        $res = $this->postJson('/api/v1/chatbot', [
            'message' => 'Tolong cek #ADU-204',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('data.reply', ChatbotService::FALLBACK_REPLY)
            ->assertJsonCount(1, 'data.tickets')
            ->assertJsonPath('data.tickets.0.ticket_id', 'ADU-204');
    }

    public function test_chatbot_rejects_history_more_than_6_items_with_422(): void
    {
        $history = array_fill(0, 7, ['role' => 'user', 'content' => 'Halo']);

        $this->postJson('/api/v1/chatbot', [
            'message' => 'Halo asisten',
            'history' => $history,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['history']);
    }
}
