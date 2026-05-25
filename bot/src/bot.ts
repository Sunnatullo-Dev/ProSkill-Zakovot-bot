import "dotenv/config";
import { Bot, GrammyError, HttpError, InlineKeyboard, InputFile, Keyboard } from "grammy";
import { createRequire } from "module";

// ─── Config ───────────────────────────────────────────────────────────────────
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN ko'rsatilmagan");

const SUPER_ADMIN_ID = Number(process.env.ADMIN_ID || "0");
const MINI_APP_URL = process.env.MINI_APP_URL || "";
const BACKEND_URL = (process.env.BACKEND_URL || "").replace(/\/$/, "");

// Backendning admin API'siga kirish uchun ALOHIDA server-internal kalit.
// Telegram bot tokeni bilan ARALASHMASIN — bot tokeni Telegram bilan baham
// ko'riladi, BOT_INTERNAL_API_KEY esa faqat bot va backend o'rtasida.
const BOT_INTERNAL_API_KEY = process.env.BOT_INTERNAL_API_KEY || "";
if (!BOT_INTERNAL_API_KEY) {
  console.warn(
    "[bot] BOT_INTERNAL_API_KEY o'rnatilmagan — admin API chaqiruvlari 401 qaytaradi. " +
    "Backend env'iga ham, bot env'iga ham bir xil tasodifiy uzun string qo'ying."
  );
}

if (MINI_APP_URL && !MINI_APP_URL.startsWith("https://"))
  throw new Error(`MINI_APP_URL HTTPS bo'lishi shart: ${MINI_APP_URL}`);

const PDF_TIMEOUT_MS = 20_000;
const BROADCAST_BATCH = 25;
const BROADCAST_DELAY_MS = 1100;

// ─── Multi-admin ──────────────────────────────────────────────────────────────
const adminIds = new Set<number>([SUPER_ADMIN_ID]);

async function refreshAdmins() {
  try {
    const data = await apiGet("/api/admin/admins");
    const ids: number[] = (data.items ?? []).map((a: any) => Number(a.telegramId));
    adminIds.clear();
    adminIds.add(SUPER_ADMIN_ID);
    for (const id of ids) adminIds.add(id);
  } catch (e: any) {
    console.warn("[bot] Admin ro'yxat yuklanmadi:", e?.message);
  }
}

function isAdmin(id: number) { return adminIds.has(id); }
function isSuperAdmin(id: number) { return id === SUPER_ADMIN_ID; }

// ─── Types ────────────────────────────────────────────────────────────────────
interface Question { id: string; text: string; correctAnswer: string; category: string | null; difficulty: string | null; }
interface PdfQuestion { text: string; correctAnswer: string; category?: string; }
interface AppUser { telegramId: number; firstName: string | null; lastName: string | null; username: string | null; displayName: string | null; score: number; }
interface AdminEntry { telegramId: number; firstName: string | null; username: string | null; addedAt: string; note: string; }

type State =
  | { t: "idle" }
  | { t: "add_text" }
  | { t: "add_answer"; text: string }
  | { t: "add_category"; text: string; answer: string }
  | { t: "add_difficulty"; text: string; answer: string; category: string | null }
  | { t: "edit_text"; id: string }
  | { t: "edit_answer"; id: string; newText: string | null }
  | { t: "await_pdf" }
  | { t: "confirm_pdf"; questions: PdfQuestion[] }
  | { t: "broadcast_text" }
  | { t: "broadcast_confirm"; text: string; total: number }
  | { t: "add_admin_id" }
  | { t: "add_admin_note"; telegramId: number };

const states = new Map<number, State>();
const getState = (id: number): State => states.get(id) ?? { t: "idle" };
const setState = (id: number, s: State) => states.set(id, s);
const clearState = (id: number) => states.set(id, { t: "idle" });

// ─── API Client ───────────────────────────────────────────────────────────────
const authHeader = () => ({
  Authorization: `bot ${BOT_INTERNAL_API_KEY}`,
  "Content-Type": "application/json"
});

async function apiGet(path: string): Promise<any> {
  const r = await fetch(`${BACKEND_URL}${path}`, { headers: authHeader() });
  if (!r.ok) { const t = await r.text(); throw new Error(`GET ${path} → ${r.status}: ${t.slice(0, 200)}`); }
  return r.json();
}
async function apiPost(path: string, body: object): Promise<any> {
  const r = await fetch(`${BACKEND_URL}${path}`, { method: "POST", headers: authHeader(), body: JSON.stringify(body) });
  if (!r.ok) { const t = await r.text(); throw new Error(`POST ${path} → ${r.status}: ${t.slice(0, 200)}`); }
  return r.json();
}
async function apiPatch(path: string, body: object): Promise<any> {
  const r = await fetch(`${BACKEND_URL}${path}`, { method: "PATCH", headers: authHeader(), body: JSON.stringify(body) });
  if (!r.ok) { const t = await r.text(); throw new Error(`PATCH ${path} → ${r.status}: ${t.slice(0, 200)}`); }
  return r.json();
}
async function apiDelete(path: string): Promise<any> {
  const r = await fetch(`${BACKEND_URL}${path}`, { method: "DELETE", headers: authHeader() });
  return r.status === 200 ? { ok: true } : r.json();
}

