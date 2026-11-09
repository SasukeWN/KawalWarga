# KawalWarga — Frontend Prompt

> Prompt untuk AI coding agent (Claude Code, Cursor, dsb.) yang dipakai Dandy untuk membangun frontend.
> **Cara pakai**: (1) taruh `API-Contract.md`, `Frontend-PRD.md`, `Design.md`, dan folder `design/` (isi `UI.zip`) di `docs/` pada repo frontend. (2) Tempel **Prompt Utama** sekali di awal sesi. (3) Tempel **prompt Step** satu per satu. Jangan lanjut ke step berikutnya sebelum step sebelumnya selesai, dites, dan **sudah dipush**.

---

## Prompt Utama (tempel sekali di awal)

```
Kamu adalah senior frontend engineer. Kita membangun frontend "KawalWarga", platform pengaduan publik berbasis AI, untuk lomba dengan deadline 15 November 2026.

SEBELUM MENULIS KODE, baca semua dokumen ini sampai habis:
- docs/Frontend-PRD.md  (kebutuhan, route, aturan teknis, rencana step)
- docs/Design.md        (design system dan spesifikasi tiap layar)
- docs/API-Contract.md  (kontrak API; sumber kebenaran untuk data)
- docs/design/          (screenshot Figma 01-24 + logo; sumber kebenaran visual)

ATURAN KERAS:
1. Stack: Next.js (App Router) + TypeScript + Tailwind CSS. Deploy sebagai STATIC EXPORT di hosting cPanel biasa. next.config wajib: output: 'export', trailingSlash: true, images: { unoptimized: true }.
2. DILARANG: SSR, API routes Next.js, Server Actions, middleware, route dinamis seperti [id], next/image optimasi. Pakai query string (contoh /lacak?id=ADU-204). Semua pengambilan data di sisi client. useSearchParams harus dibungkus <Suspense>. Akses localStorage/window hanya di useEffect/handler. Leaflet hanya lewat next/dynamic dengan ssr:false.
3. Semua panggilan API lewat src/lib/api/*. Komponen TIDAK BOLEH memanggil fetch langsung. Tipe di src/lib/types.ts mengikuti API-Contract.md persis (snake_case).
4. Mode mock: NEXT_PUBLIC_USE_MOCK=true membuat lapisan API membaca src/mocks/* dengan bentuk data PERSIS sama dengan kontrak. Dengan begitu frontend tidak menunggu backend.
5. Auth: token Bearer (Laravel Sanctum) disimpan di localStorage (kw_token, kw_user). Respons 401 -> hapus token dan redirect ke /masuk. Pengecekan role di frontend hanya untuk tampilan.
6. Visual harus mengikuti Figma dan Design.md (warna Tailwind default: emerald-700 primary, stone-50 background, dst). Teks UI berbahasa Indonesia, copy dibuat sama dengan Figma. Brand memakai logo KawalWarga (bukan "Lapor Warga").
7. Pakai library seperlunya: lucide-react, leaflet + react-leaflet, browser-image-compression, clsx. Jangan menambah library besar lain tanpa bertanya.
8. Jangan mengubah isi API-Contract.md. Kalau menemukan ketidakcocokan atau hal yang kurang jelas, BERHENTI dan tanyakan, jangan menebak.
9. Tidak ada secret/API key di repo. Sediakan .env.example. Jangan commit .env.local.
10. Semua halaman data wajib punya state loading (skeleton), empty, dan error (dengan tombol Coba Lagi). Semua tombol ikon punya aria-label.

CARA KERJA:
- Kerjakan HANYA SATU STEP per instruksi yang saya berikan.
- Setelah step selesai: jalankan `npm run lint` dan `npm run build`, perbaiki error, lalu commit dengan pesan yang diminta dan push ke GitHub (git push origin main).
- Setelah push, BERHENTI. Laporkan: ringkasan yang dibuat, file penting, hasil lint/build, dan hal yang perlu saya cek. Jangan lanjut ke step berikutnya sebelum saya minta.
- Commit kecil dan sering. Dilarang menumpuk beberapa step dalam satu push.

Konfirmasi bahwa kamu sudah membaca semua dokumen dengan menyebutkan: daftar route, 4 status laporan beserta alurnya, dan 3 kategori. Lalu tunggu instruksi Step 0.
```

