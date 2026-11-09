# KawalWarga — API Contract v1.1

> Acuan tunggal antara Frontend (Next.js static export) dan Backend (Laravel + SQLite).
> Kalau ada yang beda antara kode dan dokumen ini, **dokumen ini yang benar** sampai disepakati berdua dan diubah di sini.
> v1.1 sudah disesuaikan dengan desain Figma (`UI.zip`).

## 0. Cara Pakai

- Salinan identik file ini disimpan di kedua repo: `docs/API-Contract.md`.
- **Frontend**: bikin data mock yang bentuknya persis seperti contoh di dokumen ini (`src/mocks/`), lalu ganti ke API asli lewat `NEXT_PUBLIC_API_URL`. Jangan nunggu backend selesai.
- **Backend**: response wajib persis sama (nama field, tipe data, nilai enum).
- Ubah endpoint/field = sepakati berdua, update dokumen ini, tambah baris di **Changelog**, lalu commit di kedua repo.
- Prioritas endpoint: **[P1]** wajib ada, **[P2]** dikerjakan kalau waktu cukup.

---

## 1. Konvensi Umum

| Hal | Aturan |
|---|---|
| Base URL (production) | `https://api.DOMAINKITA.com/api/v1` |
| Base URL (lokal) | `http://localhost:8000/api/v1` |
| Format | JSON (`Content-Type: application/json`), kecuali upload file: `multipart/form-data` |
| Header wajib | `Accept: application/json` di semua request |
| Auth | `Authorization: Bearer <token>` (Laravel Sanctum) untuk endpoint admin/petugas |
| Token | Disimpan di `localStorage` sisi frontend |
| Penamaan field | `snake_case` |
| Waktu | ISO 8601 dengan zona WIB, contoh `2026-11-08T10:42:00+07:00` |
| ID tiket | Format `ADU-{nomor}` (nomor urut, minimal 3 digit), contoh `ADU-204`. UI menampilkannya dengan awalan `#` (`#ADU-204`), tapi **API selalu tanpa `#`** |
| Input ID tiket | Backend menerima huruf besar/kecil dan dengan/tanpa `#` (`#adu-204`, `ADU-204`, `adu-204` dianggap sama) |
| Identitas laporan | Semua endpoint memakai `ticket_id` (bukan ID numerik) |
| Koordinat | `latitude` dan `longitude` bertipe number (desimal) |
| URL foto | URL absolut, langsung bisa dipakai di `<img src>` |

### Format Response Sukses

```json
{ "success": true, "message": "OK", "data": { } }
```

### Format Response List (dengan pagination)

Query: `?page=1&per_page=8`

```json
{
  "success": true,
  "message": "OK",
  "data": [ ],
  "meta": { "current_page": 1, "last_page": 25, "per_page": 8, "total": 200 }
}
```

### Format Response Error

```json
{
  "success": false,
  "message": "Data yang dikirim tidak valid.",
  "errors": { "description": ["Deskripsi minimal 20 karakter."] }
}
```

`errors` hanya ada untuk error validasi (422).

### Kode HTTP

| Kode | Arti |
|---|---|
| 200 | Berhasil |
| 201 | Berhasil membuat data |
| 401 | Belum login / token tidak valid / expired |
| 403 | Login tapi role tidak boleh akses |
| 404 | Data tidak ditemukan |
| 409 | Konflik status (misal laporan sudah diambil petugas lain, atau transisi status tidak valid) |
| 422 | Validasi gagal |
| 429 | Terlalu banyak request |
| 500 | Error server |

Frontend: kalau dapat **401** di endpoint terproteksi, hapus token dan arahkan ke halaman login.

---

## 2. Enum (Nilai Tetap)

### `status`

| Value | Label tampilan |
|---|---|
| `menunggu_verifikasi` | Menunggu Verifikasi |
| `menunggu_penanganan` | Menunggu Penanganan |
| `diproses` | Diproses |
| `selesai` | Selesai |
| `ditolak` | Ditolak |

