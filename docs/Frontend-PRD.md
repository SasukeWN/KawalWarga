# KawalWarga — Frontend PRD

> Untuk: pengembang frontend (Dandy). Dibaca bersama `Design.md` (visual), `API-Contract.md` (data), dan `Frontend-Prompt.md` (prompt untuk AI coding agent).
> Versi: 1.0 · Deadline lomba: **15 November 2026** · Target frontend selesai terintegrasi: **13 November 2026**.

---

## 1. Ringkasan

KawalWarga adalah platform pengaduan publik berbasis AI untuk satu instansi di satu wilayah.

| Peran | Akses | Tugas utama |
|---|---|---|
| Warga | publik, tanpa login | kirim laporan, lacak laporan dengan ID tiket, tanya chatbot AI |
| Admin | login | verifikasi (setujui/tolak) laporan, lihat dashboard dan peta, lihat riwayat |
| Petugas | login | ambil laporan dari antrean, tangani, unggah foto bukti + catatan |

Frontend **hanya** mengurus tampilan dan interaksi. Semua data dan logika bisnis ada di backend Laravel (lihat `API-Contract.md`).

---

## 2. Aturan Teknis Wajib (Static Export)

Aplikasi di-deploy ke **web hosting cPanel biasa** (tanpa server Node.js). Karena itu Next.js dibangun sebagai **static export**.

`next.config.ts` wajib berisi:

```ts
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
```

| Boleh | Tidak boleh |
|---|---|
| Komponen React `'use client'` | SSR, `getServerSideProps` |
| `fetch` ke API Laravel dari browser | API routes Next.js (`app/api/*`) |
| App Router dengan halaman statis | Server Actions |
| Query string (`/lacak?id=ADU-204`) | Middleware Next.js |
| `useSearchParams` (dibungkus `<Suspense>`) | Route dinamis `[id]` |
| `next/font`, `next/link`, `next/dynamic` | `next/image` dengan optimasi (pakai `<img>` biasa) |

Aturan tambahan:
- Akses `localStorage`/`window`/`navigator` hanya di dalam `useEffect` atau handler event, jangan di level modul.
- Leaflet hanya di sisi client: `dynamic(() => import(...), { ssr: false })`.
- `NEXT_PUBLIC_API_URL` ditanam saat build. Ganti URL = build ulang.
- Pengecekan role di frontend hanya untuk mengatur tampilan. Keamanan sebenarnya di backend.

---

## 3. Tech Stack

| Hal | Pilihan |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| Styling | Tailwind CSS (palet default, lihat `Design.md`) |
| Ikon | `lucide-react` |
| Peta | `leaflet` + `react-leaflet` (tile OpenStreetMap) |
| Kompres gambar | `browser-image-compression` (atau canvas manual) |
| Utilitas class | `clsx` |
| Font | Inter lewat `next/font/google` |
| State | React state + Context kecil untuk auth (tidak perlu Redux) |
| Fetch | `fetch` bawaan dibungkus di satu API client |

Tidak memakai: library UI besar, Redux, React Query, library form besar. Validasi form ditulis manual (cukup sederhana).

---

## 4. Struktur Folder

```
src/
  app/
    layout.tsx                 # font, metadata, provider
    page.tsx                   # /  (buat laporan)
    terkirim/page.tsx          # /terkirim?id=
    lacak/page.tsx             # /lacak?id=
    tanya-ai/page.tsx
    masuk/page.tsx
    admin/
      layout.tsx               # AppShell admin + guard
      page.tsx                 # dashboard
      verifikasi/page.tsx
      riwayat/page.tsx
    petugas/
      layout.tsx               # AppShell petugas + guard
      page.tsx                 # antrean "Siap Ditangani"
      tugas-saya/page.tsx
      laporan/page.tsx         # detail /petugas/laporan?id=
  components/
    ui/                        # Button, Card, StatusChip, UrgencyChip, Stepper, Timeline, StatCard, Skeleton, EmptyState, ErrorState, ConfirmDialog, Toast
    layout/                    # PublicHeader, PublicFooter, AppShell, Sidebar, Topbar
    report/                    # ReportForm, PhotoPicker, LocationPicker, TicketSearchBox, ReportSummaryCard
    map/                       # MapView (client only)
    chat/                      # ChatWidget
  lib/
    api/                       # client.ts, reports.ts, auth.ts, admin.ts, officer.ts, chatbot.ts
    types.ts                   # tipe sesuai API-Contract
    auth.ts                    # simpan/baca token + user, AuthContext
    format.ts                  # formatDateTime, formatDate, formatTicket
    config.ts                  # nama instansi, wilayah, pusat peta default
    geo.ts                     # haversine, reverse geocode
    image.ts                   # kompres foto
    labels.ts                  # label status/kategori/urgensi
  mocks/                       # data mock sesuai kontrak
public/
  logo.png  favicon.ico  mock/
docs/
  API-Contract.md  Frontend-PRD.md  Design.md  design/ (isi UI.zip)
```

