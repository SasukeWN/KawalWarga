# KawalWarga — Design.md

> Acuan visual frontend. Sumber kebenaran visual tetap **Figma (`UI.zip`, 24 layar + logo)**.
> Dokumen ini merangkum token, komponen, dan aturan per layar supaya implementasi konsisten.
> Taruh `UI.zip` yang sudah di-extract di `docs/design/` (repo frontend) sebagai referensi.

---

## 1. Brand

| Hal | Aturan |
|---|---|
| Nama aplikasi | **KawalWarga** |
| Logo | `Logo Kawal Warga.png` (ikon pin lokasi hijau + teks "Kawal" gelap + "Warga" hijau). Simpan di `public/logo.png` |
| Header publik | Logo KawalWarga di kiri, subteks kecil "Dinas Prasarana & Lingkungan · Kota Harmoni" |
| Catatan | Figma masih menulis "Lapor Warga" dengan ikon perisai. **Keputusan: diganti logo dan nama KawalWarga** di semua tempat. Teks "Kota Harmoni" dan "Dinas Prasarana & Lingkungan" adalah wilayah dummy, simpan di satu file konfigurasi (`src/lib/config.ts`) |
| Tone teks | Bahasa Indonesia, ramah dan jelas, sapaan "Anda" |

---

## 2. Design Tokens

Semua warna memakai **palet default Tailwind** supaya tidak perlu konfigurasi khusus.

### Warna

| Peran | Token Tailwind | Hex |
|---|---|---|
| Primary (tombol utama, link, ikon aktif) | `emerald-700` | `#047857` |
| Primary hover | `emerald-800` | `#065f46` |
| Primary soft (banner, menu aktif, sukses) | `emerald-50` | `#ecfdf5` |
| Border primary lembut | `emerald-200` | `#a7f3d0` |
| Background halaman | `stone-50` | `#fafaf9` |
| Card / header / input | `white` | `#ffffff` |
| Border umum | `stone-200` | `#e7e5e4` |
| Teks utama | `stone-900` | `#1c1917` |
| Teks sekunder | `stone-600` | `#57534e` |
| Teks tersier / placeholder | `stone-500` | `#78716c` |
| Kartu AI (rekomendasi, ringkasan) | `teal-50` + border `teal-200` | `#f0fdfa` |
| Peringatan (duplikat) | `amber-50` + border `amber-200`, teks `amber-900` | `#fffbeb` |
| Error / tolak | `rose-50` bg, `rose-700` teks, `rose-300` border | `#fff1f2` |
| Latar peta (placeholder) | `stone-100` | `#f5f5f4` |

### Chip Status

| Status | Background | Teks | Border | Dot |
|---|---|---|---|---|
| Menunggu Verifikasi | `stone-200` | `stone-700` | – | `stone-500` |
| Menunggu Penanganan | `amber-100` | `amber-800` | `amber-300` | `amber-500` |
| Diproses | `orange-100` | `orange-800` | `orange-300` | `orange-600` |
| Selesai | `emerald-50` | `emerald-800` | `emerald-400` | `emerald-600` |
| Ditolak | `rose-100` | `rose-800` | `rose-300` | `rose-600` |

### Chip Urgensi

| Urgensi | Background | Teks |
|---|---|---|
| Darurat | `rose-100` | `rose-900` (bold) |
| Tinggi | `rose-50` | `rose-700` |
| Sedang | `amber-100` | `amber-800` |
| Rendah | `emerald-100` | `emerald-800` |

> Kalau ada beda tipis dengan Figma, **Figma yang menang**. Cukup ubah di satu tempat (`StatusChip`, `UrgencyChip`).

### Warna Pin Peta (per status)

`menunggu_penanganan` = `#f59e0b` · `diproses` = `#ea580c` · `selesai` = `#16a34a` · `ditolak` = `#e11d48`

### Tipografi