### `category`

| Value | Label tampilan |
|---|---|
| `jalan_rusak` | Jalan Rusak |
| `sampah` | Sampah |
| `lampu_mati` | Lampu Mati |

Hanya 3 kategori sesuai desain. Laporan di luar 3 kategori ini ditolak admin dengan alasan.

### `urgency`

| Value | Label tampilan |
|---|---|
| `rendah` | Rendah |
| `sedang` | Sedang |
| `tinggi` | Tinggi |
| `darurat` | Darurat |

Urutan prioritas dari tinggi ke rendah: `darurat` > `tinggi` > `sedang` > `rendah`.

### `role`

`admin`, `petugas`

### `ai.status`

`pending`, `done`, `failed` (kalau `failed`, laporan tetap tersimpan dan admin mengisi manual).

### `event` (di timeline)

`submitted`, `verified`, `rejected`, `taken`, `progress`, `completed`

---

## 3. Alur Status Laporan

```
menunggu_verifikasi ──(admin approve)──► menunggu_penanganan ──(petugas take)──► diproses ──(petugas complete)──► selesai
        │
        └──(admin reject, wajib alasan)──► ditolak
```

Transisi selain di atas dibalas **409**.

Stepper di halaman lacak (4 langkah): Menunggu Verifikasi → Menunggu Penanganan → Diproses → Selesai. Untuk `ditolak`, stepper tidak ditampilkan.

---

## 4. Objek yang Dipakai Berulang

### Actor (orang yang melakukan tindakan)

```json
{ "name": "Budi Santoso", "position": "Petugas lapangan" }
```

### Location

```json
{ "latitude": -6.2088, "longitude": 106.8456, "address_text": "Jl. Melati No. 12, Kel. Sukamaju, Kota Harmoni" }
```

`address_text` boleh `null`.

### Timeline Item

Teks `title` dan `description` dibuat backend dalam bahasa Indonesia, urutan **terbaru di atas**.

```json
{
  "event": "taken",
  "title": "Petugas mulai menangani",
  "description": "Budi Santoso melakukan pengecekan dan persiapan perbaikan.",
  "at": "2026-11-08T09:15:00+07:00"
}
```

Contoh `title` per `event`: `submitted` = "Laporan diterima", `verified` = "Laporan siap ditangani", `rejected` = "Laporan ditolak", `taken` = "Petugas mulai menangani", `progress` = "Pembaruan dari petugas", `completed` = "Selesai ditangani".

### Completion (hanya jika `status = selesai`, selain itu `null`)

```json
{
  "notes": "Lubang jalan sudah ditambal dengan aspal dingin dan dipadatkan.",
  "photo_url": "https://api.DOMAINKITA.com/storage/completions/xyz.jpg",
  "completed_by": { "name": "Budi Santoso", "position": "Petugas lapangan" },
  "completed_at": "2026-11-06T14:10:00+07:00"
}
```

### Rejection (hanya jika `status = ditolak`, selain itu `null`)

```json
{
  "reason": "Lokasi kejadian berada di luar wilayah layanan instansi.",
  "decided_by": { "name": "Nadia Putri", "position": "Admin verifikator" },
  "at": "2026-11-06T11:20:00+07:00"
}
```

### Verification (hanya jika sudah disetujui admin, selain itu `null`)

```json
{
  "category": "jalan_rusak",
  "urgency": "darurat",
  "note": "Kerusakan mengganggu akses kendaraan. Amankan area terlebih dahulu, lalu periksa kedalaman lubang.",
  "verified_by": { "name": "Nadia Putri", "position": "Admin verifikator" },
  "verified_at": "2026-11-08T08:10:00+07:00"
}
```

### Judul Laporan (`title`)

Setiap laporan punya `title` singkat (contoh: "Jalan berlubang di Jl. Melati"), dibuat oleh AI. Kalau AI gagal, backend memakai 60 karakter pertama dari deskripsi.

