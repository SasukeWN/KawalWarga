# KawalWarga — Frontend

Platform pengaduan publik berbasis AI untuk **Dinas Prasarana & Lingkungan · Kota Harmoni**. Dibangun dengan Next.js (App Router), TypeScript, dan Tailwind CSS sebagai **Static Export** (`output: 'export'`).

## Prasyarat

- Node.js 20+ dan npm

## Konfigurasi Environment

Salin `.env.example` menjadi `.env.local`:

```bash
cp .env.example .env.local
```

Isi variabel environment:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_USE_MOCK=false
```

> Ubah `NEXT_PUBLIC_USE_MOCK=true` bila ingin menjalankan frontend menggunakan data mock lokal (`src/mocks/`) tanpa server backend.

## Cara Menjalankan (Development)

```bash
npm install
npm run dev
```

Buka `http://localhost:3000` di browser.

## Cara Build (Static Export)

```bash
npm run build
```

Perintah di atas akan menghasilkan file statis siap unggah di dalam folder `out/`.
