import { ApiError, getStoredToken } from "../lib/api/client";
import { normalizeTicketInput } from "../lib/format";
import {
  getCategoryLabel,
  getStatusLabel,
  getUrgencyLabel,
  URGENCY_CONFIG,
} from "../lib/labels";
import type {
  Actor,
  AdminListParams,
  AdminReportDetail,
  AdminReportListItem,
  ApproveReportPayload,
  ChatbotResponse,
  ChatTicketCard,
  CreatedReportResponse,
  CreateReportPayload,
  DashboardAiInsight,
  DashboardDateParams,
  DashboardMapPin,
  DashboardSummary,
  LoginPayload,
  LoginResponse,
  OfficerCompletePayload,
  OfficerMyReportsParams,
  OfficerProgressPayload,
  OfficerQueueParams,
  OfficerReportDetail,
  OfficerReportListItem,
  Paginated,
  RejectReportPayload,
  ReportAiAnalysis,
  ReportCategory,
  ReportCompletion,
  ReportHandler,
  ReportLatestUpdate,
  ReportLocation,
  ReportRejection,
  ReportStatus,
  ReportUrgency,
  ReportVerification,
  SendChatPayload,
  TimelineItem,
  TrackedReport,
  User,
} from "../lib/types";

export function mockDelay(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const MOCK_USERS: Record<string, { user: User; password: string }> = {
  "admin@kawalwarga.test": {
    password: "password123",
    user: {
      id: 1,
      name: "Nadia Putri",
      email: "admin@kawalwarga.test",
      role: "admin",
      position: "Admin verifikator",
    },
  },
  "budi@kawalwarga.test": {
    password: "password123",
    user: {
      id: 2,
      name: "Budi Santoso",
      email: "budi@kawalwarga.test",
      role: "petugas",
      position: "Petugas lapangan",
    },
  },
};

const ADMIN_ACTOR: Actor = {
  name: "Nadia Putri",
  position: "Admin verifikator",
};

const OFFICER_ACTOR: Actor = {
  name: "Budi Santoso",
  position: "Petugas lapangan",
};

interface InternalMockReport {
  ticket_id: string;
  title: string;
  status: ReportStatus;
  description: string;
  photo_url: string;
  location: ReportLocation;
  reporter_phone: string | null;
  received_at: string;
  ai: ReportAiAnalysis;
  verification: ReportVerification | null;
  rejection: ReportRejection | null;
  handler: ReportHandler | null;
  latest_update: ReportLatestUpdate | null;
  completion: ReportCompletion | null;
  timeline: TimelineItem[];
}

const INITIAL_REPORTS: InternalMockReport[] = [
  {
    ticket_id: "ADU-204",
    title: "Jalan berlubang di Jl. Melati",
    status: "menunggu_verifikasi",
    description:
      "Ada lubang cukup dalam di depan Jl. Melati No. 12. Saat hujan lubang tertutup air dan membahayakan pengendara, terutama sepeda motor. Mohon segera diperbaiki.",
    photo_url: "/mock/jalan-rusak.png",
    location: {
      latitude: -6.2088,
      longitude: 106.8456,
      address_text: "Jl. Melati No. 12, Kel. Sukamaju, Kota Harmoni",
    },
    reporter_phone: "081234567890",
    received_at: "2026-11-08T10:42:00+07:00",
    ai: {
      status: "done",
      summary:
        "Lubang jalan di kawasan permukiman berisiko bagi pengendara saat hujan. Bukti foto menunjukkan kerusakan permukaan yang perlu diperiksa petugas.",
      category: "jalan_rusak",
      urgency: "tinggi",
      duplicates: [
        {
          ticket_id: "ADU-198",
          title: "Lubang jalan membesar, rawan kecelakaan",
          distance_m: 50,
        },
      ],
    },
    verification: null,
    rejection: null,
    handler: null,
    latest_update: null,
    completion: null,
    timeline: [
      {
        event: "submitted",
        title: "Laporan diterima",
        description: "Laporan masuk dan menunggu verifikasi admin.",
        at: "2026-11-08T10:42:00+07:00",
      },
    ],
  },
  {
    ticket_id: "ADU-203",
    title: "Tumpukan sampah di dekat TPS Sukamaju",
    status: "menunggu_verifikasi",
    description:
      "Sampah rumah tangga menumpuk di luar bak penampungan Jl. Anggrek Raya No. 8 sejak tiga hari lalu dan mulai menimbulkan bau menyengat bagi warga sekitar.",
    photo_url: "/mock/sampah.png",
    location: {
      latitude: -6.2115,
      longitude: 106.8492,
      address_text: "Jl. Anggrek Raya No. 8, Kel. Sukamaju, Kota Harmoni",
    },
    reporter_phone: "081298765432",
    received_at: "2026-11-08T09:50:00+07:00",
    ai: {
      status: "done",
      summary:
        "Tumpukan sampah meluber ke bahu jalan permukiman dan berpotensi mengganggu kesehatan serta kelancaran arus warga.",
      category: "sampah",
      urgency: "sedang",
      duplicates: [],
    },
    verification: null,
    rejection: null,
    handler: null,
    latest_update: null,
    completion: null,
    timeline: [
      {
        event: "submitted",
        title: "Laporan diterima",
        description: "Laporan masuk dan menunggu verifikasi admin.",
        at: "2026-11-08T09:50:00+07:00",
      },
    ],
  },
  {
    ticket_id: "ADU-201",
    title: "Lampu PJU padam total di tikungan Jl. Kenanga",
    status: "menunggu_verifikasi",
    description:
      "Lampu penerangan jalan umum di tikungan Jl. Kenanga Blok C2 mati total sejak semalam. Kondisi jalan sangat gelap dan rawan kecelakaan pada malam hari.",
    photo_url: "/mock/lampu-mati.png",
    location: {
      latitude: -6.2054,
      longitude: 106.8418,
      address_text: "Jl. Kenanga Blok C2, Kel. Mekarjaya, Kota Harmoni",
    },
    reporter_phone: null,
    received_at: "2026-11-08T08:15:00+07:00",
    ai: {
      status: "done",
      summary:
        "Lampu PJU di area tikungan permukiman mati total sehingga visibilitas malam hari sangat rendah.",
      category: "lampu_mati",
      urgency: "tinggi",
      duplicates: [],
    },
    verification: null,
    rejection: null,
    handler: null,
    latest_update: null,
    completion: null,
    timeline: [
      {
        event: "submitted",
        title: "Laporan diterima",
        description: "Laporan masuk dan menunggu verifikasi admin.",
        at: "2026-11-08T08:15:00+07:00",
      },
    ],
  },
  {
    ticket_id: "ADU-198",
    title: "Lubang jalan membesar, rawan kecelakaan",
    status: "menunggu_penanganan",
    description:
      "Lubang jalan di depan Jl. Melati No. 14 semakin besar dan dalam. Pengendara harus menghindar ke sisi jalan. Saat hujan lubangnya tidak terlihat dan sudah ada pengendara yang hampir jatuh. Mohon segera diamankan dan diperbaiki.",
    photo_url: "/mock/jalan-rusak.png",
    location: {
      latitude: -6.2091,
      longitude: 106.8459,
      address_text: "Jl. Melati No. 14, Kel. Sukamaju, Kota Harmoni",
    },
    reporter_phone: "081234567890",
    received_at: "2026-11-08T07:35:00+07:00",
    ai: {
      status: "done",
      summary:
        "Kerusakan jalan cukup dalam di jalur utama lingkungan dan berisiko tinggi menimbulkan kecelakaan roda dua.",
      category: "jalan_rusak",
      urgency: "darurat",
      duplicates: [],
    },
    verification: {
      category: "jalan_rusak",
      urgency: "darurat",
      note: "Kerusakan mengganggu akses kendaraan. Amankan area terlebih dahulu, lalu periksa kedalaman lubang dan lakukan penambalan.",
      verified_by: ADMIN_ACTOR,
      verified_at: "2026-11-08T08:10:00+07:00",
    },
    rejection: null,
    handler: null,
    latest_update: null,
    completion: null,
    timeline: [
      {
        event: "verified",
        title: "Laporan siap ditangani",
        description: "Admin menyetujui laporan. Menunggu Penanganan.",
        at: "2026-11-08T08:10:00+07:00",
      },
      {
        event: "submitted",
        title: "Laporan diterima",
        description: "Laporan masuk dan menunggu verifikasi admin.",
        at: "2026-11-08T07:35:00+07:00",
      },
    ],
  },
  {
    ticket_id: "ADU-192",
    title: "Tumpukan sampah menghalangi jalan",
    status: "menunggu_penanganan",
    description:
      "Tumpukan kantong sampah di tepi Jl. Anggrek No. 6 belum diangkut sehingga menutup sebagian bahu jalan dan mengganggu pejalan kaki.",
    photo_url: "/mock/sampah.png",
    location: {
      latitude: -6.2142,
      longitude: 106.8431,
      address_text: "Jl. Anggrek No. 6, Sukamaju",
    },
    reporter_phone: "081311223344",
    received_at: "2026-11-07T14:10:00+07:00",
    ai: {
      status: "done",
      summary:
        "Volume sampah di tepi Jl. Anggrek No. 6 menghambat akses jalan dan membutuhkan armada pengangkut segera.",
      category: "sampah",
      urgency: "tinggi",
      duplicates: [],
    },
    verification: {
      category: "sampah",
      urgency: "tinggi",
      note: "Koordinasikan dengan armada kebersihan untuk pengangkutan dan pembersihan bahu jalan.",
      verified_by: ADMIN_ACTOR,
      verified_at: "2026-11-07T15:20:00+07:00",
    },
    rejection: null,
    handler: null,
    latest_update: null,
    completion: null,
    timeline: [
      {
        event: "verified",
        title: "Laporan siap ditangani",
        description: "Admin menyetujui laporan. Menunggu Penanganan.",
        at: "2026-11-07T15:20:00+07:00",
      },
      {
        event: "submitted",
        title: "Laporan diterima",
        description: "Laporan masuk dan menunggu verifikasi admin.",
        at: "2026-11-07T14:10:00+07:00",
      },
    ],
  },
  {
    ticket_id: "ADU-187",
    title: "Lampu penerangan jalan padam",
    status: "menunggu_penanganan",
    description:
      "Lampu penerangan jalan umum di sepanjang Jl. Mawar No. 9 tidak menyala sejak dua malam terakhir. Warga khawatir saat melintas malam hari.",
    photo_url: "/mock/lampu-mati.png",
    location: {
      latitude: -6.2067,
      longitude: 106.8511,
      address_text: "Jl. Mawar No. 9, Sukamaju",
    },
    reporter_phone: null,
    received_at: "2026-11-07T09:40:00+07:00",
    ai: {
      status: "done",
      summary:
        "Gangguan jaringan PJU pada tiang lampu jalan di Jl. Mawar No. 9.",
      category: "lampu_mati",
      urgency: "sedang",
      duplicates: [],
    },
    verification: {
      category: "lampu_mati",
      urgency: "sedang",
      note: "Periksa panel konektor tiang PJU dan ganti bohlam bila putus.",
      verified_by: ADMIN_ACTOR,
      verified_at: "2026-11-07T11:05:00+07:00",
    },
    rejection: null,
    handler: null,
    latest_update: null,
    completion: null,
    timeline: [
      {
        event: "verified",
        title: "Laporan siap ditangani",
        description: "Admin menyetujui laporan. Menunggu Penanganan.",
        at: "2026-11-07T11:05:00+07:00",
      },
      {
        event: "submitted",
        title: "Laporan diterima",
        description: "Laporan masuk dan menunggu verifikasi admin.",
        at: "2026-11-07T09:40:00+07:00",
      },
    ],
  },
  {
    ticket_id: "ADU-185",
    title: "Pinggiran aspal ambles dekat jembatan kecil",
    status: "menunggu_penanganan",
    description:
      "Pinggiran aspal di Jl. Merpati No. 5 dekat jembatan saluran air mulai ambles dan retak memanjang. Perlu diberi pembatas dan diperkuat.",
    photo_url: "/mock/jalan-rusak.png",
    location: {
      latitude: -6.2128,
      longitude: 106.8395,
      address_text: "Jl. Merpati No. 5, Mekarjaya",
    },
    reporter_phone: "081566778899",
    received_at: "2026-11-07T15:10:00+07:00",
    ai: {
      status: "done",
      summary:
        "Keretakan tepi aspal dekat saluran air yang berisiko melebar bila dilalui kendaraan berat.",
      category: "jalan_rusak",
      urgency: "sedang",
      duplicates: [],
    },
    verification: {
      category: "jalan_rusak",
      urgency: "sedang",
      note: "Pasang rambu peringatan di tepi jembatan dan lakukan penambalan struktur tepi jalan.",
      verified_by: ADMIN_ACTOR,
      verified_at: "2026-11-07T17:00:00+07:00",
    },
    rejection: null,
    handler: null,
    latest_update: null,
    completion: null,
    timeline: [
      {
        event: "verified",
        title: "Laporan siap ditangani",
        description: "Admin menyetujui laporan. Menunggu Penanganan.",
        at: "2026-11-07T17:00:00+07:00",
      },
      {
        event: "submitted",
        title: "Laporan diterima",
        description: "Laporan masuk dan menunggu verifikasi admin.",
        at: "2026-11-07T15:10:00+07:00",
      },
    ],
  },
  {
    ticket_id: "ADU-182",
    title: "Kantong sampah menumpuk di dekat halte warga",
    status: "menunggu_penanganan",
    description:
      "Beberapa kantong sampah plastik ditinggalkan di samping halte kecil Jl. Cemara No. 11 dan belum terangkut sejak kemarin pagi.",
    photo_url: "/mock/sampah.png",
    location: {
      latitude: -6.2162,
      longitude: 106.8442,
      address_text: "Jl. Cemara No. 11, Sukamaju",
    },
    reporter_phone: null,
    received_at: "2026-11-06T16:15:00+07:00",
    ai: {
      status: "done",
      summary: "Tumpukan kantong sampah di samping fasilitas halte warga.",
      category: "sampah",
      urgency: "rendah",
      duplicates: [],
    },
    verification: {
      category: "sampah",
      urgency: "rendah",
      note: "Sertakan dalam jadwal sapuan bersih armada sore.",
      verified_by: ADMIN_ACTOR,
      verified_at: "2026-11-06T17:30:00+07:00",
    },
    rejection: null,
    handler: null,
    latest_update: null,
    completion: null,
    timeline: [
      {
        event: "verified",
        title: "Laporan siap ditangani",
        description: "Admin menyetujui laporan. Menunggu Penanganan.",
        at: "2026-11-06T17:30:00+07:00",
      },
      {
        event: "submitted",
        title: "Laporan diterima",
        description: "Laporan masuk dan menunggu verifikasi admin.",
        at: "2026-11-06T16:15:00+07:00",
      },
    ],
  },
  {
    ticket_id: "ADU-179",
    title: "Lampu taman warga redup dan berkedip",
    status: "menunggu_penanganan",
    description:
      "Lampu penerangan di jalur pejalan kaki Jl. Kenari No. 3 berkedip terus-menerus dan redup pada malam hari.",
    photo_url: "/mock/lampu-mati.png",
    location: {
      latitude: -6.2031,
      longitude: 106.8498,
      address_text: "Jl. Kenari No. 3, Mekarjaya",
    },
    reporter_phone: "081234567890",
    received_at: "2026-11-06T13:20:00+07:00",
    ai: {
      status: "done",
      summary: "Gangguan ballast lampu penerangan di jalur pejalan kaki.",
      category: "lampu_mati",
      urgency: "rendah",
      duplicates: [],
    },
    verification: {
      category: "lampu_mati",
      urgency: "rendah",
      note: "Periksa dudukan lampu saat patroli pemeliharaan rutin.",
      verified_by: ADMIN_ACTOR,
      verified_at: "2026-11-06T15:00:00+07:00",
    },
    rejection: null,
    handler: null,
    latest_update: null,
    completion: null,
    timeline: [
      {
        event: "verified",
        title: "Laporan siap ditangani",
        description: "Admin menyetujui laporan. Menunggu Penanganan.",
        at: "2026-11-06T15:00:00+07:00",
      },
      {
        event: "submitted",
        title: "Laporan diterima",
        description: "Laporan masuk dan menunggu verifikasi admin.",
        at: "2026-11-06T13:20:00+07:00",
      },
    ],
  },
  {
    ticket_id: "ADU-891",
    title: "Jalan berlubang di Jl. Melati",
    status: "diproses",
    description:
      "Ada lubang cukup dalam di depan Jl. Melati No. 12. Saat hujan lubang tertutup air dan membahayakan pengendara, terutama sepeda motor. Mohon segera diperbaiki.",
    photo_url: "/mock/jalan-rusak.png",
    location: {
      latitude: -6.2088,
      longitude: 106.8456,
      address_text: "Jl. Melati No. 12, Kel. Sukamaju, Kota Harmoni",
    },
    reporter_phone: "081234567890",
    received_at: "2026-11-07T16:40:00+07:00",
    ai: {
      status: "done",
      summary:
        "Lubang jalan cukup dalam di kawasan permukiman Jl. Melati No. 12 yang membahayakan pengendara motor saat hujan.",
      category: "jalan_rusak",
      urgency: "tinggi",
      duplicates: [],
    },
    verification: {
      category: "jalan_rusak",
      urgency: "tinggi",
      note: "Segera lakukan pengecekan kedalaman lubang dan pasang tanda pengaman sementara sebelum pengaspalan.",
      verified_by: ADMIN_ACTOR,
      verified_at: "2026-11-08T08:30:00+07:00",
    },
    rejection: null,
    handler: {
      ...OFFICER_ACTOR,
      taken_at: "2026-11-08T09:15:00+07:00",
    },
    latest_update: {
      note: "Kami sedang memeriksa kedalaman lubang dan menyiapkan material untuk perbaikan. Area telah diberi tanda pengaman sementara.",
      actor: OFFICER_ACTOR,
      at: "2026-11-08T09:15:00+07:00",
    },
    completion: null,
    timeline: [
      {
        event: "taken",
        title: "Petugas mulai menangani",
        description:
          "Budi Santoso melakukan pengecekan dan persiapan perbaikan.",
        at: "2026-11-08T09:15:00+07:00",
      },
      {
        event: "verified",
        title: "Laporan siap ditangani",
        description: "Admin menyetujui laporan. Menunggu Penanganan.",
        at: "2026-11-08T08:30:00+07:00",
      },
      {
        event: "submitted",
        title: "Laporan diterima",
        description: "Laporan masuk dan menunggu verifikasi admin.",
        at: "2026-11-07T16:40:00+07:00",
      },
    ],
  },
  {
    ticket_id: "ADU-180",
    title: "Tumpukan sampah liar di pinggir taman",
    status: "diproses",
    description:
      "Terdapat tumpukan kantong sampah dan ranting kering di sudut Jl. Taman Harmoni No. 9 yang mengganggu kenyamanan pengunjung taman warga.",
    photo_url: "/mock/sampah.png",
    location: {
      latitude: -6.2039,
      longitude: 106.8475,
      address_text: "Jl. Taman Harmoni No. 9, Kel. Sukamaju, Kota Harmoni",
    },
    reporter_phone: "081298765432",
    received_at: "2026-11-07T11:20:00+07:00",
    ai: {
      status: "done",
      summary:
        "Timbunan sampah liar dan ranting di area publik Taman Harmoni.",
      category: "sampah",
      urgency: "sedang",
      duplicates: [],
    },
    verification: {
      category: "sampah",
      urgency: "sedang",
      note: "Angkut tumpukan sampah dan bersihkan area trotoar taman.",
      verified_by: ADMIN_ACTOR,
      verified_at: "2026-11-07T13:00:00+07:00",
    },
    rejection: null,
    handler: {
      ...OFFICER_ACTOR,
      taken_at: "2026-11-08T08:00:00+07:00",
    },
    latest_update: {
      note: "Petugas kebersihan sedang mengangkut kantong sampah ke truk operasional.",
      actor: OFFICER_ACTOR,
      at: "2026-11-08T08:00:00+07:00",
    },
    completion: null,
    timeline: [
      {
        event: "taken",
        title: "Petugas mulai menangani",
        description:
          "Budi Santoso melakukan pengangkutan sampah di area taman.",
        at: "2026-11-08T08:00:00+07:00",
      },
      {
        event: "verified",
        title: "Laporan siap ditangani",
        description: "Admin menyetujui laporan. Menunggu Penanganan.",
        at: "2026-11-07T13:00:00+07:00",
      },
      {
        event: "submitted",
        title: "Laporan diterima",
        description: "Laporan masuk dan menunggu verifikasi admin.",
        at: "2026-11-07T11:20:00+07:00",
      },
    ],
  },
  {
    ticket_id: "ADU-176",
    title: "Perbaikan jalan di Jl. Kenanga",
    status: "selesai",
    description:
      "Lubang cukup lebar di permukaan jalan Jl. Kenanga No. 8 membuat kendaraan harus melambat drastis dan membahayakan pengendara saat malam hari.",
    photo_url: "/mock/jalan-rusak.png",
    location: {
      latitude: -6.2072,
      longitude: 106.8384,
      address_text: "Jl. Kenanga No. 8, Kel. Sukamaju, Kota Harmoni",
    },
    reporter_phone: "081234567890",
    received_at: "2026-11-05T10:20:00+07:00",
    ai: {
      status: "done",
      summary:
        "Lubang jalan di Jl. Kenanga No. 8 mengganggu kelancaran lalu lintas warga.",
      category: "jalan_rusak",
      urgency: "tinggi",
      duplicates: [],
    },
    verification: {
      category: "jalan_rusak",
      urgency: "tinggi",
      note: "Lakukan penambalan aspal dan perataan permukaan di titik kerusakan.",
      verified_by: ADMIN_ACTOR,
      verified_at: "2026-11-05T15:30:00+07:00",
    },
    rejection: null,
    handler: {
      ...OFFICER_ACTOR,
      taken_at: "2026-11-06T09:00:00+07:00",
    },
    latest_update: {
      note: "Lubang jalan sudah ditambal dengan aspal dingin dan dipadatkan. Sisa material dibersihkan, jalan kembali dapat dilalui dengan aman.",
      actor: OFFICER_ACTOR,
      at: "2026-11-06T14:10:00+07:00",
    },
    completion: {
      notes:
        "Lubang jalan sudah ditambal dengan aspal dingin dan dipadatkan. Sisa material dibersihkan, jalan kembali dapat dilalui dengan aman.",
      photo_url: "/mock/jalan-selesai.png",
      completed_by: OFFICER_ACTOR,
      completed_at: "2026-11-06T14:10:00+07:00",
    },
    timeline: [
      {
        event: "completed",
        title: "Selesai ditangani",
        description: "Bukti penanganan telah diunggah oleh Budi Santoso.",
        at: "2026-11-06T14:10:00+07:00",
      },
      {
        event: "taken",
        title: "Pengerjaan dimulai",
        description: "Petugas melakukan perbaikan jalan.",
        at: "2026-11-06T09:00:00+07:00",
      },
      {
        event: "verified",
        title: "Laporan diverifikasi",
        description: "Admin menyetujui laporan untuk ditangani.",
        at: "2026-11-05T15:30:00+07:00",
      },
      {
        event: "submitted",
        title: "Laporan diterima",
        description: "Laporan warga masuk ke antrean verifikasi.",
        at: "2026-11-05T10:20:00+07:00",
      },
    ],
  },
  {
    ticket_id: "ADU-172",
    title: "Pengangkutan sampah menumpuk di Jl. Mawar",
    status: "selesai",
    description:
      "Tumpukan sampah pasca kerja bakti warga di Jl. Mawar No. 4 membutuhkan bantuan pengangkutan armada kebersihan dinas.",
    photo_url: "/mock/sampah.png",
    location: {
      latitude: -6.2104,
      longitude: 106.8529,
      address_text: "Jl. Mawar No. 4, Kel. Sukamaju, Kota Harmoni",
    },
    reporter_phone: "081388990011",
    received_at: "2026-11-04T10:15:00+07:00",
    ai: {
      status: "done",
      summary: "Tumpukan karung sampah hasil kerja bakti warga di tepi jalan.",
      category: "sampah",
      urgency: "sedang",
      duplicates: [],
    },
    verification: {
      category: "sampah",
      urgency: "sedang",
      note: "Jadwalkan pengangkutan dengan truk rute Sukamaju.",
      verified_by: ADMIN_ACTOR,
      verified_at: "2026-11-04T11:30:00+07:00",
    },
    rejection: null,
    handler: {
      ...OFFICER_ACTOR,
      taken_at: "2026-11-05T08:20:00+07:00",
    },
    latest_update: {
      note: "Seluruh tumpukan sampah di Jl. Mawar No. 4 telah diangkut bersih.",
      actor: OFFICER_ACTOR,
      at: "2026-11-05T11:45:00+07:00",
    },
    completion: {
      notes:
        "Seluruh tumpukan sampah di Jl. Mawar No. 4 telah diangkut bersih dan area sudah disapu.",
      photo_url: "/mock/jalan-selesai.png",
      completed_by: OFFICER_ACTOR,
      completed_at: "2026-11-05T11:45:00+07:00",
    },
    timeline: [
      {
        event: "completed",
        title: "Selesai ditangani",
        description:
          "Seluruh tumpukan sampah di Jl. Mawar No. 4 telah diangkut bersih dan area sudah disapu.",
        at: "2026-11-05T11:45:00+07:00",
      },
      {
        event: "taken",
        title: "Petugas mulai menangani",
        description: "Budi Santoso mulai mengangkut tumpukan sampah.",
        at: "2026-11-05T08:20:00+07:00",
      },
      {
        event: "verified",
        title: "Laporan siap ditangani",
        description: "Admin menyetujui laporan. Menunggu Penanganan.",
        at: "2026-11-04T11:30:00+07:00",
      },
      {
        event: "submitted",
        title: "Laporan diterima",
        description: "Laporan masuk dan menunggu verifikasi admin.",
        at: "2026-11-04T10:15:00+07:00",
      },
    ],
  },
  {
    ticket_id: "ADU-168",
    title: "Penggantian bola lampu PJU di Jl. Flamboyan",
    status: "selesai",
    description:
      "Lampu jalan di depan gang Jl. Flamboyan No. 11 berkedip-kedip lalu mati sehingga akses masuk warga menjadi gelap.",
    photo_url: "/mock/lampu-mati.png",
    location: {
      latitude: -6.2156,
      longitude: 106.8471,
      address_text: "Jl. Flamboyan No. 11, Kel. Harapan Jaya, Kota Harmoni",
    },
    reporter_phone: null,
    received_at: "2026-11-03T19:40:00+07:00",
    ai: {
      status: "done",
      summary: "Kerusakan lampu PJU di mulut gang Jl. Flamboyan No. 11.",
      category: "lampu_mati",
      urgency: "sedang",
      duplicates: [],
    },
    verification: {
      category: "lampu_mati",
      urgency: "sedang",
      note: "Ganti lampu LED PJU 60W dan cek photocell.",
      verified_by: ADMIN_ACTOR,
      verified_at: "2026-11-04T08:15:00+07:00",
    },
    rejection: null,
    handler: {
      ...OFFICER_ACTOR,
      taken_at: "2026-11-04T13:30:00+07:00",
    },
    latest_update: {
      note: "Komponen lampu LED dan sensor cahaya sudah diganti baru dan menyala normal.",
      actor: OFFICER_ACTOR,
      at: "2026-11-04T16:20:00+07:00",
    },
    completion: {
      notes:
        "Komponen lampu LED dan sensor cahaya sudah diganti baru dan menyala normal.",
      photo_url: "/mock/jalan-selesai.png",
      completed_by: OFFICER_ACTOR,
      completed_at: "2026-11-04T16:20:00+07:00",
    },
    timeline: [
      {
        event: "completed",
        title: "Selesai ditangani",
        description:
          "Komponen lampu LED dan sensor cahaya sudah diganti baru dan menyala normal.",
        at: "2026-11-04T16:20:00+07:00",
      },
      {
        event: "taken",
        title: "Petugas mulai menangani",
        description: "Budi Santoso memeriksa jaringan lampu jalan.",
        at: "2026-11-04T13:30:00+07:00",
      },
      {
        event: "verified",
        title: "Laporan siap ditangani",
        description: "Admin menyetujui laporan. Menunggu Penanganan.",
        at: "2026-11-04T08:15:00+07:00",
      },
      {
        event: "submitted",
        title: "Laporan diterima",
        description: "Laporan masuk dan menunggu verifikasi admin.",
        at: "2026-11-03T19:40:00+07:00",
      },
    ],
  },
  {
    ticket_id: "ADU-165",
    title: "Tambal sulam aspal mengelupas di Jl. Bougenville",
    status: "selesai",
    description:
      "Permukaan aspal di Jl. Bougenville No. 2 mengelupas sepanjang dua meter dan membuat jalan berdebu serta licin karena kerikil lepas.",
    photo_url: "/mock/jalan-rusak.png",
    location: {
      latitude: -6.2048,
      longitude: 106.8502,
      address_text: "Jl. Bougenville No. 2, Kel. Sukamaju, Kota Harmoni",
    },
    reporter_phone: "081234567890",
    received_at: "2026-11-02T09:10:00+07:00",
    ai: {
      status: "done",
      summary: "Pengelupasan lapisan aspal ringan di Jl. Bougenville No. 2.",
      category: "jalan_rusak",
      urgency: "rendah",
      duplicates: [],
    },
    verification: {
      category: "jalan_rusak",
      urgency: "rendah",
      note: "Bersihkan kerikil lepas dan lakukan pelapisan ulang permukaan.",
      verified_by: ADMIN_ACTOR,
      verified_at: "2026-11-02T11:00:00+07:00",
    },
    rejection: null,
    handler: {
      ...OFFICER_ACTOR,
      taken_at: "2026-11-03T08:30:00+07:00",
    },
    latest_update: {
      note: "Permukaan jalan telah dilapisi ulang dan dibersihkan dari kerikil lepas.",
      actor: OFFICER_ACTOR,
      at: "2026-11-03T14:00:00+07:00",
    },
    completion: {
      notes:
        "Permukaan jalan telah dilapisi ulang dan dibersihkan dari kerikil lepas.",
      photo_url: "/mock/jalan-selesai.png",
      completed_by: OFFICER_ACTOR,
      completed_at: "2026-11-03T14:00:00+07:00",
    },
    timeline: [
      {
        event: "completed",
        title: "Selesai ditangani",
        description:
          "Permukaan jalan telah dilapisi ulang dan dibersihkan dari kerikil lepas.",
        at: "2026-11-03T14:00:00+07:00",
      },
      {
        event: "taken",
        title: "Petugas mulai menangani",
        description: "Budi Santoso mulai melakukan perbaikan lapisan jalan.",
        at: "2026-11-03T08:30:00+07:00",
      },
      {
        event: "verified",
        title: "Laporan siap ditangani",
        description: "Admin menyetujui laporan. Menunggu Penanganan.",
        at: "2026-11-02T11:00:00+07:00",
      },
      {
        event: "submitted",
        title: "Laporan diterima",
        description: "Laporan masuk dan menunggu verifikasi admin.",
        at: "2026-11-02T09:10:00+07:00",
      },
    ],
  },
  {
    ticket_id: "ADU-183",
    title: "Sampah menumpuk di Jl. Batas",
    status: "ditolak",
    description:
      "Terdapat tumpukan sampah di tepi Jl. Batas No. 4, Kel. Seberang. Sampah sudah beberapa hari belum diangkut dan menimbulkan bau.",
    photo_url: "/mock/sampah.png",
    location: {
      latitude: -6.2175,
      longitude: 106.8409,
      address_text: "Jl. Batas No. 4, Kel. Seberang, di luar wilayah Kota Harmoni.",
    },
    reporter_phone: "081900112233",
    received_at: "2026-11-06T08:10:00+07:00",
    ai: {
      status: "done",
      summary:
        "Tumpukan sampah di Jl. Batas No. 4 yang berada di luar batas wilayah layanan instansi.",
      category: "sampah",
      urgency: "sedang",
      duplicates: [],
    },
    verification: null,
    rejection: {
      reason: "Lokasi kejadian berada di luar wilayah layanan instansi.",
      decided_by: ADMIN_ACTOR,
      at: "2026-11-06T11:20:00+07:00",
    },
    handler: null,
    latest_update: null,
    completion: null,
    timeline: [
      {
        event: "rejected",
        title: "Laporan ditolak",
        description: "Lokasi kejadian berada di luar wilayah layanan instansi.",
        at: "2026-11-06T11:20:00+07:00",
      },
      {
        event: "submitted",
        title: "Laporan diterima",
        description: "Laporan masuk dan menunggu verifikasi admin.",
        at: "2026-11-06T08:10:00+07:00",
      },
    ],
  },
  {
    ticket_id: "ADU-160",
    title: "Foto laporan buram dan tidak menampilkan objek",
    status: "ditolak",
    description:
      "Ada masalah di sekitar Jl. Teratai No. 19 namun foto terambil gelap saat di dalam saku kendaraan.",
    photo_url: "/mock/sampah.png",
    location: {
      latitude: -6.2131,
      longitude: 106.8488,
      address_text: "Jl. Teratai No. 19, Kel. Sukamaju, Kota Harmoni",
    },
    reporter_phone: null,
    received_at: "2026-11-01T15:30:00+07:00",
    ai: {
      status: "failed",
      summary: null,
      category: null,
      urgency: null,
      duplicates: [],
    },
    verification: null,
    rejection: {
      reason:
        "Bukti foto tidak jelas dan tidak menunjukkan permasalahan fasilitas publik yang dilaporkan.",
      decided_by: ADMIN_ACTOR,
      at: "2026-11-01T16:45:00+07:00",
    },
    handler: null,
    latest_update: null,
    completion: null,
    timeline: [
      {
        event: "rejected",
        title: "Laporan ditolak",
        description:
          "Bukti foto tidak jelas dan tidak menunjukkan permasalahan fasilitas publik yang dilaporkan.",
        at: "2026-11-01T16:45:00+07:00",
      },
      {
        event: "submitted",
        title: "Laporan diterima",
        description: "Laporan masuk dan menunggu verifikasi admin.",
        at: "2026-11-01T15:30:00+07:00",
      },
    ],
  },
];

// Stateful in-memory store
let reportsStore: InternalMockReport[] = structuredClone(INITIAL_REPORTS);
let nextTicketNumber = 205;

function nowWibIso(): string {
  const now = new Date();
  const wibOffsetMs = 7 * 60 * 60 * 1000;
  const wibDate = new Date(now.getTime() + wibOffsetMs);
  return wibDate.toISOString().replace("Z", "+07:00");
}

function getEffectiveCategory(
  report: InternalMockReport
): ReportCategory | null {
  return report.verification?.category ?? report.ai.category ?? null;
}

function getEffectiveUrgency(report: InternalMockReport): ReportUrgency | null {
  return report.verification?.urgency ?? report.ai.urgency ?? null;
}

function findReportOrThrow(ticketIdInput: string): InternalMockReport {
  const normalized = normalizeTicketInput(ticketIdInput);
  const found = reportsStore.find(
    (r) => normalizeTicketInput(r.ticket_id) === normalized
  );
  if (!found) {
    throw new ApiError(
      404,
      `Tiket laporan ${normalized || ticketIdInput} tidak ditemukan.`
    );
  }
  return found;
}

function toAdminDetail(report: InternalMockReport): AdminReportDetail {
  const effCategory = getEffectiveCategory(report);
  const effUrgency = getEffectiveUrgency(report);
  return {
    ticket_id: report.ticket_id,
    title: report.title,
    status: report.status,
    status_label: getStatusLabel(report.status),
    category: effCategory,
    category_label: effCategory ? getCategoryLabel(effCategory) : null,
    urgency: effUrgency,
    urgency_label: effUrgency ? getUrgencyLabel(effUrgency) : null,
    description: report.description,
    photo_url: report.photo_url,
    location: { ...report.location },
    reporter: {
      phone: report.reporter_phone,
    },
    received_at: report.received_at,
    ai: structuredClone(report.ai),
    verification: report.verification
      ? structuredClone(report.verification)
      : null,
    rejection: report.rejection ? structuredClone(report.rejection) : null,
    handler: report.handler ? structuredClone(report.handler) : null,
    completion: report.completion ? structuredClone(report.completion) : null,
    timeline: structuredClone(report.timeline),
  };
}

function toOfficerDetail(report: InternalMockReport): OfficerReportDetail {
  const effCategory = getEffectiveCategory(report) ?? "jalan_rusak";
  const effUrgency = getEffectiveUrgency(report) ?? "sedang";
  const verification: ReportVerification = report.verification ?? {
    category: effCategory,
    urgency: effUrgency,
    note: "Segera lakukan pengecekan lapangan sesuai prosedur standar.",
    verified_by: ADMIN_ACTOR,
    verified_at: report.received_at,
  };

  return {
    ticket_id: report.ticket_id,
    title: report.title,
    status: report.status,
    status_label: getStatusLabel(report.status),
    category: effCategory,
    category_label: getCategoryLabel(effCategory),
    urgency: effUrgency,
    urgency_label: getUrgencyLabel(effUrgency),
    description: report.description,
    photo_url: report.photo_url,
    location: { ...report.location },
    received_at: report.received_at,
    verification: structuredClone(verification),
    rejection: report.rejection ? structuredClone(report.rejection) : null,
    handler: report.handler ? structuredClone(report.handler) : null,
    completion: report.completion ? structuredClone(report.completion) : null,
    timeline: structuredClone(report.timeline),
  };
}

// ==========================================
// 1. Mock Publik (Warga)
// ==========================================

export async function mockCreateReport(
  payload: CreateReportPayload
): Promise<CreatedReportResponse> {
  await mockDelay(500);

  const desc = payload.description?.trim() ?? "";
  if (desc.length < 20) {
    throw new ApiError(422, "Data yang dikirim tidak valid.", {
      description: ["Deskripsi minimal 20 karakter."],
    });
  }
  if (!payload.photo) {
    throw new ApiError(422, "Data yang dikirim tidak valid.", {
      photo: ["Foto bukti kejadian wajib diunggah."],
    });
  }

  const lower = desc.toLowerCase();
  let detectedCategory: ReportCategory = "jalan_rusak";
  let detectedUrgency: ReportUrgency = "sedang";
  let defaultPhoto = "/mock/jalan-rusak.png";

  if (
    lower.includes("sampah") ||
    lower.includes("bau") ||
    lower.includes("tps")
  ) {
    detectedCategory = "sampah";
    defaultPhoto = "/mock/sampah.png";
  } else if (
    lower.includes("lampu") ||
    lower.includes("pju") ||
    lower.includes("gelap") ||
    lower.includes("mati")
  ) {
    detectedCategory = "lampu_mati";
    defaultPhoto = "/mock/lampu-mati.png";
  }

  if (
    lower.includes("kecelakaan") ||
    lower.includes("bahaya") ||
    lower.includes("darurat") ||
    lower.includes("ambles")
  ) {
    detectedUrgency = "darurat";
  } else if (
    lower.includes("dalam") ||
    lower.includes("parah") ||
    lower.includes("gelap")
  ) {
    detectedUrgency = "tinggi";
  }

  let photoUrl = defaultPhoto;
  if (
    typeof window !== "undefined" &&
    typeof URL !== "undefined" &&
    payload.photo instanceof File &&
    payload.photo.size > 0
  ) {
    try {
      photoUrl = URL.createObjectURL(payload.photo);
    } catch {
      photoUrl = defaultPhoto;
    }
  }

  const ticketId = `ADU-${nextTicketNumber++}`;
  const createdAt = nowWibIso();
  const shortTitle =
    desc.length > 56 ? `${desc.slice(0, 56).trim()}...` : desc;

  const newReport: InternalMockReport = {
    ticket_id: ticketId,
    title: shortTitle,
    status: "menunggu_verifikasi",
    description: desc,
    photo_url: photoUrl,
    location: {
      latitude: payload.latitude,
      longitude: payload.longitude,
      address_text:
        payload.address_text?.trim() ||
        "Titik koordinat peta warga, Kota Harmoni",
    },
    reporter_phone: payload.reporter_phone?.trim() || null,
    received_at: createdAt,
    ai: {
      status: "done",
      summary: `Analisis otomatis AI mendeteksi laporan kategori ${getCategoryLabel(detectedCategory)} dengan tingkat urgensi ${getUrgencyLabel(detectedUrgency)}.`,
      category: detectedCategory,
      urgency: detectedUrgency,
      duplicates: [],
    },
    verification: null,
    rejection: null,
    handler: null,
    latest_update: null,
    completion: null,
    timeline: [
      {
        event: "submitted",
        title: "Laporan diterima",
        description: "Laporan masuk dan menunggu verifikasi admin.",
        at: createdAt,
      },
    ],
  };

  reportsStore = [newReport, ...reportsStore];

  return {
    ticket_id: newReport.ticket_id,
    status: newReport.status,
    status_label: getStatusLabel(newReport.status),
    created_at: createdAt,
  };
}

export async function mockTrackReport(
  ticketId: string
): Promise<TrackedReport> {
  await mockDelay(400);

  const report = findReportOrThrow(ticketId);
  const isUnverified = report.status === "menunggu_verifikasi";
  const effCategory = isUnverified ? null : getEffectiveCategory(report);

  return {
    ticket_id: report.ticket_id,
    title: report.title,
    status: report.status,
    status_label: getStatusLabel(report.status),
    category: effCategory,
    category_label: effCategory ? getCategoryLabel(effCategory) : null,
    description: report.description,
    location: { ...report.location },
    photo_url: report.photo_url,
    received_at: report.received_at,
    latest_update: report.latest_update
      ? structuredClone(report.latest_update)
      : null,
    timeline: structuredClone(report.timeline),
    rejection: report.rejection ? structuredClone(report.rejection) : null,
    completion: report.completion ? structuredClone(report.completion) : null,
  };
}

// ==========================================
// 2. Mock Autentikasi
// ==========================================

export async function mockLogin(payload: LoginPayload): Promise<LoginResponse> {
  await mockDelay(400);

  const email = payload.email.trim().toLowerCase();
  const entry = MOCK_USERS[email];
  if (!entry || entry.password !== payload.password) {
    throw new ApiError(401, "Email atau password salah.");
  }

  const rolePrefix = entry.user.role === "admin" ? "1|admin" : "2|petugas";
  return {
    token: `${rolePrefix}_mock_token_kawalwarga`,
    token_type: "Bearer",
    user: { ...entry.user },
  };
}

export async function mockLogout(): Promise<null> {
  await mockDelay(250);
  return null;
}

export async function mockMe(): Promise<User> {
  await mockDelay(300);
  const token = getStoredToken();
  if (!token) {
    throw new ApiError(401, "Belum login atau token tidak valid.");
  }
  if (token.startsWith("2|petugas")) {
    return { ...MOCK_USERS["budi@kawalwarga.test"].user };
  }
  return { ...MOCK_USERS["admin@kawalwarga.test"].user };
}

// ==========================================
// 3. Mock Admin
// ==========================================

export async function mockAdminListReports(
  params: AdminListParams = {}
): Promise<Paginated<AdminReportListItem>> {
  await mockDelay(380);

  let filtered = [...reportsStore];

  if (params.search && params.search.trim() !== "") {
    const q = normalizeTicketInput(params.search);
    const rawLower = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.ticket_id.toUpperCase().includes(q) ||
        r.title.toLowerCase().includes(rawLower) ||
        (r.location.address_text?.toLowerCase().includes(rawLower) ?? false)
    );
  }

  if (params.status) {
    filtered = filtered.filter((r) => r.status === params.status);
  }

  if (params.category) {
    filtered = filtered.filter(
      (r) => getEffectiveCategory(r) === params.category
    );
  }

  if (params.urgency) {
    filtered = filtered.filter(
      (r) => getEffectiveUrgency(r) === params.urgency
    );
  }

  if (params.from) {
    filtered = filtered.filter(
      (r) => r.received_at.slice(0, 10) >= params.from!
    );
  }

  if (params.to) {
    filtered = filtered.filter((r) => r.received_at.slice(0, 10) <= params.to!);
  }

  const sort = params.sort || "newest";
  filtered.sort((a, b) => {
    if (sort === "oldest") {
      return (
        new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
      );
    }
    if (sort === "urgency") {
      const urgA = getEffectiveUrgency(a);
      const urgB = getEffectiveUrgency(b);
      const prioA = urgA ? URGENCY_CONFIG[urgA].priority : 0;
      const prioB = urgB ? URGENCY_CONFIG[urgB].priority : 0;
      if (prioB !== prioA) return prioB - prioA;
    }
    return (
      new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    );
  });

  const page = Math.max(1, params.page || 1);
  const perPage = Math.max(1, params.per_page || 8);
  const total = filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const sliced = filtered.slice(start, start + perPage);

  const items: AdminReportListItem[] = sliced.map((r) => {
    const effCat = getEffectiveCategory(r);
    const effUrg = getEffectiveUrgency(r);
    return {
      ticket_id: r.ticket_id,
      title: r.title,
      status: r.status,
      status_label: getStatusLabel(r.status),
      category: effCat,
      category_label: effCat ? getCategoryLabel(effCat) : null,
      urgency: effUrg,
      urgency_label: effUrg ? getUrgencyLabel(effUrg) : null,
      address_text: r.location.address_text,
      created_at: r.received_at,
    };
  });

  return {
    data: items,
    meta: {
      current_page: page,
      last_page: lastPage,
      per_page: perPage,
      total,
    },
  };
}

