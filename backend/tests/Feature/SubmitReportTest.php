<?php

namespace Tests\Feature;

use App\Enums\EventType;
use App\Enums\ReportStatus;
use App\Models\Report;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SubmitReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_submit_valid_report_returns_201_stores_photo_creates_event_and_normalizes_phone(): void
    {
        Storage::fake('uploads');

        $photo = UploadedFile::fake()->image('jalan-berlubang.jpg', 800, 600)->size(500);

        $description = 'Ada lubang cukup dalam di depan Jl. Melati No. 12 yang membahayakan pengendara motor saat hujan.';

        $response = $this->post('/api/v1/reports', [
            'description'    => $description,
            'latitude'       => -6.2088,
            'longitude'      => 106.8456,
            'address_text'   => 'Jl. Melati No. 12, Kel. Sukamaju, Kota Harmoni',
            'photo'          => $photo,
            'reporter_phone' => '0812-3456-7890',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Laporan berhasil dikirim.',
                'data'    => [
                    'ticket_id'    => 'ADU-001',
                    'status'       => 'menunggu_verifikasi',
                    'status_label' => 'Menunggu Verifikasi',
                ],
            ]);

        $this->assertStringEndsWith('+07:00', $response->json('data.created_at'));

        $report = Report::where('ticket_id', 'ADU-001')->first();
        $this->assertNotNull($report);
        $this->assertSame(ReportStatus::MENUNGGU_VERIFIKASI, $report->status);
        $this->assertSame('6281234567890', $report->reporter_phone);
        $this->assertSame('failed', $report->ai_status);
        $this->assertSame(mb_substr($description, 0, 60), $report->title);
        $this->assertStringStartsWith('reports/', $report->photo_path);

        Storage::disk('uploads')->assertExists($report->photo_path);

        $this->assertDatabaseHas('report_events', [
            'report_id'   => $report->id,
            'event'       => EventType::SUBMITTED->value,
            'title'       => 'Laporan diterima',
            'description' => 'Laporan masuk dan menunggu verifikasi admin.',
        ]);
    }

    public function test_submit_report_validates_all_fields_and_returns_422_with_errors(): void
    {
        Storage::fake('uploads');

        // 1. Deskripsi terlalu pendek (< 20 karakter), koordinat di luar batas, tanpa foto, telepon tidak valid
        $response = $this->post('/api/v1/reports', [
            'description'    => 'Terlalu pendek',
            'latitude'       => -95,
            'longitude'      => 190,
            'reporter_phone' => '12345',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Data yang dikirim tidak valid.',
            ])
            ->assertJsonValidationErrors(['description', 'latitude', 'longitude', 'photo', 'reporter_phone']);

        // 2. File bukan gambar (.pdf) dan melebihi 5120 KB
        $invalidFile = UploadedFile::fake()->create('dokumen.pdf', 6000, 'application/pdf');

        $response2 = $this->post('/api/v1/reports', [
            'description' => 'Deskripsi valid minimal dua puluh karakter untuk pengujian upload file.',
            'latitude'    => -6.2088,
            'longitude'   => 106.8456,
            'photo'       => $invalidFile,
        ]);

        $response2->assertStatus(422)
            ->assertJsonValidationErrors(['photo']);
    }

    public function test_submit_report_normalizes_plus_62_phone_format(): void
    {
        Storage::fake('uploads');

        $photo = UploadedFile::fake()->image('sampah.png', 400, 400);

        $this->post('/api/v1/reports', [
            'description'    => 'Tumpukan sampah di pinggir jalan belum diangkut selama tiga hari.',
            'latitude'       => -6.2100,
            'longitude'      => 106.8500,
            'photo'          => $photo,
            'reporter_phone' => '+62 813 9876 5432',
        ])->assertStatus(201);

        $report = Report::firstOrFail();
        $this->assertSame('6281398765432', $report->reporter_phone);
    }
}
