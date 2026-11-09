# KawalWarga — Platform Pengaduan Publik Berbasis AI

KawalWarga adalah platform pengaduan publik modern untuk **Dinas Prasarana & Lingkungan · Kota Harmoni**. Dibangun untuk kompetisi hackathon (deadline 15 November 2026), platform ini menghubungkan warga, admin verifikator, dan petugas lapangan dengan dukungan rekomendasi kecerdasan buatan (AI).

---

## 🚀 Fitur Utama

- **Warga (Publik)**:
  - Form pelaporan responsif dengan upload foto (kompresi otomatis di sisi client), penentuan lokasi presisi via peta Leaflet (pin dapat digeser & tombol "Gunakan Lokasi Saya"), dan input nomor WhatsApp opsional.
  - Halaman bukti terkirim dengan salin ID tiket dan tautan simpan ke WhatsApp.
  - Pelacakan progres laporan multi-status (`menunggu_verifikasi`, `menunggu_penanganan`, `diproses`, `selesai`, `ditolak`) dengan stepper 4 langkah, komparasi foto Sebelum/Sesudah, dan riwayat jejak waktu (*timeline*).
  - Layanan **Tanya Chatbot AI** (`/tanya-ai`) dan widget melayang 24 jam dengan chip pertanyaan cepat (*Cek Status*, *Lupa ID Tiket*, *Cara Melapor*) serta integrasi kartu tiket interaktif.
- **Admin Verifikator (`/admin`)**:
  - Monitoring wilayah, 5 kartu statistik layanan harian, ringkasan eksekutif AI, tren kategori, dan pemetaan pin interaktif berwarna per status.
  - Antrean verifikasi terpadu (`/admin/verifikasi`) dengan rekomendasi kategori & urgensi dari AI, deteksi tiket duplikat terdekat, modal perbesar foto asli warga, serta form persetujuan atau penolakan laporan dengan catatan verifikasi.
  - Buku besar riwayat seluruh laporan (`/admin/riwayat`) dengan filter debounce, paginasi 8 baris, dan tampilan tabel desktop / kartu responsif mobile.
- **Petugas Lapangan (`/petugas`)**:
  - Antrean penanganan siap diambil yang diurutkan berdasarkan urgensi tertinggi, dilengkapi jarak real-time dari koordinat petugas via Geolocation + formula Haversine.
  - Detail tugas sebelum diambil dengan rute navigasi langsung ke Google Maps dan konfirmasi penguncian tugas.
  - Form penyelesaian tugas (`/petugas/laporan?id=...`) dengan checklist validasi interaktif 2 syarat (foto bukti hasil penanganan + catatan tindakan minimal 10 karakter).
  - Manajemen tugas tanggung jawab aktif dan riwayat pekerjaan selesai (`/petugas/tugas-saya`).

---

## 🛠️ Tech Stack & Arsitektur

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Lucide Icons
- **Peta Interaktif**: Leaflet + React-Leaflet (client-only dynamic import)
- **Kompresi Gambar**: `browser-image-compression` (client-side)
- **Mode Ekspor**: Static Export (`output: 'export'`, `trailingSlash: true`, `images: { unoptimized: true }`)
- **Backend**: Laravel Sanctum API (kompatibel penuh dengan kontrak API `docs/API-Contract.md`)
- **Mode Mock**: Stateful in-memory mock terintegrasi (`NEXT_PUBLIC_USE_MOCK=true`) sehingga frontend dapat dijalankan dan diuji end-to-end tanpa menunggu kesiapan backend.

---

## 📁 Struktur Direktori

```text
├── frontend/
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── logo.png
│   │   └── mock/                   # Aset foto contoh untuk mock data
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/              # Dashboard, verifikasi, & riwayat admin
│   │   │   ├── petugas/            # Antrean penanganan, tugas saya, & detail
│   │   │   ├── lacak/              # Halaman lacak laporan warga
│   │   │   ├── tanya-ai/           # Halaman asisten AI warga
│   │   │   ├── terkirim/           # Halaman sukses pengiriman laporan
│   │   │   ├── masuk/              # Halaman autentikasi admin & petugas
│   │   │   ├── layout.tsx          # Root layout (Inter font, provider, toast)
│   │   │   ├── not-found.tsx       # Halaman 404 ramah pengguna
│   │   │   └── page.tsx            # Beranda: Form buat laporan warga
│   │   ├── components/
│   │   │   ├── chat/               # ChatWidget melayang & panel asisten AI
│   │   │   ├── layout/             # PublicHeader, PublicFooter, Sidebar, Topbar, AppShell
│   │   │   ├── map/                # MapView & DraggableMap (Leaflet client-only)
│   │   │   ├── report/             # ReportForm, PhotoPicker, LocationPicker, OfficerReportCard
│   │   │   └── ui/                 # Design System (Button, Card, StatusChip, UrgencyChip, dll.)
│   │   ├── lib/
│   │   │   ├── api/                # Lapisan API client (client, reports, admin, officer, chatbot)
│   │   │   ├── auth.tsx            # AuthProvider & role guard context
│   │   │   ├── config.ts           # Konfigurasi nama aplikasi, wilayah, instansi
│   │   │   ├── format.ts           # Formatter tanggal WIB, tiket, teks
│   │   │   ├── geo.ts              # Utilitas koordinat Haversine & reverse geocoding
│   │   │   ├── labels.ts           # Konfigurasi chip status, urgensi, kategori
│   │   │   └── types.ts            # Tipe TypeScript sesuai API-Contract.md
│   │   └── mocks/                  # Mock data stateful in-memory (semua skenario tiket & alur)
│   ├── next.config.ts              # Konfigurasi static export & trailingSlash
│   └── package.json
├── backend/                        # API Backend Laravel
└── docs/                           # Frontend-PRD, Design.md, API-Contract.md, referensi Figma
```