- Font: **Inter** (via `next/font/google`).
- Judul hero halaman: `text-3xl md:text-4xl`, `font-extrabold`, `tracking-tight`.
- Eyebrow (label kecil di atas judul, contoh "LAYANAN PENGADUAN MASYARAKAT"): `text-xs font-bold uppercase tracking-wider text-emerald-700`.
- Judul kartu: `text-lg font-bold`. Teks isi: `text-sm`/`text-base`, `text-stone-600`.
- Angka statistik dashboard: `text-4xl font-extrabold`.

### Bentuk dan Jarak

- Radius: kartu `rounded-2xl`, input/tombol `rounded-xl`, chip `rounded-full`.
- Kartu: `bg-white border border-stone-200 shadow-sm`, padding `p-5 md:p-6`.
- Lebar konten halaman publik: `max-w-6xl mx-auto px-4 md:px-6`. Form dan hasil terkirim lebih sempit (`max-w-xl` untuk halaman "terkirim").
- Jarak antar blok: `gap-6`.
- Tombol utama: tinggi `h-12`, `bg-emerald-700 text-white font-semibold`, ikon di kiri.
- Tombol sekunder: `bg-white border border-stone-200 text-emerald-800 font-semibold`.
- Tombol bahaya (Tolak Laporan): `bg-white border border-rose-300 text-rose-700`.
- Tombol disabled: `bg-stone-200 text-stone-500 cursor-not-allowed` dengan ikon gembok.

### Ikon

Gunakan **lucide-react** (gaya garis tipis, cocok dengan Figma): `shield-check`, `camera`, `image-plus`, `map-pin`, `locate-fixed`, `send`, `search`, `history`, `leaf`/`sparkles` (AI), `copy`, `message-circle`, `arrow-right`, `check`, `x`, `bell`, `calendar`, `layout-dashboard`, `clipboard-check`, `files`, `list-checks`, `briefcase`, `navigation`, `play`, `lock`, `triangle-alert`, `hard-hat`.

---

## 3. Layout

### Halaman Publik (warga)

- Header putih setinggi 64 px: kiri logo + subteks, kanan link **Lacak Laporan** (teks hijau) dan tombol outline **Tanya Chatbot AI** (ikon daun).
- Mobile: header satu baris (logo), baris kedua berisi dua link yang sama (kiri **Lacak Laporan**, kanan **Tanya Chatbot AI**).
- Footer: teks kecil abu "KawalWarga · Konsep layanan Kota Harmoni / Data pribadi digunakan hanya untuk tindak lanjut laporan."
- Tombol melayang **Tanya AI** (pojok kanan bawah, hijau tua, ikon daun) di halaman `/tanya-ai`.

### Halaman Admin dan Petugas (dashboard shell)

- **Desktop**: sidebar kiri lebar 260 px (`bg-stone-50`, border kanan), konten di kanan dengan topbar putih.
- Sidebar berisi: logo, label grup ("RUANG ADMIN & PIMPINAN" atau "RUANG PETUGAS"), menu (item aktif `bg-emerald-50 text-emerald-800 font-semibold`), kartu kecil "Wilayah Kota Harmoni — Satu instansi, satu alur penanganan.", lalu di bawah nama pengguna, jabatan, dan link **Keluar dari akun**.
- Topbar: judul ("Pusat kendali layanan" untuk admin, "Ruang kerja petugas" untuk petugas) + subteks, ikon lonceng, avatar inisial bulat `bg-emerald-100 text-emerald-800`.
- **Mobile**: sidebar jadi drawer yang dibuka tombol hamburger di topbar. Isi drawer sama.
- Lonceng notifikasi: **dekoratif** (tidak ada desain daftar notifikasi), cukup tampil tanpa fungsi.

Menu admin: Dashboard & Peta · Antrean Verifikasi · Riwayat Laporan.
Menu petugas: Antrean Penanganan · Tugas Saya.

---

## 4. Komponen Bersama