// ─── PDF Parser ───────────────────────────────────────────────────────────────
let pdfParse: ((buf: Buffer) => Promise<{ text: string }>) | null = null;
try {
  const _req = createRequire(import.meta.url);
  pdfParse = _req("pdf-parse/lib/pdf-parse.js");
  console.log("[bot] pdf-parse yuklandi ✓");
} catch (e) {
  console.warn("[bot] pdf-parse yuklanmadi:", e);
}

async function parsePdfBuffer(buf: Buffer): Promise<{ text: string }> {
  const parse = Promise.resolve(pdfParse!(buf));
  const timeout = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error("PDF parse timeout")), PDF_TIMEOUT_MS)
  );
  return Promise.race([parse, timeout]);
}

function parsePdfText(raw: string): PdfQuestion[] {
  const questions: PdfQuestion[] = [];
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const markerRe = /(?:savol|s|question|q)\s*[:.]\s*(.+?)\n+(?:javob|j|answer|a)\s*[:.]\s*(.+?)(?=\n{2,}|\n*(?:savol|s|question|q)\s*[:.])|\s*$/gim;
  let m: RegExpExecArray | null;
  while ((m = markerRe.exec(text))) {
    const q = m[1]?.trim(); const a = m[2]?.trim();
    if (q && a) questions.push({ text: q, correctAnswer: a });
  }
  if (questions.length > 0) return questions;
  const numberedRe = /^\d+[.)]\s+(.+?)\n+(?:javob|j|answer|a)\s*[:.]\s*(.+?)$/gim;
  while ((m = numberedRe.exec(text))) {
    const q = m[1]?.trim(); const a = m[2]?.trim();
    if (q && a) questions.push({ text: q, correctAnswer: a });
  }
  if (questions.length > 0) return questions;
  const paras = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  for (const para of paras) {
    const lines = para.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) questions.push({ text: lines[0], correctAnswer: lines[1] });
  }
  return questions;
}

// ─── Keyboards ────────────────────────────────────────────────────────────────
const ADMIN_KB = new Keyboard()
  .text("📋 Savollar").text("➕ Qo'shish").row()
  .text("📄 PDF yuklash").text("📊 Statistika").row()
  .text("👥 Foydalanuvchilar").text("📢 Reklama").row()
  .text("👨‍💼 Adminlar").text("🏠 Asosiy menyu")
  .resized().persistent();

function listKb(items: Question[], page: number, total: number, limit = 5): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const q of items) {
    const short = q.text.length > 45 ? q.text.slice(0, 42) + "…" : q.text;
    kb.row().text(short, "noop").text("✏️", `qe:${q.id}`).text("🗑️", `qd:${q.id}`);
  }
  const totalPages = Math.ceil(total / limit);
  if (totalPages > 1) {
    kb.row();
    if (page > 1) kb.text("◀️", `ql:${page - 1}`);
    kb.text(`${page}/${totalPages}`, "noop");
    if (page < totalPages) kb.text("▶️", `ql:${page + 1}`);
  }
  return kb;
}

function usersKb(items: AppUser[], page: number, total: number, limit = 10): InlineKeyboard {
  const kb = new InlineKeyboard();
  const totalPages = Math.ceil(total / limit);
  if (totalPages > 1) {
    kb.row();
    if (page > 1) kb.text("◀️", `ul:${page - 1}`);
    kb.text(`${page}/${totalPages}`, "noop");
    if (page < totalPages) kb.text("▶️", `ul:${page + 1}`);
  }
  kb.row().text("📥 CSV export", "uexport");
  return kb;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function diffLabel(d: string | null) {
  return d === "easy" ? "🟢 Oson" : d === "medium" ? "🟡 O'rtacha" : d === "hard" ? "🔴 Qiyin" : "—";
}

const diffKb = (suffix: string) =>
  new InlineKeyboard()
    .text("🟢 Oson", `diff:easy:${suffix}`).text("🟡 O'rtacha", `diff:medium:${suffix}`).row()
    .text("🔴 Qiyin", `diff:hard:${suffix}`).text("⏭ O'tkazish", `diff:null:${suffix}`);

function formatUser(u: AppUser, i: number, offset: number): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.displayName || "—";
  const uname = u.username ? `@${u.username}` : `ID: ${u.telegramId}`;
  return `${offset + i + 1}. *${name}* (${uname})\n   💰 Ball: ${u.score}`;
}

function buildCsv(users: AppUser[]): string {
  const BOM = "﻿";
  const header = "Telegram ID,Ism,Familiya,Username,Ko'rsatma nomi,Ball";
  const rows = users.map(u => [
    u.telegramId,
    `"${(u.firstName || "").replace(/"/g, '""')}"`,
    `"${(u.lastName || "").replace(/"/g, '""')}"`,
    `"${(u.username || "").replace(/"/g, '""')}"`,
    `"${(u.displayName || "").replace(/"/g, '""')}"`,
    u.score,
  ].join(","));
  return BOM + [header, ...rows].join("\n");
}

