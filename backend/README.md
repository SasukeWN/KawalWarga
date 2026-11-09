# KawalWarga — Backend REST API

Backend REST API untuk **KawalWarga** (sistem pelaporan masalah infrastruktur & lingkungan warga berbantuan AI), dibangun dengan **Laravel**, **SQLite (WAL mode)**, **Laravel Sanctum (Bearer Token)**, dan **Google Gemini API**.

---

## 1. Prasyarat
- **PHP** 8.2+ (dengan ekstensi: `pdo_sqlite`, `sqlite3`, `mbstring`, `openssl`, `fileinfo`, `curl`, `gd`)
- **Composer** 2.x

---

## 2. Cara Menjalankan di Lokal

```bash
cd backend

# 1. Pasang dependensi
composer install

# 2. Salin konfigurasi environment & buat APP_KEY
cp .env.example .env
php artisan key:generate

# 3. Buat file database SQLite (bila belum ada) & jalankan migrasi + data demo (204 laporan)
touch database/database.sqlite
php artisan migrate:fresh --seed

# 4. Jalankan server development (http://localhost:8000)
php artisan serve
```

---

## 3. Variabel Environment (`.env`)

| Variabel | Contoh Nilai | Keterangan |
|---|---|---|
| `APP_NAME` | `KawalWarga` | Nama aplikasi |
| `APP_ENV` | `local` / `production` | Environment aplikasi |
| `APP_DEBUG` | `false` (di production) | Jangan aktifkan `true` di production |
| `APP_URL` | `http://localhost:8000` | Base URL backend (dipakai membentuk `photo_url`) |
| `APP_TIMEZONE` | `Asia/Jakarta` | Zona waktu WIB (`+07:00`) |
| `APP_LOCALE` | `id` | Bahasa pesan aplikasi |
| `FRONTEND_URL` | `http://localhost:3000` | Origin frontend yang diizinkan oleh CORS |
| `DB_CONNECTION` | `sqlite` | Koneksi database SQLite (mode WAL aktif otomatis) |
| `GEMINI_API_KEY` | `AIzaSy...` | API Key Google Gemini (hanya di server) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model Gemini yang digunakan |
| `AI_TIMEOUT` | `12` | Batas waktu panggilan HTTP ke Gemini (detik) |
| `HEALTH_KEY` | `rahasia-health-check` | Header `X-Health-Key` untuk endpoint `/api/v1/health/ai` |
| `SANCTUM_TOKEN_EXPIRATION` | `720` | Masa berlaku Bearer token dalam menit (12 jam) |

---

## 4. Seeding & Akun Demo

Jalankan perintah berikut untuk me-reset database dan mengisi ulang akun serta **204 laporan demo** (termasuk tiket khusus `ADU-204`, `ADU-200`, `ADU-198`, `ADU-192`, `ADU-187`, `ADU-183`, `ADU-176`, `ADU-172`):

```bash
php artisan migrate:fresh --seed
```

- **Akun Demo (`UserSeeder`)**:
  | Role | Nama | Jabatan | Email | Password |
  |---|---|---|---|---|
  | `admin` | Nadia Putri | Admin verifikator | `admin@kawalwarga.test` | `password123` |
  | `petugas` | Budi Santoso | Petugas lapangan | `budi@kawalwarga.test` | `password123` |
- **Foto Contoh Demo**: Taruh foto masalah per kategori di [`database/seeders/images/`](database/seeders/images/README.md) sebelum seeding. Bila folder kosong, seeder otomatis membuat gambar placeholder.
- **Nomor Tiket Berikutnya**: Setelah seeding 204 laporan, laporan baru berikutnya otomatis mendapat nomor **`ADU-205`**.

---

## 5. Pengujian (`php artisan test`)

Seluruh pengujian menggunakan SQLite `:memory:` dan `Http::fake()` (tanpa memanggil Gemini asli):

```bash
php artisan test
```

Untuk pengujian manual dari VS Code REST Client atau Thunder Client, gunakan file smoke test:
- [`docs/api-smoke-test.http`](docs/api-smoke-test.http)

---

## 6. Daftar Ringkas Endpoint (`/api/v1`)