| Komponen | Catatan |
|---|---|
| `Button` | varian: `primary`, `secondary`, `danger-outline`, `ghost`; props `icon`, `loading`, `disabled`, `fullWidth` |
| `Card` | wadah putih standar; varian `mint` (emerald-50), `ai` (teal-50), `warning`, `danger` |
| `StatusChip`, `UrgencyChip` | pemetaan warna di bagian 2 |
| `Eyebrow`, `PageHeading` | label kecil + judul hero + subteks |
| `TicketSearchBox` | input "ID tiket" dengan ikon cari + tombol **Lacak** (dipakai di `/lacak`, `/tanya-ai`, dan kartu di `/`) |
| `PhotoPicker` | area dashed hijau, ikon kamera, dua tombol **Pilih Foto** dan **Kamera** (`input type=file accept="image/*"` dan `capture="environment"`), preview file (thumbnail, nama, ukuran, status "Siap diunggah", tombol hapus), kompres otomatis |
| `LocationPicker` | peta Leaflet + pin yang bisa digeser, tombol **Gunakan Lokasi Saya Saat Ini**, teks alamat di bawahnya |
| `MapView` | pembungkus Leaflet (hanya di sisi client), mendukung 1 pin statis (detail) dan banyak pin berwarna (dashboard) |
| `Stepper` | 4 langkah (ikon centang hijau = selesai, lingkaran angka hijau = aktif, abu = belum) |
| `Timeline` | titik vertikal; item terbaru titik hijau, sisanya abu; tiap item: judul tebal, tanggal kecil, deskripsi |
| `StatCard` | judul kecil, angka besar, teks bantu, titik warna di pojok kanan atas |
| `Sidebar`, `Topbar`, `AppShell` | lihat bagian 3 |
| `ChatWidget` | panel melayang (lihat bagian 6.5) |
| `Skeleton`, `EmptyState`, `ErrorState` | wajib ada di semua halaman yang memuat data |
| `ConfirmDialog` | untuk Setujui, Tolak, Ambil Laporan, Tandai Selesai |
| `Toast` | umpan balik singkat (berhasil disalin, gagal kirim, dsb.) |

---

## 5. Pola Umum

- **Format tanggal**: `8 Nov 2026 · 10.42 WIB` (zona Asia/Jakarta, pemisah jam pakai titik). Buat satu helper `formatDateTime()` dan `formatDate()`.
- **ID tiket di UI**: selalu tampil `#ADU-204` (tambahkan `#` di frontend). Data ke API tanpa `#`.
- **Loading**: skeleton abu pada kartu, jangan layar kosong.
- **Empty state**: ikon + kalimat ramah, contoh "Belum ada laporan siap ditangani."
- **Error**: kartu merah lembut dengan tombol **Coba Lagi**.
- **Aksesibilitas dasar**: semua tombol ikon punya `aria-label`, kontras teks cukup, fokus terlihat (`focus-visible:ring-2 ring-emerald-600`).
- **Responsif**: mobile-first, breakpoint utama `md` (768 px) dan `lg` (1024 px). Layout dua kolom di desktop jadi satu kolom di mobile. Tombol aksi utama di mobile boleh `w-full`.

---

## 6. Spesifikasi Per Layar

Nomor mengacu ke nama file di `UI.zip`. Tiap layar punya versi Desktop (angka ganjil) dan Seluler (genap).

### 6.1 Warga — Buat Laporan (01, 02) → route `/`

