# Laporan Integrasi & Audit Kontrak API — KawalWarga (Step I3)

**Tanggal Audit:** 10 November 2026  
**Acuan Utama:** `docs/API-Contract.md` (v1.1)  
**Skrip Pemeriksa:** `scripts/contract-check.mjs`  

---

## 1. Ringkasan Hasil `scripts/contract-check.mjs`

Skrip otomatis `scripts/contract-check.mjs` dijalankan terhadap backend lokal (`http://127.0.0.1:8000/api/v1`) dengan data seeder (`204` laporan demo `ADU-001` s/d `ADU-204`). Seluruh operasi mutasi (`POST /reports`, `reanalyze`, `approve`, `reject`, `take`, `progress`, `complete`) dijalankan pada tiket baru sementara agar 204 data demo tetap utuh.

**Hasil Eksekusi:** **25 / 25 PASS (0 FAIL)**

| No | Pengujian Endpoint & Kasus Kontrak | Hasil | Catatan Verifikasi |
|---:|---|:---:|---|
| 1 | `GET /health` | **PASS** | `200 OK`, `app: "ok"`, `db: "ok"`, `time` ISO 8601 `+07:00` |
| 2 | `POST /auth/login` (password salah) | **PASS** | `401 Unauthorized`, envelope error sesuai kontrak |
| 3 | `POST /auth/login` (Admin) | **PASS** | `200 OK`, `Bearer` token + `user` (`role: "admin"`, `position: "Admin verifikator"`) |
| 4 | `POST /auth/login` (Petugas) | **PASS** | `200 OK`, `Bearer` token + `user` (`role: "petugas"`, `position: "Petugas lapangan"`) |
| 5 | `GET /auth/me` (tanpa token & dengan token) | **PASS** | `401` tanpa token, `200 OK` dengan token |
| 6 | Role Guard Lintas Peran | **PASS** | `403 Forbidden` saat Petugas mengakses `/admin/*` & Admin mengakses `/officer/*` |
| 7 | `GET /admin/reports` | **PASS** | `200 OK`, `data[]` + `meta` (`current_page`, `last_page`, `per_page`, `total`), enum & waktu `+07:00` valid |
| 8 | `GET /admin/reports/{ticket_id}` (`ADU-204` & `ADU-99999`) | **PASS** | `200 OK` detail lengkap (`reporter`, `ai` + `duplicates`, `timeline`), `404` bila tiket tidak ditemukan |
| 9 | `GET /reports/track/{ticket_id}` (`#adu-204`, `ADU-200`, `ADU-176`, `ADU-183`, `ADU-99999`) | **PASS** | Normalisasi `#adu-204` → `ADU-204`; `category = null` saat `menunggu_verifikasi`; `latest_update`, `completion`, `rejection` sesuai status; **tidak ada kebocoran** `reporter_phone`, `reporter`, atau `ai` |
| 10 | `POST /reports` (validasi gagal) | **PASS** | `422 Unprocessable Entity` beserta `errors` per field (`photo`, `description`, dll.) |
| 11 | `POST /reports` (buat laporan baru) | **PASS** | `201 Created`, `ticket_id` cocok `^ADU-\d{3,}$`, `status: "menunggu_verifikasi"`, `created_at` `+07:00` |
| 12 | `POST /admin/reports/{ticket_id}/reanalyze` [P2] | **PASS** | `200 OK`, mengembalikan objek `ai` (`status`, `summary`, `category`, `urgency`, `duplicates`) |
| 13 | `POST /admin/reports/{ticket_id}/approve` (+ uji ulang) | **PASS** | `200 OK` transisi ke `menunggu_penanganan` + `verification` terisi; `409 Conflict` jika di-approve ulang |
| 14 | `POST /admin/reports/{ticket_id}/reject` (tanpa alasan & dengan alasan) | **PASS** | `422` bila `reason` kosong; `200 OK` transisi ke `ditolak` + `rejection` terisi |
| 15 | `GET /officer/queue` | **PASS** | `200 OK`, semua item `menunggu_penanganan`, `location`, `verified_at`, `meta`, tanpa bocor `ai`/`reporter` |
| 16 | `GET /officer/reports/{ticket_id}` | **PASS** | `200 OK`, detail laporan dengan `verification` tanpa `ai` dan tanpa `reporter` |
| 17 | `POST /officer/reports/{ticket_id}/take` (+ uji ulang) | **PASS** | `200 OK` transisi ke `diproses` + `handler` terisi; `409 Conflict` bila diambil ulang |
| 18 | `GET /officer/my-reports` | **PASS** | `200 OK`, daftar laporan petugas dengan `taken_at` & `completed_at` |
| 19 | `POST /officer/reports/{ticket_id}/progress` [P2] | **PASS** | `200 OK`, menambah event `progress` di puncak `timeline` dan memperbarui `latest_update` |
| 20 | `POST /officer/reports/{ticket_id}/complete` (tanpa foto & dengan foto) | **PASS** | `422` tanpa foto bukti; `200 OK` transisi ke `selesai` + `completion` terisi |
| 21 | `GET /admin/dashboard/summary` | **PASS** | `200 OK`, `period` (`from`, `to`), `totals`, `by_category` (3 kategori) |
| 22 | `GET /admin/dashboard/map` | **PASS** | `200 OK`, array pin peta tanpa laporan berstatus `menunggu_verifikasi` |
| 23 | `GET` & `POST /admin/dashboard/ai-insight(/regenerate)` [P2] | **PASS** | `200 OK`, `bullets` (3 butir), `based_on_total`, `period`, `generated_at` `+07:00` |
| 24 | `POST /chatbot` [P2] | **PASS** | `200 OK`, `reply` + `tickets[]` untuk `#ADU-204` tanpa membocorkan nomor telepon pelapor |
| 25 | `POST /auth/logout` | **PASS** | `200 OK`, `data: null`, token Sanctum dicabut |

