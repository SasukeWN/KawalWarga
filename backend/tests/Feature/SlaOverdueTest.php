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
use Tests\TestCase;

class SlaOverdueTest extends TestCase
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

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_urgency_enum_returns_correct_sla_values(): void
    {
        $this->assertSame(24, Urgency::DARURAT->slaHours());
        $this->assertSame(1, Urgency::DARURAT->slaDays());
        $this->assertSame('24 Jam', Urgency::DARURAT->slaLabel());

        $this->assertSame(72, Urgency::TINGGI->slaHours());
        $this->assertSame(3, Urgency::TINGGI->slaDays());
        $this->assertSame('3 Hari', Urgency::TINGGI->slaLabel());

        $this->assertSame(168, Urgency::SEDANG->slaHours());
        $this->assertSame(7, Urgency::SEDANG->slaDays());
        $this->assertSame('7 Hari', Urgency::SEDANG->slaLabel());

        $this->assertSame(336, Urgency::RENDAH->slaHours());
        $this->assertSame(14, Urgency::RENDAH->slaDays());
        $this->assertSame('14 Hari', Urgency::RENDAH->slaLabel());
    }

    public function test_report_model_sla_attributes_and_overdue_logic(): void
    {
        Carbon::setTestNow('2026-11-10 12:00:00');

        $created = Carbon::parse('2026-11-09 10:00:00');

        // Darurat: target 24 jam. Deadline: 2026-11-10 10:00:00.
        // Pada jam 12:00:00 (2 jam lewat deadline) -> is_overdue true.
        $report = Report::create([
            'ticket_id'   => 'ADU-991',
            'title'       => 'Pohon Tumbang Darurat',
            'description' => 'Menghalangi jalan utama',
            'photo_path'  => 'reports/sla1.jpg',
            'latitude'    => -6.2,
            'longitude'   => 106.8,
            'status'      => ReportStatus::MENUNGGU_PENANGANAN,
            'category'    => Category::JALAN_RUSAK,
            'urgency'     => Urgency::DARURAT,
            'created_at'  => $created,
            'updated_at'  => $created,
        ]);

        $this->assertSame(24, $report->sla_target_hours);
        $this->assertSame('24 Jam', $report->sla_target_label);
        $this->assertSame('2026-11-10T10:00:00+07:00', $report->sla_deadline->toIso8601String());
        $this->assertTrue($report->is_overdue);

        // Jika urgensi diubah ke Sedang (168 jam = 7 hari):
        // Deadline jadi 2026-11-16 -> belum overdue
        $report->update(['urgency' => Urgency::SEDANG]);
        $report->refresh();
        $this->assertSame(168, $report->sla_target_hours);
        $this->assertSame('7 Hari', $report->sla_target_label);
        $this->assertFalse($report->is_overdue);

        // Jika status ditolak -> tidak pernah overdue
        $report->update([
            'urgency' => Urgency::DARURAT,
            'status'  => ReportStatus::DITOLAK,
        ]);
        $report->refresh();
        $this->assertFalse($report->is_overdue);

        // Jika status selesai tepat waktu (diselesaikan 2026-11-09 18:00, deadline 2026-11-10 10:00)
        $report->update([
            'status'       => ReportStatus::SELESAI,
            'completed_at' => Carbon::parse('2026-11-09 18:00:00'),
        ]);
        $report->refresh();
        $this->assertFalse($report->is_overdue);

        // Jika status selesai terlambat (diselesaikan 2026-11-10 15:00, deadline 2026-11-10 10:00)
        $report->update([
            'completed_at' => Carbon::parse('2026-11-10 15:00:00'),
        ]);
        $report->refresh();
        $this->assertTrue($report->is_overdue);
    }

    public function test_admin_api_resources_contain_sla_and_overdue_fields(): void
    {
        Carbon::setTestNow('2026-11-10 12:00:00');

        Report::create([
            'ticket_id'   => 'ADU-992',
            'title'       => 'Lampu Merah Padam',
            'description' => 'Simpang padat kendaraan',
            'photo_path'  => 'reports/sla2.jpg',
            'latitude'    => -6.2,
            'longitude'   => 106.8,
            'status'      => ReportStatus::MENUNGGU_PENANGANAN,
            'category'    => Category::LAMPU_MATI,
            'urgency'     => Urgency::DARURAT,
            'verified_at' => Carbon::parse('2026-11-08 10:00:00'),
            'created_at'  => Carbon::parse('2026-11-08 09:00:00'),
            'updated_at'  => Carbon::parse('2026-11-08 09:00:00'),
        ]);

        // 1. Admin Report List API
        $adminListRes = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->getJson('/api/v1/admin/reports');

        $adminListRes->assertStatus(200)
            ->assertJsonPath('data.0.ticket_id', 'ADU-992')
            ->assertJsonPath('data.0.is_overdue', true)
            ->assertJsonPath('data.0.sla_target_hours', 24)
            ->assertJsonPath('data.0.sla_target_label', '24 Jam');

        // 2. Admin Report Detail API
        $adminDetailRes = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->getJson('/api/v1/admin/reports/ADU-992');

        $adminDetailRes->assertStatus(200)
            ->assertJsonPath('data.is_overdue', true)
            ->assertJsonPath('data.sla.target_hours', 24)
            ->assertJsonPath('data.sla.target_label', '24 Jam')
            ->assertJsonPath('data.sla.is_overdue', true);
    }

    public function test_officer_api_resources_contain_sla_and_overdue_fields(): void
    {
        Carbon::setTestNow('2026-11-10 12:00:00');

        Report::create([
            'ticket_id'   => 'ADU-993',
            'title'       => 'Pipa Air Bocor',
            'description' => 'Genangan air di jalan',
            'photo_path'  => 'reports/sla3.jpg',
            'latitude'    => -6.2,
            'longitude'   => 106.8,
            'status'      => ReportStatus::MENUNGGU_PENANGANAN,
            'category'    => Category::JALAN_RUSAK,
            'urgency'     => Urgency::DARURAT,
            'verified_at' => Carbon::parse('2026-11-08 10:00:00'),
            'created_at'  => Carbon::parse('2026-11-08 09:00:00'),
            'updated_at'  => Carbon::parse('2026-11-08 09:00:00'),
        ]);

        // 1. Officer Queue API
        $officerListRes = $this->withHeader('Authorization', 'Bearer '.$this->officerToken)
            ->getJson('/api/v1/officer/queue');

        $officerListRes->assertStatus(200)
            ->assertJsonPath('data.0.ticket_id', 'ADU-993')
            ->assertJsonPath('data.0.is_overdue', true)
            ->assertJsonPath('data.0.sla_target_hours', 24)
            ->assertJsonPath('data.0.sla_target_label', '24 Jam');

        // 2. Officer Report Detail API
        $officerDetailRes = $this->withHeader('Authorization', 'Bearer '.$this->officerToken)
            ->getJson('/api/v1/officer/reports/ADU-993');

        $officerDetailRes->assertStatus(200)
            ->assertJsonPath('data.is_overdue', true)
            ->assertJsonPath('data.sla.target_hours', 24)
            ->assertJsonPath('data.sla.is_overdue', true);
    }
}
