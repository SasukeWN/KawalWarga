# Panduan Deploy Production & Checklist Integrasi — KawalWarga API

Dokumen ini berisi panduan langkah demi langkah untuk men-deploy backend **KawalWarga REST API** (Laravel + SQLite WAL + Sanctum + Gemini AI) ke shared hosting **cPanel (Anymhost)** pada subdomain `https://api.DOMAINKITA.com`, serta daftar periksa (checklist) integrasi akhir dengan frontend Next.js (`https://DOMAINKITA.com`).

---

## 1. Persiapan Server & Subdomain di cPanel

1. **Versi PHP & Ekstensi (`Select PHP Version`)**:
   - Pilih **PHP 8.2** atau **PHP 8.3**.
   - Pastikan ekstensi berikut dicentang/aktif:
     `pdo_sqlite`, `sqlite3`, `mbstring`, `openssl`, `fileinfo`, `curl`, `zip`, `tokenizer`, `xml`, `ctype`, `gd`.
   - Pada tab **Options** (PHP INI), sesuaikan batas berikut agar upload foto dan panggilan AI berjalan lancar:
     - `upload_max_filesize = 8M`
     - `post_max_size = 10M`
     - `max_execution_time = 30`
     - `memory_limit = 256M`

2. **Struktur Direktori (di Luar `public_html`)**:
   - Buat folder aplikasi di luar `public_html`, misalnya:
     `/home/USER/kawalwarga-api`
   - Upload seluruh isi folder `backend/` ke `/home/USER/kawalwarga-api`.
   - Dengan struktur ini, file sensitif (`.env`, `database/database.sqlite`, `storage/`) **tidak pernah berada di dalam `public_html`** dan tidak dapat diakses langsung lewat URL publik.

3. **Subdomain & SSL (`Domains` / `Subdomains`)**:
   - Buat subdomain: `api.DOMAINKITA.com`
   - Arahkan **Document Root** subdomain tepat ke folder `public`:
     `/home/USER/kawalwarga-api/public`
   - Buka menu **SSL/TLS Status (AutoSSL)** dan jalankan **Run AutoSSL** hingga sertifikat HTTPS aktif untuk `DOMAINKITA.com` dan `api.DOMAINKITA.com`.

---

## 2. Konfigurasi `.env` Production

Buat file `/home/USER/kawalwarga-api/.env` langsung di server (jangan pernah meng-commit `.env` ke Git):

```dotenv
APP_NAME=KawalWarga
APP_ENV=production
APP_KEY=base64:ISI_DENGAN_HASIL_PHP_ARTISAN_KEY_GENERATE
APP_DEBUG=false
APP_URL=https://api.DOMAINKITA.com
APP_TIMEZONE=Asia/Jakarta
APP_LOCALE=id
APP_FALLBACK_LOCALE=id
APP_FAKER_LOCALE=id_ID

LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=warning

DB_CONNECTION=sqlite
DB_DATABASE=/home/USER/kawalwarga-api/database/database.sqlite

SESSION_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
CACHE_STORE=file

# Origin Frontend untuk CORS
FRONTEND_URL=https://DOMAINKITA.com

# Google Gemini API (wajib diisi di server)
GEMINI_API_KEY=ISI_GEMINI_API_KEY_DI_SINI
GEMINI_MODEL=gemini-2.5-flash
AI_TIMEOUT=12

# Kunci proteksi endpoint GET /api/v1/health/ai
HEALTH_KEY=ISI_RANDOM_STRING_PANJANG_DI_SINI

# Masa berlaku token Sanctum (720 menit = 12 jam)
SANCTUM_TOKEN_EXPIRATION=720

# Password akun demo (ganti sebelum pengiriman final)
DEMO_ADMIN_PASSWORD=password123
DEMO_OFFICER_PASSWORD=password123
```

---

## 3. Instalasi Dependensi (`vendor/`)

### Opsi A — Tersedia Terminal / SSH di cPanel
```bash
cd ~/kawalwarga-api
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
```

### Opsi B — Tanpa Terminal / SSH
1. Di laptop lokal, jalankan:
   ```bash
   cd backend
   composer install --no-dev --optimize-autoloader
   ```
2. Kompres folder `vendor/` menjadi `vendor.zip`, upload ke `/home/USER/kawalwarga-api/`, lalu ekstrak melalui **cPanel File Manager**.

---

## 4. Database SQLite, Seeding Data Demo & Folder Upload

Pastikan foto contoh kategori sudah ditaruh di `database/seeders/images/` sebelum seeding dijalankan.

