import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";
import http from "http";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const OUTPUT_DIR = path.join(rootDir, "docs", "screenshots");
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const FOTO_RUSAK = path.join(rootDir, "contoh foto", "Jalanan_rusak_1.jpg");
const FOTO_BENAR = path.join(rootDir, "contoh foto", "Jalanan_benar_1.jpg");
const LOGO_SRC = path.join(rootDir, "docs", "Logo Kawal Warga.png");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkUrl(url) {
  return new Promise((resolve) => {
    http
      .get(url, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      })
      .on("error", () => resolve(false));
  });
}

async function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkUrl(url)) return true;
    await delay(1000);
  }
  return false;
}

// Injeksi styling untuk menyembunyikan watermark dev Next.js, kursor teks,
// dan memaksa header tetap static di paling atas (mencegah navbar melayang di tengah)
async function preparePage(page) {
  try {
    await page.addStyleTag({
      content: `
        nextjs-portal,
        [data-nextjs-toast],
        [data-nextjs-dev-tools-button],
        [data-nextjs-indicator],
        div:has(> svg[data-nextjs-dev-tools-button]) {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
        header {
          position: static !important;
        }
        *, *::before, *::after {
          caret-color: transparent !important;
        }
      `,
    });
  } catch {}

  // Scroll ke paling atas halaman sebelum capture
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const scrollables = document.querySelectorAll('main, [class*="overflow-y"]');
    scrollables.forEach((el) => {
      el.scrollTop = 0;
    });
  });

  // Tombol melayang "Tanya AI" (fixed) ditempatkan di pojok kanan bawah HALAMAN penuh,
  // bukan di tengah akibat tinggi viewport yang hanya 900px.
  await delay(500);
  await page.evaluate(() => {
    const fab = document.querySelector('button[aria-label="Buka asisten Tanya AI"]');
    if (!fab) return;
    const docHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    const h = fab.getBoundingClientRect().height || 48;
    fab.style.setProperty("position", "absolute", "important");
    fab.style.setProperty("top", `${docHeight - h - 20}px`, "important");
    fab.style.setProperty("bottom", "auto", "important");
    fab.style.setProperty("right", "20px", "important");
  });

  // Tunggu gambar selesai dimuat (non-blocking)
  await page.evaluate(async () => {
    const images = Array.from(document.querySelectorAll("img"));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((r) => {
          img.onload = r;
          img.onerror = r;
          setTimeout(r, 3000);
        });
      })
    );
  });

  await delay(1200);
}

async function captureDesktop(page, filename, description) {
  console.log(`📸 [Desktop] ${filename}: ${description}`);
  await preparePage(page);
  const outPath = path.join(OUTPUT_DIR, filename);
  await page.screenshot({ path: outPath, fullPage: true });
}

