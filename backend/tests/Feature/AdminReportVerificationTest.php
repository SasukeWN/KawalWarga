<?php

namespace Tests\Feature;

use App\Enums\Category;
use App\Enums\EventType;
use App\Enums\ReportStatus;
use App\Enums\Urgency;
use App\Models\Report;
use App\Models\ReportDuplicate;
use App\Models\ReportEvent;
use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AdminReportVerificationTest extends TestCase
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
        $this->adminToken   = $this->admin->createToken('admin')->plainTextToken;
        $this->officerToken = $this->officer->createToken('officer')->plainTextToken;
    }

    public function test_admin_reports_list_supports_filters_search_sorting_and_pagination(): void
    {
        Report::create([
            'ticket_id'    => 'ADU-198',
            'title'        => 'Lubang jalan membesar',
            'description'  => 'Lubang jalan membesar di Jl. Melati.',
            'photo_path'   => 'reports/198.jpg',
            'latitude'     => -6.2088,
            'longitude'    => 106.8456,
            'address_text' => 'Jl. Melati No. 14',
            'status'       => ReportStatus::MENUNGGU_PENANGANAN,
            'category'     => Category::JALAN_RUSAK,
            'urgency'      => Urgency::DARURAT,
            'ai_status'    => 'done',
            'created_at'   => Carbon::parse('2026-11-06T10:00:00+07:00'),
        ]);

        Report::create([
            'ticket_id'    => 'ADU-204',
            'title'        => 'Jalan berlubang di Jl. Melati',
            'description'  => 'Ada lubang cukup dalam di depan Jl. Melati No. 12.',
            'photo_path'   => 'reports/204.jpg',
            'latitude'     => -6.2089,
            'longitude'    => 106.8457,
            'address_text' => 'Jl. Melati No. 12',
            'status'       => ReportStatus::MENUNGGU_VERIFIKASI,
            'category'     => Category::JALAN_RUSAK,
            'urgency'      => Urgency::TINGGI,
            'ai_status'    => 'done',
            'created_at'   => Carbon::parse('2026-11-08T10:42:00+07:00'),
        ]);

        Report::create([
            'ticket_id'    => 'ADU-192',
            'title'        => 'Sampah menghalangi jalan',
            'description'  => 'Sampah menumpuk di Jl. Anggrek.',
            'photo_path'   => 'reports/192.jpg',
            'latitude'     => -6.2100,
            'longitude'    => 106.8460,
            'address_text' => 'Jl. Anggrek No. 6',
            'status'       => ReportStatus::MENUNGGU_VERIFIKASI,
            'category'     => Category::SAMPAH,
            'urgency'      => Urgency::RENDAH,
            'ai_status'    => 'done',
            'created_at'   => Carbon::parse('2026-11-07T09:00:00+07:00'),
        ]);

        // 1. Sort urgency (darurat -> tinggi -> rendah)
        $resSort = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->getJson('/api/v1/admin/reports?sort=urgency');

        $resSort->assertStatus(200)
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('data.0.ticket_id', 'ADU-198')
            ->assertJsonPath('data.1.ticket_id', 'ADU-204')
            ->assertJsonPath('data.2.ticket_id', 'ADU-192');

        // 2. Search "#adu-204"
        $resSearch = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->getJson('/api/v1/admin/reports?search='.urlencode('#adu-204'));

        $resSearch->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.ticket_id', 'ADU-204')
            ->assertJsonPath('data.0.category_label', 'Jalan Rusak')
            ->assertJsonPath('data.0.urgency_label', 'Tinggi');

        // 3. Filter status & category
        $resFilter = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->getJson('/api/v1/admin/reports?status=menunggu_verifikasi&category=sampah');

        $resFilter->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.ticket_id', 'ADU-192');
    }

    public function test_admin_report_detail_returns_reporter_phone_and_ai_duplicates(): void
    {
        $dupTarget = Report::create([
            'ticket_id'   => 'ADU-198',
            'title'       => 'Lubang jalan membesar, rawan kecelakaan',
            'description' => 'Lubang besar di Jl. Melati.',
            'photo_path'  => 'reports/198.jpg',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'status'      => ReportStatus::MENUNGGU_PENANGANAN,
            'ai_status'   => 'done',
        ]);

        $report = Report::create([
            'ticket_id'      => 'ADU-204',
            'title'          => 'Jalan berlubang di Jl. Melati',
            'description'    => 'Ada lubang cukup dalam di depan Jl. Melati No. 12.',
            'photo_path'     => 'reports/204.jpg',
            'latitude'       => -6.2088,
            'longitude'      => 106.8456,
            'address_text'   => 'Jl. Melati No. 12, Kel. Sukamaju, Kota Harmoni',
            'reporter_phone' => '6281234567890',
            'status'         => ReportStatus::MENUNGGU_VERIFIKASI,
            'category'       => Category::JALAN_RUSAK,
            'urgency'        => Urgency::TINGGI,
            'ai_status'      => 'done',
            'ai_category'    => Category::JALAN_RUSAK,
            'ai_urgency'     => Urgency::TINGGI,
            'ai_summary'     => 'Lubang jalan di kawasan permukiman berisiko bagi pengendara.',
        ]);

        ReportDuplicate::create([
            'report_id'       => $report->id,
            'duplicate_of_id' => $dupTarget->id,
            'distance_m'      => 50,
            'reason'          => 'Lokasi berdekatan (±50 m) dan membahas masalah yang sama.',
        ]);

        ReportEvent::create([
            'report_id'   => $report->id,
            'event'       => EventType::SUBMITTED,
            'title'       => 'Laporan diterima',
            'description' => 'Laporan masuk dan menunggu verifikasi admin.',
            'created_at'  => Carbon::parse('2026-11-08T10:42:00+07:00'),
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->getJson('/api/v1/admin/reports/%23adu-204');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data'    => [
                    'ticket_id' => 'ADU-204',
                    'reporter'  => ['phone' => '6281234567890'],
                    'ai'        => [
                        'status'     => 'done',
                        'category'   => 'jalan_rusak',
                        'urgency'    => 'tinggi',
                        'duplicates' => [
                            [
                                'ticket_id'  => 'ADU-198',
                                'title'      => 'Lubang jalan membesar, rawan kecelakaan',
                                'distance_m' => 50,
                            ],
                        ],
                    ],
                    'verification' => null,
                    'rejection'    => null,
                    'handler'      => null,
                    'completion'   => null,
                ],
            ]);
    }

    public function test_approve_report_succeeds_updates_public_tracking_and_second_approve_returns_409(): void
    {
        $report = Report::create([
            'ticket_id'   => 'ADU-204',
            'title'       => 'Jalan berlubang di Jl. Melati',
            'description' => 'Ada lubang cukup dalam di depan Jl. Melati No. 12.',
            'photo_path'  => 'reports/204.jpg',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'status'      => ReportStatus::MENUNGGU_VERIFIKASI,
            'category'    => Category::JALAN_RUSAK,
            'urgency'     => Urgency::TINGGI,
            'ai_status'   => 'done',
        ]);

        ReportEvent::create([
            'report_id'   => $report->id,
            'event'       => EventType::SUBMITTED,
            'title'       => 'Laporan diterima',
            'description' => 'Laporan masuk dan menunggu verifikasi admin.',
            'created_at'  => now()->subMinutes(10),
        ]);

        $resApprove = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson('/api/v1/admin/reports/ADU-204/approve', [
                'category' => 'jalan_rusak',
                'urgency'  => 'darurat',
                'note'     => 'Kerusakan mengganggu akses kendaraan. Amankan area terlebih dahulu.',
            ]);

        $resApprove->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data'    => [
                    'ticket_id'    => 'ADU-204',
                    'status'       => 'menunggu_penanganan',
                    'status_label' => 'Menunggu Penanganan',
                    'category'     => 'jalan_rusak',
                    'urgency'      => 'darurat',
                    'verification' => [
                        'category'    => 'jalan_rusak',
                        'urgency'     => 'darurat',
                        'note'        => 'Kerusakan mengganggu akses kendaraan. Amankan area terlebih dahulu.',
                        'verified_by' => [
                            'name'     => 'Nadia Putri',
                            'position' => 'Admin verifikator',
                        ],
                    ],
                ],
            ]);

        // Terlihat di endpoint publik lacak laporan
        $this->getJson('/api/v1/reports/track/ADU-204')
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'menunggu_penanganan')
            ->assertJsonPath('data.category', 'jalan_rusak')
            ->assertJsonPath('data.category_label', 'Jalan Rusak')
            ->assertJsonPath('data.timeline.0.event', 'verified');

        // Approve kedua kali -> 409 Conflict
        $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson('/api/v1/admin/reports/ADU-204/approve', [
                'category' => 'jalan_rusak',
                'urgency'  => 'darurat',
            ])
            ->assertStatus(409)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_reject_report_requires_reason_and_updates_status_to_ditolak(): void
    {
        $report = Report::create([
            'ticket_id'   => 'ADU-183',
            'title'       => 'Sampah di luar wilayah',
            'description' => 'Tumpukan sampah di luar wilayah.',
            'photo_path'  => 'reports/183.jpg',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'status'      => ReportStatus::MENUNGGU_VERIFIKASI,
            'ai_status'   => 'done',
        ]);

        // Tanpa alasan -> 422
        $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson('/api/v1/admin/reports/ADU-183/reject', [
                'reason' => 'Pendek',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);

        // Dengan alasan valid -> 200 ditolak
        $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson('/api/v1/admin/reports/ADU-183/reject', [
                'reason' => 'Lokasi kejadian berada di luar wilayah layanan instansi.',
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'ditolak')
            ->assertJsonPath('data.rejection.reason', 'Lokasi kejadian berada di luar wilayah layanan instansi.')
            ->assertJsonPath('data.rejection.decided_by.name', 'Nadia Putri');

        // Reject kedua kali -> 409
        $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson('/api/v1/admin/reports/ADU-183/reject', [
                'reason' => 'Lokasi kejadian berada di luar wilayah layanan instansi.',
            ])
            ->assertStatus(409);
    }

    public function test_non_admin_cannot_access_admin_report_endpoints(): void
    {
        $this->withHeader('Authorization', 'Bearer '.$this->officerToken)
            ->getJson('/api/v1/admin/reports')
            ->assertStatus(403)
            ->assertJson([
                'success' => false,
            ]);
    }
}