---

## Step 0 — Setup Proyek

```
STEP 0 — Setup proyek.

Tugas:
1. Inisialisasi Next.js (App Router, TypeScript, Tailwind, ESLint, folder src/) di root repo ini.
2. Atur next.config.ts: output: 'export', trailingSlash: true, images: { unoptimized: true }.
3. Install: lucide-react, leaflet, react-leaflet, @types/leaflet, browser-image-compression, clsx.
4. Siapkan font Inter lewat next/font/google di app/layout.tsx. Set <html lang="id">, background stone-50, teks stone-900.
5. Buat struktur folder sesuai Frontend-PRD bagian 4 (folder kosong boleh pakai .gitkeep).
6. Buat .env.example (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_USE_MOCK=true) dan pastikan .env.local masuk .gitignore.
7. Salin logo ke public/logo.png. Buat src/lib/config.ts berisi: nama aplikasi "KawalWarga", instansi "Dinas Prasarana & Lingkungan", wilayah "Kota Harmoni", pusat peta default (koordinat Jakarta, boleh diganti).
8. Buat src/app/not-found.tsx sederhana (halaman 404 ramah).
9. Buat README.md awal: deskripsi singkat, cara menjalankan (`npm install`, `npm run dev`), cara build (`npm run build` menghasilkan folder out/).

Kriteria selesai: `npm run dev` jalan, `npm run build` menghasilkan folder out/ tanpa error.

Commit: "chore: init project with static export"
Lalu push ke GitHub dan BERHENTI untuk laporan.
```

## Step 1 — Design System dan Layout

```
STEP 1 — Design system dan layout shell.

Tugas (baca Design.md bagian 2, 3, 4, 5):
1. src/lib/labels.ts: label dan warna untuk status, kategori, urgensi (sesuai API-Contract bagian 2 dan Design.md).
2. Komponen src/components/ui: Button (primary/secondary/danger-outline/ghost, loading, disabled, icon), Card (varian default/mint/ai/warning/danger), StatusChip, UrgencyChip, Eyebrow + PageHeading, Skeleton, EmptyState, ErrorState, ConfirmDialog, Toast (provider + hook), Stepper, Timeline, StatCard.
3. Layout publik: PublicHeader (logo, link Lacak Laporan, tombol Tanya Chatbot AI; mobile dua baris) dan PublicFooter (termasuk link kecil "Masuk Petugas/Admin" ke /masuk).
4. Layout dashboard: AppShell, Sidebar (desktop tetap, mobile drawer lewat hamburger), Topbar (judul, lonceng dekoratif, avatar inisial). Menu admin dan petugas sesuai Design.md bagian 3. Untuk sekarang pakai data user dummy.
5. src/lib/format.ts: formatDateTime ("8 Nov 2026 · 10.42 WIB", zona Asia/Jakarta), formatDate, formatTicket (tambah "#"), normalizeTicketInput (hapus "#", spasi, huruf besar).
6. Buat halaman sementara /_kit (atau /design-kit) yang memajang semua komponen dengan berbagai varian untuk dicek visual. Tandai sebagai halaman dev saja.

Kriteria selesai: halaman kit menampilkan semua komponen, tampilan cocok dengan Figma di desktop dan mobile.

Commit: "feat: add design system and layout shells"
Lalu push dan BERHENTI untuk laporan.
```

## Step 2 — API Layer, Mock, Auth Context

