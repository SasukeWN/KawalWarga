# KawalWarga — Backend API

Backend REST API untuk **KawalWarga**, platform pengaduan publik berbasis AI (Laravel + SQLite + Laravel Sanctum + Google Gemini API).

Dokumen acuan:
- [`docs/API-Contract.md`](docs/API-Contract.md) — Kontrak API v1.1 (sumber kebenaran field, enum, kode HTTP)
- [`docs/Backend-PRD.md`](docs/Backend-PRD.md) — Arsitektur, skema database, aturan bisnis, dan modul AI

---

## Prasyarat

- PHP 8.2+ dengan ekstensi: `pdo_sqlite`, `sqlite3`, `mbstring`, `openssl`, `fileinfo`, `curl`
- Composer 2.x

---

## Cara Menjalankan Lokal

```bash
# 1. Install dependensi PHP
composer install

# 2. Salin konfigurasi environment
cp .env.example .env

# 3. Generate application key
php artisan key:generate

# 4. Buat file database SQLite (jika belum ada) dan jalankan migrasi
touch database/database.sqlite
php artisan migrate

# 5. Jalankan server pengembangan lokal (http://localhost:8000)
php artisan serve
```

Uji endpoint kesehatan:
```bash
curl -i http://localhost:8000/api/v1/health
```

---

## Daftar Variabel Environment (`.env`)

| Variabel | Deskripsi | Contoh / Default |
|---|---|---|
| `APP_NAME` | Nama aplikasi | `KawalWarga` |
| `APP_ENV` | Lingkungan aplikasi (`local` / `production`) | `local` |
| `APP_KEY` | Kunci enkripsi Laravel (`php artisan key:generate`) | `base64:...` |
| `APP_DEBUG` | Mode debug (`false` wajib di production) | `true` |
| `APP_URL` | URL dasar backend (dipakai untuk URL absolut foto) | `http://localhost:8000` |
| `APP_TIMEZONE` | Zona waktu aplikasi | `Asia/Jakarta` |
| `APP_LOCALE` | Bahasa pesan aplikasi & validasi | `id` |
| `FRONTEND_URL` | Origin frontend yang diizinkan CORS | `http://localhost:3000` |
| `DB_CONNECTION` | Driver database | `sqlite` |
| `DB_DATABASE` | Path absolut ke file SQLite (opsional, default `database/database.sqlite`) | — |
| `CACHE_STORE` | Driver cache (gunakan `file` untuk cPanel) | `file` |
| `SESSION_DRIVER` | Driver session | `file` |
| `QUEUE_CONNECTION` | Driver queue (semua proses sinkron) | `sync` |
| `GEMINI_API_KEY` | API Key Google AI Studio (Gemini) | — |
| `GEMINI_MODEL` | Nama model Gemini dari AI Studio (jangan di-hardcode di kode) | — |
| `AI_TIMEOUT` | Batas waktu panggilan AI dalam detik (tanpa retry) | `12` |
| `HEALTH_KEY` | Kunci rahasia untuk header `X-Health-Key` pada `GET /api/v1/health/ai` | — |
| `SANCTUM_TOKEN_EXPIRATION` | Masa berlaku token Bearer dalam menit (`720` = 12 jam) | `720` |
