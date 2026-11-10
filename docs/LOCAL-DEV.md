# Panduan Pengembangan Lokal (Local Dev Setup) — KawalWarga Monorepo

Dokumen ini menjelaskan cara menyiapkan dan menjalankan **Backend Laravel (`http://localhost:8000`)** dan **Frontend Next.js (`http://localhost:3000`)** secara berdampingan di satu komputer, daftar lengkap variabel environment di kedua sisi, cara verifikasi konektivitas & CORS, serta solusi atas kendala umum (*troubleshooting*).

---

## 1. Prasyarat Sistem

| Komponen | Versi Minimum | Cara Cek |
|---|---|---|
| **PHP** | `8.2+` (dengan ekstensi `pdo_sqlite`, `sqlite3`, `mbstring`, `openssl`, `fileinfo`, `curl`, `gd`) | `php -v` & `php -m` |
| **Composer** | `2.x` | `composer -V` |
| **Node.js** | `20.x LTS` atau `22.x LTS` | `node -v` |
| **npm** | `10.x+` | `npm -v` |
| **Git** | `2.30+` | `git --version` |

---

## 2. Langkah Menyiapkan & Menjalankan

### A. Menyiapkan Backend (`backend/` — Port `8000`)

Buka **Terminal 1**:

```bash
cd backend

# 1. Pasang dependensi PHP
composer install

# 2. Salin konfigurasi environment & buat APP_KEY
cp .env.example .env
php artisan key:generate

# 3. Pastikan file database SQLite tersedia, lalu jalankan migrasi & seeder (204 laporan demo)
touch database/database.sqlite
php artisan migrate:fresh --seed

# 4. Jalankan server lokal di http://localhost:8000
php artisan serve --host=127.0.0.1 --port=8000
```

> **Penting:** Buka `backend/.env` dan isi `GEMINI_API_KEY` serta `GEMINI_MODEL=gemini-2.5-flash` agar fitur AI (analisis laporan otomatis, ringkasan eksekutif dashboard, dan chatbot) terhubung ke Google Gemini API. Bila dikosongkan, sistem otomatis menggunakan *fallback* tanpa membuat request gagal.

---

### B. Menyiapkan Frontend (`frontend/` — Port `3000`)

Buka **Terminal 2**:

```bash
cd frontend

# 1. Pasang dependensi Node.js
npm install

# 2. Buat file .env.local (terhubung ke API lokal, tanpa mock)
cp .env.example .env.local
```

Pastikan isi `frontend/.env.local` adalah:
```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_USE_MOCK=false
```

Lalu jalankan server pengembangan Next.js:
```bash
npm run dev
```

Buka browser di **`http://localhost:3000`**.

---

### C. Menjalankan Keduanya Sekaligus (Opsional)

Tersedia skrip ringan tanpa dependensi tambahan di folder `scripts/`:

- **Windows (PowerShell)**:
  ```powershell
  .\scripts\dev.ps1
  ```
- **macOS / Linux / Git Bash**:
  ```bash
  bash scripts/dev.sh
  ```

---

## 3. Daftar Variabel Environment Kedua Sisi

### 3.1 Backend (`backend/.env` — *Jangan di-commit*)

| Variabel | Nilai Lokal yang Wajib Cocok | Keterangan |
|---|---|---|
| `APP_NAME` | `KawalWarga` | Nama aplikasi |
| `APP_ENV` | `local` | Mode pengembangan lokal |
| `APP_DEBUG` | `true` | Menampilkan detail error saat lokal (`false` di production) |
| `APP_URL` | `http://localhost:8000` | Digunakan untuk membentuk URL absolut foto (`photo_url`) |
| `APP_TIMEZONE` | `Asia/Jakarta` | Zona waktu WIB (`+07:00`) |
| `APP_LOCALE` | `id` | Bahasa pesan validasi |
| `FRONTEND_URL` | `http://localhost:3000` | Origin frontend yang diizinkan oleh CORS (tanpa `/` di akhir) |
| `DB_CONNECTION` | `sqlite` | Driver database SQLite (mode WAL otomatis aktif) |
| `DB_DATABASE` | `/path/absolut/ke/backend/database/database.sqlite` | Path absolut ke file SQLite |
| `GEMINI_API_KEY` | `AIzaSy...` | API Key dari Google AI Studio |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Nama model Gemini |
| `AI_TIMEOUT` | `12` | Batas waktu HTTP ke Gemini dalam detik |
| `HEALTH_KEY` | `kawalwarga-health-secret` | Kunci untuk header `X-Health-Key` pada `GET /api/v1/health/ai` |
| `SANCTUM_TOKEN_EXPIRATION` | `720` | Masa aktif token login (12 jam) |