```
STEP 2 — API layer, mock data, dan auth context.

Tugas (baca API-Contract.md seluruhnya):
1. src/lib/types.ts: semua tipe TypeScript dari kontrak (Report track, admin list/detail, officer item, dashboard summary/map/insight, chatbot, user, ApiEnvelope, Paginated, enum Status/Category/Urgency).
2. src/lib/api/client.ts: base URL dari env, header Accept, Authorization bila ada token, dukung JSON dan FormData, parse envelope, lempar ApiError(status, message, errors). Tangani 401 (hapus token + redirect /masuk).
3. Modul API: reports.ts (createReport, trackReport), auth.ts (login, logout, me), admin.ts (listReports, getReport, approve, reject, summary, map, insight), officer.ts (queue, myReports, getReport, take, progress, complete), chatbot.ts (sendMessage).
4. Mode mock lewat NEXT_PUBLIC_USE_MOCK: tiap fungsi API membaca src/mocks/* dengan delay ~400 ms dan bentuk persis kontrak. Mock minimal: tiket dengan status menunggu_verifikasi, diproses, selesai, ditolak; 12+ laporan untuk list + paginasi + filter + sort; 5+ pin peta; summary dashboard; insight AI; balasan chatbot (termasuk satu yang membawa tickets[]); akun admin (Nadia Putri) dan petugas (Budi Santoso), password "password123". Gunakan gambar contoh di public/mock/ (salin dari docs/design bila perlu atau gunakan placeholder).
5. Mock harus stateful ringan di memori: approve/reject/take/complete mengubah status data mock sehingga alur bisa diuji end-to-end.
6. src/lib/auth.ts + AuthProvider: baca/tulis kw_token dan kw_user di localStorage (hanya di client), sediakan useAuth() dengan user, login, logout, isReady.
7. src/lib/image.ts: fungsi compressImage(file) (maks sisi 1600 px, target < 1.5 MB). src/lib/geo.ts: haversine(km) dan reverseGeocode (Nominatim, best-effort, boleh gagal diam-diam).

Kriteria selesai: build sukses; ada contoh pemanggilan di halaman kit yang menunjukkan mock bekerja (mis. tombol "Tes API" menampilkan data lacak).

Commit: "feat: add api layer, mocks and auth context"
Lalu push dan BERHENTI untuk laporan.
```

## Step 3 — Warga: Buat Laporan dan Terkirim

```
STEP 3 — Halaman Buat Laporan (/) dan Laporan Terkirim (/terkirim).

Tugas (Design.md 6.1 dan 6.2; layar Figma 01-04):
1. Komponen PhotoPicker (Pilih Foto + Kamera, preview, hapus, kompres otomatis, tolak non-gambar), LocationPicker (Leaflet via dynamic ssr:false, pin bisa digeser, tombol "Gunakan Lokasi Saya Saat Ini", alamat dari reverseGeocode), TicketSearchBox.
2. Halaman "/": banner "Laporan terakhir Anda" (dari kw_last_ticket + trackReport; sembunyikan kalau tidak ada), hero, form lengkap, kartu samping (Sudah pernah melapor, Yang dapat Anda laporkan, Butuh panduan). Responsif sesuai Figma.
3. Validasi sisi client (deskripsi min 20, foto wajib, lokasi wajib, nomor WhatsApp format Indonesia bila diisi) dan tampilkan error 422 dari API per field.
4. Submit lewat createReport (multipart). Sukses: simpan kw_last_ticket lalu redirect ke /terkirim?id=ADU-xxx.
5. Halaman "/terkirim": tampilkan tiket, status, waktu; tombol Salin ID Tiket (toast), Simpan ke WhatsApp (wa.me dengan teks berisi ID dan tautan /lacak?id=...), Lacak Laporan Saya, kembali ke beranda. Bungkus useSearchParams dengan Suspense.

Kriteria selesai: bisa kirim laporan di mode mock dan masuk ke halaman terkirim; tampilan sesuai Figma desktop dan mobile.

Commit: "feat: citizen report form and success page"
Lalu push dan BERHENTI untuk laporan.
```

## Step 4 — Warga: Lacak Laporan