- Banner mint "**Laporan terakhir Anda · #ADU-891**" + chip status + teks "Saat ini berstatus: DIPROSES. Petugas sedang menangani laporan Anda." + link **Lihat Detail →**. Tampil **hanya jika** ada tiket tersimpan di `localStorage` (`kw_last_ticket`); status diambil dari API lacak.
- Eyebrow "LAYANAN PENGADUAN MASYARAKAT", judul "Lingkungan lebih baik, dimulai dari laporan Anda.", subteks "Temukan masalah prasarana atau kebersihan? Ceritakan kepada kami. Anda bisa melapor tanpa membuat akun."
- Desktop: dua kolom. Kiri (lebar) **form "Buat laporan baru"**; kanan (sidebar): kartu "**Sudah pernah melapor?**" (`TicketSearchBox`), kartu "**Yang dapat Anda laporkan**" (Jalan rusak · Lubang dan kerusakan jalan lingkungan; Sampah · Tumpukan sampah di ruang publik; Lampu mati · Penerangan jalan yang tidak berfungsi), kartu mint "**Butuh panduan? Tanya AI.**" dengan tombol **Tanya Chatbot AI**, dan catatan kecil "Laporan akan diperiksa admin sebelum diteruskan ke petugas. Simpan ID tiket setelah mengirim."
- Mobile: urutan satu kolom (banner, judul, form, lalu kartu-kartu samping).
- **Form**:
  1. "Apa yang ingin Anda laporkan? *" textarea, placeholder "Ceritakan permasalahan di sekitar Anda secara jelas…" (validasi min 20 karakter).
  2. "Foto bukti kejadian *" `PhotoPicker`, teks "JPG atau PNG · Maksimal 10 MB".
  3. "Lokasi kejadian *" `LocationPicker`, label peta "Geser pin ke lokasi kejadian", tombol "Gunakan Lokasi Saya Saat Ini", teks alamat + "Geser pin untuk menyesuaikan titik lokasi."
  4. "Nomor WhatsApp (opsional)" placeholder `08xxxxxxxxxx`, bantuan "Opsional, untuk membantu pencarian tiket jika Anda lupa ID laporan."
  5. Garis pemisah, ikon perisai + "Data Anda hanya digunakan untuk tindak lanjut laporan. Tanpa login, tanpa biaya."
  6. Tombol **Kirim Laporan** (primary, full width, ikon kirim).
- Keadaan: tombol loading saat mengirim; error validasi per field (teks merah kecil di bawah field); gagal jaringan → toast + tombol tetap aktif.

### 6.2 Warga — Laporan Terkirim (03, 04) → route `/terkirim?id=`

- Kartu tengah (`max-w-xl`): lingkaran mint dengan centang, judul "Terima kasih sudah peduli.", teks "Laporan Anda berhasil diterima. Simpan ID tiket ini untuk memantau perkembangannya."
- Kotak mint berborder hijau: label "ID TIKET ANDA", **`#ADU-204`** besar tebal, chip "Menunggu Verifikasi", waktu "8 Nov 2026 · 10.42 WIB".
- Tombol **Salin ID Tiket** (lalu toast "ID tiket disalin") dan **Simpan ke WhatsApp** (buka `https://wa.me/?text=` berisi teks: "ID tiket laporan KawalWarga saya: #ADU-204. Lacak di {URL}/lacak?id=ADU-204").
- "Apa yang terjadi selanjutnya?" + penjelasan verifikasi admin.
- Tombol utama **Lacak Laporan Saya** → `/lacak?id=...`; link **Kembali ke halaman utama**.
- Simpan `kw_last_ticket` di `localStorage` saat laporan berhasil dikirim.

### 6.3 Warga — Lacak Laporan (05–10) → route `/lacak?id=`

Satu halaman dengan tiga tampilan sesuai status. Bagian atas selalu sama: eyebrow "PELACAKAN LAPORAN", `TicketSearchBox` (bantuan "Lupa ID tiket? Gunakan bantuan Tanya AI." yang menaut ke `/tanya-ai`), lalu kartu ringkasan: "Laporan #ADU-891", **judul laporan** besar, "Diterima 7 Nov 2026 · 16.40 WIB · Kategori Jalan Rusak", chip status di kanan.

**A. Diproses / Menunggu (05, 06)**
- `Stepper` 4 langkah.
- Kolom kiri: kartu "Laporan Anda" (foto, keterangan "Foto awal dari warga · 7 Nov 2026", deskripsi, alamat dengan ikon pin) dan peta kecil.
- Kolom kanan: kartu mint "**Kabar terbaru petugas**" (kutipan `latest_update.note`, nama petugas · jabatan · tanggal; sembunyikan kalau `null`) dan kartu "**Riwayat perkembangan**" (`Timeline`).
- Catatan kecil: "Status diperbarui oleh instansi. Simpan ID tiket #ADU-891 untuk pengecekan berikutnya."

