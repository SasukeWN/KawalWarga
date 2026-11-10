<?php

namespace Tests\Feature;

use App\Enums\Category;
use App\Enums\ReportStatus;
use App\Enums\Role;
use App\Enums\Urgency;
use App\Models\Report;
use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OfficerReportTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $budi;

    protected User $otherOfficer;

    protected string $adminToken;

    protected string $budiToken;

    protected string $otherOfficerToken;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.url' => 'http://localhost:8000']);
        $this->seed(UserSeeder::class);

        $this->admin = User::where('email', 'admin@kawalwarga.test')->firstOrFail();
        $this->budi  = User::where('email', 'budi@kawalwarga.test')->firstOrFail();

        $this->otherOfficer = User::create([
            'name'     => 'Andi Pratama',
            'email'    => 'andi@kawalwarga.test',
            'password' => Hash::make('password123'),
            'role'     => Role::PETUGAS->value,
            'position' => 'Petugas lapangan',
        ]);

        $this->adminToken        = $this->admin->createToken('admin')->plainTextToken;
        $this->budiToken         = $this->budi->createToken('budi')->plainTextToken;
        $this->otherOfficerToken = $this->otherOfficer->createToken('andi')->plainTextToken;
    }

    public function test_officer_queue_orders_by_urgency_weight_then_oldest_verified_at(): void
    {
        // 1. Urgensi tinggi, diverifikasi pukul 08:00
        Report::create([
            'ticket_id'   => 'ADU-192',
            'title'       => 'Sampah menghalangi jalan',
            'description' => 'Sampah di Jl. Anggrek.',
            'photo_path'  => 'reports/192.jpg',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'status'      => ReportStatus::MENUNGGU_PENANGANAN,
            'category'    => Category::SAMPAH,
            'urgency'     => Urgency::TINGGI,
            'ai_status'   => 'done',
            'verified_by' => $this->admin->id,
            'verified_at' => Carbon::parse('2026-11-08T08:00:00+07:00'),
        ]);

        // 2. Urgensi darurat, diverifikasi pukul 09:00
        Report::create([
            'ticket_id'   => 'ADU-198',
            'title'       => 'Lubang jalan membesar, rawan kecelakaan',
            'description' => 'Lubang besar di Jl. Melati.',
            'photo_path'  => 'reports/198.jpg',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'status'      => ReportStatus::MENUNGGU_PENANGANAN,
            'category'    => Category::JALAN_RUSAK,
            'urgency'     => Urgency::DARURAT,
            'ai_status'   => 'done',
            'verified_by' => $this->admin->id,
            'verified_at' => Carbon::parse('2026-11-08T09:00:00+07:00'),
        ]);

        // 3. Urgensi tinggi, diverifikasi lebih lama (pukul 07:00)
        Report::create([
            'ticket_id'   => 'ADU-187',
            'title'       => 'Lampu jalan padam',
            'description' => 'Lampu padam di Jl. Mawar.',
            'photo_path'  => 'reports/187.jpg',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'status'      => ReportStatus::MENUNGGU_PENANGANAN,
            'category'    => Category::LAMPU_MATI,
            'urgency'     => Urgency::TINGGI,
            'ai_status'   => 'done',
            'verified_by' => $this->admin->id,
            'verified_at' => Carbon::parse('2026-11-08T07:00:00+07:00'),
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->budiToken)
            ->getJson('/api/v1/officer/queue');

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 6)
            ->assertJsonPath('data.0.ticket_id', 'ADU-198') // darurat dulu
            ->assertJsonPath('data.1.ticket_id', 'ADU-187') // tinggi yang lebih lama menunggu
            ->assertJsonPath('data.2.ticket_id', 'ADU-192');
    }

    public function test_take_report_is_atomic_and_second_take_returns_409(): void
    {
        Report::create([
            'ticket_id'   => 'ADU-198',
            'title'       => 'Lubang jalan membesar',
            'description' => 'Lubang besar di Jl. Melati.',
            'photo_path'  => 'reports/198.jpg',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'status'      => ReportStatus::MENUNGGU_PENANGANAN,
            'category'    => Category::JALAN_RUSAK,
            'urgency'     => Urgency::DARURAT,
            'ai_status'   => 'done',
            'verified_by' => $this->admin->id,
            'verified_at' => now()->subHour(),
        ]);

        // Budi mengambil laporan -> 200
        $res1 = $this->withHeader('Authorization', 'Bearer '.$this->budiToken)
            ->postJson('/api/v1/officer/reports/ADU-198/take');

        $res1->assertStatus(200)
            ->assertJsonPath('data.status', 'diproses')
            ->assertJsonPath('data.handler.name', 'Budi Santoso')
            ->assertJsonPath('data.timeline.0.event', 'taken');

        // Detail petugas tidak punya ai atau reporter
        $this->assertArrayNotHasKey('ai', $res1->json('data'));
        $this->assertArrayNotHasKey('reporter', $res1->json('data'));

        $this->app['auth']->forgetGuards();

        // Petugas lain (Andi) mencoba mengambil laporan yang sama -> 409
        $this->withHeader('Authorization', 'Bearer '.$this->otherOfficerToken)
            ->postJson('/api/v1/officer/reports/ADU-198/take')
            ->assertStatus(409)
            ->assertJson([
                'success' => false,
                'message' => 'Laporan sudah diambil petugas lain.',
            ]);
    }

    public function test_other_officer_cannot_view_progress_or_complete_taken_report_and_unverified_returns_404(): void
    {
        $takenReport = Report::create([
            'ticket_id'   => 'ADU-198',
            'title'       => 'Lubang jalan membesar',
            'description' => 'Lubang besar di Jl. Melati.',
            'photo_path'  => 'reports/198.jpg',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'status'      => ReportStatus::DIPROSES,
            'category'    => Category::JALAN_RUSAK,
            'urgency'     => Urgency::DARURAT,
            'ai_status'   => 'done',
            'verified_by' => $this->admin->id,
            'verified_at' => now()->subHours(2),
            'handler_id'  => $this->budi->id,
            'taken_at'    => now()->subHour(),
        ]);

        $unverified = Report::create([
            'ticket_id'   => 'ADU-204',
            'title'       => 'Laporan belum diverifikasi',
            'description' => 'Deskripsi laporan belum diverifikasi.',
            'photo_path'  => 'reports/204.jpg',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'status'      => ReportStatus::MENUNGGU_VERIFIKASI,
            'ai_status'   => 'done',
        ]);

        // Laporan menunggu_verifikasi -> 404 bagi petugas
        $this->withHeader('Authorization', 'Bearer '.$this->budiToken)
            ->getJson('/api/v1/officer/reports/ADU-204')
            ->assertStatus(404);

        $this->app['auth']->forgetGuards();

        // Andi melihat detail laporan milik Budi -> 403
        $this->withHeader('Authorization', 'Bearer '.$this->otherOfficerToken)
            ->getJson('/api/v1/officer/reports/ADU-198')
            ->assertStatus(403);

        // Andi mengirim progress ke laporan milik Budi -> 403
        $this->withHeader('Authorization', 'Bearer '.$this->otherOfficerToken)
            ->postJson('/api/v1/officer/reports/ADU-198/progress', [
                'note' => 'Mencoba update laporan petugas lain.',
            ])
            ->assertStatus(403);

        // Andi mencoba menyelesaikan laporan milik Budi -> 403
        Storage::fake('uploads');
        $this->withHeader('Authorization', 'Bearer '.$this->otherOfficerToken)
            ->post('/api/v1/officer/reports/ADU-198/complete', [
                'notes' => 'Mencoba menyelesaikan laporan petugas lain.',
                'photo' => UploadedFile::fake()->image('bukti.jpg'),
            ])
            ->assertStatus(403);

        // Budi mencoba complete tanpa foto -> 422
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$this->budiToken)
            ->postJson('/api/v1/officer/reports/ADU-198/complete', [
                'notes' => 'Catatan penyelesaian valid lebih dari sepuluh karakter.',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['photo']);
    }

    public function test_full_end_to_end_workflow_submit_approve_take_progress_complete_and_track(): void
    {
        Storage::fake('uploads');

        // 1. Warga kirim laporan
        $submitRes = $this->post('/api/v1/reports', [
            'description'    => 'Ada lubang cukup dalam di depan Jl. Melati No. 12 yang membahayakan warga.',
            'latitude'       => -6.2088,
            'longitude'      => 106.8456,
            'address_text'   => 'Jl. Melati No. 12',
            'photo'          => UploadedFile::fake()->image('sebelum.jpg', 800, 600),
            'reporter_phone' => '081234567890',
        ]);
        $submitRes->assertStatus(201);
        $ticketId = $submitRes->json('data.ticket_id');

        // 2. Admin setujui laporan
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson("/api/v1/admin/reports/{$ticketId}/approve", [
                'category' => 'jalan_rusak',
                'urgency'  => 'darurat',
                'note'     => 'Segera amankan lokasi dan lakukan penambalan.',
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'menunggu_penanganan');

        // 3. Petugas Budi ambil laporan
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$this->budiToken)
            ->postJson("/api/v1/officer/reports/{$ticketId}/take")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'diproses');

        // Muncul di my-reports Budi
        $this->withHeader('Authorization', 'Bearer '.$this->budiToken)
            ->getJson('/api/v1/officer/my-reports?status=diproses')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.ticket_id', $ticketId);

        // 4. Petugas Budi kirim progres
        $this->withHeader('Authorization', 'Bearer '.$this->budiToken)
            ->postJson("/api/v1/officer/reports/{$ticketId}/progress", [
                'note' => 'Material aspal dingin sudah disiapkan di lokasi.',
            ])
            ->assertStatus(200);

        // 5. Petugas Budi selesaikan laporan dengan foto bukti
        $completeRes = $this->withHeader('Authorization', 'Bearer '.$this->budiToken)
            ->post("/api/v1/officer/reports/{$ticketId}/complete", [
                'notes' => 'Lubang jalan sudah ditambal dengan aspal dingin dan dipadatkan.',
                'photo' => UploadedFile::fake()->image('sesudah.jpg', 800, 600),
            ]);

        $completeRes->assertStatus(200)
            ->assertJsonPath('data.status', 'selesai')
            ->assertJsonPath('data.completion.notes', 'Lubang jalan sudah ditambal dengan aspal dingin dan dipadatkan.')
            ->assertJsonPath('data.completion.completed_by.name', 'Budi Santoso');

        // 6. Warga melacak laporan -> status selesai, latest_update & completion tampil lengkap
        $trackRes = $this->getJson("/api/v1/reports/track/{$ticketId}");
        $trackRes->assertStatus(200)
            ->assertJsonPath('data.status', 'selesai')
            ->assertJsonPath('data.status_label', 'Selesai')
            ->assertJsonPath('data.latest_update.note', 'Material aspal dingin sudah disiapkan di lokasi.')
            ->assertJsonPath('data.completion.notes', 'Lubang jalan sudah ditambal dengan aspal dingin dan dipadatkan.')
            ->assertJsonPath('data.timeline.0.event', 'completed');

        $this->assertCount(5, $trackRes->json('data.timeline'));
    }

    public function test_officer_queue_and_my_reports_can_filter_by_ticket_urgency_and_category(): void
    {
        Report::create([
            'ticket_id'   => 'ADU-101',
            'title'       => 'Jalan berlubang besar',
            'description' => 'Kerusakan jalan parah.',
            'photo_path'  => 'reports/101.jpg',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'status'      => ReportStatus::MENUNGGU_PENANGANAN,
            'category'    => Category::JALAN_RUSAK,
            'urgency'     => Urgency::DARURAT,
            'ai_status'   => 'done',
            'verified_by' => $this->admin->id,
            'verified_at' => now()->subHours(2),
        ]);

        Report::create([
            'ticket_id'   => 'ADU-102',
            'title'       => 'Sampah menumpuk',
            'description' => 'Sampah bau.',
            'photo_path'  => 'reports/102.jpg',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'status'      => ReportStatus::MENUNGGU_PENANGANAN,
            'category'    => Category::SAMPAH,
            'urgency'     => Urgency::SEDANG,
            'ai_status'   => 'done',
            'verified_by' => $this->admin->id,
            'verified_at' => now()->subHour(),
        ]);

        Report::create([
            'ticket_id'   => 'ADU-103',
            'title'       => 'Lampu mati di taman',
            'description' => 'Lampu taman gelap gulita.',
            'photo_path'  => 'reports/103.jpg',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'status'      => ReportStatus::DIPROSES,
            'category'    => Category::LAMPU_MATI,
            'urgency'     => Urgency::TINGGI,
            'ai_status'   => 'done',
            'handler_id'  => $this->budi->id,
            'taken_at'    => now()->subMinutes(30),
        ]);

        // 1. Filter queue by search ticket
        $this->withHeader('Authorization', 'Bearer '.$this->budiToken)
            ->getJson('/api/v1/officer/queue?search=101')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.ticket_id', 'ADU-101');

        // 2. Filter queue by category
        $this->withHeader('Authorization', 'Bearer '.$this->budiToken)
            ->getJson('/api/v1/officer/queue?category=sampah')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.ticket_id', 'ADU-102');

        // 3. Filter queue by urgency
        $this->withHeader('Authorization', 'Bearer '.$this->budiToken)
            ->getJson('/api/v1/officer/queue?urgency=darurat')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.ticket_id', 'ADU-101');

        // 4. Filter my-reports by search ticket
        $this->withHeader('Authorization', 'Bearer '.$this->budiToken)
            ->getJson('/api/v1/officer/my-reports?search=ADU-103')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.ticket_id', 'ADU-103');

        // 5. Filter my-reports by category
        $this->withHeader('Authorization', 'Bearer '.$this->budiToken)
            ->getJson('/api/v1/officer/my-reports?category=lampu_mati')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.ticket_id', 'ADU-103');

        // 6. Filter my-reports by urgency
        $this->withHeader('Authorization', 'Bearer '.$this->budiToken)
            ->getJson('/api/v1/officer/my-reports?urgency=tinggi')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.ticket_id', 'ADU-103');
    }
}
