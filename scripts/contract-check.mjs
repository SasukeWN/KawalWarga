#!/usr/bin/env node
/**
 * KawalWarga — Automated API Contract Verification Script (Step I3)
 *
 * Verifies ALL P1 & P2 endpoints against docs/API-Contract.md (v1.1) and frontend/src/lib/types.ts:
 * - HTTP status codes (200/201 success + 401, 403, 404, 409, 422 error cases)
 * - JSON envelope:
 *   - Success: { success: true, message: string, data: ..., meta?: { current_page, last_page, per_page, total } }
 *   - Error:   { success: false, message: string, errors?: Record<string, string[]> }
 * - Required fields, types, nullable constraints, enums, ^ADU-\d{3,}$, ISO 8601 +07:00
 * - Public endpoint privacy (no reporter_phone, reporter, or ai object leaked)
 * - Uses newly created test reports for mutations so the 204 demo tickets stay untouched.
 *
 * Usage:
 *   BASE_URL=http://localhost:8000/api/v1 node scripts/contract-check.mjs
 */

const BASE_URL = (process.env.BASE_URL || process.argv[2] || "http://localhost:8000/api/v1").replace(/\/+$/, "");

const VALID_STATUSES = new Set([
  "menunggu_verifikasi",
  "menunggu_penanganan",
  "diproses",
  "selesai",
  "ditolak",
]);
const VALID_CATEGORIES = new Set(["jalan_rusak", "sampah", "lampu_mati"]);
const VALID_URGENCIES = new Set(["rendah", "sedang", "tinggi", "darurat"]);
const VALID_EVENTS = new Set([
  "submitted",
  "verified",
  "rejected",
  "taken",
  "progress",
  "completed",
]);
const VALID_AI_STATUSES = new Set(["pending", "done", "failed"]);
const TICKET_REGEX = /^ADU-\d{3,}$/;
const ISO_OFFSET_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?\+07:00$/;
const DATE_YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Minimal valid 1x1 PNG buffer for multipart uploads
const TINY_PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

const results = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertString(val, name, { nullable = false, allowEmpty = false } = {}) {
  if (val === null && nullable) return;
  assert(typeof val === "string", `${name} harus string, dapat: ${typeof val} (${JSON.stringify(val)})`);
  if (!allowEmpty) {
    assert(val.trim().length > 0, `${name} tidak boleh string kosong`);
  }
}

function assertNumber(val, name, { nullable = false } = {}) {
  if (val === null && nullable) return;
  assert(typeof val === "number" && !Number.isNaN(val), `${name} harus number, dapat: ${typeof val}`);
}

function assertTicketId(val, name = "ticket_id") {
  assertString(val, name);
  assert(TICKET_REGEX.test(val), `${name} "${val}" tidak cocok pola ^ADU-\\d{3,}$`);
}

function assertIsoPlus07(val, name = "timestamp", { nullable = false } = {}) {
  if (val === null && nullable) return;
  assertString(val, name);
  assert(ISO_OFFSET_REGEX.test(val), `${name} "${val}" bukan ISO 8601 dengan offset +07:00`);
}

function assertDateYmd(val, name = "date") {
  assertString(val, name);
  assert(DATE_YMD_REGEX.test(val), `${name} "${val}" bukan YYYY-MM-DD`);
}

function assertEnum(val, allowedSet, name, { nullable = false } = {}) {
  if (val === null && nullable) return;
  assert(allowedSet.has(val), `${name} "${val}" tidak termasuk enum valid [${[...allowedSet].join(", ")}]`);
}

function assertSuccessEnvelope(body) {
  assert(body && typeof body === "object", "Response body harus berupa JSON object");
  assert(body.success === true, `envelope.success diharapkan true, dapat ${body.success}`);
  assertString(body.message, "envelope.message");
  assert("data" in body, "envelope.data wajib ada pada response sukses");
}

function assertErrorEnvelope(body, { expectValidationErrors = false } = {}) {
  assert(body && typeof body === "object", "Response body harus berupa JSON object");
  assert(body.success === false, `envelope.success diharapkan false, dapat ${body.success}`);
  assertString(body.message, "envelope.message");
  if (expectValidationErrors) {
    assert(body.errors && typeof body.errors === "object", "envelope.errors wajib ada pada HTTP 422");
  }
}

function assertMeta(meta) {
  assert(meta && typeof meta === "object", "envelope.meta wajib ada untuk list berpaginasi");
  assertNumber(meta.current_page, "meta.current_page");
  assertNumber(meta.per_page, "meta.per_page");
  assertNumber(meta.total, "meta.total");
  assertNumber(meta.last_page, "meta.last_page");
}

function assertActor(actor, name = "actor") {
  assert(actor && typeof actor === "object", `${name} harus object`);
  assertString(actor.name, `${name}.name`);
  assertString(actor.position, `${name}.position`);
}

function assertLocation(loc, name = "location") {
  assert(loc && typeof loc === "object", `${name} harus object`);
  assertNumber(loc.latitude, `${name}.latitude`);
  assertNumber(loc.longitude, `${name}.longitude`);
  assertString(loc.address_text, `${name}.address_text`, { nullable: true });
}