---

## 5. Endpoint Publik (Tanpa Login)

### 5.1 Kirim Laporan **[P1]**

`POST /reports`  (`multipart/form-data`)

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `description` | string | ya | min 20, max 2000 karakter |
| `latitude` | number | ya | -90 s/d 90 |
| `longitude` | number | ya | -180 s/d 180 |
| `address_text` | string | tidak | max 255 (frontend mengisi dari reverse geocoding, boleh kosong) |
| `photo` | file | ya | **1 foto**, jpg/jpeg/png, maks **5 MB** |
| `reporter_phone` | string | tidak | nomor WhatsApp, 9–15 digit, boleh diawali `+62` atau `08` |

Catatan: UI menyebut maksimal 10 MB. Frontend **wajib kompres foto di sisi client** (maks sisi 1600 px, target di bawah 1.5 MB) sebelum upload, supaya aman dari batas upload hosting.

**Response 201**

```json
{
  "success": true,
  "message": "Laporan berhasil dikirim.",
  "data": {
    "ticket_id": "ADU-204",
    "status": "menunggu_verifikasi",
    "status_label": "Menunggu Verifikasi",
    "created_at": "2026-11-08T10:42:00+07:00"
  }
}
```

Catatan backend: analisis AI dijalankan saat request ini (batas waktu 15 detik). Kalau gagal, laporan **tetap tersimpan** dengan `ai.status = failed`. Hasil AI **tidak** ditampilkan ke masyarakat. Rate limit: 5 request/menit per IP.

### 5.2 Lacak Laporan **[P1]**

`GET /reports/track/{ticket_id}`

**Response 200 (contoh status `diproses`)**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "ticket_id": "ADU-891",
    "title": "Jalan berlubang di Jl. Melati",
    "status": "diproses",
    "status_label": "Diproses",
    "category": "jalan_rusak",
    "category_label": "Jalan Rusak",
    "description": "Ada lubang cukup dalam di depan Jl. Melati No. 12. Saat hujan lubang tertutup air dan membahayakan pengendara, terutama sepeda motor. Mohon segera diperbaiki.",
    "location": { "latitude": -6.2088, "longitude": 106.8456, "address_text": "Jl. Melati No. 12, Kel. Sukamaju, Kota Harmoni" },
    "photo_url": "https://api.DOMAINKITA.com/storage/reports/abc123.jpg",
    "received_at": "2026-11-07T16:40:00+07:00",
    "latest_update": {
      "note": "Kami sedang memeriksa kedalaman lubang dan menyiapkan material untuk perbaikan. Area telah diberi tanda pengaman sementara.",
      "actor": { "name": "Budi Santoso", "position": "Petugas lapangan" },
      "at": "2026-11-08T09:15:00+07:00"
    },
    "timeline": [
      { "event": "taken", "title": "Petugas mulai menangani", "description": "Budi Santoso melakukan pengecekan dan persiapan perbaikan.", "at": "2026-11-08T09:15:00+07:00" },
      { "event": "verified", "title": "Laporan siap ditangani", "description": "Admin menyetujui laporan. Menunggu Penanganan.", "at": "2026-11-08T08:30:00+07:00" },
      { "event": "submitted", "title": "Laporan diterima", "description": "Laporan masuk dan menunggu verifikasi admin.", "at": "2026-11-07T16:40:00+07:00" }
    ],
    "rejection": null,
    "completion": null
  }
}
```

Aturan field:
- `category` dan `category_label` bernilai `null` selama status `menunggu_verifikasi` (belum dikonfirmasi admin).
- `latest_update`: catatan terbaru dari petugas (event `taken`/`progress` yang punya catatan), `null` kalau belum ada. Frontend menyembunyikan kartu "Kabar terbaru petugas" bila `null`.
- Untuk `selesai`: `completion` terisi. Halaman menampilkan foto warga (`photo_url`) sebagai **Sebelum** dan `completion.photo_url` sebagai **Sesudah**.
- Untuk `ditolak`: `rejection` terisi.
- Nomor WhatsApp pelapor **tidak pernah** dikirim di endpoint publik.
- Tiket tidak ditemukan: **404**.

### 5.3 Chatbot AI **[P2]**

`POST /chatbot`  (JSON)

```json
{
  "message": "Cek laporan saya #ADU-891",
  "history": [
    { "role": "assistant", "content": "Halo! Kirim ID tiket untuk mengecek laporan Anda." }
  ]
}
```

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `message` | string | ya | max 500 karakter |
| `history` | array | tidak | maks 6 pesan terakhir, `role` = `user` atau `assistant` |

**Response 200**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "reply": "Laporan #ADU-891 sedang ditangani. Budi menyiapkan perbaikan jalan di Jl. Melati No. 12. Kabar terakhir: 8 Nov, 09.15.",
    "tickets": [
      { "ticket_id": "ADU-891", "title": "Jalan berlubang di Jl. Melati", "status": "diproses", "status_label": "Diproses" }
    ]
  }
}
```