export async function mockAdminGetReport(
  ticketId: string
): Promise<AdminReportDetail> {
  await mockDelay(350);
  const report = findReportOrThrow(ticketId);
  return toAdminDetail(report);
}

export async function mockAdminApproveReport(
  ticketId: string,
  payload: ApproveReportPayload
): Promise<AdminReportDetail> {
  await mockDelay(420);
  const report = findReportOrThrow(ticketId);

  if (report.status !== "menunggu_verifikasi") {
    throw new ApiError(
      409,
      "Laporan ini sudah diverifikasi sebelumnya dan tidak dapat disetujui ulang."
    );
  }

  const verifiedAt = nowWibIso();
  report.status = "menunggu_penanganan";
  report.verification = {
    category: payload.category,
    urgency: payload.urgency,
    note: payload.note?.trim() || null,
    verified_by: ADMIN_ACTOR,
    verified_at: verifiedAt,
  };
  report.timeline = [
    {
      event: "verified",
      title: "Laporan siap ditangani",
      description: "Admin menyetujui laporan. Menunggu Penanganan.",
      at: verifiedAt,
    },
    ...report.timeline,
  ];

  return toAdminDetail(report);
}

export async function mockAdminRejectReport(
  ticketId: string,
  payload: RejectReportPayload
): Promise<AdminReportDetail> {
  await mockDelay(420);
  const report = findReportOrThrow(ticketId);

  if (report.status !== "menunggu_verifikasi") {
    throw new ApiError(
      409,
      "Laporan ini sudah diverifikasi sebelumnya dan tidak dapat ditolak."
    );
  }

  const reason = payload.reason?.trim() ?? "";
  if (reason.length < 10) {
    throw new ApiError(422, "Data yang dikirim tidak valid.", {
      reason: ["Alasan penolakan minimal 10 karakter."],
    });
  }

  const rejectedAt = nowWibIso();
  report.status = "ditolak";
  report.rejection = {
    reason,
    decided_by: ADMIN_ACTOR,
    at: rejectedAt,
  };
  report.timeline = [
    {
      event: "rejected",
      title: "Laporan ditolak",
      description: reason,
      at: rejectedAt,
    },
    ...report.timeline,
  ];

  return toAdminDetail(report);
}