---

## 💻 Cara Menjalankan Secara Lokal

### 1. Masuk ke folder frontend dan install dependensi

```bash
cd frontend
npm install
```

### 2. Atur Environment Variables

Salin berkas `.env.example` ke `.env.local`:

```bash
cp .env.example .env.local
```

Isi `.env.local`:
```env
# URL API Backend Laravel (bila tidak memakai mode mock)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Aktifkan mode mock mandiri (default: true)
NEXT_PUBLIC_USE_MOCK=true
```

> **Catatan**: Jika `NEXT_PUBLIC_USE_MOCK=true`, frontend berjalan secara mandiri dengan data simulasi yang realistis dan responsif terhadap aksi (verifikasi, tolak, ambil tugas, selesai, chatbot, pencarian).

### 3. Jalankan server pengembangan

```bash
npm run dev
```

Buka peramban Anda di [http://localhost:3000](http://localhost:3000).

---

## 🔑 Akun Uji Coba Demo (Mode Mock)

| Peran | Email | Password | URL Masuk |
|---|---|---|---|
| **Admin Verifikator** | `admin@kawalwarga.test` | `password123` | `/masuk/` |
| **Petugas Lapangan** | `budi@kawalwarga.test` | `password123` | `/masuk/` |

---

## 🎫 Contoh Tiket untuk Pengujian Pelacakan & Chatbot

Anda dapat menguji pelacakan tiket di `/lacak` atau lewat chatbot di `/tanya-ai`:

- `#ADU-204` — **Menunggu Verifikasi**: Kerusakan jalan di Jl. Melati (terdeteksi mirip tiket #ADU-198 oleh AI).
- `#ADU-198` — **Menunggu Penanganan**: Lubang jalan membesar (telah disetujui admin, siap diambil petugas).
- `#ADU-192` — **Menunggu Penanganan**: Sampah menghalangi jalan di Jl. Anggrek No. 6.
- `#ADU-891` — **Diproses**: Petugas Budi Santoso sedang menyiapkan material perbaikan di lokasi.
- `#ADU-176` — **Selesai**: Perbaikan jalan di Jl. Kenanga dengan bukti foto Sebelum/Sesudah dan catatan tindakan.
- `#ADU-183` — **Ditolak**: Lokasi berada di luar batas wilayah administrasi Kota Harmoni.
- **Pencarian WhatsApp (Lupa ID)**: Ketik nomor `081234567890` di kolom asisten AI untuk menemukan daftar tiket terkait.

---

## 📦 Build Static Export

Untuk membangun berkas HTML/CSS/JS statis yang siap di-deploy:

```bash
cd frontend
npm run build
```

Hasil build statis akan diekspor secara otomatis ke dalam direktori `frontend/out/`.

### Menguji hasil build statis secara lokal:

```bash
npx serve out -p 3000
```

---

## 🌐 Panduan Deployment ke Hosting cPanel

Aplikasi ini diekspor 100% sebagai situs statis murni tanpa ketergantungan pada runtime Node.js di server, sehingga dapat di-hosting pada akun hosting cPanel biasa.

### Langkah-langkah Deployment:

1. **Jalankan Build Statis**:
   Pastikan konfigurasi `NEXT_PUBLIC_USE_MOCK` dan `NEXT_PUBLIC_API_URL` pada `.env.local` sudah disesuaikan dengan kebutuhan produksi Anda, lalu jalankan:
   ```bash
   npm run build
   ```
2. **Siapkan Berkas**:
   Buka folder `frontend/out/`. Seluruh berkas di dalam folder ini (termasuk berkas `index.html`, `404.html`, folder `_next`, `admin`, `petugas`, `lacak`, dll.) adalah isi yang akan diunggah.
3. **Unggah ke cPanel**:
   - Masuk ke cPanel dan buka **File Manager**.
   - Masuk ke direktori target publik Anda:
     - Untuk domain utama: direktori `public_html/`.
     - Untuk subdomain / addon domain: direktori root domain tersebut.
   - Unggah seluruh isi folder `out/` (bisa di-ZIP terlebih dahulu di komputer lokal, diunggah, lalu di-Extract di File Manager cPanel).
4. **Konfigurasi `.htaccess` (Opsional untuk Routing & 404 Bersih)**:
   Buat atau tambahkan aturan berikut pada berkas `.htaccess` di direktori `public_html/`:
   ```apache
   RewriteEngine On

   # Menangani fallback halaman 404
   ErrorDocument 404 /404.html

   # Pastikan routing folder dengan trailing slash bekerja optimal
   DirectorySlash On
   DirectoryIndex index.html
   ```
5. **Verifikasi Izin Berkas**:
   Pastikan folder memiliki permission `755` dan berkas memiliki permission `644`.
6. **Aplikasi Siap Digunakan**:
   Buka domain Anda melalui browser. Semua rute (`/`, `/lacak/`, `/tanya-ai/`, `/admin/`, `/petugas/`) akan langsung dapat diakses dengan cepat dan aman.

---

## 👥 Tim & Pengembang

Dikembangkan untuk lomba hackathon **KawalWarga** (November 2026).
- **Frontend Lead**: KawalWarga Frontend Team
- **Backend Lead**: KawalWarga API Team