// ─── Broadcast helper ─────────────────────────────────────────────────────────
async function doBroadcast(
  progressCb: (sent: number, failed: number, total: number) => Promise<void>,
  text: string,
  telegramIds: number[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0;
  for (let i = 0; i < telegramIds.length; i += BROADCAST_BATCH) {
    const batch = telegramIds.slice(i, i + BROADCAST_BATCH);
    await Promise.all(batch.map(async (id) => {
      try {
        await bot.api.sendMessage(id, text, { parse_mode: "Markdown" });
        sent++;
      } catch {
        failed++;
      }
    }));
    if (i + BROADCAST_BATCH < telegramIds.length) {
      await new Promise(r => setTimeout(r, BROADCAST_DELAY_MS));
    }
    if ((i / BROADCAST_BATCH + 1) % 10 === 0) {
      await progressCb(sent, failed, telegramIds.length).catch(() => {});
    }
  }
  return { sent, failed };
}

// ─── Bot ──────────────────────────────────────────────────────────────────────
const bot = new Bot(token);

// /start
bot.command("start", async ctx => {
  const uid = ctx.from!.id;
  clearState(uid);
  const name = ctx.from?.first_name || "do'st";

  const welcomeText =
    `🎯 *Zakovat O'yiniga Xush Kelibsiz, ${name}!*\n\n` +
    `🧠 Bilimingizni sinab ko'ring, do'stlaringiz bilan raqobatlashing!\n\n` +
    `✨ *Nima kutmoqda:*\n` +
    `  🏆 Savollar va balllar\n` +
    `  ⚔️ Jamoa bellashuvlari\n` +
    `  📊 Reyting va yutuqlar\n\n` +
    `👇 *Pastdagi tugmani bosib o'yinni boshlang!*`;

  const inlineKb = new InlineKeyboard();
  if (MINI_APP_URL) {
    inlineKb.row().webApp("🚀 Zakovat O'yinini Ochish", MINI_APP_URL);
  } else {
    inlineKb.row().text("⚠️ O'yin hozircha mavjud emas", "noop");
  }

  await ctx.reply(welcomeText, { parse_mode: "Markdown", reply_markup: inlineKb });

  if (isAdmin(uid)) {
    await ctx.reply("👨‍💼 Admin sifatida kirgansiz:", { reply_markup: ADMIN_KB });
  }
});

// 🔧 Admin panel
bot.hears("🔧 Admin panel", async ctx => {
  const uid = ctx.from!.id;
  if (!isAdmin(uid)) return;
  clearState(uid);
  await ctx.reply("👨‍💼 Admin panel:", { reply_markup: ADMIN_KB });
});

// 🏠 Asosiy menyu
bot.hears("🏠 Asosiy menyu", async ctx => {
  const uid = ctx.from!.id;
  clearState(uid);
  const kb = new Keyboard();
  if (MINI_APP_URL) kb.webApp("🧠 Zakovat o'yinini ochish", MINI_APP_URL).row();
  if (isAdmin(uid)) kb.text("🔧 Admin panel").row();
  await ctx.reply("Asosiy menyu:", { reply_markup: kb.resized().persistent() });
});

// 📊 Statistika
bot.hears("📊 Statistika", async ctx => {
  if (!isAdmin(ctx.from!.id)) return;
  try {
    const data = await apiGet("/api/admin/stats");
    const cats = (data.categories || []).slice(0, 5)
      .map((c: any) => `  • ${c.category || "Nomsiz"}: ${c.count} ta`).join("\n");
    const today = new Date().toLocaleDateString("uz-UZ");
    await ctx.reply(
      `📊 *Statistika* — ${today}\n\n` +
      `👥 Foydalanuvchilar: *${data.users ?? 0}* ta\n` +
      `❓ Savollar: *${data.questions ?? 0}* ta\n` +
      `🎮 O'yinlar: *${data.games ?? 0}* ta\n` +
      `⚔️ Bellashuvlar: *${data.battles ?? 0}* ta\n` +
      `🏟️ Jamoalar: *${data.teams ?? 0}* ta\n\n` +
      `📂 *Top kategoriyalar:*\n${cats || "  —"}`,
      { parse_mode: "Markdown" }
    );
  } catch (e: any) {
    await ctx.reply(`❌ Statistikani olib bo'lmadi: ${e?.message}`);
  }
});

// 📋 Savollar
bot.hears("📋 Savollar", async ctx => {
  if (!isAdmin(ctx.from!.id)) return;
  clearState(ctx.from!.id);
  await showQuestionsList(ctx, 1);
});

async function showQuestionsList(ctx: any, page: number) {
  const limit = 5;
  try {
    const data = await apiGet(`/api/admin/questions?page=${page}&limit=${limit}`);
    const items: Question[] = data.items || [];
    const total: number = data.total || 0;
    if (total === 0) { await ctx.reply("❌ Savollar yo'q."); return; }
    const text = `📋 *Savollar* (jami: ${total})\n\n` +
      items.map((q, i) => {
        const num = (page - 1) * limit + i + 1;
        const cat = q.category ? ` [${q.category}]` : "";
        const diff = q.difficulty ? ` ${diffLabel(q.difficulty)}` : "";
        return `${num}. ${q.text.slice(0, 60)}${q.text.length > 60 ? "…" : ""}${cat}${diff}`;
      }).join("\n\n");
    await ctx.reply(text, { parse_mode: "Markdown", reply_markup: listKb(items, page, total, limit) });
  } catch (e: any) { await ctx.reply(`❌ Savollarni olib bo'lmadi: ${e?.message}`); }
}

// ➕ Qo'shish
bot.hears("➕ Qo'shish", async ctx => {
  if (!isAdmin(ctx.from!.id)) return;
  setState(ctx.from!.id, { t: "add_text" });
  await ctx.reply("✏️ Savol matnini kiriting:\n\n/cancel — bekor qilish");
});

// 📄 PDF yuklash
bot.hears("📄 PDF yuklash", async ctx => {
  if (!isAdmin(ctx.from!.id)) return;
  if (!pdfParse) {
    await ctx.reply("❌ pdf-parse moduli o'rnatilmagan.");
    return;
  }
  setState(ctx.from!.id, { t: "await_pdf" });
  await ctx.reply(
    "📄 PDF faylni yuboring.\n\nFormat:\n" +
    "  • `Savol: ...\\nJavob: ...`\n" +
    "  • Raqamlangan ro'yxat + Javob:\n" +
    "  • Juftliklar bo'sh qator bilan\n\n/cancel — bekor qilish",
    { parse_mode: "Markdown" }
  );
});

// 👥 Foydalanuvchilar
bot.hears("👥 Foydalanuvchilar", async ctx => {
  if (!isAdmin(ctx.from!.id)) return;
  clearState(ctx.from!.id);
  await showUsersList(ctx, 1);
});

async function showUsersList(ctx: any, page: number) {
  const limit = 10;
  try {
    const data = await apiGet(`/api/admin/users?page=${page}&limit=${limit}`);
    const items: AppUser[] = data.items || [];
    const total: number = data.total || 0;
    if (total === 0) { await ctx.reply("👥 Hozircha foydalanuvchilar yo'q."); return; }
    const offset = (page - 1) * limit;
    const text = `👥 *Foydalanuvchilar* (jami: ${total})\n\n` +
      items.map((u, i) => formatUser(u, i, offset)).join("\n\n");
    await ctx.reply(text, { parse_mode: "Markdown", reply_markup: usersKb(items, page, total, limit) });
  } catch (e: any) { await ctx.reply(`❌ Foydalanuvchilarni olib bo'lmadi: ${e?.message}`); }
}

// 📢 Reklama / Broadcast
bot.hears("📢 Reklama", async ctx => {
  if (!isAdmin(ctx.from!.id)) return;
  try {
    const data = await apiGet("/api/admin/users/ids");
    const total: number = data.total || 0;
    setState(ctx.from!.id, { t: "broadcast_text" });
    await ctx.reply(
      `📢 *Reklama yuborish*\n\n` +
      `📬 Qabul qiluvchilar: *${total}* ta foydalanuvchi\n\n` +
      `✍️ Xabar matnini kiriting (Markdown qo'llab-quvvatlanadi):\n\n` +
      `/cancel — bekor qilish`,
      { parse_mode: "Markdown" }
    );
  } catch (e: any) {
    await ctx.reply(`❌ Foydalanuvchi sonini olib bo'lmadi: ${e?.message}`);
  }
});

// 👨‍💼 Adminlar
bot.hears("👨‍💼 Adminlar", async ctx => {
  if (!isAdmin(ctx.from!.id)) return;
  clearState(ctx.from!.id);
  await showAdminsList(ctx);
});

async function showAdminsList(ctx: any) {
  try {
    const data = await apiGet("/api/admin/admins");
    const admins: AdminEntry[] = data.items || [];
    const uid = ctx.from!.id;
    const list = admins.length > 0
      ? admins.map((a, i) => {
          const name = a.firstName || `ID: ${a.telegramId}`;
          const uname = a.username ? ` (@${a.username})` : "";
          const note = a.note ? ` — _${a.note}_` : "";
          const date = a.addedAt.slice(0, 10);
          return `${i + 1}. *${name}*${uname}${note}\n   🆔 ${a.telegramId} | 📅 ${date}`;
        }).join("\n\n")
      : "_(Sub-adminlar yo'q)_";

    const kb = new InlineKeyboard().text("➕ Admin qo'shish", "admin_add");
    if (isSuperAdmin(uid) && admins.length > 0) {
      for (const a of admins) {
        kb.row().text(`🗑️ ${a.firstName || a.telegramId}ni o'chirish`, `admin_del:${a.telegramId}`);
      }
    }

    await ctx.reply(
      `👨‍💼 *Adminlar ro'yxati*\n\n` +
      `👑 Super-admin: ID ${SUPER_ADMIN_ID}\n\n` +
      `${list}`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  } catch (e: any) {
    await ctx.reply(`❌ Adminlarni olib bo'lmadi: ${e?.message}`);
  }
}

// /cancel
bot.command("cancel", async ctx => {
  clearState(ctx.from!.id);
  await ctx.reply("❌ Bekor qilindi.", { reply_markup: ADMIN_KB });
});

// /skip
bot.command("skip", async ctx => {
  await handleSkip(ctx);
});

// ─── Document handler (PDF) ────────────────────────────────────────────────────
bot.on("message:document", async ctx => {
  const uid = ctx.from!.id;
  if (!isAdmin(uid)) return;
  const st = getState(uid);
  if (st.t !== "await_pdf") return;

  const doc = ctx.message.document;
  if (!doc.mime_type?.includes("pdf") && !doc.file_name?.endsWith(".pdf")) {
    await ctx.reply("❌ Faqat PDF fayl yuboring.");
    return;
  }
  if (doc.file_size && doc.file_size > 10 * 1024 * 1024) {
    await ctx.reply("❌ Fayl hajmi 10MB dan kichik bo'lishi kerak.");
    return;
  }

  let msg: any;
  try { msg = await ctx.reply("⏳ PDF tahlil qilinmoqda..."); } catch { return; }

  try {
    if (!pdfParse) throw new Error("pdf-parse moduli yuklanmagan");
    const file = await ctx.getFile();
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const resp = await fetch(fileUrl);
    if (!resp.ok) throw new Error(`Fayl yuklab bo'lmadi: ${resp.status}`);
    const buffer = Buffer.from(await resp.arrayBuffer());
    console.log(`[bot] PDF: ${buffer.length} bytes`);
    const parsed = await parsePdfBuffer(buffer);
    const questions = parsePdfText(parsed.text);
    console.log(`[bot] Topilgan savollar: ${questions.length}`);

    if (questions.length === 0) {
      clearState(uid);
      await ctx.api.editMessageText(ctx.chat.id, msg.message_id,
        "❌ Savollar topilmadi.\n\nFormat: `Savol: ...\\nJavob: ...`",
        { parse_mode: "Markdown" }
      );
      return;
    }

    setState(uid, { t: "confirm_pdf", questions });
    const preview = questions.slice(0, 5)
      .map((q, i) => `${i + 1}. *${q.text.slice(0, 60)}*\n   ✅ ${q.correctAnswer.slice(0, 40)}`)
      .join("\n\n");
    const more = questions.length > 5 ? `\n\n_...va yana ${questions.length - 5} ta_` : "";

    await ctx.api.editMessageText(ctx.chat.id, msg.message_id,
      `📄 *${questions.length} ta savol topildi:*\n\n${preview}${more}\n\nSaqlash?`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().text("✅ Ha, saqlash", "pdf_confirm").text("❌ Bekor", "pdf_cancel"),
      }
    );
  } catch (e: any) {
    console.error("[bot] PDF error:", e?.message ?? e);
    clearState(uid);
    try {
      await ctx.api.editMessageText(ctx.chat.id, msg.message_id, `❌ PDF o'qishda xatolik: ${e?.message ?? "noma'lum xato"}`);
    } catch {
      await ctx.reply("❌ PDF o'qishda xatolik yuz berdi.");
    }
  }
});

// ─── Text message handler (state machine) ─────────────────────────────────────
bot.on("message:text", async ctx => {
  const uid = ctx.from!.id;
  const text = ctx.message.text.trim();
  const st = getState(uid);

  if (text === "/cancel") return;
  if (!isAdmin(uid)) return;

  // ── Add question ──
  if (st.t === "add_text") {
    setState(uid, { t: "add_answer", text });
    await ctx.reply("✅ Matn qabul qilindi.\n\n✏️ To'g'ri javobni kiriting:");
    return;
  }
  if (st.t === "add_answer") {
    setState(uid, { t: "add_category", text: st.text, answer: text });
    await ctx.reply("📂 Kategoriyani kiriting:\n\n/skip — o'tkazib yuborish");
    return;
  }
  if (st.t === "add_category") {
    const category = text.startsWith("/") ? null : text;
    setState(uid, { t: "add_difficulty", text: st.text, answer: st.answer, category });
    await ctx.reply("🎯 Qiyinlikni tanlang:", { reply_markup: diffKb("add") });
    return;
  }

  // ── Edit question ──
  if (st.t === "edit_text") {
    const newText = text.startsWith("/") ? null : text;
    setState(uid, { t: "edit_answer", id: st.id, newText });
    await ctx.reply("✏️ Yangi javobni kiriting:\n\n/skip — o'zgartirmaslik");
    return;
  }
  if (st.t === "edit_answer") {
    const newAnswer = text.startsWith("/") ? null : text;
    try {
      const body: any = {};
      if (st.newText) body.text = st.newText;
      if (newAnswer) body.correctAnswer = newAnswer;
      if (Object.keys(body).length > 0) await apiPatch(`/api/admin/questions/${st.id}`, body);
      clearState(uid);
      await ctx.reply("✅ Savol yangilandi!", { reply_markup: ADMIN_KB });
    } catch (e: any) {
      clearState(uid);
      await ctx.reply(`❌ Yangilab bo'lmadi: ${e?.message}`, { reply_markup: ADMIN_KB });
    }
    return;
  }

  // ── Broadcast ──
  if (st.t === "broadcast_text") {
    try {
      const data = await apiGet("/api/admin/users/ids");
      const total: number = data.total || 0;
      setState(uid, { t: "broadcast_confirm", text, total });
      await ctx.reply(
        `📢 *Xabar ko'rinishi:*\n\n${text}\n\n` +
        `─────────────────\n` +
        `📬 ${total} ta foydalanuvchiga yuboriladi\n\n` +
        `Tasdiqlaysizmi?`,
        {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard()
            .text("✅ Ha, yuborish", "bc_confirm")
            .text("❌ Bekor", "bc_cancel"),
        }
      );
    } catch (e: any) {
      clearState(uid);
      await ctx.reply(`❌ Xatolik: ${e?.message}`, { reply_markup: ADMIN_KB });
    }
    return;
  }

  // ── Add admin ──
  if (st.t === "add_admin_id") {
    const parsed = parseInt(text, 10);
    if (isNaN(parsed) || parsed <= 0) {
      await ctx.reply("❌ Noto'g'ri Telegram ID. Raqam kiriting:");
      return;
    }
    if (parsed === SUPER_ADMIN_ID) {
      await ctx.reply("⚠️ Bu allaqachon super-admin!");
      return;
    }
    setState(uid, { t: "add_admin_note", telegramId: parsed });
    await ctx.reply(
      `✅ Telegram ID: \`${parsed}\`\n\n` +
      `📝 Izoh kiriting (ixtiyoriy):\n/skip — o'tkazib yuborish`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  if (st.t === "add_admin_note") {
    const note = text.startsWith("/") ? "" : text.slice(0, 100);
    try {
      await apiPost("/api/admin/admins", { telegramId: st.telegramId, note });
      await refreshAdmins();
      clearState(uid);
      await ctx.reply(`✅ Admin qo'shildi: ID ${st.telegramId}`, { reply_markup: ADMIN_KB });
    } catch (e: any) {
      clearState(uid);
      await ctx.reply(`❌ Qo'shib bo'lmadi: ${e?.message}`, { reply_markup: ADMIN_KB });
    }
    return;
  }
});

async function handleSkip(ctx: any) {
  const uid = ctx.from!.id;
  const st = getState(uid);
  if (st.t === "add_category") {
    setState(uid, { t: "add_difficulty", text: st.text, answer: st.answer, category: null });
    await ctx.reply("🎯 Qiyinlikni tanlang:", { reply_markup: diffKb("add") });
  } else if (st.t === "edit_text") {
    setState(uid, { t: "edit_answer", id: st.id, newText: null });
    await ctx.reply("✏️ Yangi javobni kiriting:\n\n/skip — o'zgartirmaslik");
  } else if (st.t === "edit_answer") {
    try {
      const s = st as { t: "edit_answer"; id: string; newText: string | null };
      if (s.newText) await apiPatch(`/api/admin/questions/${s.id}`, { text: s.newText });
      clearState(uid);
      await ctx.reply("✅ Savol yangilandi!", { reply_markup: ADMIN_KB });
    } catch (e: any) {
      clearState(uid);
      await ctx.reply(`❌ Yangilab bo'lmadi: ${e?.message}`, { reply_markup: ADMIN_KB });
    }
  } else if (st.t === "add_admin_note") {
    try {
      await apiPost("/api/admin/admins", { telegramId: st.telegramId, note: "" });
      await refreshAdmins();
      clearState(uid);
      await ctx.reply(`✅ Admin qo'shildi: ID ${st.telegramId}`, { reply_markup: ADMIN_KB });
    } catch (e: any) {
      clearState(uid);
      await ctx.reply(`❌ Qo'shib bo'lmadi: ${e?.message}`, { reply_markup: ADMIN_KB });
    }
  }
}

// ─── Callback query handler ────────────────────────────────────────────────────
bot.on("callback_query:data", async ctx => {
  const uid = ctx.from.id;
  if (!isAdmin(uid)) { await ctx.answerCallbackQuery(); return; }
  const data = ctx.callbackQuery.data;

  if (data === "noop") { await ctx.answerCallbackQuery(); return; }

  // Questions pagination
  if (data.startsWith("ql:")) {
    const page = parseInt(data.slice(3), 10);
    await ctx.answerCallbackQuery();
    await showQuestionsList(ctx, page);
    return;
  }

  // Edit question
  if (data.startsWith("qe:")) {
    const id = data.slice(3);
    setState(uid, { t: "edit_text", id });
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "✏️ *Savolni tahrirlash*\n\nYangi savol matnini kiriting:\n\n/skip — o'zgartirmaslik\n/cancel — bekor qilish",
      { parse_mode: "Markdown" }
    );
    return;
  }

  // Delete question (confirm)
  if (data.startsWith("qd:") && !data.startsWith("qdc:")) {
    const id = data.slice(3);
    await ctx.answerCallbackQuery();
    await ctx.reply("⚠️ Bu savolni o'chirishni tasdiqlaysizmi?", {
      reply_markup: new InlineKeyboard().text("✅ Ha, o'chir", `qdc:${id}`).text("❌ Yo'q", "qdcancel"),
    });
    return;
  }

  // Delete question (execute)
  if (data.startsWith("qdc:")) {
    const id = data.slice(4);
    try {
      await apiDelete(`/api/admin/questions/${id}`);
      await ctx.answerCallbackQuery("✅ O'chirildi!");
      await ctx.editMessageText("✅ Savol o'chirildi.");
    } catch (e: any) {
      await ctx.answerCallbackQuery("❌ Xatolik");
      await ctx.editMessageText(`❌ O'chirib bo'lmadi: ${e?.message}`);
    }
    return;
  }

  if (data === "qdcancel") {
    await ctx.answerCallbackQuery("Bekor qilindi");
    await ctx.editMessageText("❌ O'chirish bekor qilindi.");
    return;
  }

  // Difficulty
  if (data.startsWith("diff:")) {
    const [, diff, suffix] = data.split(":");
    const difficulty = diff === "null" ? null : diff;
    const st = getState(uid);
    if (suffix === "add" && st.t === "add_difficulty") {
      try {
        await apiPost("/api/admin/questions", {
          text: st.text, correctAnswer: st.answer, category: st.category || null, difficulty,
        });
        clearState(uid);
        await ctx.answerCallbackQuery("✅ Saqlandi!");
        await ctx.editMessageText("✅ Savol muvaffaqiyatli qo'shildi!");
        await bot.api.sendMessage(uid, "Yana savol qo'shish yoki boshqa amal:", { reply_markup: ADMIN_KB });
      } catch (e: any) {
        clearState(uid);
        await ctx.answerCallbackQuery("❌ Xatolik");
        await ctx.editMessageText(`❌ Saqlashda xatolik: ${e?.message}`);
      }
    } else {
      await ctx.answerCallbackQuery();
    }
    return;
  }

  // PDF confirm/cancel
  if (data === "pdf_confirm") {
    const st = getState(uid);
    if (st.t !== "confirm_pdf") { await ctx.answerCallbackQuery(); return; }
    try {
      const result = await apiPost("/api/admin/questions/bulk", { questions: st.questions });
      clearState(uid);
      await ctx.answerCallbackQuery("✅ Saqlandi!");
      await ctx.editMessageText(`✅ ${result.inserted ?? st.questions.length} ta savol saqlandi!`);
      await bot.api.sendMessage(uid, "Admin panel:", { reply_markup: ADMIN_KB });
    } catch (e: any) {
      clearState(uid);
      await ctx.answerCallbackQuery("❌ Xatolik");
      await ctx.editMessageText(`❌ Saqlashda xatolik: ${e?.message}`);
    }
    return;
  }
  if (data === "pdf_cancel") {
    clearState(uid);
    await ctx.answerCallbackQuery("Bekor qilindi");
    await ctx.editMessageText("❌ PDF yuklash bekor qilindi.");
    await bot.api.sendMessage(uid, "Admin panel:", { reply_markup: ADMIN_KB });
    return;
  }

  // Users pagination
  if (data.startsWith("ul:")) {
    const page = parseInt(data.slice(3), 10);
    await ctx.answerCallbackQuery();
    await showUsersList(ctx, page);
    return;
  }

  // Users export (CSV)
  if (data === "uexport") {
    await ctx.answerCallbackQuery("📥 Export tayyorlanmoqda...");
    try {
      const data2 = await apiGet("/api/admin/users/export");
      const users: AppUser[] = data2.items || [];
      if (users.length === 0) {
        await ctx.reply("❌ Eksport qilish uchun foydalanuvchilar yo'q.");
        return;
      }
      const csv = buildCsv(users);
      const buf = Buffer.from(csv, "utf-8");
      const date = new Date().toISOString().slice(0, 10);
      await ctx.replyWithDocument(
        new InputFile(buf, `zakovat_users_${date}.csv`),
        {
          caption: `📥 Foydalanuvchilar ro'yxati\n📊 Jami: ${users.length} ta\n📅 Sana: ${date}`,
        }
      );
    } catch (e: any) {
      await ctx.reply(`❌ Export xatoligi: ${e?.message}`);
    }
    return;
  }

  // Broadcast confirm/cancel
  if (data === "bc_confirm") {
    const st = getState(uid);
    if (st.t !== "broadcast_confirm") { await ctx.answerCallbackQuery(); return; }
    const broadcastText = st.text;
    clearState(uid);
    await ctx.answerCallbackQuery("📡 Yuborish boshlandi!");
    await ctx.editMessageText("📡 *Xabar yuborilmoqda...*\nIltimos kuting.", { parse_mode: "Markdown" });

    try {
      const idsData = await apiGet("/api/admin/users/ids");
      const ids: number[] = idsData.ids || [];
      if (ids.length === 0) {
        await bot.api.sendMessage(uid, "❌ Foydalanuvchilar topilmadi.", { reply_markup: ADMIN_KB });
        return;
      }

      const statusMsg = await bot.api.sendMessage(uid, `📡 Yuborilmoqda: 0/${ids.length}...`);

      const { sent, failed } = await doBroadcast(
        async (s, f, total) => {
          await bot.api.editMessageText(uid, statusMsg.message_id, `📡 Yuborilmoqda: ${s + f}/${total}... ✅${s} ❌${f}`);
        },
        broadcastText,
        ids
      );

      await bot.api.editMessageText(uid, statusMsg.message_id,
        `✅ *Reklama yuborildi!*\n\n` +
        `📬 Jami: ${ids.length}\n` +
        `✅ Muvaffaqiyatli: ${sent}\n` +
        `❌ Xato: ${failed}`,
        { parse_mode: "Markdown" }
      );
      await bot.api.sendMessage(uid, "Admin panel:", { reply_markup: ADMIN_KB });
    } catch (e: any) {
      await bot.api.sendMessage(uid, `❌ Broadcast xatoligi: ${e?.message}`, { reply_markup: ADMIN_KB });
    }
    return;
  }

  if (data === "bc_cancel") {
    clearState(uid);
    await ctx.answerCallbackQuery("Bekor qilindi");
    await ctx.editMessageText("❌ Reklama bekor qilindi.");
    await bot.api.sendMessage(uid, "Admin panel:", { reply_markup: ADMIN_KB });
    return;
  }

  // Admin management
  if (data === "admin_add") {
    if (!isAdmin(uid)) { await ctx.answerCallbackQuery(); return; }
    setState(uid, { t: "add_admin_id" });
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "👨‍💼 *Admin qo'shish*\n\n" +
      "Yangi adminning Telegram ID raqamini kiriting.\n\n" +
      "💡 _ID olish uchun foydalanuvchi @userinfobot botiga yozsin._\n\n" +
      "/cancel — bekor qilish",
      { parse_mode: "Markdown" }
    );
    return;
  }

  if (data.startsWith("admin_del:")) {
    if (!isSuperAdmin(uid)) {
      await ctx.answerCallbackQuery("❌ Faqat super-admin o'chira oladi");
      return;
    }
    const targetId = parseInt(data.slice(10), 10);
    try {
      await apiDelete(`/api/admin/admins/${targetId}`);
      await refreshAdmins();
      await ctx.answerCallbackQuery("✅ O'chirildi!");
      await ctx.editMessageText(`✅ Admin ID ${targetId} o'chirildi.`);
      await bot.api.sendMessage(uid, "Admin panel:", { reply_markup: ADMIN_KB });
    } catch (e: any) {
      await ctx.answerCallbackQuery("❌ Xatolik");
      await ctx.reply(`❌ O'chirib bo'lmadi: ${e?.message}`);
    }
    return;
  }

  await ctx.answerCallbackQuery();
});

// ─── Error handler & graceful shutdown ────────────────────────────────────────
bot.catch(err => {
  const id = err.ctx?.update?.update_id;
  if (err.error instanceof GrammyError)
    console.error(`[bot] Telegram API xatosi update=${id}`, err.error.description);
  else if (err.error instanceof HttpError)
    console.error(`[bot] Tarmoq xatosi update=${id}`, err.error.message);
  else
    console.error(`[bot] Kutilmagan xato update=${id}`, err.error);
});

const stop = (sig: string) => {
  console.log(`Bot ${sig} signali oldi, to'xtatilmoqda...`);
  void bot.stop().finally(() => process.exit(0));
};
process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));