export async function mockAdminReanalyzeReport(
  ticketId: string
): Promise<ReportAiAnalysis> {
  await mockDelay(600);
  const report = findReportOrThrow(ticketId);

  report.ai = {
    status: "done",
    summary:
      report.ai.summary ||
      "Analisis ulang AI berhasil mengidentifikasi kerusakan fasilitas umum berdasarkan deskripsi dan bukti foto warga.",
    category: report.ai.category || "jalan_rusak",
    urgency: report.ai.urgency || "tinggi",
    duplicates: report.ai.duplicates,
  };

  return structuredClone(report.ai);
}

export async function mockAdminDashboardSummary(
  params: DashboardDateParams = {}
): Promise<DashboardSummary> {
  await mockDelay(350);

  const from = params.from || "2026-11-01";
  const to = params.to || "2026-11-08";

  // Hitung perubahan dinamis di atas baseline seeder 200 laporan agar angka sesuai Figma & responsif terhadap aksi
  const deltaVerifikasi =
    reportsStore.filter((r) => r.status === "menunggu_verifikasi").length -
    INITIAL_REPORTS.filter((r) => r.status === "menunggu_verifikasi").length;
  const deltaPenanganan =
    reportsStore.filter((r) => r.status === "menunggu_penanganan").length -
    INITIAL_REPORTS.filter((r) => r.status === "menunggu_penanganan").length;
  const deltaDiproses =
    reportsStore.filter((r) => r.status === "diproses").length -
    INITIAL_REPORTS.filter((r) => r.status === "diproses").length;
  const deltaSelesai =
    reportsStore.filter((r) => r.status === "selesai").length -
    INITIAL_REPORTS.filter((r) => r.status === "selesai").length;
  const deltaDitolak =
    reportsStore.filter((r) => r.status === "ditolak").length -
    INITIAL_REPORTS.filter((r) => r.status === "ditolak").length;

  const menunggu_verifikasi = Math.max(0, 24 + deltaVerifikasi);
  const menunggu_penanganan = Math.max(0, 16 + deltaPenanganan);
  const diproses = Math.max(0, 40 + deltaDiproses);
  const selesai = Math.max(0, 110 + deltaSelesai);
  const ditolak = Math.max(0, 10 + deltaDitolak);
  const all =
    menunggu_verifikasi +
    menunggu_penanganan +
    diproses +
    selesai +
    ditolak;

  return {
    period: { from, to },
    totals: {
      all,
      menunggu_verifikasi,
      menunggu_penanganan,
      diproses,
      selesai,
      ditolak,
    },
    by_category: [
      { category: "jalan_rusak", label: "Jalan Rusak", count: 90 },
      { category: "sampah", label: "Sampah", count: 60 },
      { category: "lampu_mati", label: "Lampu Mati", count: 50 },
    ],
  };
}