function assertTimeline(timeline, name = "timeline") {
  assert(Array.isArray(timeline) && timeline.length >= 1, `${name} harus array minimal 1 item`);
  for (const [idx, item] of timeline.entries()) {
    assertEnum(item.event, VALID_EVENTS, `${name}[${idx}].event`);
    assertString(item.title, `${name}[${idx}].title`);
    assertString(item.description, `${name}[${idx}].description`);
    assertIsoPlus07(item.at, `${name}[${idx}].at`);
  }
}

function assertAiObject(ai, name = "ai") {
  assert(ai && typeof ai === "object", `${name} harus object`);
  assertEnum(ai.status, VALID_AI_STATUSES, `${name}.status`);
  assertString(ai.summary, `${name}.summary`, { nullable: true });
  assertEnum(ai.category, VALID_CATEGORIES, `${name}.category`, { nullable: true });
  assertEnum(ai.urgency, VALID_URGENCIES, `${name}.urgency`, { nullable: true });
  assert(Array.isArray(ai.duplicates), `${name}.duplicates harus array`);
  for (const [idx, dup] of ai.duplicates.entries()) {
    assertTicketId(dup.ticket_id, `${name}.duplicates[${idx}].ticket_id`);
    assertString(dup.title, `${name}.duplicates[${idx}].title`);
    assertNumber(dup.distance_m, `${name}.duplicates[${idx}].distance_m`);
  }
}

function assertVerification(ver, name = "verification", { nullable = false } = {}) {
  if (ver === null && nullable) return;
  assert(ver && typeof ver === "object", `${name} harus object`);
  assertEnum(ver.category, VALID_CATEGORIES, `${name}.category`);
  assertEnum(ver.urgency, VALID_URGENCIES, `${name}.urgency`);
  assertString(ver.note, `${name}.note`, { nullable: true });
  assertActor(ver.verified_by, `${name}.verified_by`);
  assertIsoPlus07(ver.verified_at, `${name}.verified_at`);
}

function assertRejection(rej, name = "rejection", { nullable = false } = {}) {
  if (rej === null && nullable) return;
  assert(rej && typeof rej === "object", `${name} harus object`);
  assertString(rej.reason, `${name}.reason`);
  assertActor(rej.decided_by, `${name}.decided_by`);
  assertIsoPlus07(rej.at, `${name}.at`);
}

function assertHandler(handler, name = "handler", { nullable = false } = {}) {
  if (handler === null && nullable) return;
  assertActor(handler, name);
  assertIsoPlus07(handler.taken_at, `${name}.taken_at`);
}

function assertCompletion(comp, name = "completion", { nullable = false } = {}) {
  if (comp === null && nullable) return;
  assert(comp && typeof comp === "object", `${name} harus object`);
  assertString(comp.notes, `${name}.notes`);
  assertString(comp.photo_url, `${name}.photo_url`);
  assertActor(comp.completed_by, `${name}.completed_by`);
  assertIsoPlus07(comp.completed_at, `${name}.completed_at`);
}

function assertNoPrivateLeak(obj, contextName) {
  const raw = JSON.stringify(obj);
  assert(!("reporter_phone" in obj), `${contextName} membocorkan field reporter_phone`);
  assert(!("reporter" in obj), `${contextName} membocorkan objek reporter`);
  assert(!("ai" in obj), `${contextName} membocorkan objek ai`);
  assert(!raw.includes('"reporter_phone"'), `${contextName} JSON memuat reporter_phone`);
}