**B. Selesai (07, 08)**
- Judul halaman "Laporan tuntas, lingkungan lebih nyaman." dan `Stepper` semua centang.
- Kartu "**Bukti perubahan di lapangan**": dua foto berdampingan, label "SEBELUM · FOTO WARGA" dan "SESUDAH · FOTO PETUGAS" (hijau), keterangan tanggal, alamat. Di mobile tersusun atas-bawah.
- Kartu mint "**Catatan tindakan petugas**" (`completion.notes`, nama · jabatan · "Selesai {tanggal}") dan `Timeline`.

**C. Ditolak (09, 10)**
- Judul halaman "Informasi hasil verifikasi.", **tanpa** stepper.
- Kolom kiri: kartu "Laporan Anda" (foto, deskripsi, lokasi).
- Kolom kanan: kartu merah lembut "**Laporan tidak dapat diteruskan**", label "ALASAN PENOLAKAN DARI ADMIN", alasan tebal, "Nadia Putri · Admin verifikator / 6 Nov 2026 · 11.20 WIB". Di bawahnya kartu "**Apa yang bisa dilakukan?**" dengan tombol **Buat Laporan Baru** (ke `/`).

**D. Belum ada / tidak ditemukan**: `EmptyState` "Tiket tidak ditemukan. Periksa kembali ID tiket Anda." Kalau URL tanpa `?id=`, tampilkan hanya `TicketSearchBox`.

### 6.4 Warga — Tanya AI (11, 12) → route `/tanya-ai`

- Eyebrow "LAYANAN WARGA", judul "Ada yang bisa kami bantu?", subteks "Cek perkembangan laporan atau tanyakan panduan layanan melalui asisten AI."
- `TicketSearchBox`, lalu kartu "Laporan terakhir Anda" (foto, judul, chip status, "#ADU-891 · alamat", teks status, tombol **Lihat Detail**) dan kartu mint info "Tidak perlu akun… Cukup simpan ID tiket…".
- `ChatWidget`: tombol melayang **Tanya AI** (ikon daun) yang membuka panel di pojok kanan bawah (desktop 380 px; mobile layar penuh bawah). Panel: header hijau tua "Asisten Lapor Warga / AI untuk membantu Anda" + tombol tutup; baris chip cepat "Cek Status Tiket", "Lupa ID Tiket", "Cara Melapor"; area pesan (bubble asisten putih, bubble pengguna hijau); balasan yang membawa tiket menampilkan **kartu tiket** (pesan, chip status, link "Lihat detail laporan →"); input "Tulis pesan Anda…" + tombol kirim; catatan kecil "AI dapat keliru. Keputusan laporan oleh instansi."
- Pesan pembuka otomatis: "Halo! Kirim ID tiket untuk mengecek laporan Anda."
- Saat menunggu jawaban: indikator mengetik (tiga titik).
- Nama di header chat: ganti ke "Asisten KawalWarga".

### 6.5 Admin — Dashboard & Peta (13, 14) → route `/admin`