---

## 5. Daftar Route

| Route | Halaman | Akses | Layar Figma |
|---|---|---|---|
| `/` | Buat laporan | publik | 01, 02 |
| `/terkirim?id=ADU-204` | Laporan terkirim | publik | 03, 04 |
| `/lacak?id=ADU-891` | Lacak laporan (diproses/selesai/ditolak) | publik | 05–10 |
| `/tanya-ai` | Tanya AI + chat widget | publik | 11, 12 |
| `/masuk` | Login admin/petugas | publik | – (dirancang sendiri, lihat `Design.md` 6.11) |
| `/admin` | Dashboard & peta | admin | 13, 14 |
| `/admin/verifikasi?id=` | Antrean verifikasi + detail | admin | 15, 16 |
| `/admin/riwayat` | Riwayat seluruh laporan | admin | 17, 18 |
| `/petugas` | Antrean "Siap Ditangani" | petugas | 19, 20 |
| `/petugas/tugas-saya` | Tugas saya | petugas | – (varian 19) |
| `/petugas/laporan?id=` | Detail + penyelesaian | petugas | 21–24 |

Halaman `/admin/*` dan `/petugas/*` dibungkus guard di `layout.tsx`. Detail visual tiap halaman ada di `Design.md` bagian 6.

---

## 6. Kebutuhan Fungsional

Prioritas: **P1** wajib, **P2** kalau waktu cukup.

### 6.1 Warga

| ID | Kebutuhan | Prio |
|---|---|---|
| W-1 | Form laporan: deskripsi (min 20), foto (1, wajib, kompres otomatis), lokasi di peta (pin bisa digeser, wajib), nomor WhatsApp (opsional). Validasi sisi client + tampilkan error dari API (422) per field | P1 |
| W-2 | Tombol "Gunakan Lokasi Saya Saat Ini" memakai Geolocation browser; kalau ditolak tampilkan pesan dan pakai pusat peta default | P1 |
| W-3 | Alamat teks diisi dari reverse geocoding (Nominatim) secara best-effort; kalau gagal, kirim `address_text` kosong | P2 |
| W-4 | Kirim ke `POST /reports` (multipart). Sukses → simpan `kw_last_ticket` di localStorage → redirect ke `/terkirim?id=` | P1 |
| W-5 | Halaman terkirim: tampilkan ID tiket, salin ke clipboard, bagikan ke WhatsApp (`wa.me`), tombol ke `/lacak` | P1 |
| W-6 | Banner "Laporan terakhir Anda" di `/` dan kartu di `/tanya-ai` dari `kw_last_ticket` (ambil status via `GET /reports/track/{id}`) | P1 |
| W-7 | Lacak laporan lewat input ID tiket (normalisasi: hapus `#`, spasi, huruf besar) dan `?id=`; tiga tampilan sesuai status (diproses, selesai, ditolak) + stepper + timeline | P1 |
| W-8 | Chat widget: kirim `message` + `history` (maks 6) ke `POST /chatbot`, tampilkan balasan + kartu tiket, chip cepat, indikator mengetik | P2 |

### 6.2 Autentikasi

| ID | Kebutuhan | Prio |
|---|---|---|
| A-1 | Halaman `/masuk`, panggil `POST /auth/login`, simpan `token` + `user` di localStorage (`kw_token`, `kw_user`) | P1 |
| A-2 | `AuthContext` membaca localStorage saat mount, menyediakan `user`, `login()`, `logout()` | P1 |
| A-3 | Guard layout: belum login → redirect `/masuk`; role tidak cocok → redirect ke home role-nya | P1 |
| A-4 | API client menambah header `Authorization: Bearer`; respons **401** → hapus token, redirect `/masuk` | P1 |
| A-5 | Logout memanggil `POST /auth/logout` lalu hapus localStorage (tetap hapus walau request gagal) | P1 |

### 6.3 Admin