async function startBot(attemptsLeft = 5): Promise<void> {
  try {
    await bot.start({
      onStart: async info => {
        console.log(`Zakovat bot ishga tushdi: @${info.username}`);
        console.log(`[bot] MINI_APP_URL: ${MINI_APP_URL || "(belgilanmagan)"}`);
        if (!BACKEND_URL) console.warn("⚠️  BACKEND_URL ko'rsatilmagan");
        if (!SUPER_ADMIN_ID) console.warn("⚠️  ADMIN_ID ko'rsatilmagan");
        await refreshAdmins();
        if (MINI_APP_URL) {
          try {
            await bot.api.setChatMenuButton({
              menu_button: { type: "web_app", text: "Zakovat", web_app: { url: MINI_APP_URL } },
            });
            console.log(`[bot] Menu button o'rnatildi: ${MINI_APP_URL}`);
          } catch (e: any) {
            console.warn("[bot] Menu button o'rnatilmadi:", e?.message);
          }
        }
        // Admin ro'yxatini har 5 daqiqada yangilab turish
        setInterval(() => { refreshAdmins().catch(console.warn); }, 5 * 60 * 1000);
      },
    });
  } catch (err: any) {
    const is409 = err instanceof GrammyError && err.error_code === 409;
    if (is409 && attemptsLeft > 0) {
      const wait = 35_000;
      console.log(`[bot] 409 Conflict — ${attemptsLeft} urinish qoldi. ${wait / 1000}s kutilmoqda...`);
      await new Promise(r => setTimeout(r, wait));
      return startBot(attemptsLeft - 1);
    }
    console.error("[bot] Bot ishga tushmadi:", err);
    process.exit(1);
  }
}

void startBot();