- `tickets`: daftar kartu tiket yang relevan dengan jawaban (boleh array kosong). Frontend menampilkan kartu status + tautan "Lihat detail laporan" ke `/lacak?id=...`.
- Kalau pengguna mengirim nomor WhatsApp (fitur "Lupa ID Tiket"), backend mengembalikan maksimal 3 tiket terbaru dengan nomor tersebut, hanya `ticket_id`, `title`, dan `status`.
- Chatbot stateless (frontend menyimpan riwayat dan mengirim ulang). Chip cepat ("Cek Status Tiket", "Lupa ID Tiket", "Cara Melapor") dibuat di frontend sebagai teks pesan biasa. Rate limit: 10 request/menit per IP.

---

## 6. Autentikasi

### 6.1 Login **[P1]**

`POST /auth/login`

```json
{ "email": "admin@kawalwarga.test", "password": "password123" }
```

**Response 200**

```json
{
  "success": true,
  "message": "Login berhasil.",
  "data": {
    "token": "1|abcdefghijklmnopqrstuvwxyz",
    "token_type": "Bearer",
    "user": { "id": 1, "name": "Nadia Putri", "email": "admin@kawalwarga.test", "role": "admin", "position": "Admin verifikator" }
  }
}
```

Gagal: **401** `"Email atau password salah."`. Akun admin dan petugas dibuat lewat **seeder** (tidak ada registrasi publik).

### 6.2 Logout **[P1]**

`POST /auth/logout` (butuh token) → **200** `{ "success": true, "message": "Logout berhasil.", "data": null }`

### 6.3 Profil Saya **[P1]**

`GET /auth/me` (butuh token) → `data` berisi objek `user` seperti di login.

---

## 7. Endpoint Admin (role: `admin`)

Semua butuh `Authorization: Bearer <token>`. Role salah → **403**.

### 7.1 Daftar Laporan **[P1]**

`GET /admin/reports`

Query (semua opsional):

| Param | Nilai |
|---|---|
| `search` | cari ID tiket, contoh `ADU-891` atau `891` |
| `status`, `category`, `urgency` | nilai enum |
| `sort` | `newest` (default), `oldest`, `urgency` |
| `from`, `to` | tanggal `YYYY-MM-DD` (filter tanggal laporan masuk) |
| `page`, `per_page` | default `per_page` = 8 |

Dipakai untuk halaman **Riwayat Laporan** dan **Antrean Verifikasi** (`status=menunggu_verifikasi`).

**Item response**

```json
{
  "ticket_id": "ADU-204",
  "title": "Jalan berlubang",
  "status": "menunggu_verifikasi",
  "status_label": "Menunggu Verifikasi",
  "category": "jalan_rusak",
  "category_label": "Jalan Rusak",
  "urgency": "tinggi",
  "urgency_label": "Tinggi",
  "address_text": "Jl. Melati No. 12",
  "created_at": "2026-11-08T10:42:00+07:00"
}
```