| ID | Kebutuhan | Prio |
|---|---|---|
| AD-1 | Dashboard: 5 stat card, filter rentang tanggal (`from`, `to`), tren kategori dari `by_category` | P1 |
| AD-2 | Peta persebaran dengan pin berwarna per status + popup (thumbnail, kategori, tiket, status, link detail) + legenda | P1 |
| AD-3 | Ringkasan Eksekutif AI dari `GET /admin/dashboard/ai-insight` (sembunyikan kartu bila gagal/belum ada) | P2 |
| AD-4 | Antrean verifikasi: ambil daftar `status=menunggu_verifikasi`, navigasi "Laporan berikutnya", detail laporan, rekomendasi AI, pilihan kategori + urgensi (default dari AI), peringatan duplikat | P1 |
| AD-5 | Setujui (`approve` dengan kategori, urgensi, catatan opsional) dan Tolak (`reject` dengan alasan min 10 karakter), pakai `ConfirmDialog`, lalu pindah ke laporan berikutnya | P1 |
| AD-6 | Riwayat: tabel dengan pencarian ID, filter status/kategori/urgensi, paginasi 8 per halaman; mobile jadi kartu | P1 |
| AD-7 | Detail baca-saja untuk laporan yang bukan `menunggu_verifikasi` | P2 |

### 6.4 Petugas

| ID | Kebutuhan | Prio |
|---|---|---|
| P-1 | Antrean "Siap Ditangani": kartu laporan, urut urgensi tertinggi, badge jumlah, "Muat Laporan Lainnya" | P1 |
| P-2 | Jarak dari lokasi petugas (Geolocation + Haversine), disembunyikan kalau izin ditolak | P2 |
| P-3 | Detail laporan + catatan verifikasi admin + tombol Google Maps + tombol "Ambil & Kerjakan Laporan" (`take`, tangani 409) | P1 |
| P-4 | Form penyelesaian: 1 foto bukti + catatan (min 10), checklist, tombol "Tandai Selesai" nonaktif sampai lengkap, kirim `complete` multipart | P1 |
| P-5 | Tab "Tugas Saya" (`my-reports`, filter `diproses`/`selesai`) | P1 |
| P-6 | Form "Pembaruan progres" (`progress`) | P2 |

### 6.5 Lintas Fitur

| ID | Kebutuhan | Prio |
|---|---|---|
| X-1 | Loading skeleton, empty state, error state + tombol "Coba Lagi" di semua halaman data | P1 |
| X-2 | Responsif penuh mobile dan desktop sesuai Figma | P1 |
| X-3 | Kompres foto sebelum upload (maks sisi 1600 px, target < 1.5 MB, tetap jpg/png) | P1 |
| X-4 | Format tanggal dan ID tiket konsisten (lihat `Design.md` bagian 5) | P1 |
| X-5 | Toast untuk umpan balik, `ConfirmDialog` untuk aksi penting | P1 |
| X-6 | Metadata halaman (title per halaman), favicon | P2 |

---

## 7. API Layer dan Mock

- Semua pemanggilan API lewat `src/lib/api/*`. **Komponen tidak boleh memanggil `fetch` langsung.**
- Tipe TypeScript di `src/lib/types.ts` mengikuti `API-Contract.md` persis (nama field `snake_case`).
- `client.ts`: base URL dari `NEXT_PUBLIC_API_URL`, header `Accept: application/json`, tambah `Authorization` bila ada token, parse envelope `{success, message, data, meta, errors}`, lempar `ApiError` (status, message, errors) saat gagal.
- **Mode mock**: `NEXT_PUBLIC_USE_MOCK=true` membuat fungsi API membaca dari `src/mocks/*` (data statis + `await delay(400)`), mengembalikan bentuk persis kontrak. Mock harus mencakup minimal: tiket status `menunggu_verifikasi`, `diproses`, `selesai`, `ditolak`; 12+ laporan untuk riwayat dan paginasi; 5+ pin peta; ringkasan dashboard; balasan chatbot; akun admin dan petugas.
- Saat backend siap: set `NEXT_PUBLIC_USE_MOCK=false` dan `NEXT_PUBLIC_API_URL`. **Tidak ada perubahan di komponen.**

Env file:

```
# .env.local (development)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_USE_MOCK=true
```

Sediakan `.env.example` di repo. Jangan commit `.env.local`.

---

## 8. Penanganan Data dan Error

- Error validasi (422): petakan `errors` ke field form.
- 401: logout otomatis. 403: tampilkan pesan "Anda tidak punya akses". 404 lacak: empty state "Tiket tidak ditemukan". 409: toast pesan dari API. 429: toast "Terlalu banyak percobaan, coba lagi sebentar". 500/jaringan: `ErrorState` dengan **Coba Lagi**.
- Tombol aksi menonaktifkan diri selama request berjalan (cegah klik ganda).
- Upload foto: tampilkan nama, ukuran setelah kompres, dan tombol hapus. Tolak file non-gambar.