export async function mockAdminDashboardMap(
  params: DashboardDateParams = {}
): Promise<DashboardMapPin[]> {
  await mockDelay(350);

  return reportsStore
    .filter((r) => {
      if (r.status === "menunggu_verifikasi") return false;
      if (params.from && r.received_at.slice(0, 10) < params.from) return false;
      if (params.to && r.received_at.slice(0, 10) > params.to) return false;
      return true;
    })
    .map((r) => {
      const cat = getEffectiveCategory(r) ?? "jalan_rusak";
      const verifiedStatus = r.status as Exclude<
        ReportStatus,
        "menunggu_verifikasi"
      >;
      return {
        ticket_id: r.ticket_id,
        title: r.title,
        category: cat,
        category_label: getCategoryLabel(cat),
        status: verifiedStatus,
        status_label: getStatusLabel(verifiedStatus),
        latitude: r.location.latitude,
        longitude: r.location.longitude,
        photo_url: r.photo_url,
      };
    });
}

export async function mockAdminDashboardInsight(
  params: DashboardDateParams = {}
): Promise<DashboardAiInsight> {
  await mockDelay(400);
  const from = params.from || "2026-11-01";
  const to = params.to || "2026-11-08";

  return {
    bullets: [
      "Jalan rusak mendominasi: 90 laporan (45%). Prioritaskan pemeriksaan ruas lingkungan.",
      "56 laporan masih dalam alur penanganan. 16 laporan terverifikasi belum diambil petugas.",
      "110 laporan telah selesai (55%). Tinjau 24 laporan baru agar antrean tidak menumpuk.",
    ],
    based_on_total: 200,
    period: { from, to },
    generated_at: "2026-11-08T08:00:00+07:00",
  };
}