---

## 2. Tabel Audit Ketidakcocokan & Edge-Case (`frontend` vs `backend` vs `API-Contract.md`)

Secara struktural, seluruh endpoint backend dan pemanggilan API di `frontend/src/lib/api/*.ts` telah mematuhi `docs/API-Contract.md` v1.1. Namun dari perbandingan mendalam antara `frontend/src/lib/types.ts`, `frontend/src/lib/format.ts`, komponen UI frontend, dan perilaku runtime backend, ditemukan **3 temuan kecil (edge-case)** berikut:

| # | Endpoint | Temuan | Penyebab | Keputusan yang disarankan (ubah backend / ubah frontend / ubah kontrak) | Status |
|---:|---|---|---|---|---|
| 1 | `GET /admin/dashboard/map` | Pada `frontend/src/lib/types.ts` (`DashboardMapPin`), field `category: ReportCategory` dan `category_label: string` didefinisikan **non-nullable**. Namun jika ada laporan yang saat dikirim mengalami gagal analisis AI (`ai_status = "failed"`, sehingga `category = null` dan `ai_category = null`) lalu **ditolak** oleh Admin (`POST /admin/reports/{id}/reject` hanya mengirim `reason` tanpa mengisi kategori), laporan berstatus `ditolak` tersebut tetap masuk ke `GET /admin/dashboard/map` dengan `category: null` dan `category_label: null`. Di `frontend/src/components/map/MapViewInner.tsx` baris 144, `{pin.category_label}` dirender langsung pada header popup pin sehingga akan kosong jika `null`. | Endpoint `reject` menurut kontrak 7.4 tidak meminta input `category`, sedangkan `GET /admin/dashboard/map` menurut kontrak 7.7 mengembalikan laporan berstatus `menunggu_penanganan`, `diproses`, `selesai`, dan `ditolak`. | **Ubah frontend** (`frontend/src/lib/types.ts` & `MapViewInner.tsx`): ubah tipe `category: ReportCategory \| null` dan `category_label: string \| null` pada `DashboardMapPin`, serta beri fallback `{pin.category_label \|\| "Belum Dikategorikan"}` pada popup peta. *(Tidak perlu mengubah kontrak maupun backend).* | **Selesai** (`0e85a61`) |
| 2 | `GET /reports/track/{ticket_id}` & `GET /admin/reports?search=` | Kontrak Bab 1 & 7.1 menyatakan warga/admin dapat mencari tiket dengan mengetik `#adu-204`, `ADU-204`, `adu-204`, atau angka saja seperti `891` / `204`. Backend `TicketService::normalize()` sudah menormalisasi semua bentuk tersebut (`204`, `adu204`, `#adu-204` → `ADU-204`). Namun fungsi `normalizeTicketInput()` di `frontend/src/lib/format.ts` (baris 92–105) hanya menghapus awalan `#` dan mengubah ke huruf besar tanpa menambahkan prefiks `ADU-` jika pengguna mengetik angka saja (`"204"`) atau tanpa tanda hubung (`"adu204"`), sehingga tampilan badge/URL di frontend menjadi `#204` alih-alih `#ADU-204`. | Regex normalisasi di `frontend/src/lib/format.ts` belum menyamakan format digit murni (`204` → `ADU-204`) seperti di backend `TicketService::normalize()`. | **Ubah frontend** (`frontend/src/lib/format.ts`): perbarui `normalizeTicketInput()` agar input berpola `^#?(?:ADU-?)?(\d+)$` otomatis dinormalisasi menjadi `ADU-${digits.padStart(3, "0")}` sehingga tampilan dan query URL di frontend konsisten dengan backend. | **Selesai** (`0e85a61`) |
| 3 | `POST /chatbot` | Di `docs/API-Contract.md` Bab 5.3: contoh JSON response pada baris 321 menyertakan `"status_label": "Diproses"`, tetapi kalimat penjelasan di baris 328 menyebutkan *"hanya `ticket_id`, `title`, dan `status`"*. Backend `ChatbotController` selalu mengirim keempat field (`ticket_id`, `title`, `status`, `status_label`), dan `frontend/src/lib/types.ts` (`ChatTicketCard`) mendefinisikan `status_label?: string` (opsional) serta komponen `ChatbotWidget.tsx` menggunakan `ticket.status_label \|\| getStatusLabel(ticket.status)`. | Perbedaan redaksi kecil antara contoh JSON dan teks deskripsi di Bab 5.3 kontrak, namun kedua sisi sudah saling kompatibel. | **Pertahankan (tidak ada perubahan kode)**: implementasi backend (selalu mengirim `status_label`) dan frontend (`status_label?: string` dengan fallback `getStatusLabel`) sudah 100% kompatibel dan aman. | **Selesai** (Kompatibel / `0e85a61`) |

---

## 3. Hasil Tindak Lanjut (Step I3b)

1. **Temuan #1 Selesai**: `DashboardMapPin` di `frontend/src/lib/types.ts` telah diubah menjadi nullable (`category: ReportCategory | null`, `category_label: string | null`) dan header popup di `frontend/src/components/map/MapViewInner.tsx` telah ditambahkan fallback `"Belum Dikategorikan"`.
2. **Temuan #2 Selesai**: `normalizeTicketInput()` di `frontend/src/lib/format.ts` telah diperbarui sehingga input angka murni (`204`) maupun format tanpa tanda hubung (`adu204`) dinormalisasi secara kanonik ke `ADU-204` konsisten dengan backend.
3. **Temuan #3 Selesai**: Diverifikasi kompatibel tanpa perubahan kode.
4. **Validasi Akhir**:
   - `scripts/contract-check.mjs`: **25/25 PASS (0 FAIL)**
   - Backend test (`php artisan test`): **52 tests, 408 assertions (100% PASS)**
   - Frontend lint (`npm run lint`): **0 errors, 0 warnings**
   - Frontend build (`npm run build`): **16/16 routes generated cleanly**
