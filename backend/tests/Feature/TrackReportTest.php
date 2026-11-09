<?php

namespace Tests\Feature;

use App\Enums\Category;
use App\Enums\EventType;
use App\Enums\ReportStatus;
use App\Enums\Urgency;
use App\Models\Report;
use App\Models\ReportEvent;
use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TrackReportTest extends TestCase
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

    public function test_track_menunggu_verifikasi_hides_category_and_never_exposes_phone_or_ai(): void
    {
        $report = Report::create([
            'ticket_id'      => 'ADU-204',
            'title'          => 'Jalan berlubang di Jl. Melati',
            'description'    => 'Ada lubang cukup dalam di depan Jl. Melati No. 12.',
            'photo_path'     => 'reports/abc123.jpg',
            'latitude'       => -6.2088,
            'longitude'      => 106.8456,
            'address_text'   => 'Jl. Melati No. 12',
            'reporter_phone' => '6281234567890',
            'status'         => ReportStatus::MENUNGGU_VERIFIKASI,
            'category'       => Category::JALAN_RUSAK, // Rekomendasi awal AI
            'urgency'        => Urgency::TINGGI,
            'ai_status'      => 'done',
            'ai_category'    => Category::JALAN_RUSAK,
            'ai_urgency'     => Urgency::TINGGI,
            'ai_summary'     => 'Ringkasan internal AI.',
        ]);

        ReportEvent::create([
            'report_id'   => $report->id,
            'event'       => EventType::SUBMITTED,
            'title'       => 'Laporan diterima',
            'description' => 'Laporan masuk dan menunggu verifikasi admin.',
            'created_at'  => Carbon::parse('2026-11-08T10:42:00+07:00'),
        ]);

        $response = $this->getJson('/api/v1/reports/track/ADU-204');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'OK',
                'data'    => [
                    'ticket_id'      => 'ADU-204',
                    'title'          => 'Jalan berlubang di Jl. Melati',
                    'status'         => 'menunggu_verifikasi',
                    'status_label'   => 'Menunggu Verifikasi',
                    'category'       => null,
                    'category_label' => null,
                    'latest_update'  => null,
                    'rejection'      => null,
                    'completion'     => null,
                ],
            ]);

        $data = $response->json('data');
        $this->assertArrayNotHasKey('reporter_phone', $data);
        $this->assertArrayNotHasKey('reporter', $data);
        $this->assertArrayNotHasKey('ai', $data);
        $this->assertStringNotContainsString('6281234567890', $response->getContent());
    }

    public function test_track_diproses_returns_effective_category_latest_update_and_newest_first_timeline(): void
    {
        $report = Report::create([
            'ticket_id'    => 'ADU-891',
            'title'        => 'Jalan berlubang di Jl. Melati',
            'description'  => 'Ada lubang cukup dalam di depan Jl. Melati No. 12.',
            'photo_path'   => 'reports/abc123.jpg',
            'latitude'     => -6.2088,
            'longitude'    => 106.8456,
            'address_text' => 'Jl. Melati No. 12, Kel. Sukamaju, Kota Harmoni',
            'status'       => ReportStatus::DIPROSES,
            'category'     => Category::JALAN_RUSAK,
            'urgency'      => Urgency::DARURAT,
            'ai_status'    => 'done',
            'verified_by'  => $this->admin->id,
            'verified_at'  => Carbon::parse('2026-11-08T08:30:00+07:00'),
            'handler_id'   => $this->officer->id,
            'taken_at'     => Carbon::parse('2026-11-08T09:00:00+07:00'),
        ]);

        ReportEvent::create([
            'report_id'   => $report->id,
            'event'       => EventType::SUBMITTED,
            'title'       => 'Laporan diterima',
            'description' => 'Laporan masuk dan menunggu verifikasi admin.',
            'created_at'  => Carbon::parse('2026-11-07T16:40:00+07:00'),
        ]);

        ReportEvent::create([
            'report_id'   => $report->id,
            'event'       => EventType::VERIFIED,
            'title'       => 'Laporan siap ditangani',
            'description' => 'Admin menyetujui laporan. Menunggu Penanganan.',
            'actor_id'    => $this->admin->id,
            'created_at'  => Carbon::parse('2026-11-08T08:30:00+07:00'),
        ]);

        ReportEvent::create([
            'report_id'   => $report->id,
            'event'       => EventType::TAKEN,
            'title'       => 'Petugas mulai menangani',
            'description' => 'Budi Santoso mulai menangani laporan.',
            'actor_id'    => $this->officer->id,
            'created_at'  => Carbon::parse('2026-11-08T09:00:00+07:00'),
        ]);

        ReportEvent::create([
            'report_id'   => $report->id,
            'event'       => EventType::PROGRESS,
            'title'       => 'Pembaruan dari petugas',
            'description' => 'Kami sedang memeriksa kedalaman lubang dan menyiapkan material.',
            'note'        => 'Kami sedang memeriksa kedalaman lubang dan menyiapkan material.',
            'actor_id'    => $this->officer->id,
            'created_at'  => Carbon::parse('2026-11-08T09:15:00+07:00'),
        ]);

        $response = $this->getJson('/api/v1/reports/track/ADU-891');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'OK',
                'data'    => [
                    'ticket_id'      => 'ADU-891',
                    'status'         => 'diproses',
                    'status_label'   => 'Diproses',
                    'category'       => 'jalan_rusak',
                    'category_label' => 'Jalan Rusak',
                    'latest_update'  => [
                        'note'  => 'Kami sedang memeriksa kedalaman lubang dan menyiapkan material.',
                        'actor' => [
                            'name'     => 'Budi Santoso',
                            'position' => 'Petugas lapangan',
                        ],
                        'at'    => '2026-11-08T09:15:00+07:00',
                    ],
                    'rejection'      => null,
                    'completion'     => null,
                ],
            ]);

        $timeline = $response->json('data.timeline');
        $this->assertCount(4, $timeline);
        $this->assertSame('progress', $timeline[0]['event']);
        $this->assertSame('taken', $timeline[1]['event']);
        $this->assertSame('verified', $timeline[2]['event']);
        $this->assertSame('submitted', $timeline[3]['event']);
    }

    public function test_track_selesai_populates_completion_object(): void
    {
        $report = Report::create([
            'ticket_id'             => 'ADU-176',
            'title'                 => 'Perbaikan jalan di Jl. Kenanga',
            'description'           => 'Jalan berlubang di Jl. Kenanga sudah diperbaiki.',
            'photo_path'            => 'reports/before.jpg',
            'latitude'              => -6.2088,
            'longitude'             => 106.8456,
            'address_text'          => 'Jl. Kenanga',
            'status'                => ReportStatus::SELESAI,
            'category'              => Category::JALAN_RUSAK,
            'urgency'               => Urgency::TINGGI,
            'ai_status'             => 'done',
            'handler_id'            => $this->officer->id,
            'completion_notes'      => 'Lubang jalan sudah ditambal dengan aspal dingin dan dipadatkan.',
            'completion_photo_path' => 'completions/after.jpg',
            'completed_at'          => Carbon::parse('2026-11-06T14:10:00+07:00'),
        ]);

        $response = $this->getJson('/api/v1/reports/track/ADU-176');

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'ticket_id'  => 'ADU-176',
                    'status'     => 'selesai',
                    'completion' => [
                        'notes'        => 'Lubang jalan sudah ditambal dengan aspal dingin dan dipadatkan.',
                        'photo_url'    => 'http://localhost:8000/uploads/completions/after.jpg',
                        'completed_by' => [
                            'name'     => 'Budi Santoso',
                            'position' => 'Petugas lapangan',
                        ],
                        'completed_at' => '2026-11-06T14:10:00+07:00',
                    ],
                    'rejection'  => null,
                ],
            ]);
    }

    public function test_track_ditolak_populates_rejection_object(): void
    {
        $report = Report::create([
            'ticket_id'        => 'ADU-183',
            'title'            => 'Sampah di luar wilayah',
            'description'      => 'Tumpukan sampah di perbatasan wilayah.',
            'photo_path'       => 'reports/sampah.jpg',
            'latitude'         => -6.2088,
            'longitude'        => 106.8456,
            'status'           => ReportStatus::DITOLAK,
            'category'         => Category::SAMPAH,
            'ai_status'        => 'done',
            'rejection_reason' => 'Lokasi kejadian berada di luar wilayah layanan instansi.',
            'rejected_by'      => $this->admin->id,
            'rejected_at'      => Carbon::parse('2026-11-06T11:20:00+07:00'),
        ]);

        $response = $this->getJson('/api/v1/reports/track/ADU-183');

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'ticket_id'  => 'ADU-183',
                    'status'     => 'ditolak',
                    'rejection'  => [
                        'reason'     => 'Lokasi kejadian berada di luar wilayah layanan instansi.',
                        'decided_by' => [
                            'name'     => 'Nadia Putri',
                            'position' => 'Admin verifikator',
                        ],
                        'at'         => '2026-11-06T11:20:00+07:00',
                    ],
                    'completion' => null,
                ],
            ]);
    }

    public function test_track_normalizes_ticket_id_variants_and_returns_404_when_not_found(): void
    {
        Report::create([
            'ticket_id'   => 'ADU-204',
            'title'       => 'Jalan berlubang',
            'description' => 'Deskripsi jalan berlubang.',
            'photo_path'  => 'reports/abc.jpg',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'status'      => ReportStatus::MENUNGGU_VERIFIKASI,
            'ai_status'   => 'done',
        ]);

        foreach (['adu-204', '204', 'ADU-0204', '%23adu-204'] as $variant) {
            $this->getJson("/api/v1/reports/track/{$variant}")
                ->assertStatus(200)
                ->assertJsonPath('data.ticket_id', 'ADU-204');
        }

        $this->getJson('/api/v1/reports/track/ADU-999')
            ->assertStatus(404)
            ->assertJson([
                'success' => false,
            ]);

        $this->getJson('/api/v1/reports/track/TIKET-INVALID')
            ->assertStatus(404)
            ->assertJson([
                'success' => false,
            ]);
    }
}