export async function mockAdminRegenerateInsight(
  params: DashboardDateParams = {}
): Promise<DashboardAiInsight> {
  await mockDelay(650);
  const summary = await mockAdminDashboardSummary(params);
  return {
    bullets: [
      `Jalan rusak mendominasi: 90 laporan (45%). Prioritaskan pemeriksaan ruas lingkungan di Kel. Sukamaju.`,
      `${summary.totals.menunggu_penanganan + summary.totals.diproses} laporan masih dalam alur penanganan. ${summary.totals.menunggu_penanganan} laporan terverifikasi belum diambil petugas.`,
      `${summary.totals.selesai} laporan telah selesai. Tinjau ${summary.totals.menunggu_verifikasi} laporan baru agar antrean tidak menumpuk.`,
    ],
    based_on_total: summary.totals.all,
    period: summary.period,
    generated_at: nowWibIso(),
  };
}

// ==========================================
// 4. Mock Petugas
// ==========================================

export async function mockOfficerQueue(
  params: OfficerQueueParams = {}
): Promise<Paginated<OfficerReportListItem>> {
  await mockDelay(380);

  let filtered = reportsStore.filter((r) => r.status === "menunggu_penanganan");

  if (params.category) {
    filtered = filtered.filter(
      (r) => getEffectiveCategory(r) === params.category
    );
  }

  const sort = params.sort || "urgency";
  filtered.sort((a, b) => {
    if (sort === "urgency") {
      const urgA = getEffectiveUrgency(a) ?? "rendah";
      const urgB = getEffectiveUrgency(b) ?? "rendah";
      const prioDiff =
        URGENCY_CONFIG[urgB].priority - URGENCY_CONFIG[urgA].priority;
      if (prioDiff !== 0) return prioDiff;
      const verA = a.verification?.verified_at ?? a.received_at;
      const verB = b.verification?.verified_at ?? b.received_at;
      return new Date(verA).getTime() - new Date(verB).getTime();
    }
    return (
      new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    );
  });

  const page = Math.max(1, params.page || 1);
  const perPage = Math.max(1, params.per_page || 6);
  const total = filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const sliced = filtered.slice(start, start + perPage);

  const items: OfficerReportListItem[] = sliced.map((r) => {
    const cat = getEffectiveCategory(r) ?? "jalan_rusak";
    const urg = getEffectiveUrgency(r) ?? "sedang";
    return {
      ticket_id: r.ticket_id,
      title: r.title,
      status: r.status,
      status_label: getStatusLabel(r.status),
      category: cat,
      category_label: getCategoryLabel(cat),
      urgency: urg,
      urgency_label: getUrgencyLabel(urg),
      photo_url: r.photo_url,
      location: { ...r.location },
      verified_at: r.verification?.verified_at ?? r.received_at,
    };
  });

  return {
    data: items,
    meta: {
      current_page: page,
      last_page: lastPage,
      per_page: perPage,
      total,
    },
  };
}

