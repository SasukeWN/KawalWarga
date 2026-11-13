# KawalWarga — Backend REST API (`backend/`)

Direktori ini berisi kode sumber **Backend REST API KawalWarga** berbasis **Laravel**, **SQLite (WAL mode)**, **Laravel Sanctum (Bearer Token)**, dan **Google Gemini API**.

> **Dokumentasi Utama Monorepo:** Silakan baca **[`../README.md`](../README.md)** di root repositori untuk panduan arsitektur lengkap, skenario pengujian, dan alur kerja sistem.

---

## Cara Cepat Menjalankan di Lokal

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate:fresh --seed
php artisan serve
```

Server API berjalan di `http://localhost:8000` (base endpoint: `http://localhost:8000/api/v1`).

## Menjalankan Pengujian Otomatis

```bash
php artisan test
```

## Tautan Dokumentasi (`../docs/`)

- [Panduan Dev Lokal (`../docs/LOCAL-DEV.md`)](../docs/LOCAL-DEV.md) — Setup dev lokal, variabel `.env`, & troubleshooting.