```
STEP 4 — Halaman Lacak Laporan (/lacak).

Tugas (Design.md 6.3; layar Figma 05-10):
1. Baca ?id= dan TicketSearchBox (normalisasi input). Tanpa id: hanya tampilkan kotak pencarian.
2. Kartu ringkasan (ID, judul, tanggal diterima, kategori, chip status) dan Stepper 4 langkah (sembunyikan untuk status ditolak).
3. Tiga tampilan sesuai status: (A) diproses/menunggu: kartu Laporan Anda (foto, deskripsi, alamat), peta kecil, kartu "Kabar terbaru petugas" (sembunyikan jika latest_update null), Timeline. (B) selesai: Sebelum/Sesudah (dua foto), catatan tindakan petugas, Timeline. (C) ditolak: alasan penolakan dari admin dan tombol Buat Laporan Baru.
4. State: loading skeleton, 404 (tiket tidak ditemukan), error + Coba Lagi.
5. Pastikan MapView dipakai ulang (komponen peta tunggal, client only).

Kriteria selesai: keempat tiket mock (menunggu_verifikasi, diproses, selesai, ditolak) tampil benar dan cocok dengan Figma, desktop dan mobile.

Commit: "feat: ticket tracking page"
Lalu push dan BERHENTI untuk laporan.
```

## Step 5 — Login dan Guard

```
STEP 5 — Login, guard role, dan shell admin/petugas.

Tugas (Design.md 6.11, bagian 3; Frontend-PRD 6.2):
1. Halaman /masuk sesuai Design.md 6.11. Login via API; redirect berdasarkan role (admin -> /admin, petugas -> /petugas). Tampilkan error 401 dengan pesan dari API. Jika sudah login, langsung redirect.
2. Guard di src/app/admin/layout.tsx dan src/app/petugas/layout.tsx: tunggu AuthProvider isReady, belum login -> /masuk, role salah -> home role yang benar. Tampilkan skeleton selama mengecek.
3. Sambungkan AppShell dengan data user asli (nama, jabatan dari user.position, inisial avatar) dan tombol "Keluar dari akun" (logout, lalu ke /masuk).
4. Halaman placeholder untuk /admin, /admin/verifikasi, /admin/riwayat, /petugas, /petugas/tugas-saya, /petugas/laporan (judul saja) agar navigasi sidebar bisa dites.

Kriteria selesai: login admin dan petugas (akun mock) mengarah ke shell masing-masing; akses silang role ditolak; logout berfungsi.

Commit: "feat: login and role guards"
Lalu push dan BERHENTI untuk laporan.
```

## Step 6 — Petugas

```
STEP 6 — Halaman Petugas.

Tugas (Design.md 6.8, 6.9, 6.10; layar Figma 19-24):
1. /petugas: sapaan, tab (Siap Ditangani dengan badge total, Tugas Saya), banner info, baris kontrol, grid kartu laporan (urut urgensi tertinggi), tombol "Muat Laporan Lainnya" (tambahkan halaman berikutnya), jarak dari lokasi petugas via Geolocation + haversine (sembunyikan jika ditolak).
2. /petugas/tugas-saya: daftar kartu laporan milik petugas dengan filter Diproses/Selesai.
3. /petugas/laporan?id=: tampilan menyesuaikan status. menunggu_penanganan: detail + catatan verifikasi admin + lokasi + tombol Google Maps + "Ambil & Kerjakan Laporan" (ConfirmDialog; tangani 409 dengan toast dan kembali ke antrean). diproses: form penyelesaian (PhotoPicker 1 foto, catatan min 10, checklist, tombol Tandai Selesai nonaktif sampai lengkap, ConfirmDialog, kirim complete multipart). selesai: mode baca-saja dengan bukti.
4. Semua state loading/empty/error.

Kriteria selesai: alur ambil -> selesaikan berjalan end-to-end di mode mock; tampilan cocok dengan Figma desktop dan mobile.

Commit: "feat: officer pages"
Lalu push dan BERHENTI untuk laporan.
```

## Step 7 — Admin: Verifikasi dan Riwayat