export async function mockOfficerMyReports(
  params: OfficerMyReportsParams = {}
): Promise<Paginated<OfficerReportListItem>> {
  await mockDelay(380);

  let filtered = reportsStore.filter(
    (r) => r.status === "diproses" || r.status === "selesai"
  );

  if (params.status) {
    filtered = filtered.filter((r) => r.status === params.status);
  }

  filtered.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "diproses" ? -1 : 1;
    }
    return (
      new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    );
  });

  const page = Math.max(1, params.page || 1);
  const perPage = Math.max(1, params.per_page || 6);
  const total = filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const sliced = filtered.slice(start, start + perPage);

  const items: OfficerReportListItem[] = sliced.map((r) => {
    const cat = getEffectiveCategory(r) ?? "jalan_rusak";
    const urg = getEffectiveUrgency(r) ?? "sedang";
    return {
      ticket_id: r.ticket_id,
      title: r.title,
      status: r.status,
      status_label: getStatusLabel(r.status),
      category: cat,
      category_label: getCategoryLabel(cat),
      urgency: urg,
      urgency_label: getUrgencyLabel(urg),
      photo_url: r.photo_url,
      location: { ...r.location },
      verified_at: r.verification?.verified_at ?? r.received_at,
      taken_at: r.handler?.taken_at ?? null,
      completed_at: r.completion?.completed_at ?? null,
    };
  });

  return {
    data: items,
    meta: {
      current_page: page,
      last_page: lastPage,
      per_page: perPage,
      total,
    },
  };
}