- Eyebrow "MONITORING WILAYAH", judul "Gambaran layanan hari ini.", subteks "Pantau laporan masuk, persebaran masalah, dan progres penanganan."
- Baris periode: teks "1–8 Nov 2026 · Seluruh wilayah Kota Harmoni" dan tombol rentang tanggal (ikon kalender). Boleh pakai dua `input type=date` dalam popover sederhana.
- **5 StatCard**: Total Laporan Masuk (titik hijau, bantu "Termasuk {n} menunggu penanganan"), Menunggu Verifikasi (abu, "Perlu keputusan admin"), Sedang Diproses Petugas (oranye, "Dikerjakan di lapangan"), Selesai Ditangani (hijau, "{x}% dari seluruh laporan"), Laporan Ditolak (merah, "Dengan alasan verifikasi"). Mobile: kartu pertama penuh, sisanya grid 2×2.
- **Peta persebaran pengaduan**: teks "Pilih pin untuk melihat laporan. {n} laporan aktif: {a} menunggu penanganan, {b} diproses." Pin berwarna per status; klik pin → popup berisi thumbnail, judul kategori, `#ADU-891`, chip status, link "Lihat detail laporan →". Legenda: Menunggu Penanganan, Diproses, Selesai, Ditolak, dan catatan "Menunggu Verifikasi belum dipetakan sebagai tugas petugas."
- Kartu mint "**{n} laporan menunggu keputusan Anda**" + tombol **Buka Antrean Verifikasi →**.
- Kolom kanan: kartu `ai` "**Ringkasan Eksekutif AI**" (label "BERDASARKAN 200 LAPORAN · 1–8 NOV", daftar poin, catatan "Rekomendasi pendukung, bukan keputusan otomatis.") dan kartu "**Tren kategori**" (batang progres hijau + persen + jumlah per kategori).
- Kalau endpoint ringkasan AI belum tersedia (P2), sembunyikan kartu atau tampilkan `EmptyState` kecil.

### 6.6 Admin — Antrean Verifikasi (15, 16) → route `/admin/verifikasi?id=`

- Eyebrow "VERIFIKASI LAPORAN", judul "Periksa bukti. Putuskan dengan yakin.", subteks "AI membantu menganalisis. Keputusan akhir tetap dibuat oleh admin."
- Kartu navigator: "{n} laporan menunggu verifikasi", "Terbaru lebih dulu · Laporan 1 dari 24", pill laporan aktif (`#ADU-204 · Jalan berlubang di Jl. Melati`) dan tombol **Laporan berikutnya →**.
- Judul "Pemeriksaan #ADU-204" + chip status.
- Kolom kiri: kartu "**Bukti & deskripsi asli**" (foto besar, "jalan-melati.jpg · Foto asli warga", link "Perbesar foto ↗" yang membuka foto dalam modal, deskripsi dikutip, "Diterima 8 Nov 2026 · 10.42 WIB / WhatsApp tidak disertakan") dan kartu "**Lokasi kejadian**" (peta + alamat + "Pin lokasi dari warga · Dalam wilayah layanan").
- Kolom kanan: kartu `ai` "**Rekomendasi Analisis AI**" ("RINGKASAN CEPAT" + ringkasan, select **Kategori laporan**, tombol pilihan **Urgensi** (Rendah, Sedang, Tinggi ✓, Darurat), catatan "Kategori dan urgensi dapat diubah sesuai hasil pemeriksaan admin.", dan kotak kuning duplikat "Terdeteksi mirip dengan Tiket #ADU-198 (Jarak 50m). Lihat Tiket Terkait →" bila `ai.duplicates` ada).
- Kartu "**Keputusan admin**": tombol hijau **Setujui & Teruskan ke Petugas** (dengan teks bantu "Setelah disetujui: Menunggu Penanganan…"), tambah textarea opsional "Catatan untuk petugas"; lalu bagian "Jika laporan harus ditolak": textarea **Alasan penolakan \*** ("Wajib diisi sebelum menolak. Alasan akan terlihat oleh warga.") dan tombol outline merah **Tolak Laporan** (aktif hanya bila alasan terisi, min 10 karakter).
- Setelah setujui/tolak: toast, lalu otomatis pindah ke laporan berikutnya; kalau antrean habis tampil `EmptyState` "Semua laporan sudah diperiksa."
- Mode **baca-saja** bila status bukan `menunggu_verifikasi` (dibuka dari Riwayat atau tiket terkait): sembunyikan kartu keputusan, tampilkan blok "Hasil verifikasi" / alasan penolakan.

