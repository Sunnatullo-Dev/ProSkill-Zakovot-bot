import "dotenv/config";
import { Bot, GrammyError, HttpError, InlineKeyboard, Keyboard } from "grammy";
import { createRequire } from "module";

// ─── Config ───────────────────────────────────────────────────────────────────
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN ko'rsatilmagan");

const ADMIN_ID = Number(process.env.ADMIN_ID || "0");
const MINI_APP_URL = process.env.MINI_APP_URL || "";
const BACKEND_URL = (process.env.BACKEND_URL || "").replace(/\/$/, "");

if (MINI_APP_URL && !MINI_APP_URL.startsWith("https://"))
  throw new Error(`MINI_APP_URL HTTPS bo'lishi shart. Hozirgi: ${MINI_APP_URL}`);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Question { id: string; text: string; correctAnswer: string; category: string | null; difficulty: string | null; }
interface PdfQuestion { text: string; correctAnswer: string; category?: string; }

type State =
  | { t: "idle" }
  | { t: "add_text" }
  | { t: "add_answer"; text: string }
  | { t: "add_category"; text: string; answer: string }
  | { t: "add_difficulty"; text: string; answer: string; category: string | null }
  | { t: "edit_text"; id: string }
  | { t: "edit_answer"; id: string; newText: string | null }
  | { t: "await_pdf" }
  | { t: "confirm_pdf"; questions: PdfQuestion[] };

const states = new Map<number, State>();
const getState = (id: number): State => states.get(id) ?? { t: "idle" };
const setState = (id: number, s: State) => states.set(id, s);
const clearState = (id: number) => states.set(id, { t: "idle" });

// ─── API Client ───────────────────────────────────────────────────────────────
const authHeader = () => ({ Authorization: `bot ${token}`, "Content-Type": "application/json" });

async function apiGet(path: string): Promise<any> {
  const r = await fetch(`${BACKEND_URL}${path}`, { headers: authHeader() });
  return r.json();
}
async function apiPost(path: string, body: object): Promise<any> {
  const r = await fetch(`${BACKEND_URL}${path}`, { method: "POST", headers: authHeader(), body: JSON.stringify(body) });
  return r.json();
}
async function apiPatch(path: string, body: object): Promise<any> {
  const r = await fetch(`${BACKEND_URL}${path}`, { method: "PATCH", headers: authHeader(), body: JSON.stringify(body) });
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
  pdfParse = _req("pdf-parse");
} catch { /* pdf-parse o'rnatilmagan */ }

function parsePdfText(raw: string): PdfQuestion[] {
  const questions: PdfQuestion[] = [];
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Format 1: "Savol: ...\nJavob: ..."  yoki  "S: ...\nJ: ..."  yoki "Q: ...\nA: ..."
  const markerRe = /(?:savol|s|question|q)\s*[:.]\s*(.+?)\n+(?:javob|j|answer|a)\s*[:.]\s*(.+?)(?=\n{2,}|\n*(?:savol|s|question|q)\s*[:.])|\s*$/gim;
  let m: RegExpExecArray | null;
  while ((m = markerRe.exec(text))) {
    const q = m[1]?.trim(); const a = m[2]?.trim();
    if (q && a) questions.push({ text: q, correctAnswer: a });
  }
  if (questions.length > 0) return questions;

  // Format 2: "1. Savol matni\nJavob: to'g'ri"
  const numberedRe = /^\d+[.)]\s+(.+?)\n+(?:javob|j|answer|a)\s*[:.]\s*(.+?)$/gim;
  while ((m = numberedRe.exec(text))) {
    const q = m[1]?.trim(); const a = m[2]?.trim();
    if (q && a) questions.push({ text: q, correctAnswer: a });
  }
  if (questions.length > 0) return questions;

  // Format 3: bo'sh qator bilan ajratilgan juftliklar
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
  .text("🏠 Asosiy menyu")
  .resized().persistent();

const MAIN_KB = (hasAdmin: boolean) => {
  const kb = new Keyboard();
  if (hasAdmin) kb.text("🔧 Admin panel").row();
  return kb.resized().persistent();
};