```
STEP 7 — Admin: Antrean Verifikasi dan Riwayat.

Tugas (Design.md 6.6 dan 6.7; layar Figma 15-18):
1. /admin/verifikasi: ambil daftar status=menunggu_verifikasi (sort newest), kartu navigator ("Laporan x dari n", "Laporan berikutnya"), detail laporan terpilih (bisa juga lewat ?id=), foto + "Perbesar foto" (modal), lokasi di peta, kartu Rekomendasi AI (ringkasan, select kategori, pilihan urgensi dengan nilai awal dari rekomendasi AI, peringatan duplikat dengan tautan "Lihat Tiket Terkait" ke /admin/verifikasi?id=...).
2. Kartu Keputusan admin: Setujui & Teruskan (ConfirmDialog, catatan opsional untuk petugas) dan Tolak Laporan (alasan wajib min 10 karakter, tombol aktif hanya bila terisi). Setelah aksi: toast dan pindah ke laporan berikutnya; antrean habis -> EmptyState.
3. Mode baca-saja bila status bukan menunggu_verifikasi (tampilkan hasil verifikasi atau alasan penolakan, tanpa kartu keputusan).
4. /admin/riwayat: kartu filter (cari ID, status, kategori, urgensi; debounce 400 ms; ubah filter kembali ke halaman 1), tabel (8 baris per halaman) dengan UrgencyChip dan StatusChip, aksi panah ke /admin/verifikasi?id=, paginasi dengan teks "1-8 dari N laporan · Halaman x dari y". Mobile: tampilan kartu, bukan tabel.

Kriteria selesai: setujui/tolak di mode mock mengubah status dan terlihat di Riwayat; tampilan sesuai Figma desktop dan mobile.

Commit: "feat: admin verification and history"
Lalu push dan BERHENTI untuk laporan.
```

## Step 8 — Admin: Dashboard dan Peta

```
STEP 8 — Admin: Dashboard dan Peta.

Tugas (Design.md 6.5; layar Figma 13-14):
1. /admin: judul, rentang tanggal (dua input tanggal dalam popover; default 7 hari terakhir), 5 StatCard (hitung persentase di frontend), kartu "n laporan menunggu keputusan Anda" dengan tombol ke /admin/verifikasi.
2. Peta persebaran (MapView): pin berwarna per status (divIcon, bukan ikon default Leaflet), popup (thumbnail, kategori, ID tiket, chip status, link "Lihat detail laporan"), legenda, teks ringkasan jumlah laporan aktif. Tautan detail menuju /admin/verifikasi?id=.
3. Kartu "Ringkasan Eksekutif AI" (poin-poin dari insight; sembunyikan/placeholder jika gagal) dan kartu "Tren kategori" (batang progres dengan persen + jumlah).
4. Semua state loading/empty/error. Responsif: kartu pertama penuh dan sisanya grid 2x2 di mobile.

Kriteria selesai: dashboard tampil dengan data mock, filter tanggal memicu pemuatan ulang, tampilan sesuai Figma.

Commit: "feat: admin dashboard and map"
Lalu push dan BERHENTI untuk laporan.
```

## Step 9 — Chatbot dan Halaman Tanya AI

```
STEP 9 — Chat widget dan halaman /tanya-ai.

Tugas (Design.md 6.4; layar Figma 11-12):
1. Halaman /tanya-ai: hero, TicketSearchBox, kartu "Laporan terakhir Anda" (dari kw_last_ticket), kartu info mint.
2. ChatWidget: tombol melayang "Tanya AI" yang membuka panel (desktop 380 px, mobile hampir layar penuh). Header, chip cepat (Cek Status Tiket, Lihat/Lupa ID Tiket, Cara Melapor) yang mengirim teks pesan, area pesan, bubble asisten/pengguna, kartu tiket dari tickets[] dengan link ke /lacak?id=, indikator mengetik, input + tombol kirim, catatan "AI dapat keliru. Keputusan laporan oleh instansi."
3. Kirim ke sendMessage dengan message dan history (maks 6 pesan terakhir). Pesan pembuka otomatis. Tangani error dan 429 dengan pesan ramah di dalam chat.
4. Pasang tombol "Tanya Chatbot AI" di header publik untuk membuka widget (atau menuju /tanya-ai dengan widget terbuka).

Kriteria selesai: percakapan mock berjalan, kartu tiket tampil dan bisa diklik.

Commit: "feat: ai chat widget"
Lalu push dan BERHENTI untuk laporan.
```