### 6.7 Admin — Riwayat Laporan (17, 18) → route `/admin/riwayat`

- Eyebrow "BUKU BESAR LAYANAN", judul "Riwayat & seluruh laporan.", subteks "Telusuri setiap laporan, dari pengajuan hingga bukti penyelesaian."
- Kartu filter: **Cari ID tiket** (placeholder "Ketik ID, mis. ADU-891"), select **Status**, **Kategori**, **Urgensi**; teks ringkasan "Periode 1–8 Nov 2026 · 200 laporan · Semua status, kategori, dan urgensi".
- Tabel "Seluruh laporan" dengan kolom: ID Tiket (hijau, tebal), Laporan/Kategori (judul + kategori kecil), Lokasi, Urgensi (`UrgencyChip`), Status (`StatusChip`), Tanggal, Aksi (ikon panah → buka `/admin/verifikasi?id=`). "Menampilkan 1–8 dari 200".
- Paginasi: tombol panah, nomor halaman aktif hijau; teks "1–8 dari 200 laporan · Halaman 1 dari 25". 8 baris per halaman.
- Mobile: tabel berubah jadi **daftar kartu** (satu kartu per laporan berisi semua info di atas).
- Filter debounce 400 ms untuk pencarian; setiap perubahan filter kembali ke halaman 1.

### 6.8 Petugas — Antrean Penanganan (19, 20) → route `/petugas`

- Topbar "Ruang kerja petugas". Judul "Selamat bertugas, {nama depan}." subteks "Pilih laporan terverifikasi untuk mulai membantu warga hari ini."
- Tab: **Siap Ditangani** (badge jumlah) dan **Tugas Saya** (route `/petugas/tugas-saya`).
- Banner mint: "Semua laporan di sini sudah diverifikasi admin dan berstatus Menunggu Penanganan. Ambil laporan sesuai prioritas dan kesiapan Anda."
- Baris kontrol: "Menampilkan 3 dari 16 laporan siap ditangani" dan "Urgensi tertinggi dulu" (ikon sort).
- Grid kartu (3 kolom desktop, 1 kolom mobile): chip urgensi kiri atas, kategori + `#ADU-198` kanan atas, foto, judul tebal, chip status, alamat + "0,8 km dari lokasi Anda", "Diverifikasi 8 Nov · 08.10 WIB", tombol **Lihat Detail Laporan**.
- Tombol **Muat Laporan Lainnya** (halaman berikutnya ditambahkan ke daftar).

### 6.9 Petugas — Detail Sebelum Diambil (21, 22) → route `/petugas/laporan?id=`

- Tautan "← Kembali ke Siap Ditangani". Eyebrow "DETAIL LAPORAN · #ADU-198", judul besar judul laporan, subteks "Periksa kondisi dan lokasi sebelum mengambil tanggung jawab penanganan."
- Chip status + chip urgensi + "Jalan Rusak · Diterima 8 Nov 2026".
- Kolom kiri: kartu "**Laporan asli warga**" (foto + "Foto awal dari warga · 8 Nov 2026, 07.35 WIB" + "DESKRIPSI KEJADIAN") dan kartu mint "**Catatan verifikasi admin**" ("Valid · Urgensi Darurat", catatan, "Nadia Putri · 8 Nov 2026, 08.10 WIB", "Kategori ditetapkan: Jalan Rusak").
- Kolom kanan: kartu "**Lokasi penanganan**" (peta, alamat, "0,8 km dari lokasi Anda · Pin dari warga", tombol **Buka Rute di Google Maps** → `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`) dan kartu aksi dengan teks "Dengan mengambil laporan, Anda bertanggung jawab atas penanganannya." + tombol **Ambil & Kerjakan Laporan** (`ConfirmDialog` dulu).
- Catatan: "Laporan belum diambil petugas. Setelah Anda mengambilnya, status berubah menjadi Diproses dan form bukti penanganan akan tersedia."
- Kalau balasan **409** saat mengambil: toast "Laporan sudah diambil petugas lain" lalu kembali ke antrean.

