# KawalWarga — End-to-End (E2E) Test Checklist

> Acuan: `docs/Integration-PRD.md` Bab 7 (Skenario S1–S14).  
> Pengujian dilakukan manual di browser desktop (Chrome / Edge / Firefox) dan browser HP asli (atau Chrome Device Mode 360px), pertama di lingkungan lokal (`http://localhost:3000`), lalu diulangi di production setelah deployment.

---

## 1. Akun & Kredensial Uji Demo

| Peran | Email | Password | Jabatan | Catatan Hak Akses |
|---|---|---|---|---|
| **Admin** | `admin@kawalwarga.test` | `password123` | Admin verifikator | Dashboard ringkasan, peta sebaran, antrean verifikasi, riwayat laporan, manajemen kategori |
| **Petugas** | `budi@kawalwarga.test` | `password123` | Petugas lapangan | Antrean "Siap Ditangani", daftar "Tugas Saya", ambil tugas, perbarui progres, selesaikan laporan |

---

## 2. Tiket Demo Khusus untuk Pengujian

| ID Tiket | Status | Kategori | Urgensi | Catatan Khusus untuk Skenario Uji |
|---|---|---|---|---|
| `ADU-204` | `menunggu_verifikasi` | *Belum terverifikasi* | *Belum terverifikasi* | Laporan warga baru (jalan rusak di Jl. Melati No. 12), terdeteksi duplikat dengan `ADU-198` (~50 m). Siap untuk uji verifikasi admin (**S3**). |
| `ADU-198` | `menunggu_penanganan` | `jalan_rusak` | `darurat` | Telah disetujui admin. Siap di antrean tugas petugas untuk diuji ambil/take (**S5**). |
| `ADU-200` | `diproses` | `jalan_rusak` | `tinggi` | Ditangani oleh Budi Santoso, memiliki catatan progres terbaru (*"Material aspal dingin sudah tiba di lokasi..."*) untuk uji kartu "Kabar terbaru petugas" (**S2**). |
| `ADU-192` | `diproses` | `sampah` | `sedang` | Sedang dalam pengerjaan penanganan sampah oleh petugas. |
| `ADU-187` | `diproses` | `lampu_mati` | `rendah` | Sedang dalam penanganan lampu penerangan padam. |
| `ADU-183` | `ditolak` | *Ditolak* | *Ditolak* | Ditolak admin dengan alasan: *"Lokasi kejadian berada di luar wilayah layanan instansi."* Siap untuk uji tampilan kartu penolakan warga (**S4**). |
| `ADU-176` | `selesai` | `jalan_rusak` | `tinggi` | Selesai diperbaiki, memiliki foto **Sebelum** dan foto bukti **Sesudah** penambalan jalan serta catatan penyelesaian (**S5**, **S2**). |
| `ADU-172` | `selesai` | `sampah` | `sedang` | Selesai dibersihkan petugas (kategori sampah). |

---

## 3. Cara Reset Data Demo

Jika data laporan berubah selama pengujian dan ingin dikembalikan ke kondisi awal (204 laporan demo):
- **PowerShell (Windows)**:
  ```powershell
  .\scripts\reset-demo.ps1
  ```
- **Bash / Linux / macOS**:
  ```bash
  ./scripts/reset-demo.sh
  ```
- **Atau manual**:
  ```bash
  cd backend && php artisan migrate:fresh --seed
  ```

---

## 4. Matriks Checklist Skenario E2E (S1–S14)