| Method | Endpoint | Auth / Role | Deskripsi |
|---|---|---|---|
| `GET` | `/api/v1/health` | Publik | Cek status server & koneksi SQLite |
| `GET` | `/api/v1/health/ai` | `X-Health-Key` | Cek koneksi keluar ke Google Gemini API |
| `POST` | `/api/v1/reports` | Publik (`5/mnt/IP`) | Kirim laporan warga (`multipart/form-data`) + analisis AI |
| `GET` | `/api/v1/reports/track/{ticket_id}` | Publik | Lacak status, timeline, kabar petugas, & bukti selesai |
| `POST` | `/api/v1/chatbot` | Publik (`10/mnt/IP`) | Chatbot AI: cek tiket, lupa ID tiket (via WA), panduan |
| `POST` | `/api/v1/auth/login` | Publik (`10/mnt/IP`) | Login admin / petugas (Sanctum Bearer token) |
| `POST` | `/api/v1/auth/logout` | `Bearer` | Hapus token yang sedang dipakai |
| `GET` | `/api/v1/auth/me` | `Bearer` | Profil pengguna yang sedang login |
| `GET` | `/api/v1/admin/reports` | `admin` | Daftar laporan (filter `search`, `status`, `category`, `urgency`, `from`, `to`, `sort`) |
| `GET` | `/api/v1/admin/reports/{ticket_id}` | `admin` | Detail laporan lengkap + rekomendasi AI & kandidat duplikat |
| `POST` | `/api/v1/admin/reports/{ticket_id}/approve` | `admin` | Setujui laporan (`menunggu_verifikasi` → `menunggu_penanganan`) |
| `POST` | `/api/v1/admin/reports/{ticket_id}/reject` | `admin` | Tolak laporan dengan alasan wajib (`menunggu_verifikasi` → `ditolak`) |
| `POST` | `/api/v1/admin/reports/{ticket_id}/reanalyze` | `admin` | Analisis ulang laporan dengan Gemini AI |
| `GET` | `/api/v1/admin/dashboard/summary` | `admin` | Ringkasan total per status & per kategori efektif |
| `GET` | `/api/v1/admin/dashboard/map` | `admin` | Titik koordinat laporan terverifikasi untuk peta persebaran |
| `GET` | `/api/v1/admin/dashboard/ai-insight` | `admin` | Ringkasan eksekutif AI (3 poin, cache 6 jam + fallback aturan) |
| `POST` | `/api/v1/admin/dashboard/ai-insight/regenerate` | `admin` | Buat ulang ringkasan eksekutif AI untuk periode terpilih |
| `GET` | `/api/v1/officer/queue` | `petugas` | Antrean laporan `menunggu_penanganan` (urut urgensi / terbaru) |
| `GET` | `/api/v1/officer/my-reports` | `petugas` | Daftar laporan yang ditangani petugas (`diproses` / `selesai`) |
| `GET` | `/api/v1/officer/reports/{ticket_id}` | `petugas` | Detail laporan untuk petugas (tanpa data AI & nomor telepon warga) |
| `POST` | `/api/v1/officer/reports/{ticket_id}/take` | `petugas` | Ambil laporan secara atomik (`menunggu_penanganan` → `diproses`) |
| `POST` | `/api/v1/officer/reports/{ticket_id}/progress` | `petugas` | Tambah catatan pembaruan progres penanganan |
| `POST` | `/api/v1/officer/reports/{ticket_id}/complete` | `petugas` | Selesaikan laporan dengan catatan & foto bukti (`multipart/form-data`) |

---

## 7. Referensi Dokumentasi
- [API Contract v1.1 (`docs/API-Contract.md`)](../docs/API-Contract.md) — Acuan tunggal kontrak request/response antara Frontend dan Backend.
- [Backend PRD (`docs/Backend-PRD.md`)](../docs/Backend-PRD.md) — Spesifikasi arsitektur, alur kerja, AI prompt, dan kriteria penerimaan backend.
- [Panduan Deploy & Checklist Integrasi (`docs/DEPLOY.md`)](docs/DEPLOY.md) — Langkah deploy ke cPanel (`api.DOMAINKITA.com`), konfigurasi `.env` production, dan checklist uji akhir.
- [API Smoke Test (`docs/api-smoke-test.http`)](docs/api-smoke-test.http) — Koleksi request uji manual seluruh endpoint dari awal sampai akhir.
