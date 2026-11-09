# KawalWarga — Frontend Next.js

Platform pengaduan publik berbasis kecerdasan buatan untuk **Dinas Prasarana & Lingkungan · Kota Harmoni**. Dibangun menggunakan **Next.js 16 (App Router)**, **TypeScript**, dan **Tailwind CSS** sebagai **Static Export murni** (`output: 'export'`) yang siap diunggah ke cPanel public_html tanpa ketergantungan runtime Node.js di server.

---

## 🛠️ Prasyarat

- **Node.js**: Versi 20.x atau lebih baru
- **npm**: Versi 10.x atau lebih baru

---

## ⚙️ Konfigurasi Environment

Salin berkas `.env.example` ke `.env.local`:

```bash
cp .env.example .env.local
```

### Opsi 1: Mode API Nyata (Production / Staging)
```env
NEXT_PUBLIC_API_URL=https://api.DOMAINKITA.com/api/v1
NEXT_PUBLIC_USE_MOCK=false
```

### Opsi 2: Mode API Lokal (Development dengan backend Laravel lokal)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_USE_MOCK=false
```

### Opsi 3: Mode Mock Mandiri (Tanpa backend berjalan)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_USE_MOCK=true
```

> Mode mock menyediakan simulasi stateful in-memory yang mencakup seluruh alur: pengiriman laporan, pelacakan tiket (`ADU-204`, `ADU-198`, `ADU-200`, `ADU-176`, `ADU-183`), login admin & petugas, antrean verifikasi, dashboard peta, antrean petugas, ambil tugas, penyelesaian tugas, dan chatbot AI.

---

## 💻 Menjalankan Server Pengembangan

```bash
npm install
npm run dev
```

Buka peramban di [http://localhost:3000](http://localhost:3000).

---

## 📦 Membangun Static Export (Production Build)

Untuk menghasilkan bundel HTML, CSS, dan JavaScript statis:

```bash
npm run build
```

Hasil kompilasi statis akan dihasilkan di dalam direktori `out/`:
- `out/index.html` — Halaman Buat Laporan Warga
- `out/terkirim/index.html` — Halaman Bukti Laporan Terkirim
- `out/lacak/index.html` — Halaman Pelacakan Tiket
- `out/tanya-ai/index.html` — Halaman Asisten AI
- `out/masuk/index.html` — Halaman Login Admin & Petugas
- `out/admin/index.html` — Dashboard Monitoring & Peta Admin
- `out/admin/verifikasi/index.html` — Antrean Verifikasi Admin
- `out/admin/riwayat/index.html` — Buku Besar Riwayat Seluruh Laporan
- `out/petugas/index.html` — Antrean Laporan Siap Ditangani Petugas
- `out/petugas/tugas-saya/index.html` — Laporan Diproses & Selesai Petugas
- `out/petugas/laporan/index.html` — Detail & Form Penyelesaian Petugas
- `out/404.html` — Halaman 404 Kustom
- `out/.htaccess` — Aturan Apache cPanel (Options -Indexes, ErrorDocument 404, HTTPS redirect)

Untuk menguji hasil build statis secara lokal menggunakan server HTTP sederhana:
```bash
npx serve out -p 3000
```

---

## 🌐 Panduan Deploy ke cPanel (public_html)

1. **Jalankan Build Production**:
   Pastikan variabel di `.env.local` atau `.env.production` sudah mengarah ke backend produksi:
   ```env
   NEXT_PUBLIC_API_URL=https://api.DOMAINKITA.com/api/v1
   NEXT_PUBLIC_USE_MOCK=false
   ```
   Lalu jalankan `npm run build`.

2. **Kompres Direktori `out/`**:
   Kompres seluruh berkas dan folder di dalam `frontend/out/` menjadi berkas `frontend-build.zip`.
   Pastikan file `out/.htaccess` ikut terkompresi.

3. **Unggah ke cPanel File Manager**:
   - Buka cPanel hosting Anda → **File Manager**.
   - Masuk ke direktori `public_html/` (atau root subdomain frontend).
   - Unggah `frontend-build.zip` lalu klik **Extract**.
   - Pastikan berkas `index.html` dan folder `_next` berada langsung di dalam `public_html/`.

4. **Konfigurasi `.htaccess`**:
   Pastikan file `public_html/.htaccess` memuat aturan berikut:
   ```apache
   Options -Indexes
   ErrorDocument 404 /404.html

   <IfModule mod_rewrite.c>
       RewriteEngine On

       # Paksa HTTPS di production
       RewriteCond %{HTTPS} !=on
       RewriteCond %{HTTP_HOST} !^localhost [NC]
       RewriteCond %{HTTP_HOST} !^127\.0\.0\.1
       RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

       # Pastikan routing folder dengan trailing slash bekerja optimal
       DirectorySlash On
       DirectoryIndex index.html
   </IfModule>
   ```

5. **Cek Sertifikat HTTPS**:
   Pastikan domain memiliki sertifikat SSL aktif (AutoSSL) di menu **SSL/TLS Status** cPanel.

---

## 🧪 Pemeriksaan Kualitas Kode

```bash
# Jalankan ESLint
npm run lint

# Jalankan TypeScript compiler check
npx tsc --noEmit
```

---

## 👥 Pengembang

Tim Frontend KawalWarga — Hackathon 2026.