async function main() {
  console.log("=================================================");
  console.log("🚀 Menjalankan Generator Screenshot Desktop Bersih");
  console.log("=================================================");

  let backendProcess = null;
  let frontendProcess = null;

  // Bersihkan screenshot lama di folder docs/screenshot update/
  console.log("🧹 Membersihkan folder screenshot lama...");
  const oldFiles = fs.readdirSync(OUTPUT_DIR);
  for (const f of oldFiles) {
    if (f.endsWith(".png") && !f.includes("Logo")) {
      fs.unlinkSync(path.join(OUTPUT_DIR, f));
    }
  }

  // 1. Cek / Jalankan Backend Laravel (Port 8000)
  const backendRunning = await checkUrl("http://127.0.0.1:8000/api/v1/categories");
  if (!backendRunning) {
    console.log("⚙️  Menyalakan Backend Laravel di port 8000...");
    const phpPath = "C:\\laragon\\bin\\php\\php-8.3.30-Win32-vs16-x64\\php.exe";
    backendProcess = spawn(phpPath, ["artisan", "serve", "--host=127.0.0.1", "--port=8000"], {
      cwd: path.join(rootDir, "backend"),
      stdio: "ignore",
    });
    const ok = await waitForServer("http://127.0.0.1:8000/api/v1/categories", 35000);
    if (!ok) throw new Error("Gagal menyalakan backend Laravel.");
    console.log("✅ Backend Laravel siap!");
  } else {
    console.log("✅ Backend Laravel sudah berjalan.");
  }

  // 2. Cek / Jalankan Frontend Next.js (Port 3000)
  const frontendRunning = await checkUrl("http://localhost:3000");
  if (!frontendRunning) {
    console.log("⚙️  Menyalakan Frontend Next.js di port 3000...");
    frontendProcess = spawn("cmd.exe", ["/c", "npm.cmd run dev"], {
      cwd: path.join(rootDir, "frontend"),
      stdio: "ignore",
    });
    const ok = await waitForServer("http://localhost:3000", 45000);
    if (!ok) throw new Error("Gagal menyalakan frontend Next.js.");
    console.log("✅ Frontend Next.js siap!");
  } else {
    console.log("✅ Frontend Next.js sudah berjalan.");
  }

  // 3. Salin Logo Kawal Warga ke docs/screenshot update/
  if (fs.existsSync(LOGO_SRC)) {
    const logoDest = path.join(OUTPUT_DIR, "Logo Kawal Warga.png");
    fs.copyFileSync(LOGO_SRC, logoDest);
    console.log("🖼️  Logo Kawal Warga.png berhasil disalin ke folder screenshot update.");
  }

  // 4. Buka Browser Chrome Headless dengan resolusi Desktop (1440x900 @2x -> 2880px)
  console.log("🌐 Membuka Chrome headless...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    protocolTimeout: 180000,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--window-size=1440,900",
    ],
    defaultViewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
    },
  });

  const page = await browser.newPage();

  page.on("console", (m) => {
    if (m.type() === "error") console.log("[Browser Console Error]:", m.text());
  });

  try {
    const descText =
      "Terdapat lubang jalan yang cukup lebar dan dalam di Jalan Melati dekat perempatan. Aspal amblas dan berkerikil lepas, sangat membahayakan pengendara motor terutama saat malam hari dan kondisi hujan.";

    // =========================================================================
    // LAYAR 01: WARGA · BUAT LAPORAN · DESKTOP
    // =========================================================================
    console.log("\n--- [Layar 01] Warga: Buat Laporan (Jalan Rusak) ---");
    await page.goto("http://localhost:3000/", { waitUntil: "networkidle0" });
    await delay(1200);

    // Bersihkan banner lama di localStorage
    await page.evaluate(() => {
      localStorage.removeItem("kw_last_ticket");
      localStorage.removeItem("kw_last_ticket_meta");
    });
    await page.reload({ waitUntil: "networkidle0" });
    await delay(1000);

    // Pilih kategori "Jalan Rusak"
    const catButtons = await page.$$("button");
    for (const b of catButtons) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text && text.includes("Jalan Rusak")) {
        await page.evaluate((el) => el.click(), b);
        break;
      }
    }
    await delay(300);

    // Isi deskripsi
    await page.type("#report-description", descText, { delay: 5 });

    // Upload foto jalanan rusak
    const fileInputs = await page.$$("input[type=file]");
    if (fileInputs.length > 0) {
      await fileInputs[0].uploadFile(FOTO_RUSAK);
      console.log("📁 Foto jalanan rusak di-upload, menunggu kompresi dan pratinjau...");
    }
    await page.waitForSelector("img[alt*='Pratinjau']", { timeout: 15000 }).catch(() => {});
    await delay(2000);

    // Isi WhatsApp
    await page.type("#report-whatsapp", "081288889999", { delay: 5 });
    await delay(500);

    // Capture 01
    await captureDesktop(
      page,
      "01 - Warga · Buat laporan · Desktop.png",
      "Formulir pelaporan warga terisi lengkap dengan kategori jalan rusak (Desktop)"
    );

    // =========================================================================
    // SUBMIT LAPORAN & LAYAR 02: WARGA · LAPORAN TERKIRIM · DESKTOP
    // =========================================================================
    console.log("\n--- [Layar 02] Mengirim Laporan & Halaman Terkirim ---");
    const submitBtn = await page.$("button[type=submit]");
    await page.evaluate((el) => el.click(), submitBtn);

    console.log("⏳ Menunggu verifikasi AI backend & redirect ke /terkirim...");
    await page.waitForFunction(
      () => window.location.pathname.includes("/terkirim"),
      { timeout: 45000 }
    );
    await delay(1000);

    // Ambil ticket ID yang sebenarnya dari URL / state
    const ticketId = await page.evaluate(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const fromUrl = urlParams.get("id");
      if (fromUrl) return fromUrl;
      const fromStorage = window.localStorage.getItem("kw_last_ticket");
      if (fromStorage) return fromStorage;
      const match = document.body.innerText.match(/ADU-\d+/);
      return match ? match[0] : "ADU-205";
    });
    console.log(`🎟️  Tiket Laporan Diterbitkan: #${ticketId}`);

    // Tunggu teks tiket muncul (bukan skeleton)
    await page.waitForSelector(".text-3xl.font-extrabold, p.text-3xl", { timeout: 15000 }).catch(() => {});
    await delay(1500);

    await captureDesktop(
      page,
      "02 - Warga · Laporan terkirim · Desktop.png",
      `Konfirmasi laporan terkirim dengan tiket #${ticketId} (Desktop)`
    );

    // =========================================================================
    // LOGIN ADMIN & LAYAR 03: ADMIN · ANTREAN VERIFIKASI · DESKTOP
    // =========================================================================
    console.log("\n--- [Layar 03] Admin: Antrean Verifikasi ---");
    await page.goto("http://localhost:3000/masuk/", { waitUntil: "networkidle0" });
    await delay(800);
    await page.type("#login-email", "admin@kawalwarga.test", { delay: 5 });
    await page.type("#login-password", "password123", { delay: 5 });
    const adminLoginBtn = await page.$("button[type=submit]");
    await page.evaluate((el) => el.click(), adminLoginBtn);
    await page.waitForFunction(
      () => window.location.pathname.includes("/admin"),
      { timeout: 20000 }
    );
    await delay(1200);

    await page.goto(`http://localhost:3000/admin/verifikasi/?id=${ticketId}`, {
      waitUntil: "networkidle0",
    });
    await delay(2500);

    // Pastikan kategori & urgensi dipilih
    try {
      await page.select("select", "jalan_rusak");
    } catch {}

    const urgBtns = await page.$$("button");
    for (const b of urgBtns) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text && text.trim().startsWith("Tinggi")) {
        await page.evaluate((el) => el.click(), b);
        break;
      }
    }
    await delay(1000);

    await captureDesktop(
      page,
      "03 - Admin · Antrean verifikasi · Desktop.png",
      `Verifikasi laporan #${ticketId} oleh admin dengan rekomendasi AI (Desktop)`
    );

    // =========================================================================
    // ADMIN MENYETUJUI LAPORAN
    // =========================================================================
    console.log("\n--- Admin: Menyetujui Laporan ---");
    const approveBtns = await page.$$("button");
    for (const b of approveBtns) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text && text.includes("Setujui & Teruskan")) {
        await page.evaluate((el) => el.click(), b);
        break;
      }
    }
    await delay(1200);

    await page.waitForSelector("#admin-approve-note", { timeout: 8000 }).catch(() => {});
    const approveNoteArea = await page.$("#admin-approve-note");
    if (approveNoteArea) {
      await approveNoteArea.type(
        "Laporan telah diverifikasi valid. Kerusakan lubang aspal membahayakan jalan umum, segera lakukan penambalan coldmix.",
        { delay: 5 }
      );
    }
    await delay(500);

    const confirmApproveBtns = await page.$$("div[role='dialog'] button");
    for (const b of confirmApproveBtns) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text && (text.includes("Ya, Setujui") || text.includes("Setujui Laporan"))) {
        await page.evaluate((el) => el.click(), b);
        break;
      }
    }
    await delay(3500);

    // =========================================================================
    // LAYAR 04: ADMIN & PIMPINAN · DASHBOARD DAN PETA · DESKTOP
    // =========================================================================
    console.log("\n--- [Layar 04] Admin: Dashboard & Peta ---");
    await page.goto("http://localhost:3000/admin/", { waitUntil: "networkidle0" });
    await delay(2500);
    await captureDesktop(
      page,
      "04 - Admin & Pimpinan · Dashboard dan peta · Desktop.png",
      "Dashboard monitoring pimpinan dengan 5 kartu statistik dan peta sebaran (Desktop)"
    );

    // =========================================================================
    // LAYAR 05: ADMIN · RIWAYAT SELURUH LAPORAN · DESKTOP
    // =========================================================================
    console.log("\n--- [Layar 05] Admin: Riwayat Seluruh Laporan ---");
    await page.goto("http://localhost:3000/admin/riwayat/", { waitUntil: "networkidle0" });
    await delay(2000);
    await captureDesktop(
      page,
      "05 - Admin · Riwayat seluruh laporan · Desktop.png",
      "Buku besar riwayat seluruh laporan dengan filter dan paginasi (Desktop)"
    );

    // =========================================================================
    // LOGIN PETUGAS & LAYAR 06: PETUGAS · ANTREAN PENANGANAN · DESKTOP
    // =========================================================================
    console.log("\n--- [Layar 06] Petugas: Antrean Penanganan ---");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto("http://localhost:3000/masuk/", { waitUntil: "networkidle0" });
    await delay(800);
    await page.type("#login-email", "budi@kawalwarga.test", { delay: 5 });
    await page.type("#login-password", "password123", { delay: 5 });
    const officerLoginBtn = await page.$("button[type=submit]");
    await page.evaluate((el) => el.click(), officerLoginBtn);
    await page.waitForFunction(
      () => window.location.pathname.includes("/petugas"),
      { timeout: 20000 }
    );
    await delay(1500);

    await page.goto("http://localhost:3000/petugas/", { waitUntil: "networkidle0" });
    await delay(2000);
    await captureDesktop(
      page,
      "06 - Petugas · Antrean penanganan · Desktop.png",
      "Daftar antrean laporan siap ditangani terurut prioritas urgensi (Desktop)"
    );

    // =========================================================================
    // LAYAR 07: PETUGAS · DETAIL SEBELUM DIAMBIL · DESKTOP
    // =========================================================================
    console.log("\n--- [Layar 07] Petugas: Detail Sebelum Diambil ---");
    await page.goto(`http://localhost:3000/petugas/laporan/?id=${ticketId}`, {
      waitUntil: "networkidle0",
    });
    await delay(2000);
    await captureDesktop(
      page,
      "07 - Petugas · Detail sebelum diambil · Desktop.png",
      `Detail tugas #${ticketId}: foto warga, disposisi admin, dan rute lokasi penanganan (Desktop)`
    );

    // =========================================================================
    // PETUGAS MENGAMBIL LAPORAN -> STATUS MENJADI "DIPROSES"
    // =========================================================================
    console.log("\n--- Petugas: Mengambil Tanggung Jawab Laporan ---");
    await page.waitForSelector("button", { timeout: 10000 });
    const takeBtns = await page.$$("button");
    for (const b of takeBtns) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text && text.includes("Ambil & Kerjakan")) {
        console.log("Mengklik tombol Ambil & Kerjakan...");
        await page.evaluate((el) => el.click(), b);
        break;
      }
    }
    await delay(1500);

    await page.waitForSelector("div[role='dialog'] button", { timeout: 10000 }).catch(() => {});
    const confirmTakeBtns = await page.$$("div[role='dialog'] button");
    for (const b of confirmTakeBtns) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text && text.includes("Ya, Ambil Laporan")) {
        console.log("Mengklik tombol konfirmasi Ya, Ambil Laporan...");
        await page.evaluate((el) => el.click(), b);
        break;
      }
    }
    await delay(4000);

    // =========================================================================
    // LAYAR 08: WARGA · LACAK LAPORAN DIPROSES · DESKTOP
    // =========================================================================
    console.log("\n--- [Layar 08] Warga: Lacak Laporan Diproses ---");
    await page.goto(`http://localhost:3000/lacak/?id=${ticketId}`, {
      waitUntil: "networkidle0",
    });
    await delay(2500);
    await captureDesktop(
      page,
      "08 - Warga · Lacak laporan diproses · Desktop.png",
      `Pelacakan status Diproses oleh petugas untuk tiket #${ticketId} (Desktop)`
    );

    // =========================================================================
    // LAYAR 09: PETUGAS · TUGAS AKTIF DAN PENYELESAIAN · DESKTOP
    // =========================================================================
    console.log("\n--- [Layar 09] Petugas: Tugas Aktif & Pengisian Bukti Selesai ---");
    const completionNoteText =
      "Penambalan lubang jalan telah selesai dikerjakan secara tuntas dengan aspal dingin (coldmix) dan dipadatkan menggunakan stamper. Permukaan jalan kini rata, bersih, dan aman dilalui.";

    await page.goto(`http://localhost:3000/petugas/laporan/?id=${ticketId}`, {
      waitUntil: "networkidle0",
    });
    await delay(2000);
    await page.waitForSelector("#officer-completion-notes", { timeout: 15000 });

    const officerFileInputs = await page.$$("input[type=file]");
    if (officerFileInputs.length > 0) {
      await officerFileInputs[0].uploadFile(FOTO_BENAR);
      console.log("📁 Foto bukti penyelesaian di-upload, menunggu pratinjau...");
    }
    await page.waitForSelector("img[alt*='Pratinjau']", { timeout: 15000 }).catch(() => {});
    await delay(2000);

    // Klik dan fokus ke textarea catatan penyelesaian, lalu isi teks dan trigger React state
    await page.focus("#officer-completion-notes");
    await page.evaluate((text) => {
      const textarea = document.getElementById("officer-completion-notes");
      if (textarea) {
        textarea.focus();
        const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
        if (valueSetter) {
          valueSetter.call(textarea, text);
        } else {
          textarea.value = text;
        }
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, completionNoteText);
    await delay(1000);

    // Pastikan tombol Tandai Selesai aktif
    await page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.innerText.includes("Tandai Selesai"));
      return btn && !btn.disabled;
    }, { timeout: 10000 }).catch(() => {});

    await captureDesktop(
      page,
      "09 - Petugas · Tugas aktif dan penyelesaian · Desktop.png",
      "Form bukti penanganan terisi lengkap foto sesudah dan catatan tindakan (Desktop)"
    );

    // =========================================================================
    // PETUGAS MENANDAI SELESAI
    // =========================================================================
    console.log("\n--- Petugas: Menandai Selesai ---");
    const finishBtns = await page.$$("button");
    for (const b of finishBtns) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text && text.includes("Tandai Selesai")) {
        console.log("Mengklik tombol Tandai Selesai...");
        await page.evaluate((el) => el.click(), b);
        break;
      }
    }
    await delay(1500);

    await page.waitForSelector("div[role='dialog'] button", { timeout: 10000 }).catch(() => {});
    const finishConfirmBtns = await page.$$("div[role='dialog'] button");
    for (const b of finishConfirmBtns) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text && (text.includes("Ya, Tandai") || text.includes("Selesai"))) {
        console.log("Mengklik konfirmasi selesaikan...");
        await page.evaluate((el) => el.click(), b);
        break;
      }
    }
    await delay(4500);

    // =========================================================================
    // LAYAR 10: WARGA · LACAK LAPORAN SELESAI (SEBELUM VS SESUDAH) · DESKTOP
    // =========================================================================
    console.log("\n--- [Layar 10] Warga: Lacak Laporan Selesai (Sebelum vs Sesudah) ---");
    await page.goto(`http://localhost:3000/lacak/?id=${ticketId}`, {
      waitUntil: "networkidle0",
    });
    // Tunggu tampilan selesai (Sebelum vs Sesudah) termuat
    await page.waitForFunction(() => {
      return document.body.innerText.includes("Laporan tuntas") || document.body.innerText.includes("SESUDAH");
    }, { timeout: 15000 }).catch(() => {});
    await delay(2500);
    await captureDesktop(
      page,
      "10 - Warga · Lacak laporan selesai · Desktop.png",
      `Lacak laporan tuntas: stepper lengkap, foto Sebelum vs Sesudah, catatan tindakan petugas (Desktop)`
    );

    // =========================================================================
    // LAYAR 11: WARGA · LACAK LAPORAN DITOLAK · DESKTOP
    // =========================================================================
    console.log("\n--- [Layar 11] Warga: Lacak Laporan Ditolak ---");
    await page.goto("http://localhost:3000/lacak/?id=ADU-183", {
      waitUntil: "networkidle0",
    });
    await delay(2000);
    await captureDesktop(
      page,
      "11 - Warga · Lacak laporan ditolak · Desktop.png",
      "Lacak laporan ditolak dengan alasan penolakan verifikasi admin (Desktop)"
    );

    // =========================================================================
    // LAYAR 12: WARGA · TANYA AI · DESKTOP
    // =========================================================================
    console.log("\n--- [Layar 12] Warga: Tanya AI ---");
    await page.goto("http://localhost:3000/tanya-ai/", {
      waitUntil: "networkidle0",
    });
    await delay(2000);
    await captureDesktop(
      page,
      "12 - Warga · Tanya AI · Desktop.png",
      "Layanan Tanya AI warga dengan input lacak tiket dan asisten pintar (Desktop)"
    );

    console.log("\n=================================================");
    console.log("🎉 SEMUA SCREENSHOT DESKTOP BERSIH BERHASIL DIBUAT!");
    console.log(`📁 Lokasi Output: ${OUTPUT_DIR}`);
    console.log("=================================================");
  } finally {
    await browser.close();
    if (backendProcess) {
      try {
        process.kill(backendProcess.pid);
      } catch {}
    }
    if (frontendProcess) {
      try {
        process.kill(frontendProcess.pid);
      } catch {}
    }
  }
}

main().catch((err) => {
  console.error("❌ Terjadi kesalahan fatal:", err);
  process.exit(1);
});
