# KawalWarga — Frontend Next.js (`frontend/`)

Direktori ini berisi kode sumber **Frontend KawalWarga** berbasis **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, dan **Leaflet** yang dikompilasi sebagai **Static Export murni (`output: 'export'`)**.

> **Dokumentasi Utama Monorepo:** Silakan baca **[`../README.md`](../README.md)** di root repositori untuk panduan arsitektur lengkap, tangkapan layar, akun demo, dan panduan deploy gabungan.

---

## Cara Cepat Menjalankan di Lokal

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Aplikasi berjalan di `http://localhost:3000`.

### Konfigurasi `frontend/.env.local` (Terhubung ke Backend Lokal)
```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_USE_MOCK=false
```
*(Ubah `NEXT_PUBLIC_USE_MOCK=true` bila ingin menjalankan simulasi mandiri tanpa server backend).*

## Pemeriksaan Kualitas & Build Statis

```bash
npm run lint
npm run build
```
Hasil build statis siap unggah akan tersedia di folder `frontend/out/`.

## Tautan Dokumentasi (`../docs/`)

- [Panduan Dev Lokal (`../docs/LOCAL-DEV.md`)](../docs/LOCAL-DEV.md) — Setup dev lokal, variabel `.env`, & troubleshooting.