---

## 9. Build dan Deploy

1. `npm run build` menghasilkan folder `out/`.
2. Upload **isi** `out/` ke `public_html` (domain utama) lewat File Manager cPanel (zip lalu extract).
3. `.htaccess` di `public_html` (karena `trailingSlash: true`, rute seperti `/admin/` dilayani dari `admin/index.html`):

```apache
Options -Indexes
ErrorDocument 404 /404.html
```

4. Pastikan `NEXT_PUBLIC_API_URL` production (`https://api.DOMAINKITA.com/api/v1`) dan `NEXT_PUBLIC_USE_MOCK=false` saat build final.
5. Buat `src/app/not-found.tsx` agar `404.html` ikut dihasilkan.

---

## 10. Rencana Kerja dan Checkpoint GitHub

Aturan: **setiap step selesai wajib commit dan push ke GitHub**. Dilarang menumpuk beberapa step dalam satu push. Format commit: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:` + deskripsi singkat.

| Step | Isi | Tanggal target | Commit (contoh) |
|---|---|---|---|
| 0 | Setup repo, Next.js + Tailwind, konfigurasi static export, copy docs, `.env.example` | 8–9 Nov | `chore: init project with static export` |
| 1 | Design system: token, font, komponen UI dasar, layout publik dan AppShell | 9 Nov | `feat: add design system and layout shells` |
| 2 | Tipe, API client, mock data, auth context, helper format | 9 Nov | `feat: add api layer, mocks and auth context` |
| 3 | Warga: form buat laporan + halaman terkirim | 10 Nov | `feat: citizen report form and success page` |
| 4 | Warga: lacak laporan (3 tampilan) + banner laporan terakhir | 10 Nov | `feat: ticket tracking page` |
| 5 | Login + guard + shell admin/petugas | 11 Nov | `feat: login and role guards` |
| 6 | Petugas: antrean, detail, ambil, penyelesaian, tugas saya | 11 Nov | `feat: officer pages` |
| 7 | Admin: antrean verifikasi + riwayat | 12 Nov | `feat: admin verification and history` |
| 8 | Admin: dashboard, peta, ringkasan AI | 12 Nov | `feat: admin dashboard and map` |
| 9 | Chatbot widget + halaman Tanya AI | 12 Nov | `feat: ai chat widget` |
| 10 | Polish: responsif, state loading/error/empty, metadata, cek build static | 13 Nov | `chore: polish and verify static build` |
| 11 | Integrasi API asli (matikan mock), perbaiki beda kontrak | 13–14 Nov | `feat: connect to real api` |
| 12 | Deploy ke cPanel, uji alur penuh, README + screenshot | 14 Nov | `docs: add readme and deploy guide` |

Cadangan waktu: 15 Nov hanya untuk perbaikan darurat dan pengiriman.

Setelah Step 10, kirim repo ke Ilyasa untuk **penyatuan** (PRD gabungan). Step 11–12 dikerjakan bersama saat project disatukan.

---

## 11. Definition of Done

- [ ] Semua halaman di tabel route ada dan sesuai Figma (desktop + mobile)
- [ ] Semua fitur P1 jalan dengan data mock **dan** dengan API asli
- [ ] `npm run build` sukses tanpa error dan menghasilkan `out/`
- [ ] Tidak ada pemakaian fitur terlarang (SSR, API routes, server actions, middleware, route dinamis)
- [ ] Tidak ada `fetch` langsung di komponen
- [ ] Tidak ada secret/API key di repo
- [ ] Commit terpush bertahap sesuai step
- [ ] README berisi cara menjalankan, env, build, dan deploy

---

## 12. Di Luar Lingkup

Registrasi pengguna, lupa password, daftar notifikasi (lonceng hanya dekoratif), manajemen akun petugas, multi-instansi, mode gelap, multi-bahasa, unggah banyak foto.

---

## 13. Risiko dan Mitigasi

| Risiko | Mitigasi |
|---|---|
| Kontrak API berubah di tengah jalan | Semua perubahan lewat `API-Contract.md` + Changelog, tipe terpusat di `types.ts` |
| Foto besar gagal diupload ke hosting | Kompres di client (X-3) |
| Leaflet error saat build static | `dynamic` + `ssr: false`, tidak import Leaflet di level modul server |
| Waktu mepet | Kerjakan urutan step; fitur P2 dikerjakan terakhir; mock membuat frontend tidak menunggu backend |
| Tile OSM dibatasi | Gunakan hanya untuk demo, atribusi tampil; siapkan fallback kotak abu berisi koordinat kalau tile gagal |
