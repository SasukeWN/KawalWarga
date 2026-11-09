# Foto Contoh Demo (`DemoReportSeeder`)

Taruh file foto contoh (`.jpg`, `.jpeg`, atau `.png`) di folder ini sebelum menjalankan `php artisan migrate:fresh --seed`.

## Konvensi Nama File yang Didukung

Seeder akan otomatis mencari foto berdasarkan awalan nama file (atau subfolder dengan nama yang sama):

1. **Kategori Jalan Rusak** (minimal 3 foto):
   - `jalan_rusak_1.jpg`, `jalan_rusak_2.jpg`, `jalan_rusak_3.jpg` (atau nama file apa pun yang mengandung kata `jalan`, maupun di dalam subfolder `jalan_rusak/`)
2. **Kategori Sampah** (minimal 3 foto):
   - `sampah_1.jpg`, `sampah_2.jpg`, `sampah_3.jpg` (atau nama file yang mengandung kata `sampah`, maupun di dalam subfolder `sampah/`)
3. **Kategori Lampu Mati** (minimal 3 foto):
   - `lampu_mati_1.jpg`, `lampu_mati_2.jpg`, `lampu_mati_3.jpg` (atau nama file yang mengandung kata `lampu`, maupun di dalam subfolder `lampu_mati/`)
4. **Foto Sesudah Perbaikan / Completion** (minimal 1 foto):
   - `sesudah_1.jpg` (atau nama file yang mengandung kata `sesudah`, `after`, atau `completion`, maupun di dalam subfolder `sesudah/`)

> **Catatan:** Bila foto belum tersedia di folder ini, `DemoReportSeeder` akan otomatis membuat gambar placeholder sederhana di disk `uploads` agar proses seeding tidak error.