export async function mockOfficerGetReport(
  ticketId: string
): Promise<OfficerReportDetail> {
  await mockDelay(350);
  const report = findReportOrThrow(ticketId);
  if (report.status === "menunggu_verifikasi") {
    throw new ApiError(403, "Laporan belum diverifikasi oleh admin.");
  }
  return toOfficerDetail(report);
}

export async function mockOfficerTakeReport(
  ticketId: string
): Promise<OfficerReportDetail> {
  await mockDelay(420);
  const report = findReportOrThrow(ticketId);

  if (report.status !== "menunggu_penanganan") {
    throw new ApiError(
      409,
      "Laporan ini sudah diambil petugas atau tidak dalam status siap ditangani."
    );
  }

  const takenAt = nowWibIso();
  report.status = "diproses";
  report.handler = {
    ...OFFICER_ACTOR,
    taken_at: takenAt,
  };
  report.latest_update = {
    note: `${OFFICER_ACTOR.name} melakukan pengecekan dan persiapan perbaikan di lokasi.`,
    actor: OFFICER_ACTOR,
    at: takenAt,
  };
  report.timeline = [
    {
      event: "taken",
      title: "Petugas mulai menangani",
      description: `${OFFICER_ACTOR.name} melakukan pengecekan dan persiapan perbaikan.`,
      at: takenAt,
    },
    ...report.timeline,
  ];

  return toOfficerDetail(report);
}