function listKb(items: Question[], page: number, total: number, limit = 5): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const q of items) {
    const short = q.text.length > 45 ? q.text.slice(0, 42) + "…" : q.text;
    kb.row()
      .text(short, `noop`)
      .text("✏️", `qe:${q.id}`)
      .text("🗑️", `qd:${q.id}`);
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isAdmin(id: number) { return id === ADMIN_ID; }

function diffLabel(d: string | null) {
  return d === "easy" ? "🟢 Oson" : d === "medium" ? "🟡 O'rtacha" : d === "hard" ? "🔴 Qiyin" : "—";
}

const diffKb = (suffix: string) =>
  new InlineKeyboard()
    .text("🟢 Oson", `diff:easy:${suffix}`)
    .text("🟡 O'rtacha", `diff:medium:${suffix}`)
    .row()
    .text("🔴 Qiyin", `diff:hard:${suffix}`)
    .text("⏭ O'tkazish", `diff:null:${suffix}`);

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

  const replyKb = new Keyboard();
  if (isAdmin(uid)) replyKb.text("🔧 Admin panel").row();

  await ctx.reply(welcomeText, {
    parse_mode: "Markdown",
    reply_markup: inlineKb,
  });

  if (isAdmin(uid)) {
    await ctx.reply("👨‍💼 Admin sifatida kirgansiz:", {
      reply_markup: replyKb.resized().persistent(),
    });
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
      .map((c: any) => `  • ${c.category}: ${c.count} ta`).join("\n");
    await ctx.reply(
      `📊 *Statistika*\n\n` +
      `👥 Foydalanuvchilar: ${data.users ?? "?"}\n` +
      `❓ Savollar: ${data.questions ?? "?"}\n` +
      `🎮 O'yinlar: ${data.games ?? "?"}\n` +
      `⚔️ Bellashuvlar: ${data.battles ?? "?"}\n` +
      `\n📂 Top kategoriyalar:\n${cats || "  —"}`,
      { parse_mode: "Markdown" }
    );
  } catch (e) {
    await ctx.reply("❌ Statistikani olib bo'lmadi.");
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
    const kb = listKb(items, page, total, limit);
    await ctx.reply(text, { parse_mode: "Markdown", reply_markup: kb });
  } catch { await ctx.reply("❌ Savollarni olib bo'lmadi."); }
}

// ➕ Qo'shish — start flow
bot.hears("➕ Qo'shish", async ctx => {
  if (!isAdmin(ctx.from!.id)) return;
  setState(ctx.from!.id, { t: "add_text" });
  await ctx.reply("✏️ Savol matnini kiriting:\n\n/cancel — bekor qilish");
});

// 📄 PDF yuklash
bot.hears("📄 PDF yuklash", async ctx => {
  if (!isAdmin(ctx.from!.id)) return;
  if (!pdfParse) {
    await ctx.reply("❌ pdf-parse moduli o'rnatilmagan. Bot admini bilan bog'laning.");
    return;
  }
  setState(ctx.from!.id, { t: "await_pdf" });
  await ctx.reply(
    "📄 PDF faylni yuboring.\n\n" +
    "Fayl quyidagi formatda bo'lishi kerak:\n" +
    "  • `Savol: ...\\nJavob: ...` (yoki S:/J:)\n" +
    "  • Raqamlangan ro'yxat + Javob: ...\n" +
    "  • Har bir savol juftligi bo'sh qator bilan ajratilgan\n\n" +
    "/cancel — bekor qilish"
  );
});

// /cancel
bot.command("cancel", async ctx => {
  clearState(ctx.from!.id);
  await ctx.reply("❌ Bekor qilindi.", { reply_markup: ADMIN_KB });
});

// /skip (category va difficulty uchun)
bot.command("skip", async ctx => {
  await handleSkip(ctx);
});

// ─── PDF document handler ──────────────────────────────────────────────────────
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

  const msg = await ctx.reply("⏳ PDF tahlil qilinmoqda...");
  try {
    const file = await ctx.getFile();
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const resp = await fetch(fileUrl);
    const buffer = Buffer.from(await resp.arrayBuffer());
    const parsed = await pdfParse!(buffer);
    const questions = parsePdfText(parsed.text);

    if (questions.length === 0) {
      setState(uid, { t: "idle" });
      await ctx.reply("❌ Savollar topilmadi. Fayl formatini tekshiring.");
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
        reply_markup: new InlineKeyboard()
          .text("✅ Ha, saqlash", "pdf_confirm")
          .text("❌ Bekor", "pdf_cancel"),
      }
    );
  } catch (e) {
    console.error("PDF parse error:", e);
    clearState(uid);
    await ctx.reply("❌ PDF o'qishda xatolik yuz berdi.");
  }
});

// ─── Text message handler (state machine) ─────────────────────────────────────
bot.on("message:text", async ctx => {
  const uid = ctx.from!.id;
  const text = ctx.message.text.trim();
  const st = getState(uid);

  if (text === "/cancel") return;
  if (!isAdmin(uid)) return;

  // ── Add question flow ──
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

  // ── Edit question flow ──
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
    } catch {
      clearState(uid);
      await ctx.reply("❌ Yangilab bo'lmadi.", { reply_markup: ADMIN_KB });
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
    } catch {
      clearState(uid);
      await ctx.reply("❌ Yangilab bo'lmadi.", { reply_markup: ADMIN_KB });
    }
  }
}