`category` dan `urgency` di list adalah **nilai efektif**: nilai konfirmasi admin kalau sudah diverifikasi, kalau belum memakai rekomendasi AI. Bernilai `null` hanya kalau AI gagal dan belum diverifikasi.

### 7.2 Detail Laporan **[P1]**

`GET /admin/reports/{ticket_id}`

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "ticket_id": "ADU-204",
    "title": "Jalan berlubang di Jl. Melati",
    "status": "menunggu_verifikasi",
    "status_label": "Menunggu Verifikasi",
    "category": "jalan_rusak",
    "category_label": "Jalan Rusak",
    "urgency": "tinggi",
    "urgency_label": "Tinggi",
    "description": "Ada lubang cukup dalam di depan Jl. Melati No. 12. ...",
    "photo_url": "https://...",
    "location": { "latitude": -6.2088, "longitude": 106.8456, "address_text": "Jl. Melati No. 12, Kel. Sukamaju, Kota Harmoni" },
    "reporter": { "phone": null },
    "received_at": "2026-11-08T10:42:00+07:00",
    "ai": {
      "status": "done",
      "summary": "Lubang jalan di kawasan permukiman berisiko bagi pengendara saat hujan. Bukti foto menunjukkan kerusakan permukaan yang perlu diperiksa petugas.",
      "category": "jalan_rusak",
      "urgency": "tinggi",
      "duplicates": [
        { "ticket_id": "ADU-198", "title": "Lubang jalan membesar, rawan kecelakaan", "distance_m": 50 }
      ]
    },
    "verification": null,
    "rejection": null,
    "handler": null,
    "completion": null,
    "timeline": [
      { "event": "submitted", "title": "Laporan diterima", "description": "Laporan masuk dan menunggu verifikasi admin.", "at": "2026-11-08T10:42:00+07:00" }
    ]
  }
}
```

- `category` dan `urgency` = nilai efektif (sama aturan 7.1). Dua field itu dipakai sebagai nilai awal pilihan di form verifikasi.
- `ai.category` dan `ai.urgency` bisa `null` kalau `ai.status` bukan `done`. `ai.duplicates` array kosong kalau tidak ada.
- `reporter.phone` bisa `null` (UI menampilkan "WhatsApp tidak disertakan").
- `handler` setelah diambil petugas: `{ "name": "Budi Santoso", "position": "Petugas lapangan", "taken_at": "..." }`, selain itu `null`.

### 7.3 Setujui Laporan **[P1]**

`POST /admin/reports/{ticket_id}/approve`

```json
{
  "category": "jalan_rusak",
  "urgency": "darurat",
  "note": "Kerusakan mengganggu akses kendaraan. Amankan area terlebih dahulu."
}
```

`category` dan `urgency` wajib (admin bebas mengubah dari rekomendasi AI). `note` opsional (max 500 karakter), tampil ke petugas sebagai **Catatan verifikasi admin**. Status berubah ke `menunggu_penanganan`. Status awal bukan `menunggu_verifikasi` → **409**.

### 7.4 Tolak Laporan **[P1]**

`POST /admin/reports/{ticket_id}/reject`

```json
{ "reason": "Lokasi kejadian berada di luar wilayah layanan instansi." }
```

`reason` wajib (min 10 karakter), akan terlihat oleh warga. Status berubah ke `ditolak`.

### 7.5 Analisis Ulang dengan AI **[P2]**

`POST /admin/reports/{ticket_id}/reanalyze` → `data` berisi objek `ai` seperti di 7.2.

### 7.6 Dashboard: Ringkasan **[P1]**

`GET /admin/dashboard/summary?from=2026-11-01&to=2026-11-08`

`from` dan `to` opsional (default: 7 hari terakhir sampai hari ini).

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "period": { "from": "2026-11-01", "to": "2026-11-08" },
    "totals": {
      "all": 200,
      "menunggu_verifikasi": 24,
      "menunggu_penanganan": 16,
      "diproses": 40,
      "selesai": 110,
      "ditolak": 10
    },
    "by_category": [
      { "category": "jalan_rusak", "label": "Jalan Rusak", "count": 90 },
      { "category": "sampah", "label": "Sampah", "count": 60 },
      { "category": "lampu_mati", "label": "Lampu Mati", "count": 50 }
    ]
  }
}
```