export async function mockOfficerProgressReport(
  ticketId: string,
  payload: OfficerProgressPayload
): Promise<OfficerReportDetail> {
  await mockDelay(400);
  const report = findReportOrThrow(ticketId);

  if (report.status !== "diproses") {
    throw new ApiError(
      409,
      "Hanya laporan yang sedang diproses yang dapat diperbarui progresnya."
    );
  }

  const note = payload.note?.trim() ?? "";
  if (note.length < 5) {
    throw new ApiError(422, "Data yang dikirim tidak valid.", {
      note: ["Catatan progres minimal 5 karakter."],
    });
  }

  const updatedAt = nowWibIso();
  report.latest_update = {
    note,
    actor: OFFICER_ACTOR,
    at: updatedAt,
  };
  report.timeline = [
    {
      event: "progress",
      title: "Pembaruan dari petugas",
      description: note,
      at: updatedAt,
    },
    ...report.timeline,
  ];

  return toOfficerDetail(report);
}

export async function mockOfficerCompleteReport(
  ticketId: string,
  payload: OfficerCompletePayload
): Promise<OfficerReportDetail> {
  await mockDelay(500);
  const report = findReportOrThrow(ticketId);

  if (report.status !== "diproses") {
    throw new ApiError(
      409,
      "Laporan harus berstatus Diproses sebelum ditandai selesai."
    );
  }

  const notes = payload.notes?.trim() ?? "";
  if (notes.length < 10) {
    throw new ApiError(422, "Data yang dikirim tidak valid.", {
      notes: ["Catatan penyelesaian minimal 10 karakter."],
    });
  }

  if (!payload.photo) {
    throw new ApiError(422, "Data yang dikirim tidak valid.", {
      photo: ["Foto bukti hasil penanganan wajib diunggah."],
    });
  }

  let completionPhotoUrl = "/mock/jalan-selesai.png";
  if (
    typeof window !== "undefined" &&
    typeof URL !== "undefined" &&
    payload.photo instanceof File &&
    payload.photo.size > 0
  ) {
    try {
      completionPhotoUrl = URL.createObjectURL(payload.photo);
    } catch {
      completionPhotoUrl = "/mock/jalan-selesai.png";
    }
  }

  const completedAt = nowWibIso();
  report.status = "selesai";
  report.completion = {
    notes,
    photo_url: completionPhotoUrl,
    completed_by: OFFICER_ACTOR,
    completed_at: completedAt,
  };
  report.latest_update = {
    note: notes,
    actor: OFFICER_ACTOR,
    at: completedAt,
  };
  report.timeline = [
    {
      event: "completed",
      title: "Selesai ditangani",
      description: notes,
      at: completedAt,
    },
    ...report.timeline,
  ];

  return toOfficerDetail(report);
}

// ==========================================
// 5. Mock Chatbot AI
// ==========================================

export async function mockChatbotSendMessage(
  payload: SendChatPayload
): Promise<ChatbotResponse> {
  await mockDelay(450);

  const msg = payload.message.trim();
  const lower = msg.toLowerCase();

  // 1. Cek apakah ada ID tiket seperti ADU-891 atau #ADU-204
  const ticketMatch = msg.match(/#?(ADU-\d+)/i);
  if (ticketMatch) {
    const normalizedId = normalizeTicketInput(ticketMatch[1]);
    const found = reportsStore.find(
      (r) => normalizeTicketInput(r.ticket_id) === normalizedId
    );

    if (found) {
      const card: ChatTicketCard = {
        ticket_id: found.ticket_id,
        title: found.title,
        status: found.status,
        status_label: getStatusLabel(found.status),
      };

      let replyText = `Laporan #${found.ticket_id} saat ini berstatus "${getStatusLabel(found.status)}".`;
      if (found.status === "diproses") {
        replyText = `Laporan #${found.ticket_id} sedang ditangani. ${found.handler?.name || "Petugas"} menyiapkan perbaikan di ${found.location.address_text || "lokasi"}. Kabar terakhir: ${found.latest_update?.note || "Sedang dikerjakan."}`;
      } else if (found.status === "selesai") {
        replyText = `Laporan #${found.ticket_id} telah selesai ditangani oleh petugas pada area ${found.location.address_text || "terkait"}. Terima kasih atas partisipasi Anda!`;
      } else if (found.status === "menunggu_penanganan") {
        replyText = `Laporan #${found.ticket_id} sudah disetujui oleh admin dan sedang menunggu petugas lapangan mengambil tugas penanganan.`;
      } else if (found.status === "ditolak") {
        replyText = `Laporan #${found.ticket_id} tidak dapat dilanjutkan dengan alasan: "${found.rejection?.reason || "Di luar cakupan layanan"}".`;
      }

      return {
        reply: replyText,
        tickets: [card],
      };
    }

    return {
      reply: `Maaf, kami tidak menemukan laporan dengan ID tiket #${normalizedId}. Pastikan penulisan nomor tiket sudah benar (contoh: #ADU-891 atau #ADU-204).`,
      tickets: [],
    };
  }

  // 2. Cek apakah pengguna mengirim nomor WhatsApp (08... atau +62...)
  const phoneMatch = msg.match(/(\+62|08)\d{7,13}/);
  if (phoneMatch) {
    const rawPhone = phoneMatch[0].replace(/^\+62/, "0");
    const matchedReports = reportsStore
      .filter((r) => r.reporter_phone?.replace(/^\+62/, "0") === rawPhone)
      .slice(0, 3);

    if (matchedReports.length > 0) {
      return {
        reply: `Kami menemukan ${matchedReports.length} laporan terbaru yang terdaftar dengan nomor WhatsApp tersebut:`,
        tickets: matchedReports.map((r) => ({
          ticket_id: r.ticket_id,
          title: r.title,
          status: r.status,
          status_label: getStatusLabel(r.status),
        })),
      };
    }

    return {
      reply:
        "Kami tidak menemukan laporan yang terhubung dengan nomor WhatsApp tersebut. Coba gunakan nomor yang Anda masukkan saat mengirim laporan (contoh demo: 081234567890).",
      tickets: [],
    };
  }

  // 3. Chip cepat atau pertanyaan umum
  if (lower.includes("cek status") || lower.includes("status tiket")) {
    return {
      reply:
        "Silakan ketik ID tiket laporan Anda (contoh: #ADU-891 atau #ADU-204). Saya akan menampilkan status dan kabar penanganan terbarunya.",
      tickets: [],
    };
  }

  if (lower.includes("lupa id") || lower.includes("lupa tiket")) {
    return {
      reply:
        "Jika Anda menyertakan nomor WhatsApp saat melapor, ketikkan nomor WhatsApp Anda di sini (contoh: 081234567890) untuk mencari hingga 3 tiket laporan terbaru Anda.",
      tickets: [],
    };
  }

  if (lower.includes("cara melapor") || lower.includes("buat laporan")) {
    return {
      reply:
        "Untuk mengirim laporan baru: buka halaman Beranda, isi deskripsi masalah (minimal 20 karakter), pilih titik lokasi kejadian pada peta, dan unggah 1 foto bukti. Sistem AI kami akan otomatis mengelompokkan kategori dan urgensinya.",
      tickets: [],
    };
  }

  // Default fallback dengan contoh tiket aktif
  return {
    reply:
      "Halo! Saya asisten AI KawalWarga. Anda dapat mengetikkan ID tiket (seperti #ADU-891) untuk mengecek progres laporan, mengirim nomor WhatsApp jika lupa ID tiket, atau menanyakan cara melapor.",
    tickets: [],
  };
}