### Opsi A — Dengan Terminal / SSH di cPanel
```bash
cd ~/kawalwarga-api
touch database/database.sqlite
php artisan migrate:fresh --seed --force
```

### Opsi B — Tanpa Terminal / SSH (Pre-built dari Lokal)
1. Di laptop lokal, pastikan `APP_URL=https://api.DOMAINKITA.com` saat menyiapkan atau biarkan path relatif tersimpan di DB (accessor `photo_url` otomatis membaca `APP_URL` aktif di server):
   ```bash
   cd backend
   php artisan migrate:fresh --seed
   ```
2. Upload file `backend/database/database.sqlite` ke `/home/USER/kawalwarga-api/database/database.sqlite`.
3. Upload seluruh isi `backend/public/uploads/` (termasuk `.htaccess`, `reports/`, dan `completions/`) ke `/home/USER/kawalwarga-api/public/uploads/`.

---

## 5. Izin Tulis Direktori (`chmod 775`)

SQLite dalam mode WAL membutuhkan izin tulis pada **file `.sqlite` sekaligus folder `database/`** (untuk membuat file `-wal` dan `-shm`). Jalankan perintah berikut (atau atur lewat **Change Permissions** di File Manager):

```bash
cd ~/kawalwarga-api
chmod -R 775 storage bootstrap/cache database public/uploads
chmod 664 database/database.sqlite
```

---

## 6. Optimasi Cache & Paksa HTTPS

### 6.1 Cache Konfigurasi & Route (via SSH)
```bash
cd ~/kawalwarga-api
php artisan config:cache
php artisan route:cache
```
*(Bila mengubah isi `.env` di kemudian hari, jalankan ulang `php artisan config:cache`).*

### 6.2 Paksa HTTPS & Teruskan Header `Authorization` (`public/.htaccess`)
Pastikan `/home/USER/kawalwarga-api/public/.htaccess` memuat aturan berikut:

```apache
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    # Paksa HTTPS di production
    RewriteCond %{HTTPS} !=on
    RewriteCond %{HTTP_HOST} !^localhost [NC]
    RewriteCond %{HTTP_HOST} !^127\.0\.0\.1
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

    # Teruskan Header Authorization ke PHP (wajib untuk Bearer token Sanctum di cPanel)
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Handle X-XSRF-Token Header
    RewriteCond %{HTTP:x-xsrf-token} .
    RewriteRule .* - [E=HTTP_X_XSRF_TOKEN:%{HTTP:X-XSRF-Token}]

    # Redirect Trailing Slashes If Not A Folder...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    # Send Requests To Front Controller...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>
```

Dan pastikan `/home/USER/kawalwarga-api/public/uploads/.htaccess` tetap ada untuk menonaktifkan eksekusi script di folder upload:
```apache
<FilesMatch "\.(php|phtml|php3|php4|php5|php7|php8|phar|pl|py|cgi|sh)$">
    Require all denied
</FilesMatch>
Options -Indexes -ExecCGI
```

---

## 7. Pengamanan Akun Demo Sebelum Pengiriman Final

Seeder hanya membuat 2 akun resmi sesuai kontrak (`admin@kawalwarga.test` dan `budi@kawalwarga.test`). Tidak ada endpoint registrasi publik maupun akun tersembunyi lainnya.

Sebelum pengiriman final (atau setelah sesi penjurian bila diperlukan):
1. Ubah `DEMO_ADMIN_PASSWORD` dan `DEMO_OFFICER_PASSWORD` di `.env` server, atau
2. Jalankan perintah berikut via SSH untuk memperbarui password tanpa menghapus data laporan:
   ```bash
   cd ~/kawalwarga-api
   php artisan db:seed --class=UserSeeder --force
   ```
3. Jangan lupa informasikan kredensial terbaru kepada tim / juri di lembar pengumpulan lomba.

---

## 8. Sinkronisasi `API-Contract.md` & Catatan Integrasi Frontend

- **Versi Kontrak Aktif**: **`v1.1` (2026-11-08)** — identik antara `docs/API-Contract.md` (root repo) dan `backend/docs/API-Contract.md`.
- **Hal Penting saat Integrasi Frontend (`Dandy`)**:
  1. **Base URL Frontend**: Set `NEXT_PUBLIC_API_URL=https://api.DOMAINKITA.com/api/v1` saat menjalankan `npm run build` (static export Next.js).
  2. **Header Wajib**: Semua request wajib menyertakan `Accept: application/json`. Untuk endpoint `/admin/*`, `/officer/*`, `/auth/me`, dan `/auth/logout`, sertakan `Authorization: Bearer <token>`.
  3. **Upload Foto (`multipart/form-data`)**: Pada `POST /reports` dan `POST /officer/reports/{ticket_id}/complete`, jangan set header `Content-Type` secara manual di `fetch`/`axios` saat mengirim `FormData` (biarkan browser menambahkan `boundary` otomatis). Kompres foto di sisi client (maks sisi 1600 px, target `< 1.5 MB`) sebelum dikirim.
  4. **Penanganan HTTP 401**: Bila endpoint terproteksi mengembalikan `401`, hapus token dari `localStorage` dan arahkan pengguna ke halaman `/login`.

