<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Report;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DemoReportSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_populates_204_demo_reports_special_tickets_and_next_is_adu_205(): void
    {
        Storage::fake('uploads');
        Http::fake([
            '*' => Http::response([], 500),
        ]);

        $this->seed(DatabaseSeeder::class);

        $this->assertSame(204, Report::count());

        $admin = User::where('email', 'admin@kawalwarga.test')->firstOrFail();
        $budi  = User::where('email', 'budi@kawalwarga.test')->firstOrFail();
        $this->assertSame(Role::ADMIN, $admin->role);
        $this->assertSame(Role::PETUGAS, $budi->role);

        // 1. Cek ringkasan dashboard (totals & by_category)
        $summaryRes = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/dashboard/summary')
            ->assertStatus(200);

        $totals = $summaryRes->json('data.totals');
        $this->assertSame(204, $totals['all']);
        $this->assertSame(24, $totals['menunggu_verifikasi']);
        $this->assertSame(16, $totals['menunggu_penanganan']);
        $this->assertSame(40, $totals['diproses']);
        $this->assertSame(115, $totals['selesai']);
        $this->assertSame(9, $totals['ditolak']);

        $byCategory = collect($summaryRes->json('data.by_category'))->keyBy('category');
        $this->assertSame(92, $byCategory['jalan_rusak']['count']);
        $this->assertSame(61, $byCategory['sampah']['count']);
        $this->assertSame(51, $byCategory['lampu_mati']['count']);

        // 2. Cek peta dashboard (204 - 24 menunggu_verifikasi = 180 titik)
        $mapRes = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/dashboard/map')
            ->assertStatus(200);
        $this->assertCount(180, $mapRes->json('data'));

        // 3. Cek tiket khusus ADU-204 & ADU-198 saling duplikat (±50 m)
        $detail204 = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/ADU-204')
            ->assertStatus(200)
            ->json('data');

        $this->assertSame('Jalan berlubang di Jl. Melati', $detail204['title']);
        $this->assertSame('menunggu_verifikasi', $detail204['status']);
        $this->assertSame('tinggi', $detail204['urgency']);
        $this->assertSame('done', $detail204['ai']['status']);
        $this->assertSame('ADU-198', $detail204['ai']['duplicates'][0]['ticket_id']);
        $this->assertSame(50, $detail204['ai']['duplicates'][0]['distance_m']);
        Storage::disk('uploads')->assertExists(Report::find(204)->photo_path);

        $detail198 = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/ADU-198')
            ->assertStatus(200)
            ->json('data');

        $this->assertSame('Lubang jalan membesar, rawan kecelakaan', $detail198['title']);
        $this->assertSame('menunggu_penanganan', $detail198['status']);
        $this->assertSame('darurat', $detail198['urgency']);
        $this->assertSame('ADU-204', $detail198['ai']['duplicates'][0]['ticket_id']);

        // 4. Cek ADU-176 (selesai dengan foto sebelum/sesudah + completion notes)
        $track176 = $this->getJson('/api/v1/reports/track/ADU-176')
            ->assertStatus(200)
            ->json('data');

        $this->assertSame('Perbaikan jalan di Jl. Kenanga', $track176['title']);
        $this->assertSame('selesai', $track176['status']);
        $this->assertSame('Lubang jalan sudah ditambal dengan aspal dingin dan dipadatkan.', $track176['completion']['notes']);
        $this->assertSame('Budi Santoso', $track176['completion']['completed_by']['name']);
        $this->assertNotEmpty($track176['photo_url']);
        $this->assertNotEmpty($track176['completion']['photo_url']);
        Storage::disk('uploads')->assertExists(Report::find(176)->completion_photo_path);

        // 5. Cek ADU-183 (ditolak dengan alasan dari tabel oleh Nadia Putri)
        $track183 = $this->getJson('/api/v1/reports/track/ADU-183')
            ->assertStatus(200)
            ->json('data');

        $this->assertSame('Sampah di luar wilayah', $track183['title']);
        $this->assertSame('ditolak', $track183['status']);
        $this->assertSame('Lokasi kejadian berada di luar wilayah layanan instansi.', $track183['rejection']['reason']);
        $this->assertSame('Nadia Putri', $track183['rejection']['decided_by']['name']);

        // 6. Cek ADU-200 (diproses milik Budi dengan event progress / Kabar terbaru petugas)
        $track200 = $this->getJson('/api/v1/reports/track/ADU-200')
            ->assertStatus(200)
            ->json('data');

        $this->assertSame('diproses', $track200['status']);
        $this->assertNotNull($track200['latest_update']);
        $this->assertSame('Budi Santoso', $track200['latest_update']['actor']['name']);
        $this->assertNotEmpty($track200['latest_update']['note']);

        // 7. Cek ADU-192, ADU-187, ADU-172
        $this->getJson('/api/v1/reports/track/ADU-192')
            ->assertStatus(200)
            ->assertJsonPath('data.title', 'Sampah menghalangi jalan')
            ->assertJsonPath('data.status', 'menunggu_penanganan');

        $this->getJson('/api/v1/reports/track/ADU-187')
            ->assertStatus(200)
            ->assertJsonPath('data.title', 'Lampu jalan padam')
            ->assertJsonPath('data.status', 'menunggu_penanganan');

        $this->getJson('/api/v1/reports/track/ADU-172')
            ->assertStatus(200)
            ->assertJsonPath('data.title', 'Lampu taman padam')
            ->assertJsonPath('data.status', 'selesai');

        // 8. Laporan baru berikutnya harus bernomor ADU-205
        $submitRes = $this->postJson('/api/v1/reports', [
            'description' => 'Laporan baru setelah seeding untuk memastikan nomor urut ADU-205.',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'photo'       => UploadedFile::fake()->image('baru.jpg', 400, 300),
        ])->assertStatus(201);

        $this->assertSame('ADU-205', $submitRes->json('data.ticket_id'));
    }
}