### 3.2 Frontend (`frontend/.env.local` — *Jangan di-commit*)

| Variabel | Nilai Lokal yang Wajib Cocok | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Base URL endpoint REST API backend (tanpa `/` di akhir) |
| `NEXT_PUBLIC_USE_MOCK` | `false` | `false` = panggil backend nyata; `true` = mode simulasi in-memory |

---

## 4. Verifikasi Konektivitas (`curl`)

Setelah kedua server berjalan, jalankan 3 perintah berikut untuk memastikan koneksi, CORS, dan autentikasi berfungsi:

### 4.1 Cek Health Endpoint
```bash
curl -i -H "Accept: application/json" http://localhost:8000/api/v1/health
```
Respons yang diharapkan (`200 OK`):
```json
{"success":true,"message":"OK","data":{"app":"ok","db":"ok","time":"2026-11-10T11:07:27+07:00"}}
```

### 4.2 Cek Preflight CORS dari Origin `http://localhost:3000`
```bash
curl -i -X OPTIONS http://localhost:8000/api/v1/reports \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type"
```
Header respons yang diharapkan (`204 No Content`):
- `Access-Control-Allow-Origin: http://localhost:3000`
- `Access-Control-Allow-Methods: *` (atau memuat `POST, GET, OPTIONS`)
- `Access-Control-Allow-Headers: authorization, content-type`

### 4.3 Cek Login Menggunakan Akun Seeder
```bash
curl -i -X POST http://localhost:8000/api/v1/auth/login \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kawalwarga.test","password":"password123"}'
```
Respons yang diharapkan (`200 OK`): mengembalikan `data.token`, `data.token_type = "Bearer"`, dan `data.user` (`Nadia Putri`, `role = "admin"`).

---

## 5. Troubleshooting (Masalah Umum & Solusi)

### 1. Error CORS (`blocked by CORS policy` di Console Browser)
- **Penyebab**: Nilai `FRONTEND_URL` di `backend/.env` tidak cocok dengan URL yang dibuka di browser (misal membuka `http://127.0.0.1:3000` padahal origin yang diizinkan `http://localhost:3000`, atau ada tanda `/` di akhir `FRONTEND_URL`).
- **Solusi**:
  1. Pastikan `FRONTEND_URL=http://localhost:3000` (tanpa garis miring di akhir) dan buka frontend lewat `http://localhost:3000`.
  2. Jalankan `cd backend && php artisan config:clear` lalu restart `php artisan serve`.

### 2. Port `8000` atau `3000` Bentrok (`Address already in use`)
- **Penyebab**: Ada proses `php` atau `node` lama yang masih berjalan di latar belakang.
- **Solusi**:
  - **Windows (PowerShell)**:
    ```powershell
    Get-NetTCPConnection -LocalPort 8000,3000 -ErrorAction SilentlyContinue | Select-Object LocalPort,OwningProcess
    Stop-Process -Id <PID> -Force
    ```
  - **macOS / Linux**:
    ```bash
    lsof -ti:8000,3000 | xargs kill -9
    ```

### 3. SQLite Tidak Bisa Ditulis (`Database file at path [...] does not exist` atau `attempt to write a readonly database`)
- **Penyebab**: File `backend/database/database.sqlite` belum dibuat, path `DB_DATABASE` salah, atau folder `backend/database/` tidak memiliki izin tulis (SQLite mode WAL memerlukan izin tulis pada folder `database/` untuk membuat file `.sqlite-wal` dan `.sqlite-shm`).
- **Solusi**:
  1. Buat file bila belum ada: `touch backend/database/database.sqlite`.
  2. Gunakan path absolut dengan garis miring maju (`/`) pada `DB_DATABASE` di `backend/.env`.
  3. Di Linux/macOS/cPanel: `chmod -R 775 backend/database backend/storage && chmod 664 backend/database/database.sqlite`.

### 4. Versi PHP atau Node.js Tidak Sesuai / Ekstensi `pdo_sqlite` Belum Aktif
- **Penyebab**: `composer install` gagal karena PHP `< 8.2`, atau migrasi gagal dengan pesan `could not find driver`.
- **Solusi**:
  - Di **Laragon (Windows)**: Klik kanan ikon Laragon → **PHP** → pilih versi **PHP 8.2 / 8.3**, lalu buka **Quick Settings** dan centang `pdo_sqlite` serta `sqlite3`.
  - Pastikan Node.js berada di versi LTS (`>= 20.x`) sebelum menjalankan `npm install` dan `npm run dev`.