---

## 9. Checklist Uji Akhir di Server Production

Jalankan daftar periksa ini secara berurutan setelah backend dan frontend ter-deploy:

- [ ] **1. Health Check Database (`GET /api/v1/health`)**
  - Buka `https://api.DOMAINKITA.com/api/v1/health`
  - Pastikan status HTTP `200`, `data.status = "ok"`, `data.db = "ok"`, dan waktu berzona `+07:00`.
- [ ] **2. Health Check Gemini AI (`GET /api/v1/health/ai`)**
  - Kirim request dengan header `X-Health-Key: <HEALTH_KEY>`
  - Pastikan status HTTP `200`, `data.ai = "ok"`, dan model Gemini merespons dalam `< 12 detik`.
- [ ] **3. Verifikasi CORS dari Domain Frontend**
  - Buka `https://DOMAINKITA.com` di browser, buka **DevTools → Network**, pastikan preflight `OPTIONS` dan request ke `https://api.DOMAINKITA.com/api/v1/*` memiliki header `Access-Control-Allow-Origin: https://DOMAINKITA.com` tanpa error CORS.
- [ ] **4. Login Admin & Petugas (`POST /api/v1/auth/login` & `GET /api/v1/auth/me`)**
  - Login sebagai Admin (`admin@kawalwarga.test`) dan Petugas (`budi@kawalwarga.test`).
  - Pastikan Bearer token diterima, disimpan di `localStorage`, dan halaman Admin/Petugas terbuka sesuai role.
- [ ] **5. Kirim Laporan Baru dengan Foto dari Browser & HP (`POST /api/v1/reports`)**
  - Uji kirim laporan langsung dari kamera/galeri HP di `https://DOMAINKITA.com/lapor`.
  - Pastikan kompresi foto client berjalan, respons `201 Created` mengembalikan `ticket_id` (`ADU-205`), foto dapat dibuka lewat `photo_url` HTTPS, dan hasil analisis AI (`title`, `category`, `urgency`, `summary`, `duplicates`) terisi di halaman detail Admin.
- [ ] **6. Lacak Laporan Publik (`GET /api/v1/reports/track/{ticket_id}`)**
  - Uji pencarian `#adu-204`, `ADU-176`, `ADU-183`, `ADU-200`, dan tiket baru `ADU-205`.
  - Pastikan stepper status, timeline, kartu *"Kabar terbaru petugas"* (`ADU-200`), alasan penolakan (`ADU-183`), serta foto Sebelum & Sesudah (`ADU-176`) tampil dengan benar, dan tidak ada nomor telepon pelapor di payload JSON.
- [ ] **7. Verifikasi Admin (`POST /admin/reports/{id}/approve` & `/reject`)**
  - Setujui laporan baru `ADU-205` dari dashboard Admin; pastikan berpindah ke status `menunggu_penanganan`.
- [ ] **8. Alur Petugas Lapangan (`queue`, `take`, `progress`, `complete`)**
  - Login sebagai Budi Santoso, lihat `ADU-205` di tab **Siap Ditangani**, klik **Ambil Laporan**, tambahkan **Catatan Progres**, lalu **Selesaikan Laporan** dengan unggah foto bukti.
  - Cek kembali di halaman Lacak Warga bahwa status `ADU-205` sudah **Selesai** lengkap dengan foto Sebelum & Sesudah.
- [ ] **9. Dashboard Admin (`summary`, `map`, `ai-insight`)**
  - Buka Dashboard Admin; pastikan angka kartu ringkasan, persentase kategori, pin peta persebaran, serta 3 poin **Ringkasan Eksekutif AI** (beserta tombol Regenerate) tampil tanpa error.
- [ ] **10. Chatbot AI (`POST /api/v1/chatbot`)**
  - Uji tanya status `#ADU-204`, fitur **Lupa ID Tiket** dengan nomor WhatsApp (`081299990204`), dan pertanyaan panduan cara melapor. Pastikan balasan ramah dan kartu tiket muncul.