| ID | Skenario | Langkah Pengujian | Hasil yang Diharapkan | Lokal | Prod | Catatan / Bug |
|:---:|---|---|---|:---:|:---:|---|
| **S1** | **Warga kirim laporan** | 1. Buka halaman utama `/`<br>2. Upload 1 foto (kamera HP/file)<br>3. Isi deskripsi (≥ 20 karakter)<br>4. Pilih lokasi (geser pin peta atau klik "Gunakan Lokasi Saya")<br>5. Isi nomor WhatsApp (opsional)<br>6. Klik tombol "Kirim Laporan" | • Tombol loading dengan indikator jelas<br>• Redirect ke `/terkirim?id=ADU-xxx`<br>• Nomor tiket berformat `#ADU-xxx` tampil rapi<br>• Tombol "Salin ID Tiket" dan "Lacak Status" berfungsi<br>• Laporan baru langsung muncul di Antrean Verifikasi Admin | [ ] | [ ] | |
| **S2** | **Warga lacak laporan** | 1. Buka `/lacak`<br>2. Masukkan ID tiket: coba `#ADU-204`, `adu-204`, `204`<br>3. Uji tiket berstatus selesai `ADU-176`<br>4. Uji tiket dengan progres `ADU-200` | • Input tiket otomatis dinormalisasi tanpa error<br>• Stepper status menampilkan langkah aktif<br>• Pada `ADU-200`, kartu "Kabar terbaru petugas" tampil dengan catatan Budi<br>• Pada `ADU-176`, kartu perbandingan Sebelum vs Sesudah tampil dengan foto bukti selesai<br>• **Privasi**: Tidak ada nomor HP pelapor atau data internal AI yang bocor | [ ] | [ ] | |
| **S3** | **Admin setujui laporan** | 1. Login sebagai Admin di `/masuk`<br>2. Buka menu **Antrean Verifikasi** `/admin/verifikasi`<br>3. Pilih tiket `ADU-204`<br>4. Periksa ringkasan AI, deteksi duplikat dengan `ADU-198`<br>5. Ubah kategori/urgensi jika perlu, isi catatan verifikasi<br>6. Klik "Setujui Laporan" | • Rekomendasi AI (kategori, urgensi, ringkasan) tampil lengkap<br>• Peringatan duplikat menampilkan tiket `ADU-198` (~50 m)<br>• Modal konfirmasi persetujuan muncul<br>• Status berubah menjadi `menunggu_penanganan`<br>• Laporan berpindah ke antrean petugas | [ ] | [ ] | |
| **S4** | **Admin tolak laporan** | 1. Di Antrean Verifikasi, pilih laporan uji<br>2. Klik "Tolak Laporan"<br>3. Masukkan alasan penolakan (≥ 10 karakter)<br>4. Buka halaman `/lacak` untuk tiket tersebut | • Validasi alasan penolakan aktif (tidak boleh kosong/pendek)<br>• Status laporan berubah menjadi `ditolak`<br>• Di halaman lacak warga, tampil banner merah penolakan beserta alasan resmi admin, nama verifikator, dan waktu | [ ] | [ ] | |
| **S5** | **Petugas tangani & selesaikan laporan** | 1. Login sebagai Petugas di `/masuk`<br>2. Buka **Tugas Siap Ditangani** `/petugas`<br>3. Klik "Ambil Tugas" pada tiket `ADU-198`<br>4. Buka tab **Tugas Saya** `/petugas/tugas-saya`<br>5. Tambah pembaruan progres (opsional)<br>6. Klik "Selesaikan Laporan", upload foto bukti perbaikan dan catatan penyelesaian | • Tiket berpindah dari antrean publik petugas ke "Tugas Saya"<br>• Status berubah menjadi `diproses`<br>• Form penyelesaian memvalidasi foto bukti dan catatan<br>• Status berubah menjadi `selesai`<br>• Halaman lacak warga langsung terbarui menampilkan foto Sebelum vs Sesudah | [ ] | [ ] | |
| **S6** | **Dashboard admin** | 1. Login Admin, buka Dashboard `/admin`<br>2. Periksa kartu ringkasan total (Total, Menunggu Verifikasi, Diproses, Selesai, Ditolak)<br>3. Ganti filter periode (7 Hari, 30 Hari, Semua)<br>4. Periksa peta sebaran dan klik pin peta<br>5. Periksa ringkasan eksekutif AI | • Angka kartu statistik sinkron dengan database<br>• Pin peta berwarna sesuai status dan menampilkan popup detail dengan tautan verifikasi<br>• Pin hanya memuat laporan yang sudah diverifikasi (tidak ada `menunggu_verifikasi`)<br>• Tombol "Perbarui Ringkasan AI" berfungsi | [ ] | [ ] | |
| **S7** | **Chatbot asisten AI** | 1. Buka halaman Tanya AI `/tanya-ai`<br>2. Kirim: *"Cek laporan saya #ADU-204 dong"*<br>3. Klik tombol chip bantuan: *"Cara Melapor"*, *"Lupa ID Tiket"*<br>4. Masukkan nomor WhatsApp pelapor | • AI membalas dengan bahasa santun dan kontekstual<br>• Tiket yang disebut memunculkan kartu ringkas status tiket<br>• Kartu tiket dapat diklik menuju halaman `/lacak`<br>• Fitur Lupa ID Tiket mengembalikan daftar tiket terkait nomor HP pelapor | [ ] | [ ] | |
| **S8** | **Otorisasi & Guard peran** | 1. Petugas membuka `/admin` atau `/admin/verifikasi`<br>2. Admin membuka `/petugas` atau `/petugas/tugas-saya`<br>3. Hapus token di `localStorage` lalu refresh halaman dashboard | • Petugas otomatis diarahkan ke `/petugas` (tidak bisa akses admin)<br>• Admin otomatis diarahkan ke `/admin` (tidak bisa akses petugas)<br>• Tanpa token (401), user otomatis di-redirect ke `/masuk` tanpa loop atau layar blank | [ ] | [ ] | |
| **S9** | **Ketahanan (Error Handling)** | 1. Matikan backend (`Ctrl+C` pada serve), refresh halaman frontend<br>2. Set `GEMINI_API_KEY` salah/kosong di backend `.env`<br>3. Kirim laporan baru saat AI mati | • Halaman menampilkan komponen ErrorState ramah + tombol "Coba Lagi" (bukan white screen/stack trace)<br>• Saat AI mati, pengiriman laporan tetap sukses (201) dengan `ai_status: failed`<br>• Admin tetap dapat menyetujui secara manual<br>• Dashboard dan Chatbot beralih ke fallback cerdas | [ ] | [ ] | |
| **S10** | **Balapan ambil laporan (Race Condition)** | 1. Buka 2 tab browser / 2 browser berbeda dengan akun petugas berbeda (atau simulasi paralel)<br>2. Ambil tiket yang sama secara bersamaan | • Hanya 1 petugas yang berhasil mengambil (status 200)<br>• Petugas kedua menerima respons 409 Conflict dengan pesan ramah *"Laporan sudah diambil oleh petugas lain"* | [ ] | [ ] | |
| **S11** | **Validasi formulir & input** | 1. Submit form laporan tanpa foto<br>2. Deskripsi < 20 karakter<br>3. Format nomor WhatsApp tidak valid (huruf/simbol) | • Validasi client-side mencegah submit jika tidak valid<br>• Validasi server-side mengembalikan 422 dengan pesan error spesifik per kolom<br>• Field yang error ditandai merah beserta pesan penjelas | [ ] | [ ] | |
| **S12** | **Upload foto besar dari HP** | 1. Ambil foto resolusi tinggi dari kamera HP (ukuran 5 MB – 12 MB)<br>2. Unggah melalui formulir laporan warga | • Kompresi canvas client-side berjalan otomatis sebelum upload<br>• Ukuran payload terkompres menjadi < 1.5 MB<br>• Upload berhasil tanpa timeout atau error 413 Payload Too Large | [ ] | [ ] | |
| **S13** | **Responsivitas perangkat bergerak (Mobile)** | 1. Buka seluruh halaman di layar lebar 360 px (Chrome DevTools / HP asli)<br>2. Navigasi drawer admin/petugas<br>3. Tampilan tabel riwayat laporan | • Layout responsif tanpa horizontal scrollbar yang merusak tampilan<br>• Navigasi samping berubah menjadi drawer geser yang nyaman disentuh<br>• Tabel riwayat bertransformasi menjadi kartu (cards) mobile | [ ] | [ ] | |
| **S14** | **Reset data demo** | 1. Jalankan `.\scripts\reset-demo.ps1` (atau `php artisan migrate:fresh --seed`)<br>2. Buka dashboard admin dan halaman antrean | • Database SQLite ter-seed ulang bersih dengan 204 laporan demo<br>• Akun admin dan petugas dapat login kembali dengan password default<br>• Tiket demo khusus (`ADU-204`, `ADU-198`, `ADU-176`, dll.) kembali ke status semula | [ ] | [ ] | |

---

## 5. Log Temuan Bug & Hasil Investigasi E2E

Setiap bug yang ditemukan selama sesi pengujian manual dicatat di tabel berikut dan diselesaikan dengan commit terpisah (`fix: <deskripsi bug>`):

| No | ID Skenario | Deskripsi Temuan / Bug | Sisi (FE/BE) | Akar Masalah & Solusi | Commit Hash | Status |
|:---:|:---:|---|:---:|---|:---:|:---:|
| 1 | - | *(Belum ada bug yang dilaporkan)* | - | - | - | Menunggu Uji |