Frontend menghitung sendiri persentase (contoh "55% dari seluruh laporan", "45%") dari angka di atas. `by_category` menghitung laporan yang punya kategori efektif.

### 7.7 Dashboard: Peta Persebaran **[P1]**

`GET /admin/dashboard/map?from=&to=`

Hanya laporan yang **sudah diverifikasi** (status `menunggu_penanganan`, `diproses`, `selesai`, `ditolak`). `menunggu_verifikasi` tidak dipetakan (sesuai desain). Tidak dipaginasi.

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "ticket_id": "ADU-891",
      "title": "Jalan berlubang",
      "category": "jalan_rusak",
      "category_label": "Jalan Rusak",
      "status": "diproses",
      "status_label": "Diproses",
      "latitude": -6.2088,
      "longitude": 106.8456,
      "photo_url": "https://..."
    }
  ]
}
```

### 7.8 Dashboard: Ringkasan Eksekutif AI **[P2]**

`GET /admin/dashboard/ai-insight?from=&to=`

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "bullets": [
      "Jalan rusak mendominasi: 90 laporan (45%). Prioritaskan pemeriksaan ruas lingkungan.",
      "56 laporan masih dalam alur penanganan. 16 laporan terverifikasi belum diambil petugas.",
      "110 laporan telah selesai (55%). Tinjau 24 laporan baru agar antrean tidak menumpuk."
    ],
    "based_on_total": 200,
    "period": { "from": "2026-11-01", "to": "2026-11-08" },
    "generated_at": "2026-11-08T08:00:00+07:00"
  }
}
```

Hasil disimpan di database per periode (cache), supaya AI tidak dipanggil tiap dashboard dibuka. `POST /admin/dashboard/ai-insight/regenerate` (body `from`, `to`) membuat ulang dan mengembalikan objek yang sama.

---

## 8. Endpoint Petugas (role: `petugas`)

### 8.1 Antrean "Siap Ditangani" **[P1]**

`GET /officer/queue`

Query opsional: `sort` (`urgency` default = urgensi tertinggi dulu lalu paling lama menunggu, atau `newest`), `category`, `page`, `per_page` (default 6).

Isinya laporan `menunggu_penanganan` yang belum diambil. `meta.total` dipakai untuk badge jumlah di tab ("Siap Ditangani 16") dan teks "Menampilkan 3 dari 16 laporan".

```json
{
  "ticket_id": "ADU-198",
  "title": "Lubang jalan membesar, rawan kecelakaan",
  "status": "menunggu_penanganan",
  "status_label": "Menunggu Penanganan",
  "category": "jalan_rusak",
  "category_label": "Jalan Rusak",
  "urgency": "darurat",
  "urgency_label": "Darurat",
  "photo_url": "https://...",
  "location": { "latitude": -6.2088, "longitude": 106.8456, "address_text": "Jl. Melati No. 14, Sukamaju" },
  "verified_at": "2026-11-08T08:10:00+07:00"
}
```

Jarak "0,8 km dari lokasi Anda" **dihitung di frontend** (Geolocation browser + rumus Haversine). Kalau izin lokasi ditolak, teks jarak disembunyikan.

### 8.2 Tugas Saya **[P1]**

`GET /officer/my-reports`

Query opsional: `status` (`diproses` atau `selesai`), `page`, `per_page`. Hanya laporan yang ditangani petugas yang login. Bentuk item sama dengan 8.1, ditambah `taken_at` dan `completed_at` (boleh `null`).

### 8.3 Detail Laporan **[P1]**