async function apiFetch(path, { method = "GET", token = null, json = null, formData = null } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== null) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (formData !== null) {
    body = formData;
  }

  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Response dari ${method} ${path} (HTTP ${res.status}) bukan JSON valid: ${text.slice(0, 180)}`);
  }
  return { status: res.status, body: parsed };
}

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, passed: true, detail: detail || "OK" });
    console.log(`PASS | ${name} — ${detail || "OK"}`);
  } catch (err) {
    results.push({ name, passed: false, detail: err.message });
    console.error(`FAIL | ${name} — ${err.message}`);
  }
}

async function main() {
  console.log(`======================================================================`);
  console.log(`KawalWarga API Contract Check (docs/API-Contract.md v1.1)`);
  console.log(`BASE_URL: ${BASE_URL}`);
  console.log(`======================================================================\n`);

  let adminToken = null;
  let officerToken = null;
  let samplePendingTicket = "ADU-204";
  let newTicketApproveFlow = null;
  let newTicketRejectFlow = null;

  // 1. GET /health
  await check("GET /health (200)", async () => {
    const { status, body } = await apiFetch("/health");
    assert(status === 200, `HTTP ${status} != 200`);
    assertSuccessEnvelope(body);
    assert(body.data.app === "ok", `data.app = ${body.data.app}`);
    assert(body.data.db === "ok", `data.db = ${body.data.db}`);
    assertIsoPlus07(body.data.time, "data.time");
    return `app=${body.data.app}, db=${body.data.db}, time=${body.data.time}`;
  });

  // 2. POST /auth/login — 401 Invalid credentials
  await check("POST /auth/login kredensial salah (401)", async () => {
    const { status, body } = await apiFetch("/auth/login", {
      method: "POST",
      json: { email: "admin@kawalwarga.test", password: "salah_password" },
    });
    assert(status === 401, `HTTP ${status} != 401`);
    assertErrorEnvelope(body);
    return `HTTP 401 (${body.message})`;
  });

  // 3. POST /auth/login — Admin (200)
  await check("POST /auth/login sebagai Admin (200)", async () => {
    const { status, body } = await apiFetch("/auth/login", {
      method: "POST",
      json: { email: "admin@kawalwarga.test", password: "password123" },
    });
    assert(status === 200, `HTTP ${status} != 200`);
    assertSuccessEnvelope(body);
    assertString(body.data.token, "data.token");
    assert(body.data.token_type === "Bearer", `token_type harus Bearer, dapat ${body.data.token_type}`);
    assertNumber(body.data.user.id, "user.id");
    assertString(body.data.user.name, "user.name");
    assertString(body.data.user.email, "user.email");
    assert(body.data.user.role === "admin", `user.role harus admin, dapat ${body.data.user.role}`);
    assertString(body.data.user.position, "user.position");
    adminToken = body.data.token;
    return `user=${body.data.user.email}, role=${body.data.user.role}, position=${body.data.user.position}`;
  });

  // 4. POST /auth/login — Petugas (200)
  await check("POST /auth/login sebagai Petugas (200)", async () => {
    const { status, body } = await apiFetch("/auth/login", {
      method: "POST",
      json: { email: "budi@kawalwarga.test", password: "password123" },
    });
    assert(status === 200, `HTTP ${status} != 200`);
    assertSuccessEnvelope(body);
    assertString(body.data.token, "data.token");
    assert(body.data.token_type === "Bearer", "token_type harus Bearer");
    assert(body.data.user.role === "petugas", `user.role harus petugas, dapat ${body.data.user.role}`);
    assertString(body.data.user.position, "user.position");
    officerToken = body.data.token;
    return `user=${body.data.user.email}, role=${body.data.user.role}, position=${body.data.user.position}`;
  });

  // 5. GET /auth/me — 401 without token & 200 with token
  await check("GET /auth/me tanpa token (401) & dengan token (200)", async () => {
    const unauth = await apiFetch("/auth/me");
    assert(unauth.status === 401, `Tanpa token diharapkan 401, dapat ${unauth.status}`);
    assertErrorEnvelope(unauth.body);

    const auth = await apiFetch("/auth/me", { token: adminToken });
    assert(auth.status === 200, `Dengan token diharapkan 200, dapat ${auth.status}`);
    assertSuccessEnvelope(auth.body);
    assertNumber(auth.body.data.id, "data.id");
    assertString(auth.body.data.name, "data.name");
    assertString(auth.body.data.email, "data.email");
    assert(auth.body.data.role === "admin", "data.role harus admin");
    assertString(auth.body.data.position, "data.position");
    return `401 unauth & 200 auth (${auth.body.data.name})`;
  });

  // 6. Role Guard (403) — Petugas ke /admin/* & Admin ke /officer/*
  await check("Role Guard 403 (Petugas -> /admin/reports & Admin -> /officer/queue)", async () => {
    const officerToAdmin = await apiFetch("/admin/reports", { token: officerToken });
    assert(officerToAdmin.status === 403, `Petugas ke /admin/reports harus 403, dapat ${officerToAdmin.status}`);
    assertErrorEnvelope(officerToAdmin.body);

    const adminToOfficer = await apiFetch("/officer/queue", { token: adminToken });
    assert(adminToOfficer.status === 403, `Admin ke /officer/queue harus 403, dapat ${adminToOfficer.status}`);
    assertErrorEnvelope(adminToOfficer.body);
    return "403 Forbidden terverifikasi dua arah";
  });

  // 7. GET /admin/reports (200 + meta + item schema sesuai Kontrak 7.1)
  await check("GET /admin/reports daftar & filter (200)", async () => {
    const { status, body } = await apiFetch("/admin/reports?per_page=10", { token: adminToken });
    assert(status === 200, `HTTP ${status} != 200`);
    assertSuccessEnvelope(body);
    assertMeta(body.meta);
    assert(Array.isArray(body.data) && body.data.length > 0, "data harus array tidak kosong");

    for (const [idx, item] of body.data.entries()) {
      assertTicketId(item.ticket_id, `data[${idx}].ticket_id`);
      assertString(item.title, `data[${idx}].title`);
      assertEnum(item.status, VALID_STATUSES, `data[${idx}].status`);
      assertString(item.status_label, `data[${idx}].status_label`);
      assertEnum(item.category, VALID_CATEGORIES, `data[${idx}].category`, { nullable: true });
      assertString(item.category_label, `data[${idx}].category_label`, { nullable: true });
      assertEnum(item.urgency, VALID_URGENCIES, `data[${idx}].urgency`, { nullable: true });
      assertString(item.urgency_label, `data[${idx}].urgency_label`, { nullable: true });
      assertString(item.address_text, `data[${idx}].address_text`, { nullable: true });
      assertIsoPlus07(item.created_at, `data[${idx}].created_at`);
    }

    const pendingItem = body.data.find((r) => r.status === "menunggu_verifikasi");
    if (pendingItem) samplePendingTicket = pendingItem.ticket_id;
    return `total=${body.meta.total}, sample=${samplePendingTicket}`;
  });

  // 8. GET /admin/reports/{ticket_id} (200 & 404 sesuai Kontrak 7.2)
  await check("GET /admin/reports/{ticket_id} detail ADU-204 (200) & tidak ada (404)", async () => {
    const { status, body } = await apiFetch(`/admin/reports/${samplePendingTicket}`, { token: adminToken });
    assert(status === 200, `HTTP ${status} != 200`);
    assertSuccessEnvelope(body);
    const d = body.data;
    assertTicketId(d.ticket_id);
    assertString(d.title, "title");
    assertString(d.description, "description");
    assertEnum(d.status, VALID_STATUSES, "status");
    assertString(d.status_label, "status_label");
    assertEnum(d.category, VALID_CATEGORIES, "category", { nullable: true });
    assertString(d.category_label, "category_label", { nullable: true });
    assertEnum(d.urgency, VALID_URGENCIES, "urgency", { nullable: true });
    assertString(d.urgency_label, "urgency_label", { nullable: true });
    assertString(d.photo_url, "photo_url");
    assertLocation(d.location);
    assert(d.reporter && typeof d.reporter === "object", "reporter wajib ada di detail admin");
    assertString(d.reporter.phone, "reporter.phone", { nullable: true });
    assertIsoPlus07(d.received_at, "received_at");
    assertAiObject(d.ai, "ai");
    assertVerification(d.verification, "verification", { nullable: true });
    assertRejection(d.rejection, "rejection", { nullable: true });
    assertHandler(d.handler, "handler", { nullable: true });
    assertCompletion(d.completion, "completion", { nullable: true });
    assertTimeline(d.timeline);

    const notFound = await apiFetch("/admin/reports/ADU-99999", { token: adminToken });
    assert(notFound.status === 404, `Tiket tidak ada harus 404, dapat ${notFound.status}`);
    assertErrorEnvelope(notFound.body);
    return `ticket=${d.ticket_id}, ai.status=${d.ai.status}, duplicates=${d.ai.duplicates.length}`;
  });

  // 9. GET /reports/track/{ticket_id} (Publik — semua variasi status, normalisasi, privasi, 404 sesuai Kontrak 5.2)
  await check("GET /reports/track/{ticket_id} publik (ADU-204, ADU-200, ADU-176, ADU-183, 404, privasi)", async () => {
    // 9a. Menunggu verifikasi + normalisasi #adu-204
    const pendingRes = await apiFetch(`/reports/track/${encodeURIComponent("#adu-204")}`);
    assert(pendingRes.status === 200, `Track #adu-204 harus 200, dapat ${pendingRes.status}`);
    assertSuccessEnvelope(pendingRes.body);
    const p = pendingRes.body.data;
    assert(p.ticket_id === "ADU-204", `Normalisasi #adu-204 harus ADU-204, dapat ${p.ticket_id}`);
    assert(p.status === "menunggu_verifikasi", `ADU-204 status harus menunggu_verifikasi, dapat ${p.status}`);
    assert(p.category === null && p.category_label === null, "category & category_label harus null saat menunggu_verifikasi");
    assertNoPrivateLeak(p, "GET /reports/track/ADU-204");
    assertLocation(p.location);
    assertIsoPlus07(p.received_at, "received_at");
    assertTimeline(p.timeline);

    // 9b. Diproses dengan latest_update (ADU-200)
    const progressRes = await apiFetch("/reports/track/ADU-200");
    assert(progressRes.status === 200, `Track ADU-200 harus 200, dapat ${progressRes.status}`);
    const pr = progressRes.body.data;
    assert(pr.status === "diproses", `ADU-200 status harus diproses, dapat ${pr.status}`);
    assert(pr.latest_update && typeof pr.latest_update === "object", "ADU-200 latest_update wajib ada");
    assertString(pr.latest_update.note, "ADU-200 latest_update.note");
    assertActor(pr.latest_update.actor, "ADU-200 latest_update.actor");
    assertIsoPlus07(pr.latest_update.at, "ADU-200 latest_update.at");
    assertNoPrivateLeak(pr, "GET /reports/track/ADU-200");

    // 9c. Selesai dengan completion (ADU-176)
    const doneRes = await apiFetch("/reports/track/ADU-176");
    assert(doneRes.status === 200, `Track ADU-176 harus 200, dapat ${doneRes.status}`);
    const dn = doneRes.body.data;
    assert(dn.status === "selesai", `ADU-176 status harus selesai, dapat ${dn.status}`);
    assertCompletion(dn.completion, "ADU-176 completion");
    assertNoPrivateLeak(dn, "GET /reports/track/ADU-176");

    // 9d. Ditolak dengan rejection (ADU-183)
    const rejRes = await apiFetch("/reports/track/ADU-183");
    assert(rejRes.status === 200, `Track ADU-183 harus 200, dapat ${rejRes.status}`);
    const rj = rejRes.body.data;
    assert(rj.status === "ditolak", `ADU-183 status harus ditolak, dapat ${rj.status}`);
    assertRejection(rj.rejection, "ADU-183 rejection");
    assertNoPrivateLeak(rj, "GET /reports/track/ADU-183");

    // 9e. 404 Not Found
    const nfRes = await apiFetch("/reports/track/ADU-99999");
    assert(nfRes.status === 404, `Track ADU-99999 harus 404, dapat ${nfRes.status}`);
    assertErrorEnvelope(nfRes.body);

    return "ADU-204 (pending), ADU-200 (progress), ADU-176 (selesai), ADU-183 (ditolak), 404 & privasi OK";
  });

  // 10. POST /reports — Validasi gagal (422)
  await check("POST /reports validasi gagal (422)", async () => {
    const fd = new FormData();
    fd.append("description", "pendek");
    const { status, body } = await apiFetch("/reports", { method: "POST", formData: fd });
    assert(status === 422, `HTTP ${status} != 422`);
    assertErrorEnvelope(body, { expectValidationErrors: true });
    assert(Array.isArray(body.errors.photo), "errors.photo wajib ada");
    assert(Array.isArray(body.errors.description), "errors.description wajib ada");
    return `fields: ${Object.keys(body.errors).join(", ")}`;
  });

  // 11. POST /reports — Buat 2 laporan uji baru (201) agar data demo tidak rusak
  await check("POST /reports buat laporan uji baru (201)", async () => {
    const buildReportForm = (descSuffix) => {
      const fd = new FormData();
      fd.append("photo", new Blob([TINY_PNG_BYTES], { type: "image/png" }), "test-jalan.png");
      fd.append(
        "description",
        `Laporan uji contract check (${descSuffix}): jalan berlubang cukup dalam di depan balai warga dan membahayakan pengendara motor.`
      );
      fd.append("latitude", "-6.2015");
      fd.append("longitude", "106.8166");
      fd.append("address_text", "Jl. Uji Kontrak Integrasi No. 10, Jakarta Pusat");
      fd.append("reporter_phone", "081234567890");
      return fd;
    };

    const res1 = await apiFetch("/reports", { method: "POST", formData: buildReportForm("alur-approve") });
    assert(res1.status === 201, `Laporan #1 HTTP ${res1.status} != 201`);
    assertSuccessEnvelope(res1.body);
    assertTicketId(res1.body.data.ticket_id);
    assert(res1.body.data.status === "menunggu_verifikasi", "status awal harus menunggu_verifikasi");
    assertString(res1.body.data.status_label, "status_label");
    assertIsoPlus07(res1.body.data.created_at, "created_at");
    newTicketApproveFlow = res1.body.data.ticket_id;

    const res2 = await apiFetch("/reports", { method: "POST", formData: buildReportForm("alur-reject") });
    assert(res2.status === 201, `Laporan #2 HTTP ${res2.status} != 201`);
    assertSuccessEnvelope(res2.body);
    assertTicketId(res2.body.data.ticket_id);
    newTicketRejectFlow = res2.body.data.ticket_id;

    return `created ${newTicketApproveFlow} & ${newTicketRejectFlow}`;
  });

  // 12. POST /admin/reports/{ticket_id}/reanalyze [P2] (200 sesuai Kontrak 7.5)
  await check("POST /admin/reports/{ticket_id}/reanalyze [P2] (200)", async () => {
    const { status, body } = await apiFetch(`/admin/reports/${newTicketApproveFlow}/reanalyze`, {
      method: "POST",
      token: adminToken,
    });
    assert(status === 200, `HTTP ${status} != 200`);
    assertSuccessEnvelope(body);
    assertAiObject(body.data, "data (ai object)");
    return `ticket=${newTicketApproveFlow}, ai.status=${body.data.status}`;
  });

  // 13. POST /admin/reports/{ticket_id}/approve (200 + 409 jika diulang sesuai Kontrak 7.3)
  await check("POST /admin/reports/{ticket_id}/approve (200 & 409 transisi tidak valid)", async () => {
    const { status, body } = await apiFetch(`/admin/reports/${newTicketApproveFlow}/approve`, {
      method: "POST",
      token: adminToken,
      json: {
        category: "jalan_rusak",
        urgency: "tinggi",
        note: "Disetujui oleh skrip contract-check untuk penanganan segera.",
      },
    });
    assert(status === 200, `HTTP ${status} != 200`);
    assertSuccessEnvelope(body);
    assert(body.data.ticket_id === newTicketApproveFlow, "ticket_id cocok");
    assert(body.data.status === "menunggu_penanganan", `status harus menunggu_penanganan, dapat ${body.data.status}`);
    assertString(body.data.status_label, "status_label");
    assert(body.data.category === "jalan_rusak", "category harus jalan_rusak");
    assertString(body.data.category_label, "category_label");
    assert(body.data.urgency === "tinggi", "urgency harus tinggi");
    assertString(body.data.urgency_label, "urgency_label");
    assertVerification(body.data.verification, "verification");

    // 409 Conflict bila di-approve lagi
    const conflict = await apiFetch(`/admin/reports/${newTicketApproveFlow}/approve`, {
      method: "POST",
      token: adminToken,
      json: { category: "jalan_rusak", urgency: "tinggi" },
    });
    assert(conflict.status === 409, `Approve ulang harus 409, dapat ${conflict.status}`);
    assertErrorEnvelope(conflict.body);
    return `${newTicketApproveFlow} -> menunggu_penanganan (+ 409 terverifikasi)`;
  });

  // 14. POST /admin/reports/{ticket_id}/reject (422 tanpa alasan + 200 sukses sesuai Kontrak 7.4)
  await check("POST /admin/reports/{ticket_id}/reject (422 validasi & 200 sukses)", async () => {
    const bad = await apiFetch(`/admin/reports/${newTicketRejectFlow}/reject`, {
      method: "POST",
      token: adminToken,
      json: { reason: "" },
    });
    assert(bad.status === 422, `Reject tanpa alasan harus 422, dapat ${bad.status}`);
    assertErrorEnvelope(bad.body, { expectValidationErrors: true });

    const { status, body } = await apiFetch(`/admin/reports/${newTicketRejectFlow}/reject`, {
      method: "POST",
      token: adminToken,
      json: { reason: "Foto buram dan bukan fasilitas umum dalam pengujian kontrak." },
    });
    assert(status === 200, `HTTP ${status} != 200`);
    assertSuccessEnvelope(body);
    assert(body.data.ticket_id === newTicketRejectFlow, "ticket_id cocok");
    assert(body.data.status === "ditolak", `status harus ditolak, dapat ${body.data.status}`);
    assertString(body.data.status_label, "status_label");
    assertRejection(body.data.rejection, "rejection");
    return `${newTicketRejectFlow} -> ditolak`;
  });

  // 15. GET /officer/queue (200 + meta + schema sesuai Kontrak 8.1)
  await check("GET /officer/queue daftar tugas tersedia (200)", async () => {
    const { status, body } = await apiFetch("/officer/queue?per_page=10", { token: officerToken });
    assert(status === 200, `HTTP ${status} != 200`);
    assertSuccessEnvelope(body);
    assertMeta(body.meta);
    assert(Array.isArray(body.data) && body.data.length > 0, "data antrian petugas harus tidak kosong");

    for (const [idx, item] of body.data.entries()) {
      assertTicketId(item.ticket_id, `queue[${idx}].ticket_id`);
      assertString(item.title, `queue[${idx}].title`);
      assert(item.status === "menunggu_penanganan", `queue[${idx}].status harus menunggu_penanganan`);
      assertString(item.status_label, `queue[${idx}].status_label`);
      assertEnum(item.category, VALID_CATEGORIES, `queue[${idx}].category`);
      assertString(item.category_label, `queue[${idx}].category_label`);
      assertEnum(item.urgency, VALID_URGENCIES, `queue[${idx}].urgency`);
      assertString(item.urgency_label, `queue[${idx}].urgency_label`);
      assertLocation(item.location, `queue[${idx}].location`);
      assertString(item.photo_url, `queue[${idx}].photo_url`);
      assertIsoPlus07(item.verified_at, `queue[${idx}].verified_at`);
      assertNoPrivateLeak(item, `queue[${idx}]`);
    }
    return `total=${body.meta.total}`;
  });

  // 16. GET /officer/reports/{ticket_id} (200 + tanpa ai & reporter sesuai Kontrak 8.3)
  await check("GET /officer/reports/{ticket_id} detail untuk petugas (200)", async () => {
    const { status, body } = await apiFetch(`/officer/reports/${newTicketApproveFlow}`, {
      token: officerToken,
    });
    assert(status === 200, `HTTP ${status} != 200`);
    assertSuccessEnvelope(body);
    const d = body.data;
    assertTicketId(d.ticket_id);
    assertNoPrivateLeak(d, "GET /officer/reports/{ticket_id}");
    assertVerification(d.verification, "verification");
    assertTimeline(d.timeline);
    return `ticket=${d.ticket_id}, verified_by=${d.verification.verified_by.name}`;
  });

  // 17. POST /officer/reports/{ticket_id}/take (200 & 409 jika diambil lagi sesuai Kontrak 8.4)
  await check("POST /officer/reports/{ticket_id}/take (200 & 409 konflik)", async () => {
    const { status, body } = await apiFetch(`/officer/reports/${newTicketApproveFlow}/take`, {
      method: "POST",
      token: officerToken,
    });
    assert(status === 200, `HTTP ${status} != 200`);
    assertSuccessEnvelope(body);
    assert(body.data.ticket_id === newTicketApproveFlow, "ticket_id cocok");
    assert(body.data.status === "diproses", `status harus diproses, dapat ${body.data.status}`);
    assertString(body.data.status_label, "status_label");
    assertHandler(body.data.handler, "handler");

    const conflict = await apiFetch(`/officer/reports/${newTicketApproveFlow}/take`, {
      method: "POST",
      token: officerToken,
    });
    assert(conflict.status === 409, `Take ulang harus 409, dapat ${conflict.status}`);
    assertErrorEnvelope(conflict.body);
    return `${newTicketApproveFlow} -> diproses oleh ${body.data.handler.name}`;
  });

  // 18. GET /officer/my-reports (200 + meta + schema sesuai Kontrak 8.2)
  await check("GET /officer/my-reports daftar tugas saya (200)", async () => {
    const { status, body } = await apiFetch("/officer/my-reports?status=diproses", { token: officerToken });
    assert(status === 200, `HTTP ${status} != 200`);
    assertSuccessEnvelope(body);
    assertMeta(body.meta);
    assert(Array.isArray(body.data) && body.data.length > 0, "data my-reports harus tidak kosong");
    const item = body.data.find((r) => r.ticket_id === newTicketApproveFlow) || body.data[0];
    assertTicketId(item.ticket_id);
    assertIsoPlus07(item.verified_at, "verified_at");
    assertIsoPlus07(item.taken_at, "taken_at");
    assertIsoPlus07(item.completed_at, "completed_at", { nullable: true });
    assertNoPrivateLeak(item, "GET /officer/my-reports");
    return `total=${body.meta.total}, found=${item.ticket_id}`;
  });

  // 19. POST /officer/reports/{ticket_id}/progress [P2] (200 sesuai Kontrak 8.5)
  await check("POST /officer/reports/{ticket_id}/progress [P2] (200)", async () => {
    const { status, body } = await apiFetch(`/officer/reports/${newTicketApproveFlow}/progress`, {
      method: "POST",
      token: officerToken,
      json: { note: "Material aspal dingin sudah tiba di lokasi, pengerjaan dimulai." },
    });
    assert(status === 200, `HTTP ${status} != 200`);
    assertSuccessEnvelope(body);
    assertTimeline(body.data.timeline, "timeline");
    const latestEvent = body.data.timeline[0];
    assert(latestEvent.event === "progress", `timeline[0].event harus progress, dapat ${latestEvent.event}`);
    return `event=${latestEvent.event}, description="${latestEvent.description.slice(0, 35)}..."`;
  });

  // 20. POST /officer/reports/{ticket_id}/complete (422 tanpa foto & 200 dengan bukti foto sesuai Kontrak 8.6)
  await check("POST /officer/reports/{ticket_id}/complete (422 validasi & 200 selesai)", async () => {
    const badFd = new FormData();
    badFd.append("notes", "Selesai tanpa foto bukti penanganan.");
    const bad = await apiFetch(`/officer/reports/${newTicketApproveFlow}/complete`, {
      method: "POST",
      token: officerToken,
      formData: badFd,
    });
    assert(bad.status === 422, `Complete tanpa foto harus 422, dapat ${bad.status}`);
    assertErrorEnvelope(bad.body, { expectValidationErrors: true });

    const fd = new FormData();
    fd.append("photo", new Blob([TINY_PNG_BYTES], { type: "image/png" }), "bukti-selesai.png");
    fd.append("notes", "Lubang jalan sudah ditambal rata dan dipadatkan.");
    const { status, body } = await apiFetch(`/officer/reports/${newTicketApproveFlow}/complete`, {
      method: "POST",
      token: officerToken,
      formData: fd,
    });
    assert(status === 200, `HTTP ${status} != 200`);
    assertSuccessEnvelope(body);
    assert(body.data.ticket_id === newTicketApproveFlow, "ticket_id cocok");
    assert(body.data.status === "selesai", `status harus selesai, dapat ${body.data.status}`);
    assertString(body.data.status_label, "status_label");
    assertCompletion(body.data.completion, "completion");
    return `${newTicketApproveFlow} -> selesai`;
  });

  // 21. GET /admin/dashboard/summary (200 sesuai Kontrak 7.6)
  await check("GET /admin/dashboard/summary (200)", async () => {
    const { status, body } = await apiFetch("/admin/dashboard/summary", { token: adminToken });
    assert(status === 200, `HTTP ${status} != 200`);
    assertSuccessEnvelope(body);
    const d = body.data;
    assertDateYmd(d.period.from, "period.from");
    assertDateYmd(d.period.to, "period.to");
    for (const k of [
      "all",
      "menunggu_verifikasi",
      "menunggu_penanganan",
      "diproses",
      "selesai",
      "ditolak",
    ]) {
      assertNumber(d.totals[k], `totals.${k}`);
    }
    assert(Array.isArray(d.by_category) && d.by_category.length === 3, "by_category harus 3 kategori");
    for (const cat of d.by_category) {
      assertEnum(cat.category, VALID_CATEGORIES, "by_category.category");
      assertString(cat.label, "by_category.label");
      assertNumber(cat.count, "by_category.count");
    }
    return `period=${d.period.from}..${d.period.to}, all=${d.totals.all}`;
  });

  // 22. GET /admin/dashboard/map (200 sesuai Kontrak 7.7)
  await check("GET /admin/dashboard/map (200 & tidak memuat menunggu_verifikasi)", async () => {
    const { status, body } = await apiFetch("/admin/dashboard/map", { token: adminToken });
    assert(status === 200, `HTTP ${status} != 200`);
    assertSuccessEnvelope(body);
    assert(Array.isArray(body.data) && body.data.length > 0, "data pin peta harus array tidak kosong");
    for (const [idx, pin] of body.data.entries()) {
      assertTicketId(pin.ticket_id, `map[${idx}].ticket_id`);
      assertString(pin.title, `map[${idx}].title`);
      assertEnum(pin.status, VALID_STATUSES, `map[${idx}].status`);
      assert(
        pin.status !== "menunggu_verifikasi",
        `map[${idx}] (${pin.ticket_id}) tidak boleh berstatus menunggu_verifikasi`
      );
      assertString(pin.status_label, `map[${idx}].status_label`);
      assertEnum(pin.category, VALID_CATEGORIES, `map[${idx}].category`, { nullable: true });
      assertString(pin.category_label, `map[${idx}].category_label`, { nullable: true });
      assertNumber(pin.latitude, `map[${idx}].latitude`);
      assertNumber(pin.longitude, `map[${idx}].longitude`);
      assertString(pin.photo_url, `map[${idx}].photo_url`);
    }
    return `pins=${body.data.length}`;
  });

  // 23. GET /admin/dashboard/ai-insight [P2] & POST /admin/dashboard/ai-insight/regenerate [P2] (200 sesuai Kontrak 7.8)
  await check("GET & POST /admin/dashboard/ai-insight(/regenerate) [P2] (200)", async () => {
    const getRes = await apiFetch("/admin/dashboard/ai-insight", { token: adminToken });
    assert(getRes.status === 200, `GET ai-insight HTTP ${getRes.status} != 200`);
    assertSuccessEnvelope(getRes.body);
    assert(Array.isArray(getRes.body.data.bullets) && getRes.body.data.bullets.length === 3, "bullets harus 3 butir");
    assertNumber(getRes.body.data.based_on_total, "based_on_total");
    assertDateYmd(getRes.body.data.period.from, "period.from");
    assertDateYmd(getRes.body.data.period.to, "period.to");
    assertIsoPlus07(getRes.body.data.generated_at, "generated_at");

    const postRes = await apiFetch("/admin/dashboard/ai-insight/regenerate", {
      method: "POST",
      token: adminToken,
      json: {},
    });
    assert(postRes.status === 200, `POST regenerate HTTP ${postRes.status} != 200`);
    assertSuccessEnvelope(postRes.body);
    assert(Array.isArray(postRes.body.data.bullets) && postRes.body.data.bullets.length === 3, "bullets harus 3 butir");
    assertIsoPlus07(postRes.body.data.generated_at, "generated_at");
    return `bullets=${postRes.body.data.bullets.length}, based_on_total=${postRes.body.data.based_on_total}`;
  });

  // 24. POST /chatbot [P2] (200 + tanpa bocor data privat sesuai Kontrak 5.3)
  await check("POST /chatbot [P2] tanya status tiket #ADU-204 (200)", async () => {
    const { status, body } = await apiFetch("/chatbot", {
      method: "POST",
      json: {
        message: "Cek status laporan #ADU-204 dong",
        history: [{ role: "user", content: "Halo" }],
      },
    });
    assert(status === 200, `HTTP ${status} != 200`);
    assertSuccessEnvelope(body);
    assertString(body.data.reply, "data.reply");
    assert(Array.isArray(body.data.tickets) && body.data.tickets.length >= 1, "data.tickets harus memuat ADU-204");
    const t = body.data.tickets[0];
    assert(t.ticket_id === "ADU-204", `ticket_id harus ADU-204, dapat ${t.ticket_id}`);
    assertString(t.title, "tickets[0].title");
    assertEnum(t.status, VALID_STATUSES, "tickets[0].status");
    assertString(t.status_label, "tickets[0].status_label");
    assertNoPrivateLeak(t, "POST /chatbot tickets[0]");
    return `reply=${body.data.reply.length} chars, ticket=${t.ticket_id}`;
  });

  // 25. POST /auth/logout (200 sesuai Kontrak 6.2)
  await check("POST /auth/logout (200 & pencabutan token)", async () => {
    const { status, body } = await apiFetch("/auth/logout", {
      method: "POST",
      token: officerToken,
    });
    assert(status === 200, `HTTP ${status} != 200`);
    assertSuccessEnvelope(body);
    assert(body.data === null, "data harus null saat logout");
    return "Token petugas berhasil dicabut";
  });

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  console.log(`\n======================================================================`);
  console.log(`HASIL AKHIR: ${passedCount}/${results.length} PASS, ${failedCount} FAIL`);
  console.log(`======================================================================`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