// ─── Callback query handler ────────────────────────────────────────────────────
bot.on("callback_query:data", async ctx => {
  const uid = ctx.from.id;
  if (!isAdmin(uid)) { await ctx.answerCallbackQuery(); return; }
  const data = ctx.callbackQuery.data;

  // noop
  if (data === "noop") { await ctx.answerCallbackQuery(); return; }

  // Savollar sahifasi
  if (data.startsWith("ql:")) {
    const page = parseInt(data.slice(3), 10);
    await ctx.answerCallbackQuery();
    await showQuestionsList(ctx, page);
    return;
  }

  // Tahrirlash
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

  // O'chirish — tasdiq so'rash
  if (data.startsWith("qd:") && !data.startsWith("qdc:")) {
    const id = data.slice(3);
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "⚠️ Bu savolni o'chirishni tasdiqlaysizmi?",
      {
        reply_markup: new InlineKeyboard()
          .text("✅ Ha, o'chir", `qdc:${id}`)
          .text("❌ Yo'q", "qdcancel"),
      }
    );
    return;
  }

  // O'chirishni tasdiqlash
  if (data.startsWith("qdc:")) {
    const id = data.slice(4);
    try {
      await apiDelete(`/api/admin/questions/${id}`);
      await ctx.answerCallbackQuery("✅ O'chirildi!");
      await ctx.editMessageText("✅ Savol o'chirildi.");
    } catch {
      await ctx.answerCallbackQuery("❌ Xatolik");
      await ctx.editMessageText("❌ O'chirib bo'lmadi.");
    }
    return;
  }

  // O'chirishni bekor qilish
  if (data === "qdcancel") {
    await ctx.answerCallbackQuery("Bekor qilindi");
    await ctx.editMessageText("❌ O'chirish bekor qilindi.");
    return;
  }

  // Qiyinlik tanlash
  if (data.startsWith("diff:")) {
    const [, diff, suffix] = data.split(":");
    const difficulty = diff === "null" ? null : diff;
    const st = getState(uid);

    if (suffix === "add" && st.t === "add_difficulty") {
      try {
        await apiPost("/api/admin/questions", {
          text: st.text,
          correctAnswer: st.answer,
          category: st.category || null,
          difficulty,
        });
        clearState(uid);
        await ctx.answerCallbackQuery("✅ Saqlandi!");
        await ctx.editMessageText("✅ Savol muvaffaqiyatli qo'shildi!");
        await bot.api.sendMessage(uid, "Yana savol qo'shish yoki boshqa amal:", { reply_markup: ADMIN_KB });
      } catch {
        clearState(uid);
        await ctx.answerCallbackQuery("❌ Xatolik");
        await ctx.editMessageText("❌ Saqlashda xatolik yuz berdi.");
      }
    } else {
      await ctx.answerCallbackQuery();
    }
    return;
  }

  // PDF tasdiqlash
  if (data === "pdf_confirm") {
    const st = getState(uid);
    if (st.t !== "confirm_pdf") { await ctx.answerCallbackQuery(); return; }
    try {
      const result = await apiPost("/api/admin/questions/bulk", { questions: st.questions });
      clearState(uid);
      await ctx.answerCallbackQuery("✅ Saqlandi!");
      await ctx.editMessageText(`✅ ${result.inserted ?? st.questions.length} ta savol saqlandi!`);
      await bot.api.sendMessage(uid, "Admin panel:", { reply_markup: ADMIN_KB });
    } catch {
      clearState(uid);
      await ctx.answerCallbackQuery("❌ Xatolik");
      await ctx.editMessageText("❌ Saqlashda xatolik yuz berdi.");
    }
    return;
  }

  // PDF bekor qilish
  if (data === "pdf_cancel") {
    clearState(uid);
    await ctx.answerCallbackQuery("Bekor qilindi");
    await ctx.editMessageText("❌ PDF yuklash bekor qilindi.");
    await bot.api.sendMessage(uid, "Admin panel:", { reply_markup: ADMIN_KB });
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

// 409 Conflict: eski long-polling ulanishi tugashini kutib, qayta urinadi
async function startBot(attemptsLeft = 5): Promise<void> {
  try {
    await bot.start({
      onStart: info => {
        console.log(`Zakovat bot ishga tushdi: @${info.username}`);
        if (!BACKEND_URL) console.warn("⚠️  BACKEND_URL ko'rsatilmagan — admin API ishlamaydi");
        if (!ADMIN_ID) console.warn("⚠️  ADMIN_ID ko'rsatilmagan");
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