`GET /officer/reports/{ticket_id}`

Bentuk sama dengan 7.2 **tanpa** `ai` dan `reporter`. Field `verification` (catatan admin) selalu terisi untuk laporan yang bisa dilihat petugas. Boleh membuka laporan antrean (belum diambil) maupun laporan miliknya sendiri. Laporan milik petugas lain yang sudah `diproses` → **403**.

### 8.4 Ambil Laporan **[P1]**

`POST /officer/reports/{ticket_id}/take`

Tanpa body. Status berubah ke `diproses`, `handler` = petugas ini, dan timeline mendapat event `taken`. Sudah diambil petugas lain atau status bukan `menunggu_penanganan` → **409**.

### 8.5 Pembaruan Progres **[P2]**

`POST /officer/reports/{ticket_id}/progress`

```json
{ "note": "Material sudah disiapkan, pengerjaan dimulai besok pagi." }
```

`note` wajib (min 5 karakter). Menambah event `progress` di timeline dan memperbarui `latest_update`. Hanya petugas yang mengambil laporan itu, kalau bukan → **403**.

### 8.6 Selesaikan Laporan **[P1]**

`POST /officer/reports/{ticket_id}/complete`  (`multipart/form-data`)

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `notes` | string | ya | min 10, max 1000 karakter |
| `photo` | file | ya | **1 foto** bukti, jpg/jpeg/png, maks 5 MB (frontend kompres dulu) |

Tanpa foto → **422**. Status berubah ke `selesai`. Hanya petugas yang mengambil laporan tersebut.

---

## 9. Hak Akses Ringkas

| Endpoint | Publik | Petugas | Admin |
|---|:-:|:-:|:-:|
| `POST /reports`, `GET /reports/track/*`, `POST /chatbot` | ✅ | ✅ | ✅ |
| `POST /auth/login` | ✅ | ✅ | ✅ |
| `POST /auth/logout`, `GET /auth/me` | ❌ | ✅ | ✅ |
| `/admin/*` | ❌ | ❌ | ✅ |
| `/officer/*` | ❌ | ✅ | ❌ |

---

## 10. Akun Seeder (Development & Demo)

| Role | Nama | Jabatan | Email | Password |
|---|---|---|---|---|
| admin | Nadia Putri | Admin verifikator | `admin@kawalwarga.test` | `password123` |
| petugas | Budi Santoso | Petugas lapangan | `budi@kawalwarga.test` | `password123` |

Backend juga menyiapkan **data demo** (seeder laporan dengan berbagai status) supaya dashboard dan riwayat terlihat hidup saat demo lomba. Ganti password sebelum deploy final.

---

## 11. Catatan CORS & Deploy

- Backend mengizinkan origin domain frontend (dari `.env`: `FRONTEND_URL`) dan `http://localhost:3000` untuk development.
- Karena pakai token Bearer (bukan cookie), **tidak perlu** `supports_credentials`.
- Semua request production wajib HTTPS.

---

## Changelog

| Versi | Tanggal | Perubahan | Oleh |
|---|---|---|---|
| 1.0 | 2026-11-08 | Draft awal kontrak API | Ilyasa |
| 1.1 | 2026-11-08 | Disesuaikan dengan Figma: ID tiket `ADU-{nomor}` (tanpa `#`) dan semua endpoint pakai `ticket_id`; kategori jadi 3 (`jalan_rusak`, `sampah`, `lampu_mati`); urgensi `kritis` diganti `darurat`; foto jadi 1 (`photo`) untuk laporan dan penyelesaian; tambah `title`, `latest_update`, `rejection`, `verification`, `completion.photo_url`; timeline jadi `event/title/description/at`; hapus `reporter_name`, `/public/stats`, endpoint tren; tambah `note` di approve; `user.position`; dashboard punya filter `from/to`, peta jadi P1 dan hanya laporan terverifikasi; chatbot mengembalikan `tickets[]` | Ilyasa |