### 6.10 Petugas — Tugas Aktif & Penyelesaian (23, 24) → route `/petugas/laporan?id=` (status `diproses`)

Route sama dengan 6.9; tampilan berubah mengikuti status laporan.

- Judul "Penanganan ada di tangan Anda.", subteks "Kerjakan dengan aman, lalu dokumentasikan hasilnya untuk warga."
- Chip status, urgensi, "Jalan Rusak · Diambil Budi Santoso, 8 Nov 2026 · 11.00 WIB".
- Banner mint dengan ikon helm: judul laporan, alamat, "Anda adalah petugas penanggung jawab."
- Kolom kiri: sama dengan 6.9 (laporan asli, catatan verifikasi admin, lokasi + tombol rute).
- Kolom kanan: kartu "**Dokumentasikan hasil penanganan**": teks "Lengkapi kedua bukti berikut setelah pekerjaan benar-benar selesai. Tanda * wajib diisi.", `PhotoPicker` "Upload Foto Bukti Penanganan *" ("Tambahkan foto hasil penanganan · JPG atau PNG · Maksimal 10 MB"), textarea "**Catatan Tindakan \***" (contoh isian di bawahnya), **checklist** dua baris ("Foto bukti penanganan belum diunggah", "Catatan tindakan belum diisi") yang berubah jadi centang hijau saat terpenuhi.
- Kartu bawah: teks "Isi foto bukti dan catatan tindakan untuk menyelesaikan laporan." dan tombol **Tandai Selesai** (disabled dengan gembok sampai foto + catatan terisi; `ConfirmDialog` sebelum kirim) + catatan "Foto dan catatan akan tampil di halaman pelacakan warga setelah laporan diselesaikan."
- Setelah selesai: toast, lalu tampil mode baca-saja status `selesai` (tampilkan bukti yang diunggah, form disembunyikan).
- Tab **Tugas Saya** (`/petugas/tugas-saya`): daftar kartu laporan milik petugas, filter chip "Diproses" / "Selesai".

### 6.11 Login Admin/Petugas (tidak ada di Figma) → route `/masuk`

Dibuat mengikuti gaya yang sama:
- Kartu tengah `max-w-md` di atas latar `stone-50`, logo KawalWarga di atas.
- Judul "Masuk ke ruang kerja", subteks "Khusus admin dan petugas instansi."
- Field **Email** dan **Password** (ikon mata untuk tampilkan password), tombol **Masuk** (primary, full width, loading state), pesan error merah kalau 401.
- Setelah login: `role = admin` → `/admin`; `role = petugas` → `/petugas`.
- Link kecil "← Kembali ke halaman utama". Tidak ada "lupa password" atau daftar.
- Link **Masuk Petugas/Admin** kecil di footer halaman publik.

---

## 7. Aset

| Aset | Lokasi |
|---|---|
| Logo | `public/logo.png` (dari `Logo Kawal Warga.png`) |
| Favicon | buat dari ikon pin pada logo (`public/favicon.ico`) |
| Foto contoh untuk mock | pakai gambar dari `UI/` Figma di `public/mock/` (jalan berlubang, sampah, lampu padam, jalan ditambal). **Jangan** dikirim ke produksi kalau tidak dipakai |
| Peta | Leaflet + tile OpenStreetMap (atribusi "© OpenStreetMap" wajib tampil) |

---

## 8. Checklist Kesesuaian dengan Figma

- [ ] Warna primary, background, border sesuai token
- [ ] Semua chip status dan urgensi sesuai bagian 2
- [ ] Teks eyebrow, judul, dan subteks sama dengan Figma (copy persis)
- [ ] Layout desktop dua kolom dan mobile satu kolom pada semua layar
- [ ] Semua layar 01–24 punya padanan halaman
- [ ] Logo KawalWarga dipakai di header dan sidebar
- [ ] Format tanggal `8 Nov 2026 · 10.42 WIB` konsisten