## Step 10 — Polish dan Verifikasi Build Statis

```
STEP 10 — Polish dan verifikasi static build.

Tugas:
1. Review semua halaman terhadap docs/design (01-24) di desktop dan mobile; perbaiki selisih visual.
2. Pastikan semua halaman punya state loading/empty/error dan semua tombol ikon punya aria-label dan fokus terlihat.
3. Tambah metadata (title per halaman) dan favicon.
4. Cari dan hapus pelanggaran aturan: fetch langsung di komponen, penggunaan window/localStorage di level modul, route dinamis, API routes, middleware, server actions.
5. Jalankan `npm run lint` dan `npm run build`; periksa folder out/ memuat index.html di setiap route (/, /terkirim/, /lacak/, /tanya-ai/, /masuk/, /admin/, /admin/verifikasi/, /admin/riwayat/, /petugas/, /petugas/tugas-saya/, /petugas/laporan/) dan 404.html.
6. Uji out/ secara lokal dengan server statis (mis. `npx serve out`) dan klik semua alur utama dalam mode mock.
7. Lengkapi README: cara jalankan, env, mode mock, build, struktur folder, deploy ke cPanel (upload isi out/ ke public_html).

Kriteria selesai: build bersih, semua route terbuka dari hasil build statis, tidak ada error console.

Commit: "chore: polish and verify static build"
Lalu push dan BERHENTI untuk laporan. Setelah ini repo siap dikirim ke Ilyasa untuk penyatuan.
```

## Step 11 — Integrasi API Asli (dikerjakan setelah backend siap)

```
STEP 11 — Hubungkan ke API asli.

Prasyarat: backend berjalan (lokal atau di api.DOMAINKITA.com) dan API-Contract.md versinya sama di kedua repo.

Tugas:
1. Set NEXT_PUBLIC_USE_MOCK=false dan NEXT_PUBLIC_API_URL ke backend.
2. Uji setiap endpoint dari UI: kirim laporan, lacak, login admin/petugas, verifikasi (setujui/tolak), ambil laporan, selesaikan, dashboard, peta, chatbot.
3. Setiap ketidakcocokan antara respons nyata dan kontrak: JANGAN menyesuaikan diam-diam. Catat daftar ketidakcocokan, laporkan ke saya, lalu perbaiki sesuai keputusan (kontrak yang diubah, atau backend yang diperbaiki).
4. Periksa CORS, header Authorization, upload multipart (foto terkompres), dan penanganan 401/403/409/422/429.

Commit: "feat: connect to real api"
Lalu push dan BERHENTI untuk laporan.
```

## Step 12 — Deploy dan Dokumentasi

```
STEP 12 — Deploy dan dokumentasi akhir.

Tugas:
1. Build production dengan NEXT_PUBLIC_API_URL production dan NEXT_PUBLIC_USE_MOCK=false.
2. Siapkan panduan deploy di README: zip isi out/, upload dan extract ke public_html lewat cPanel File Manager, file .htaccess (Options -Indexes, ErrorDocument 404 /404.html), cek HTTPS.
3. Tambahkan screenshot layar utama ke README (docs/screenshots/).
4. Checklist uji akhir: alur warga (kirim -> lacak), admin (verifikasi -> dashboard), petugas (ambil -> selesai -> terlihat di lacak warga), chatbot.

Commit: "docs: add readme and deploy guide"
Lalu push dan BERHENTI untuk laporan.
```

---

## Catatan untuk Dandy

- Kalau agent bertanya atau menemukan kontrak yang tidak jelas, **jangan dijawab asal**. Tanyakan ke Ilyasa dulu, lalu update `API-Contract.md` + Changelog di kedua repo.
- Cek hasil tiap step di browser (desktop dan mobile) sebelum bilang "lanjut".
- Kalau sebuah step terlalu besar untuk satu sesi, pecah jadi beberapa commit **dan beberapa push** (misal `feat: report form ui` lalu `feat: report form validation`). Aturan utamanya: jangan ada push yang menumpuk pekerjaan berhari-hari.
