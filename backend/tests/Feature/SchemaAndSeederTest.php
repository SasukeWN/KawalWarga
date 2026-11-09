<?php

namespace Tests\Feature;

use App\Enums\Category;
use App\Enums\EventType;
use App\Enums\ReportStatus;
use App\Enums\Role;
use App\Enums\Urgency;
use App\Models\AiInsight;
use App\Models\Report;
use App\Models\ReportDuplicate;
use App\Models\ReportEvent;
use App\Models\User;
use App\Services\TicketService;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SchemaAndSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_seeder_creates_admin_and_officer_accounts(): void
    {
        $this->seed(UserSeeder::class);

        $admin = User::where('email', 'admin@kawalwarga.test')->first();
        $this->assertNotNull($admin);
        $this->assertSame('Nadia Putri', $admin->name);
        $this->assertSame(Role::ADMIN, $admin->role);
        $this->assertSame('Admin verifikator', $admin->position);
        $this->assertTrue(Hash::check('password123', $admin->password));

        $officer = User::where('email', 'budi@kawalwarga.test')->first();
        $this->assertNotNull($officer);
        $this->assertSame('Budi Santoso', $officer->name);
        $this->assertSame(Role::PETUGAS, $officer->role);
        $this->assertSame('Petugas lapangan', $officer->position);
        $this->assertTrue(Hash::check('password123', $officer->password));
    }

    public function test_report_model_relations_casts_and_accessors_work(): void
    {
        config(['app.url' => 'http://localhost:8000']);
        $this->seed(UserSeeder::class);

        $admin   = User::where('email', 'admin@kawalwarga.test')->firstOrFail();
        $officer = User::where('email', 'budi@kawalwarga.test')->firstOrFail();

        $report = Report::create([
            'title'                 => 'Jalan berlubang di Jl. Melati',
            'description'           => 'Ada lubang cukup dalam di depan Jl. Melati No. 12.',
            'photo_path'            => 'reports/abc123.jpg',
            'latitude'              => -6.2088,
            'longitude'             => 106.8456,
            'address_text'          => 'Jl. Melati No. 12',
            'reporter_phone'        => '628123456789',
            'status'                => ReportStatus::MENUNGGU_PENANGANAN,
            'category'              => Category::JALAN_RUSAK,
            'urgency'               => Urgency::DARURAT,
            'ai_status'             => 'done',
            'ai_category'           => Category::JALAN_RUSAK,
            'ai_urgency'            => Urgency::TINGGI,
            'ai_summary'            => 'Lubang jalan membahayakan pengendara.',
            'verified_by'           => $admin->id,
            'verified_at'           => now(),
            'handler_id'            => $officer->id,
            'completion_photo_path' => 'completions/xyz.jpg',
        ]);

        $report->update(['ticket_id' => TicketService::format($report->id)]);

        ReportEvent::create([
            'report_id'   => $report->id,
            'event'       => EventType::SUBMITTED,
            'title'       => EventType::SUBMITTED->label(),
            'description' => 'Laporan masuk dan menunggu verifikasi admin.',
            'created_at'  => now()->subMinutes(5),
        ]);

        $other = Report::create([
            'ticket_id'   => 'ADU-198',
            'title'       => 'Lubang jalan membesar',
            'description' => 'Lubang jalan membesar di Jl. Melati.',
            'photo_path'  => 'reports/def456.jpg',
            'latitude'    => -6.2089,
            'longitude'   => 106.8457,
            'status'      => ReportStatus::MENUNGGU_PENANGANAN,
            'ai_status'   => 'done',
        ]);

        ReportDuplicate::create([
            'report_id'       => $report->id,
            'duplicate_of_id' => $other->id,
            'distance_m'      => 50,
            'reason'          => 'Lokasi berdekatan (±50 m) dan membahas masalah yang sama.',
        ]);

        $fresh = $report->fresh(['events', 'duplicates.duplicateOf', 'verifier', 'handler']);

        $this->assertSame('ADU-001', $fresh->ticket_id);
        $this->assertSame(ReportStatus::MENUNGGU_PENANGANAN, $fresh->status);
        $this->assertSame('Menunggu Penanganan', $fresh->status_label);
        $this->assertSame(Category::JALAN_RUSAK, $fresh->category);
        $this->assertSame('Jalan Rusak', $fresh->category_label);
        $this->assertSame(Urgency::DARURAT, $fresh->urgency);
        $this->assertSame('Darurat', $fresh->urgency_label);
        $this->assertSame(4, $fresh->urgency->weight());
        $this->assertSame('http://localhost:8000/uploads/reports/abc123.jpg', $fresh->photo_url);
        $this->assertSame('http://localhost:8000/uploads/completions/xyz.jpg', $fresh->completion_photo_url);
        $this->assertCount(1, $fresh->events);
        $this->assertCount(1, $fresh->duplicates);
        $this->assertSame('ADU-198', $fresh->duplicates->first()->duplicateOf->ticket_id);
        $this->assertSame($admin->id, $fresh->verifier->id);
        $this->assertSame($officer->id, $fresh->handler->id);

        $insight = AiInsight::create([
            'from_date'      => '2026-11-01',
            'to_date'        => '2026-11-08',
            'bullets'        => ['Poin 1', 'Poin 2', 'Poin 3'],
            'based_on_total' => 200,
            'generated_at'   => now(),
        ]);

        $this->assertCount(3, $insight->fresh()->bullets);
    }
}
