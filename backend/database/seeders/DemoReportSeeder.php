<?php

namespace Database\Seeders;

use App\Enums\Category;
use App\Enums\EventType;
use App\Enums\ReportStatus;
use App\Enums\Urgency;
use App\Models\AiInsight;
use App\Models\Report;
use App\Models\ReportDuplicate;
use App\Models\ReportEvent;
use App\Models\User;
use App\Services\TicketService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DemoReportSeeder extends Seeder
{
    public const TOTAL_REPORTS = 204;

    public const CENTER_LAT = -6.2088;

    public const CENTER_LNG = 106.8456;

    public const SPREAD_DEG = 0.016;

    /**
     * Minimal valid 1x1 JPEG binary fallback apabila ekstensi GD tidak tersedia.
     */
    private const MINIMAL_JPEG_BASE64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

    public function run(): void
    {
        $admin = User::where('email', 'admin@kawalwarga.test')->first();
        $budi  = User::where('email', 'budi@kawalwarga.test')->first();

        if (! $admin || ! $budi) {
            $this->call(UserSeeder::class);
            $admin = User::where('email', 'admin@kawalwarga.test')->firstOrFail();
            $budi  = User::where('email', 'budi@kawalwarga.test')->firstOrFail();
        }

        mt_srand(20261108);

        $photoPools = $this->prepareUploadsPool();

        $specialSpecs = $this->getSpecialTicketSpecs($photoPools);
        $assignments  = $this->build204Assignments($specialSpecs);

        $nowJakarta = Carbon::now('Asia/Jakarta');
        $startWindow = $nowJakarta->copy()->subDays(7)->setTime(7, 0, 0);
        $endWindow   = $nowJakarta->copy()->subMinutes(10);
        if ($endWindow->lte($startWindow)) {
            $endWindow = $nowJakarta->copy();
        }
        $totalSpanSeconds = max(3600, (int) $startWindow->diffInSeconds($endWindow));

        DB::transaction(function () use (
            $assignments,
            $specialSpecs,
            $photoPools,
            $admin,
            $budi,
            $startWindow,
            $totalSpanSeconds,
            $nowJakarta
        ): void {
            ReportDuplicate::query()->delete();
            ReportEvent::query()->delete();
            Report::query()->delete();
            AiInsight::query()->delete();

            if (DB::getDriverName() === 'sqlite') {
                DB::statement("DELETE FROM sqlite_sequence WHERE name IN ('reports', 'report_events', 'report_duplicates', 'ai_insights')");
            }

            for ($id = 1; $id <= self::TOTAL_REPORTS; $id++) {
                $ticketId = TicketService::format($id);
                $spec     = $assignments[$id];
                $status   = $spec['status'];
                $category = $spec['category'];
                $urgency  = $spec['urgency'];

                $ratio     = ($id - 1) / max(1, self::TOTAL_REPORTS - 1);
                $offsetSec = (int) round($ratio * $totalSpanSeconds);
                $createdAt = $startWindow->copy()->addSeconds($offsetSec);

                $template = $this->pickTemplate($category, $id);

                $title       = $spec['title'] ?? $template['title'];
                $description = $spec['description'] ?? $template['description'];
                $addressText = $spec['address_text'] ?? $this->pickAddress($id);
                $aiSummary   = $spec['ai_summary'] ?? $template['ai_summary'];
                $lat         = $spec['latitude'] ?? $this->randomCoord(self::CENTER_LAT, self::SPREAD_DEG);
                $lng         = $spec['longitude'] ?? $this->randomCoord(self::CENTER_LNG, self::SPREAD_DEG);
                $phone       = $spec['reporter_phone'] ?? ($id % 3 === 0 ? null : '62812' . str_pad((string) (1000000 + $id), 7, '0', STR_PAD_LEFT));

                $categoryPhotos = $photoPools[$category];
                $photoPath      = $spec['photo_path'] ?? $categoryPhotos[$id % count($categoryPhotos)];

                $verifiedBy          = null;
                $verifiedAt          = null;
                $verificationNote    = null;
                $rejectedBy          = null;
                $rejectedAt          = null;
                $rejectionReason     = null;
                $handlerId           = null;
                $takenAt             = null;
                $completedAt         = null;
                $completionNotes     = null;
                $completionPhotoPath = null;
                $updatedAt           = $createdAt->copy();

                $eventsToInsert = [
                    [
                        'event'       => EventType::SUBMITTED->value,
                        'title'       => EventType::SUBMITTED->label(),
                        'description' => 'Laporan masuk dan menunggu verifikasi admin.',
                        'note'        => null,
                        'actor_id'    => null,
                        'created_at'  => $createdAt->copy(),
                    ],
                ];

                if ($status === ReportStatus::MENUNGGU_PENANGANAN->value) {
                    $verifiedBy = $admin->id;
                    // Pastikan ADU-198, ADU-192, ADU-187 memiliki verified_at lebih awal agar tampil di halaman 1 antrean petugas
                    $verifiedAt = isset($specialSpecs[$id])
                        ? $createdAt->copy()->addMinutes(5)
                        : $createdAt->copy()->addMinutes(25);
                    if ($verifiedAt->gt($nowJakarta)) {
                        $verifiedAt = $nowJakarta->copy()->subMinutes(5);
                    }
                    $verificationNote = $spec['verification_note'] ?? $this->defaultVerificationNote($category);
                    $updatedAt        = $verifiedAt->copy();

                    $eventsToInsert[] = [
                        'event'       => EventType::VERIFIED->value,
                        'title'       => EventType::VERIFIED->label(),
                        'description' => 'Admin menyetujui laporan. Menunggu Penanganan.',
                        'note'        => $verificationNote,
                        'actor_id'    => $admin->id,
                        'created_at'  => $verifiedAt->copy(),
                    ];
                } elseif ($status === ReportStatus::DIPROSES->value) {
                    $verifiedBy       = $admin->id;
                    $verifiedAt       = $createdAt->copy()->addMinutes(15);
                    $verificationNote = $spec['verification_note'] ?? $this->defaultVerificationNote($category);
                    $handlerId        = $budi->id;
                    $takenAt          = $verifiedAt->copy()->addMinutes(20);
                    $progressAt       = $takenAt->copy()->addMinutes(15);
                    if ($progressAt->gt($nowJakarta)) {
                        $verifiedAt = $createdAt->copy()->addMinutes(2);
                        $takenAt    = $createdAt->copy()->addMinutes(4);
                        $progressAt = $createdAt->copy()->addMinutes(6);
                    }
                    $progressNote = $spec['progress_note'] ?? $this->defaultProgressNote($category);
                    $updatedAt    = $progressAt->copy();

                    $eventsToInsert[] = [
                        'event'       => EventType::VERIFIED->value,
                        'title'       => EventType::VERIFIED->label(),
                        'description' => 'Admin menyetujui laporan. Menunggu Penanganan.',
                        'note'        => $verificationNote,
                        'actor_id'    => $admin->id,
                        'created_at'  => $verifiedAt->copy(),
                    ];
                    $eventsToInsert[] = [
                        'event'       => EventType::TAKEN->value,
                        'title'       => EventType::TAKEN->label(),
                        'description' => "{$budi->name} mulai menangani laporan.",
                        'note'        => null,
                        'actor_id'    => $budi->id,
                        'created_at'  => $takenAt->copy(),
                    ];
                    $eventsToInsert[] = [
                        'event'       => EventType::PROGRESS->value,
                        'title'       => EventType::PROGRESS->label(),
                        'description' => $progressNote,
                        'note'        => $progressNote,
                        'actor_id'    => $budi->id,
                        'created_at'  => $progressAt->copy(),
                    ];
                } elseif ($status === ReportStatus::SELESAI->value) {
                    $verifiedBy          = $admin->id;
                    $verifiedAt          = $createdAt->copy()->addMinutes(15);
                    $verificationNote    = $spec['verification_note'] ?? $this->defaultVerificationNote($category);
                    $handlerId           = $budi->id;
                    $takenAt             = $verifiedAt->copy()->addMinutes(25);
                    $completedAt         = $takenAt->copy()->addMinutes(45);
                    if ($completedAt->gt($nowJakarta)) {
                        $verifiedAt  = $createdAt->copy()->addMinutes(2);
                        $takenAt     = $createdAt->copy()->addMinutes(5);
                        $completedAt = $createdAt->copy()->addMinutes(8);
                    }
                    $completionNotes     = $spec['completion_notes'] ?? $this->defaultCompletionNotes($category);
                    $completionPool      = $photoPools['completions'];
                    $completionPhotoPath = $spec['completion_photo_path'] ?? $completionPool[$id % count($completionPool)];
                    $updatedAt           = $completedAt->copy();

                    $eventsToInsert[] = [
                        'event'       => EventType::VERIFIED->value,
                        'title'       => EventType::VERIFIED->label(),
                        'description' => 'Admin menyetujui laporan. Menunggu Penanganan.',
                        'note'        => $verificationNote,
                        'actor_id'    => $admin->id,
                        'created_at'  => $verifiedAt->copy(),
                    ];
                    $eventsToInsert[] = [
                        'event'       => EventType::TAKEN->value,
                        'title'       => EventType::TAKEN->label(),
                        'description' => "{$budi->name} mulai menangani laporan.",
                        'note'        => null,
                        'actor_id'    => $budi->id,
                        'created_at'  => $takenAt->copy(),
                    ];
                    $eventsToInsert[] = [
                        'event'       => EventType::COMPLETED->value,
                        'title'       => EventType::COMPLETED->label(),
                        'description' => $completionNotes,
                        'note'        => $completionNotes,
                        'actor_id'    => $budi->id,
                        'created_at'  => $completedAt->copy(),
                    ];
                } elseif ($status === ReportStatus::DITOLAK->value) {
                    $rejectedBy      = $admin->id;
                    $rejectedAt      = $createdAt->copy()->addMinutes(20);
                    if ($rejectedAt->gt($nowJakarta)) {
                        $rejectedAt = $createdAt->copy()->addMinutes(3);
                    }
                    $rejectionReason = $spec['rejection_reason'] ?? 'Laporan tidak dapat diproses karena informasi lokasi di luar cakupan layanan instansi.';
                    $updatedAt       = $rejectedAt->copy();

                    $eventsToInsert[] = [
                        'event'       => EventType::REJECTED->value,
                        'title'       => EventType::REJECTED->label(),
                        'description' => $rejectionReason,
                        'note'        => $rejectionReason,
                        'actor_id'    => $admin->id,
                        'created_at'  => $rejectedAt->copy(),
                    ];
                }

                $report = Report::create([
                    'ticket_id'             => $ticketId,
                    'title'                 => $title,
                    'description'           => $description,
                    'photo_path'            => $photoPath,
                    'latitude'              => $lat,
                    'longitude'             => $lng,
                    'address_text'          => $addressText,
                    'reporter_phone'        => $phone,
                    'status'                => $status,
                    'category'              => $category,
                    'urgency'               => $urgency,
                    'ai_status'             => 'done',
                    'ai_category'           => $category,
                    'ai_urgency'            => $urgency,
                    'ai_summary'            => $aiSummary,
                    'verified_by'           => $verifiedBy,
                    'verified_at'           => $verifiedAt,
                    'verification_note'     => $verificationNote,
                    'rejected_by'           => $rejectedBy,
                    'rejected_at'           => $rejectedAt,
                    'rejection_reason'      => $rejectionReason,
                    'handler_id'            => $handlerId,
                    'taken_at'              => $takenAt,
                    'completed_at'          => $completedAt,
                    'completion_notes'      => $completionNotes,
                    'completion_photo_path' => $completionPhotoPath,
                    'created_at'            => $createdAt,
                    'updated_at'            => $updatedAt,
                ]);

                foreach ($eventsToInsert as $ev) {
                    ReportEvent::create([
                        'report_id'   => $report->id,
                        'event'       => $ev['event'],
                        'title'       => $ev['title'],
                        'description' => $ev['description'],
                        'note'        => $ev['note'],
                        'actor_id'    => $ev['actor_id'],
                        'created_at'  => $ev['created_at'],
                    ]);
                }
            }

            // ADU-204 dan ADU-198 saling duplikat (±50 m)
            ReportDuplicate::create([
                'report_id'       => 204,
                'duplicate_of_id' => 198,
                'distance_m'      => 50,
                'reason'          => 'Lokasi berdekatan (±50 m) dan membahas masalah yang sama.',
            ]);

            ReportDuplicate::create([
                'report_id'       => 198,
                'duplicate_of_id' => 204,
                'distance_m'      => 50,
                'reason'          => 'Lokasi berdekatan (±50 m) dan membahas masalah yang sama.',
            ]);
        });
    }

    /**
     * Salin foto dari database/seeders/images/ ke disk uploads dengan nama acak (UUID).
     * Bila foto belum ada, buat gambar placeholder sederhana agar seeder tidak error.
     *
     * @return array{
     *   jalan_rusak: array<int, string>,
     *   sampah: array<int, string>,
     *   lampu_mati: array<int, string>,
     *   completions: array<int, string>
     * }
     */
    private function prepareUploadsPool(): array
    {
        $disk      = Storage::disk('uploads');
        $imagesDir = database_path('seeders/images');

        if (! File::isDirectory($imagesDir)) {
            File::makeDirectory($imagesDir, 0775, true);
        }

        $pools = [
            Category::JALAN_RUSAK->value => $this->copyOrCreateCategoryPhotos(
                $disk,
                $imagesDir,
                'jalan_rusak',
                ['jalan_rusak', 'jalan'],
                'reports',
                3,
                [180, 60, 50],
                'Contoh Foto Jalan Rusak'
            ),
            Category::SAMPAH->value => $this->copyOrCreateCategoryPhotos(
                $disk,
                $imagesDir,
                'sampah',
                ['sampah'],
                'reports',
                3,
                [55, 135, 75],
                'Contoh Foto Tumpukan Sampah'
            ),
            Category::LAMPU_MATI->value => $this->copyOrCreateCategoryPhotos(
                $disk,
                $imagesDir,
                'lampu_mati',
                ['lampu_mati', 'lampu'],
                'reports',
                3,
                [60, 90, 165],
                'Contoh Foto Lampu Jalan Padam'
            ),
            'completions' => $this->copyOrCreateCategoryPhotos(
                $disk,
                $imagesDir,
                'sesudah',
                ['sesudah', 'after', 'completion', 'selesai'],
                'completions',
                2,
                [40, 140, 100],
                'Foto Sesudah Perbaikan'
            ),
        ];

        return $pools;
    }

    /**
     * @param  array<int, string>  $keywords
     * @param  array{0: int, 1: int, 2: int}  $rgb
     * @return array<int, string>
     */
    private function copyOrCreateCategoryPhotos(
        $disk,
        string $imagesDir,
        string $subDirName,
        array $keywords,
        string $targetFolder,
        int $minCount,
        array $rgb,
        string $label
    ): array {
        $foundFiles = [];

        $subDir = $imagesDir . DIRECTORY_SEPARATOR . $subDirName;
        if (File::isDirectory($subDir)) {
            foreach (File::files($subDir) as $file) {
                $ext = strtolower($file->getExtension());
                if (in_array($ext, ['jpg', 'jpeg', 'png'], true)) {
                    $foundFiles[] = $file->getPathname();
                }
            }
        }

        foreach (File::files($imagesDir) as $file) {
            $ext  = strtolower($file->getExtension());
            $name = strtolower($file->getFilenameWithoutExtension());
            if (! in_array($ext, ['jpg', 'jpeg', 'png'], true)) {
                continue;
            }
            if ($targetFolder === 'reports' && (str_contains($name, 'sesudah') || str_contains($name, 'after') || str_contains($name, 'completion'))) {
                continue;
            }
            foreach ($keywords as $kw) {
                if (str_contains($name, $kw)) {
                    $foundFiles[] = $file->getPathname();
                    break;
                }
            }
        }

        $foundFiles = array_values(array_unique($foundFiles));
        $uploadedPaths = [];

        foreach ($foundFiles as $srcPath) {
            $ext      = strtolower(pathinfo($srcPath, PATHINFO_EXTENSION)) ?: 'jpg';
            $destPath = $targetFolder . '/' . Str::uuid()->toString() . '.' . $ext;
            $disk->put($destPath, File::get($srcPath));
            $uploadedPaths[] = $destPath;
        }

        while (count($uploadedPaths) < $minCount) {
            $index    = count($uploadedPaths) + 1;
            $destPath = $targetFolder . '/' . Str::uuid()->toString() . '.jpg';
            $bytes    = $this->generatePlaceholderJpeg("{$label} #{$index}", $rgb);
            $disk->put($destPath, $bytes);
            $uploadedPaths[] = $destPath;
        }

        return $uploadedPaths;
    }

    /**
     * @param  array{0: int, 1: int, 2: int}  $rgb
     */
    private function generatePlaceholderJpeg(string $text, array $rgb): string
    {
        if (function_exists('imagecreatetruecolor') && function_exists('imagejpeg')) {
            $img = @imagecreatetruecolor(640, 420);
            if ($img !== false) {
                $bg  = imagecolorallocate($img, $rgb[0], $rgb[1], $rgb[2]);
                $fg  = imagecolorallocate($img, 255, 255, 255);
                $acc = imagecolorallocate($img, max(0, $rgb[0] - 30), max(0, $rgb[1] - 30), max(0, $rgb[2] - 30));

                imagefilledrectangle($img, 0, 0, 640, 420, $bg);
                imagefilledrectangle($img, 24, 24, 616, 396, $acc);
                imagestring($img, 5, 48, 180, 'KawalWarga Demo Photo', $fg);
                imagestring($img, 4, 48, 210, $text, $fg);

                ob_start();
                imagejpeg($img, null, 82);
                $data = (string) ob_get_clean();
                imagedestroy($img);

                if ($data !== '') {
                    return $data;
                }
            }
        }

        return (string) base64_decode(self::MINIMAL_JPEG_BASE64);
    }

    /**
     * Data khusus sesuai tabel di Backend-PRD bab 11.
     *
     * @param  array<string, array<int, string>>  $photoPools
     * @return array<int, array<string, mixed>>
     */
    private function getSpecialTicketSpecs(array $photoPools): array
    {
        return [
            204 => [
                'title'          => 'Jalan berlubang di Jl. Melati',
                'description'    => 'Ada lubang cukup dalam di depan Jl. Melati No. 12. Saat hujan lubang tertutup air dan membahayakan pengendara, terutama sepeda motor. Mohon segera diperbaiki.',
                'status'         => ReportStatus::MENUNGGU_VERIFIKASI->value,
                'category'       => Category::JALAN_RUSAK->value,
                'urgency'        => Urgency::TINGGI->value,
                'address_text'   => 'Jl. Melati No. 12, Kel. Sukamaju, Kota Harmoni',
                'latitude'       => -6.2088,
                'longitude'      => 106.8456,
                'reporter_phone' => '6281299990204',
                'ai_summary'     => 'Lubang jalan di kawasan permukiman berisiko bagi pengendara saat hujan. Bukti foto menunjukkan kerusakan permukaan yang perlu diperiksa petugas.',
                'photo_path'     => $photoPools[Category::JALAN_RUSAK->value][0],
            ],
            200 => [
                'title'             => 'Perbaikan saluran dan lubang jalan di Jl. Cempaka',
                'description'       => 'Lubang di tengah Jl. Cempaka No. 5 cukup dalam dan menggenang setelah hujan deras, menghambat laju kendaraan warga.',
                'status'            => ReportStatus::DIPROSES->value,
                'category'          => Category::JALAN_RUSAK->value,
                'urgency'           => Urgency::TINGGI->value,
                'address_text'      => 'Jl. Cempaka No. 5, Kel. Sukamaju, Kota Harmoni',
                'latitude'          => -6.2102,
                'longitude'         => 106.8471,
                'reporter_phone'    => '6281299990200',
                'ai_summary'        => 'Kerusakan jalan berlubang disertai genangan air di Jl. Cempaka memerlukan penambalan segera.',
                'verification_note' => 'Segera pasang rambu pengaman dan lakukan penambalan aspal.',
                'progress_note'     => 'Kami sedang memeriksa kedalaman lubang dan menyiapkan material untuk perbaikan. Area telah diberi tanda pengaman sementara.',
                'photo_path'        => $photoPools[Category::JALAN_RUSAK->value][1],
            ],
            198 => [
                'title'             => 'Lubang jalan membesar, rawan kecelakaan',
                'description'       => 'Lubang jalan di depan Jl. Melati No. 14 semakin membesar dan dalam akibat tergerus air hujan. Sangat rawan memicu kecelakaan bagi pengendara motor di malam hari.',
                'status'            => ReportStatus::MENUNGGU_PENANGANAN->value,
                'category'          => Category::JALAN_RUSAK->value,
                'urgency'           => Urgency::DARURAT->value,
                'address_text'      => 'Jl. Melati No. 14, Kel. Sukamaju, Kota Harmoni',
                'latitude'          => -6.20845,
                'longitude'         => 106.84588,
                'reporter_phone'    => '6281299990198',
                'ai_summary'        => 'Lubang jalan berukuran besar di lajur utama Jl. Melati membahayakan keselamatan pengendara dan berstatus darurat.',
                'verification_note' => 'Kerusakan mengganggu akses kendaraan. Amankan area terlebih dahulu, lalu periksa kedalaman lubang.',
                'photo_path'        => $photoPools[Category::JALAN_RUSAK->value][2],
            ],
            192 => [
                'title'             => 'Sampah menghalangi jalan',
                'description'       => 'Tumpukan sampah rumah tangga dan kantong plastik meluber hingga menutup sebagian badan jalan di Jl. Anggrek No. 6 serta menimbulkan bau menyengat.',
                'status'            => ReportStatus::MENUNGGU_PENANGANAN->value,
                'category'          => Category::SAMPAH->value,
                'urgency'           => Urgency::TINGGI->value,
                'address_text'      => 'Jl. Anggrek No. 6, Kel. Sukamaju, Kota Harmoni',
                'latitude'          => -6.2115,
                'longitude'         => 106.8432,
                'reporter_phone'    => '6281299990192',
                'ai_summary'        => 'Tumpukan sampah liar meluber ke badan jalan di Jl. Anggrek No. 6 sehingga mengganggu akses dan kebersihan lingkungan.',
                'verification_note' => 'Tumpukan sampah menghambat akses jalan lingkungan. Segera kirim armada pengangkut.',
                'photo_path'        => $photoPools[Category::SAMPAH->value][0],
            ],
            187 => [
                'title'             => 'Lampu jalan padam',
                'description'       => 'Lampu penerangan jalan umum di depan Jl. Mawar No. 9 padam total sejak tiga malam lalu sehingga area jalan menjadi gelap gulita.',
                'status'            => ReportStatus::MENUNGGU_PENANGANAN->value,
                'category'          => Category::LAMPU_MATI->value,
                'urgency'           => Urgency::SEDANG->value,
                'address_text'      => 'Jl. Mawar No. 9, Kel. Sukamaju, Kota Harmoni',
                'latitude'          => -6.2065,
                'longitude'         => 106.8482,
                'reporter_phone'    => '6281299990187',
                'ai_summary'        => 'Lampu PJU padam di Jl. Mawar No. 9 mengurangi visibilitas warga pada malam hari.',
                'verification_note' => 'Periksa jaringan kelistrikan PJU dan ganti lampu yang putus.',
                'photo_path'        => $photoPools[Category::LAMPU_MATI->value][0],
            ],
            183 => [
                'title'            => 'Sampah di luar wilayah',
                'description'      => 'Terdapat tumpukan sampah liar di tepi jalan perbatasan wilayah luar kota yang belum diangkut selama beberapa hari.',
                'status'           => ReportStatus::DITOLAK->value,
                'category'         => Category::SAMPAH->value,
                'urgency'          => Urgency::SEDANG->value,
                'address_text'     => 'Jl. Raya Perbatasan No. 40 (Luar Wilayah)',
                'latitude'         => -6.2240,
                'longitude'        => 106.8610,
                'reporter_phone'   => '6281299990183',
                'ai_summary'       => 'Laporan tumpukan sampah berada di titik perbatasan di luar wilayah kerja instansi.',
                'rejection_reason' => 'Lokasi kejadian berada di luar wilayah layanan instansi.',
                'photo_path'       => $photoPools[Category::SAMPAH->value][1],
            ],
            176 => [
                'title'                 => 'Perbaikan jalan di Jl. Kenanga',
                'description'           => 'Permukaan aspal di Jl. Kenanga No. 8 berlubang cukup dalam dan membahayakan warga yang melintas setiap pagi.',
                'status'                => ReportStatus::SELESAI->value,
                'category'              => Category::JALAN_RUSAK->value,
                'urgency'               => Urgency::TINGGI->value,
                'address_text'          => 'Jl. Kenanga No. 8, Kel. Sukamaju, Kota Harmoni',
                'latitude'              => -6.2072,
                'longitude'             => 106.8440,
                'reporter_phone'        => '6281299990176',
                'ai_summary'            => 'Kerusakan permukaan aspal di Jl. Kenanga memerlukan penambalan agar kembali rata dan aman dilalui.',
                'verification_note'     => 'Lakukan penambalan aspal dingin dan pemadatan di lokasi.',
                'completion_notes'      => 'Lubang jalan sudah ditambal dengan aspal dingin dan dipadatkan.',
                'photo_path'            => $photoPools[Category::JALAN_RUSAK->value][0],
                'completion_photo_path' => $photoPools['completions'][0],
            ],
            172 => [
                'title'                 => 'Lampu taman padam',
                'description'           => 'Lampu penerangan utama di sekitar area jalur pejalan kaki Taman Melati padam sehingga warga kesulitan beraktivitas di malam hari.',
                'status'                => ReportStatus::SELESAI->value,
                'category'              => Category::LAMPU_MATI->value,
                'urgency'               => Urgency::SEDANG->value,
                'address_text'          => 'Taman Melati, Kel. Sukamaju, Kota Harmoni',
                'latitude'              => -6.2095,
                'longitude'             => 106.8465,
                'reporter_phone'        => '6281299990172',
                'ai_summary'            => 'Lampu penerangan di Taman Melati padam dan membutuhkan penggantian bohlam LED.',
                'verification_note'     => 'Cek panel lampu Taman Melati dan ganti unit lampu yang mati.',
                'completion_notes'      => 'Lampu taman sudah diganti dengan unit LED baru dan kembali menyala normal.',
                'photo_path'            => $photoPools[Category::LAMPU_MATI->value][1],
                'completion_photo_path' => $photoPools['completions'][count($photoPools['completions']) - 1],
            ],
        ];
    }

    /**
     * Bangun distribusi 204 laporan:
     * Status: 24 menunggu_verifikasi, 16 menunggu_penanganan, 40 diproses, 115 selesai, 9 ditolak.
     * Kategori: 92 jalan_rusak (~45%), 61 sampah (~30%), 51 lampu_mati (~25%).
     *
     * @param  array<int, array<string, mixed>>  $specialSpecs
     * @return array<int, array<string, mixed>>
     */
    private function build204Assignments(array $specialSpecs): array
    {
        $remainingStatuses = array_merge(
            array_fill(0, 113, ReportStatus::SELESAI->value),
            array_fill(0, 8, ReportStatus::DITOLAK->value),
            array_fill(0, 39, ReportStatus::DIPROSES->value),
            array_fill(0, 13, ReportStatus::MENUNGGU_PENANGANAN->value),
            array_fill(0, 23, ReportStatus::MENUNGGU_VERIFIKASI->value),
        );

        $remainingCategories = array_merge(
            array_fill(0, 88, Category::JALAN_RUSAK->value),
            array_fill(0, 59, Category::SAMPAH->value),
            array_fill(0, 49, Category::LAMPU_MATI->value),
        );

        // Acak kategori secara deterministik
        $this->deterministicShuffle($remainingCategories);

        // Kelompokkan status secara realistis (ID kecil dominan selesai/ditolak, ID besar dominan aktif/baru)
        $earlyZone  = array_slice($remainingStatuses, 0, 121); // 113 selesai + 8 ditolak
        $recentZone = array_slice($remainingStatuses, 121);    // 39 diproses + 13 menunggu_penanganan + 23 menunggu_verifikasi
        $this->deterministicShuffle($earlyZone);
        $this->deterministicShuffle($recentZone);
        $orderedStatuses = array_merge($earlyZone, $recentZone);

        $urgenciesQueue = [
            Urgency::TINGGI->value,
            Urgency::SEDANG->value,
            Urgency::SEDANG->value,
            Urgency::SEDANG->value,
            Urgency::SEDANG->value,
            Urgency::SEDANG->value,
            Urgency::RENDAH->value,
            Urgency::RENDAH->value,
            Urgency::RENDAH->value,
            Urgency::RENDAH->value,
            Urgency::RENDAH->value,
            Urgency::RENDAH->value,
            Urgency::RENDAH->value,
        ];

        $generalUrgencies = [
            Urgency::RENDAH->value,
            Urgency::SEDANG->value,
            Urgency::SEDANG->value,
            Urgency::TINGGI->value,
            Urgency::TINGGI->value,
            Urgency::DARURAT->value,
        ];

        $assignments = [];
        $remIdx      = 0;
        $queueUrgIdx = 0;

        for ($id = 1; $id <= self::TOTAL_REPORTS; $id++) {
            if (isset($specialSpecs[$id])) {
                $assignments[$id] = $specialSpecs[$id];
                continue;
            }

            $status   = $orderedStatuses[$remIdx];
            $category = $remainingCategories[$remIdx];
            $remIdx++;

            if ($status === ReportStatus::MENUNGGU_PENANGANAN->value) {
                // Pastikan di antrean menunggu_penanganan hanya ADU-198 yang darurat dan ADU-192 + 1 tiket yang tinggi
                // sehingga ADU-198, ADU-192, dan ADU-187 semuanya tampil di halaman 1 GET /officer/queue
                $urgency = $urgenciesQueue[$queueUrgIdx % count($urgenciesQueue)];
                $queueUrgIdx++;
            } else {
                $urgency = $generalUrgencies[$id % count($generalUrgencies)];
            }

            $assignments[$id] = [
                'status'   => $status,
                'category' => $category,
                'urgency'  => $urgency,
            ];
        }

        return $assignments;
    }

    /**
     * @param  array<int, string>  $items
     */
    private function deterministicShuffle(array &$items): void
    {
        for ($i = count($items) - 1; $i > 0; $i--) {
            $j         = mt_rand(0, $i);
            $tmp       = $items[$i];
            $items[$i] = $items[$j];
            $items[$j] = $tmp;
        }
    }

    /**
     * @return array{title: string, description: string, ai_summary: string}
     */
    private function pickTemplate(string $category, int $seed): array
    {
        $templates = [
            Category::JALAN_RUSAK->value => [
                [
                    'title'       => 'Aspal jalan mengelupas dan berlubang',
                    'description' => 'Permukaan aspal jalan mengelupas cukup lebar dan menimbulkan lubang sedalam ±10 cm yang membahayakan pengendara roda dua.',
                    'ai_summary'  => 'Kerusakan permukaan aspal berlubang di jalur warga berpotensi membahayakan pengendara sepeda motor.',
                ],
                [
                    'title'       => 'Jalan retak dan ambles di tepi saluran',
                    'description' => 'Bahu jalan mengalami keretakan dan mulai ambles setelah hujan deras kemarin sore sehingga menyempitkan lajur kendaraan.',
                    'ai_summary'  => 'Bahu jalan retak dan ambles di dekat saluran air memerlukan perbaikan struktural segera.',
                ],
                [
                    'title'       => 'Genangan air menutup lubang jalan lingkungan',
                    'description' => 'Terdapat cekungan jalan berlubang yang selalu tergenang air saat hujan sehingga pengendara sering terperosok.',
                    'ai_summary'  => 'Lubang jalan tertutup genangan air berisiko menyebabkan kecelakaan bagi pengguna jalan.',
                ],
                [
                    'title'       => 'Paving block jalan lingkungan rusak',
                    'description' => 'Susunan paving block di jalan lingkungan terlepas dan bergelombang sepanjang kurang lebih 4 meter.',
                    'ai_summary'  => 'Kerusakan paving block bergelombang di jalan permukiman menghambat mobilitas warga.',
                ],
            ],
            Category::SAMPAH->value => [
                [
                    'title'       => 'Tumpukan sampah rumah tangga belum diangkut',
                    'description' => 'Sampah rumah tangga menumpuk di pinggir jalan sejak tiga hari lalu dan mulai mengeluarkan bau tidak sedap.',
                    'ai_summary'  => 'Tumpukan sampah rumah tangga di tepi jalan memerlukan pengangkutan segera agar tidak mencemari lingkungan.',
                ],
                [
                    'title'       => 'Sampah liar menyumbat mulut drainase',
                    'description' => 'Kantong plastik dan sampah ranting menumpuk di depan mulut saluran drainase sehingga air meluap ke jalan saat hujan.',
                    'ai_summary'  => 'Sampah plastik menyumbat saluran drainase dan berpotensi memicu genangan di jalan.',
                ],
                [
                    'title'       => 'Bak penampungan sampah warga penuh dan meluber',
                    'description' => 'Wadah penampungan sampah sementara sudah penuh hingga sampah berserakan ke bahu jalan lingkungan.',
                    'ai_summary'  => 'Kapasitas bak sampah penuh dan meluber ke bahu jalan, membutuhkan jadwal angkut tambahan.',
                ],
            ],
            Category::LAMPU_MATI->value => [
                [
                    'title'       => 'Lampu PJU padam di persimpangan jalan',
                    'description' => 'Lampu penerangan jalan umum di titik persimpangan jalan padam total sejak dua malam lalu sehingga rawan bagi pengendara.',
                    'ai_summary'  => 'Lampu PJU padam di persimpangan mengurangi jarak pandang pengendara pada malam hari.',
                ],
                [
                    'title'       => 'Lampu jalan berkedip dan redup di malam hari',
                    'description' => 'Lampu penerangan jalan lingkungan hanya berkedip-kedip redup lalu mati saat malam hari sehingga jalan menjadi gelap.',
                    'ai_summary'  => 'Gangguan komponen lampu PJU menyebabkan penerangan jalan tidak berfungsi optimal.',
                ],
                [
                    'title'       => 'Deretan lampu jalan lingkungan mati total',
                    'description' => 'Tiga tiang lampu penerangan jalan di sepanjang blok permukiman mati bersamaan sejak kemarin malam.',
                    'ai_summary'  => 'Beberapa titik lampu jalan padam bersamaan, diduga akibat gangguan jaringan kabel PJU.',
                ],
            ],
        ];

        $list = $templates[$category] ?? $templates[Category::JALAN_RUSAK->value];

        return $list[$seed % count($list)];
    }

    private function pickAddress(int $seed): string
    {
        $streets = [
            'Jl. Melati',
            'Jl. Anggrek',
            'Jl. Mawar',
            'Jl. Kenanga',
            'Jl. Cempaka',
            'Jl. Dahlia',
            'Jl. Flamboyan',
            'Jl. Bougenville',
            'Jl. Kamboja',
            'Jl. Teratai',
        ];

        $kelurahan = [
            'Kel. Sukamaju',
            'Kel. Mekarsari',
            'Kel. Harapan Jaya',
            'Kel. Ciptakarya',
        ];

        $street = $streets[$seed % count($streets)];
        $no     = ($seed % 45) + 1;
        $kel    = $kelurahan[$seed % count($kelurahan)];

        return "{$street} No. {$no}, {$kel}, Kota Harmoni";
    }

    private function randomCoord(float $center, float $spread): float
    {
        // Hindari jarak terlalu dekat (<200m) dengan koordinat ADU-204 (-6.2088, 106.8456)
        $factor = (mt_rand(-1000, 1000) / 1000.0) * $spread;
        if (abs($factor) < 0.0022) {
            $factor = $factor >= 0 ? 0.0025 : -0.0025;
        }

        return round($center + $factor, 6);
    }

    private function defaultVerificationNote(string $category): string
    {
        return match ($category) {
            Category::JALAN_RUSAK->value => 'Laporan terverifikasi. Petugas diminta memeriksa kondisi permukaan jalan dan melakukan penambalan.',
            Category::SAMPAH->value      => 'Laporan terverifikasi. Segera jadwalkan armada kebersihan untuk mengangkut tumpukan sampah.',
            Category::LAMPU_MATI->value  => 'Laporan terverifikasi. Tim teknis PJU diminta memeriksa jaringan dan mengganti lampu yang padam.',
            default                      => 'Laporan telah diverifikasi oleh admin dan siap ditangani petugas.',
        };
    }

    private function defaultProgressNote(string $category): string
    {
        return match ($category) {
            Category::JALAN_RUSAK->value => 'Petugas sedang berada di lokasi untuk membersihkan permukaan jalan dan menyiapkan material tambal aspal.',
            Category::SAMPAH->value      => 'Tim kebersihan sedang mengangkut tumpukan sampah dan membersihkan sisa kotoran di bahu jalan.',
            Category::LAMPU_MATI->value  => 'Petugas teknis sedang mengecek panel kelistrikan tiang PJU dan menyiapkan penggantian bohlam LED.',
            default                      => 'Petugas lapangan sedang melakukan penanganan di lokasi laporan.',
        };
    }

    private function defaultCompletionNotes(string $category): string
    {
        return match ($category) {
            Category::JALAN_RUSAK->value => 'Permukaan jalan yang berlubang telah ditambal menggunakan aspal dingin dan dipadatkan hingga rata.',
            Category::SAMPAH->value      => 'Seluruh tumpukan sampah telah diangkut ke armada kebersihan dan lokasi sudah dibersihkan.',
            Category::LAMPU_MATI->value  => 'Komponen lampu PJU yang rusak telah diganti dengan unit baru dan lampu kembali menyala normal.',
            default                      => 'Penanganan laporan di lokasi telah diselesaikan oleh petugas.',
        };
    }
}
