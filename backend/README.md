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

- [API Contract v1.1 (`../docs/API-Contract.md`)](../docs/API-Contract.md) — Sumber kebenaran tunggal kontrak API.
- [Backend PRD (`../docs/Backend-PRD.md`)](../docs/Backend-PRD.md) — Spesifikasi teknis & prompt AI backend.
- [Integration PRD (`../docs/Integration-PRD.md`)](../docs/Integration-PRD.md) — Rencana penyatuan, uji E2E, dan penyerahan.
- [Panduan Deploy (`../docs/DEPLOY.md`)](../docs/DEPLOY.md) — Panduan deploy cPanel & checklist produksi.
- [API Smoke Test (`../docs/api-smoke-test.http`)](../docs/api-smoke-test.http) — Koleksi request uji manual REST Client / Thunder Client.
