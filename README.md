# KawalWarga

Platform pengaduan publik berbasis AI untuk **Dinas Prasarana & Lingkungan · Kota Harmoni**.

## Struktur Repository

- `frontend/` — Aplikasi web Next.js (App Router, TypeScript, Tailwind CSS) dengan konfigurasi Static Export (`output: 'export'`).
- `backend/` — Layanan API backend (Laravel + SQLite).
- `docs/` — Dokumentasi PRD, Design System (`Design.md`), Kontrak API (`API-Contract.md`), dan referensi layar Figma (`docs/design/`).

## Menjalankan Frontend

Masuk ke direktori `frontend/`:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

## Build Static Export Frontend

```bash
cd frontend
npm run build
```

Hasil build statis berada di folder `frontend/out/`.
