/**
 * Interaktiv Zakovat Stoli — Telegram bot tomonlama logika.
 *
 * Admin flow:
 *   🔴 Zakovat Stoli (ADMIN_KB) → xona yaratish → 12 savol yuklash →
 *   jamoani tasdiqlash → boshlash → har raundda ot aylantirish → admin
 *   qo'lda baholaydi (Gemini emas — spec talabi).
 *
 * Ishtirokchi flow:
 *   🔴 Interaktiv Zakovat Stoli (asosiy menyu) → "Xonaga qo'shilish (Kod bilan)"
 *   yoki "O'yinni kuzatish" → kod kiritiladi.
 *
 * Bu modul bot.ts dan import qilinadi va gameroom.ts bilan bir xil dependency
 * bag'ni (GrBotDeps) ishlatadi — struktura bir xil, faqat nomi moslashtirildi.
 *
 * Jonli holat yangilanishi: haqiqiy fon polling o'rniga (bu loyihada bunday
 * infratuzilma yo'q — celery/redis yo'q) push-based yondashuv ishlatiladi:
 * har bir state o'zgarishidan keyin (qo'shilish, tasdiqlash, spin, baholash)
 * admin va kuzatuvchilarning kuzatib turgan xabarlari darhol editMessageText
 * bilan yangilanadi. 60 soniyalik muhokama oynasi Node.js setTimeout bilan
 * boshqariladi; deadline backend tomonida ham tekshiriladi (server-authoritative).
 */

import { InlineKeyboard } from "grammy";
import type { GrBotDeps } from "./gameroom.js";

// GrBotDeps va ZtBotDeps struktura jihatidan bir xil — bot.ts bitta deps
// bag'ni ikkala modulga ham uzatadi.
export type ZtBotDeps = GrBotDeps;

// ─── State turlari ────────────────────────────────────────────────────────────

export type ZtState =
  // Admin: 12 ta savolni ketma-ket yig'ish oqimi
  | { t: "zt_q_text"; roomCode: string; collected: { text: string; answer: string }[] }
  | { t: "zt_q_answer"; roomCode: string; collected: { text: string; answer: string }[]; pendingText: string }
  // Ishtirokchi: xonaga qo'shilish / kuzatish uchun kod kutilmoqda
  | { t: "zt_join_code" }
  | { t: "zt_spectate_code" }
  // Kapitan: yakuniy javob kutilmoqda (matn yoki ovozli xabar)
  | { t: "zt_awaiting_captain_answer"; roomCode: string; adminTelegramId: number };

export type BotState = { t: string; [key: string]: any };

// ─── Konstantalar ─────────────────────────────────────────────────────────────

const QUESTION_COUNT = 12;

// ─── In-memory kuzatuv (bot qayta ishga tushganda yo'qoladi) ────────────────
// Har bir xona uchun kim (admin/kuzatuvchi) qaysi xabarni "jonli" kuzatib
// turibdi — state o'zgarganda shu xabarlar editMessageText bilan yangilanadi.

type ViewKind = "admin" | "spectator";
interface ViewRef {
  chatId: number;
  messageId: number;
  kind: ViewKind;
}

const roomViews = new Map<string, Map<number, ViewRef>>();
const discussionTimers = new Map<string, NodeJS.Timeout>();

function addRoomView(roomCode: string, telegramId: number, ref: ViewRef) {
  const code = roomCode.toUpperCase();
  if (!roomViews.has(code)) roomViews.set(code, new Map());
  roomViews.get(code)!.set(telegramId, ref);
}

function clearDiscussionTimer(roomCode: string) {
  const code = roomCode.toUpperCase();
  const timer = discussionTimers.get(code);
  if (timer) {
    clearTimeout(timer);
    discussionTimers.delete(code);
  }
}

function cleanupRoom(roomCode: string) {
  const code = roomCode.toUpperCase();
  clearDiscussionTimer(code);
  roomViews.delete(code);
}

// ─── Yordamchilar ─────────────────────────────────────────────────────────────

function md(value: unknown): string {
  return String(value ?? "").replace(/([\\_*[\]()`])/g, "\\$1");
}

function requireZtAdmin(ctx: any, deps: ZtBotDeps): boolean {
  const uid = Number(ctx.from?.id ?? 0);
  if (!deps.isAdmin(uid)) {
    void ctx.answerCallbackQuery?.({ text: "Admin huquqi kerak", show_alert: true }).catch(() => {});
    return false;
  }
  return true;
}

function winnerLabel(winner: string | null | undefined): string {
  if (winner === "team") return "O'yinchilar jamoasi!";
  if (winner === "fans") return "Muxlislar!";
  return "Durrang!";
}

// ─── Stol ko'rinishi (Message 2 uslubi) ──────────────────────────────────────

function seatName(players: any[], seat: number): string {
  const p = (players ?? []).find((pl: any) => pl.seat === seat);
  if (!p) return "—";
  const name = String(p.displayName ?? "—").replace(/`/g, "'").slice(0, 14);
  return p.isCaptain ? `${name} (Kapitan)` : name;
}

function renderTableBlock(state: any): string {
  const s = (n: number) => seatName(state.players, n);
  const pad = (v: string) => v.padEnd(22, " ");
  const lines = [
    "==============================",
    `🏆 ZAKOVAT O'YINI | Xona kodi: #${state.displayCode}`,
    "==============================",
    `📊 HISOB: 👥 Jamoa [${state.teamScore}] : [${state.fansScore}] 🧠 Muxlislar`,
    "",
    `        [1] ${s(1)}`,
    `[6] ${pad(s(6))}[2] ${s(2)}`,
    "",
    "   ┌─                        ─┐",
    "   |    🔴 RED STOL            |",
    "   |    🐎 (Ot)                |",
    "   └─                        ─┘",
    "",
    `[5] ${pad(s(5))}[3] ${s(3)}`,
    `        [4] ${s(4)}`,
    "==============================",
  ];
  return "```\n" + lines.join("\n") + "\n```";
}

function statusLine(state: any): string {
  const s = state.status;
  if (s === "waiting") {
    return state.teamFull
      ? `🎲 HOLAT: Jamoa to'liq yig'ildi. Boshlovchi "Jamoani tasdiqlash" tugmasini bosishi kutilmoqda...`
      : `🎲 HOLAT: Jamoa yig'ilmoqda (${state.playerCount}/6)...`;
  }
  if (s === "team_confirmed") {
    return state.questionsTotal >= QUESTION_COUNT
      ? `🎲 HOLAT: Hammasi tayyor! Boshlovchi "O'yinni boshlash" tugmasini bosishi kutilmoqda...`
      : `🎲 HOLAT: Jamoa tasdiqlandi. Boshlovchi ${QUESTION_COUNT} ta savol yuklashi kerak (${state.questionsTotal}/${QUESTION_COUNT}).`;
  }
  if (s === "in_progress") return `🎲 HOLAT: Boshlovchi otni aylantirishini kutmoqda...`;
  if (s === "discussion") {
    const sector = state.currentQuestion?.sector ?? "?";
    const secs = state.discussionSecondsRemaining ?? 0;
    return `🎲 HOLAT: ${sector}-savol o'qildi — jamoa muhokama qilmoqda (~${secs}s qoldi)`;
  }
  if (s === "awaiting_answer") return `🎲 HOLAT: Kapitan (${state.captainName ?? "—"}) yakuniy javobini kutmoqda...`;
  if (s === "verifying") return `🎲 HOLAT: Admin javobni baholamoqda...`;
  if (s === "finished") return `🎲 HOLAT: O'yin tugadi! G'olib: ${winnerLabel(state.winner)}`;
  return "";
}

function buildAdminPanelMessage(state: any): { text: string; kb: InlineKeyboard } {
  const text = renderTableBlock(state) + "\n" + statusLine(state);
  const kb = new InlineKeyboard();
  if (state.status === "waiting" && state.teamFull) {
    kb.row().text("👥 Jamoani tasdiqlash (6/6)", `zt:confirm:${state.code}`);
  }
  if (state.status === "team_confirmed" && state.questionsTotal < QUESTION_COUNT) {
    kb.row().text("📝 Savollarni yuklash (12 ta)", `zt:upload:${state.code}`);
  }
  if (state.status === "team_confirmed" && state.questionsTotal >= QUESTION_COUNT) {
    kb.row().text("🎬 O'yinni boshlash", `zt:startgame:${state.code}`);
  }
  if (state.status === "in_progress") {
    kb.row().text("🔄 Otni aylantirish", `zt:spin:${state.code}`);
  }
  kb.row().text("🔄 Yangilash", `zt:refresh:${state.code}`);
  return { text, kb };
}

function buildSpectatorMessage(state: any): string {
  return (
    renderTableBlock(state) + "\n" + statusLine(state) +
    "\n\n_👁 Siz kuzatuvchi sifatida tomosha qilyapsiz._"
  );
}

// ─── Jonli xabarlarni yangilash ───────────────────────────────────────────────

async function refreshRoomViews(deps: ZtBotDeps, roomCode: string) {
  const code = roomCode.toUpperCase();
  const views = roomViews.get(code);
  if (!views) return;
  for (const [tid, ref] of views.entries()) {
    try {
      const state = await deps.apiGetOnBehalf(`/api/zakovat-table/rooms/${code}/state`, tid);
      if (ref.kind === "admin") {
        const { text, kb } = buildAdminPanelMessage(state);
        await deps.bot.api.editMessageText(ref.chatId, ref.messageId, text, {
          parse_mode: "Markdown", reply_markup: kb,
        });
      } else {
        const text = buildSpectatorMessage(state);
        await deps.bot.api.editMessageText(ref.chatId, ref.messageId, text, {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard().text("🔄 Yangilash", `zt:refresh:${code}`),
        });
      }
    } catch {
      // Xabar eskirgan/o'chirilgan yoki matn o'zgarmagan bo'lishi mumkin — jim o'tamiz
    }
  }
}

// ─── O'yin tugashi (g'alaba yoki savollar tugashi) ───────────────────────────

async function announceGameOver(deps: ZtBotDeps, roomCode: string, state: any, extraNote?: string) {
  const text =
    `🎉 *O'YIN TUGADI!*\n` +
    `🏆 *G'OLIB:* ${winnerLabel(state.winner)}\n` +
    `📊 Yakuniy hisob: 👥 Jamoa [${state.teamScore}] : [${state.fansScore}] 🧠 Muxlislar\n` +
    (extraNote ? `\nℹ️ ${extraNote}\n` : "") +
    `\nO'yinda ishtirok etgan barcha bilimdonlarga va kuzatib borgan muxlislarga tashakkur!`;

  const recipients = new Set<number>();
  if (state.adminTelegramId) recipients.add(state.adminTelegramId);
  for (const p of state.players ?? []) recipients.add(p.telegramId);
  const views = roomViews.get(roomCode.toUpperCase());
  if (views) for (const tid of views.keys()) recipients.add(tid);

  for (const tid of recipients) {
    try {
      await deps.bot.api.sendMessage(tid, text, { parse_mode: "Markdown" });
    } catch { /* bloklagan bo'lishi mumkin */ }
  }

  cleanupRoom(roomCode);
}

// ─── 60 soniyalik muhokama timeri ────────────────────────────────────────────

function scheduleDiscussionAdvance(deps: ZtBotDeps, roomCode: string, delayMs: number) {
  const code = roomCode.toUpperCase();
  clearDiscussionTimer(code);
  const timer = setTimeout(() => { void advanceDiscussion(deps, code); }, delayMs);
  discussionTimers.set(code, timer);
}

async function advanceDiscussion(deps: ZtBotDeps, roomCode: string) {
  const code = roomCode.toUpperCase();
  discussionTimers.delete(code);

  let state: any;
  try {
    state = await deps.apiPost(`/api/zakovat-table/rooms/${code}/advance-discussion`, {});
  } catch {
    // Deadline hali tugamagan yoki xona holati boshqacha o'zgargan — jim o'tamiz
    return;
  }
  if (state.status !== "awaiting_answer") return;

  const captainId: number | null = state.captainTelegramId ?? null;
  const captainName: string = state.captainName ?? "Kapitan";
  const msgText =
    `⏰ *Vaqt tugadi!*\n` +
    `🎙 Jamoa kapitani (${md(captainName)}), yakuniy javobni yuboring.\n` +
    `_(Kapitan matn yoki ovozli xabar ko'rinishida javob yuboradi)_`;

  if (captainId) {
    deps.setState(captainId, {
      t: "zt_awaiting_captain_answer", roomCode: code, adminTelegramId: state.adminTelegramId,
    } as ZtState);
    try { await deps.bot.api.sendMessage(captainId, msgText, { parse_mode: "Markdown" }); } catch { /* bloklagan */ }
  }
  try { await deps.bot.api.sendMessage(state.adminTelegramId, msgText, { parse_mode: "Markdown" }); } catch { /* bloklagan */ }

  for (const p of state.players ?? []) {
    if (p.telegramId === captainId) continue;
    try {
      await deps.bot.api.sendMessage(
        p.telegramId,
        `⏰ Vaqt tugadi! Kapitan (${md(captainName)}) yakuniy javob bermoqda...`,
        { parse_mode: "Markdown" }
      );
    } catch { /* bloklagan */ }
  }

  await refreshRoomViews(deps, code);
}

// ─── Admin-only tasdiqlash so'rovi (Message 6) ───────────────────────────────

async function sendAdminVerifyPrompt(
  deps: ZtBotDeps, roomCode: string, adminTelegramId: number, fallbackAnswerText: string, isVoice: boolean,
) {
  const code = roomCode.toUpperCase();
  const state = await deps.apiGetOnBehalf(`/api/zakovat-table/rooms/${code}/state`, adminTelegramId);
  const cq = state.currentQuestion;
  const answerLine = isVoice
    ? "🎙 _(ovozli xabar — yuqorida)_"
    : `"${md(state.captainAnswerText ?? fallbackAnswerText)}"`;

  const text =
    `🎂 *Kapitan javobi:* ${answerLine}\n` +
    `*Savolning asl javobi:* "${md(cq?.answer ?? "")}"\n\n` +
    `Ushbu javobni qabul qilasizmi?`;

  await deps.bot.api.sendMessage(adminTelegramId, text, {
    parse_mode: "Markdown",
    reply_markup: new InlineKeyboard()
      .text("✅ To'g'ri (Jamoaga +1)", `zt:verify:${code}:1`)
      .text("❌ Noto'g'ri (Muxlislarga +1)", `zt:verify:${code}:0`),
  });
}

// ─── Ot aylantirish (spin) oqimi ──────────────────────────────────────────────

async function runSpinFlow(ctx: any, deps: ZtBotDeps, roomCode: string) {
  const uid: number = ctx.from.id;
  await ctx.answerCallbackQuery("🐎 Ot aylanmoqda...");

  let animMsg: any = null;
  try {
    animMsg = await deps.bot.api.sendMessage(uid, "🐎 Ot aylanmoqda...\n🔄 Sektor raqami tanlanmoqda...");
  } catch { /* jim */ }

  let result: any;
  try {
    result = await deps.apiPostOnBehalf(`/api/zakovat-table/admin/rooms/${roomCode}/spin`, {}, uid);
  } catch (e: any) {
    const errText = `❌ Xatolik: ${e?.message}`;
    if (animMsg) { try { await deps.bot.api.editMessageText(uid, animMsg.message_id, errText); } catch { /* jim */ } }
    else await ctx.reply(errText);
    return;
  }

  if (result.ranOutOfQuestions) {
    if (animMsg) { try { await deps.bot.api.deleteMessage(uid, animMsg.message_id); } catch { /* jim */ } }
    await announceGameOver(deps, roomCode, result, "Barcha 12 ta savol ishlatildi — joriy hisobga ko'ra g'olib aniqlandi.");
    return;
  }

  const cq = result.currentQuestion;
  const finalSpinText = `🐎 Ot aylanmoqda...\n🔄 Sektor raqami tanlanmoqda...\n🎯 Ot ${cq.sector}-sektorda to'xtadi!`;
  if (animMsg) {
    try { await deps.bot.api.editMessageText(uid, animMsg.message_id, finalSpinText); } catch { /* jim */ }
  } else {
    await ctx.reply(finalSpinText);
  }

  const questionText =
    `❓ *${cq.sector}-SAVOL:* "${md(cq.text)}"\n\n` +
    `⏳ Muhokama vaqti: ${result.discussionSeconds ?? 60} soniya\n` +
    `💬 Jamoa a'zolari chatda yozma yoki ovozli ravishda muhokama qilishi mumkin.`;

  try { await deps.bot.api.sendMessage(uid, questionText, { parse_mode: "Markdown" }); } catch { /* jim */ }

  for (const p of result.players ?? []) {
    try {
      await deps.bot.api.sendMessage(
        p.telegramId,
        `🎯 Ot ${cq.sector}-sektorda to'xtadi!\n\n${questionText}`,
        { parse_mode: "Markdown" }
      );
    } catch { /* bloklagan bo'lishi mumkin */ }
  }

  await refreshRoomViews(deps, roomCode);
  scheduleDiscussionAdvance(deps, roomCode, (result.discussionSeconds ?? 60) * 1000);
}

// ─── Ishtirokchi: xona/kuzatish uchun qo'shilish ─────────────────────────────

async function doJoinPlayer(ctx: any, deps: ZtBotDeps, uid: number, rawCode: string) {
  deps.clearState(uid);
  const displayName =
    [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(" ").trim() || `O'yinchi ${uid}`;
  try {
    const state = await deps.apiPostOnBehalf(`/api/zakovat-table/rooms/${rawCode}/join`, { displayName }, uid);
    const me = (state.players ?? []).find((p: any) => p.telegramId === uid);
    const seatLine = me ? `🪑 O'rningiz: [${me.seat}]${me.isCaptain ? " — 🎙 Siz *KAPITAN*siz!" : ""}` : "";

    await ctx.reply(
      `✅ *${state.displayCode}* xonasiga jamoa a'zosi sifatida qo'shildingiz!\n\n${seatLine}\n\n👥 Jamoa: ${state.playerCount}/6`,
      { parse_mode: "Markdown" }
    );

    await refreshRoomViews(deps, state.code);

    if (state.playerCount === 6 && state.adminTelegramId) {
      try {
        await deps.bot.api.sendMessage(
          state.adminTelegramId,
          `🎉 Jamoa to'liq yig'ildi (6/6)! Endi "👥 Jamoani tasdiqlash" tugmasini bosishingiz mumkin.`
        );
      } catch { /* jim */ }
    }
  } catch (e: any) {
    await ctx.reply(`❌ Qo'shilib bo'lmadi: ${e?.message}`);
  }
}

async function doJoinSpectator(ctx: any, deps: ZtBotDeps, uid: number, rawCode: string) {
  deps.clearState(uid);
  try {
    const state = await deps.apiPostOnBehalf(`/api/zakovat-table/rooms/${rawCode}/spectate`, {}, uid);
    const text = buildSpectatorMessage(state);
    const sent = await ctx.reply(text, {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard().text("🔄 Yangilash", `zt:refresh:${state.code}`),
    });
    addRoomView(state.code, uid, { chatId: sent.chat.id, messageId: sent.message_id, kind: "spectator" });
  } catch (e: any) {
    await ctx.reply(`❌ Kuzatib bo'lmadi: ${e?.message}`);
  }
}

// ─── Foydalanuvchi menyusi (asosiy menyudagi tugmadan) ───────────────────────

export async function sendZtUserMenu(ctx: any) {
  await ctx.reply(
    "🔴 *Interaktiv Zakovat Stoli*\n\n" +
    "Jonli efirda o'tkaziladigan jamoaviy bilimdonlar o'yini — 6 kishilik jamoa va ularni kuzatuvchi muxlislar.\n\n" +
    "Nima qilmoqchisiz?",
    {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard()
        .text("🚪 Xonaga qo'shilish (Kod bilan)", "zt:join_manual").row()
        .text("👁 O'yinni kuzatish", "zt:spectate_manual").row()
        .text("◀️ Orqaga", "zt:back"),
    }
  );
}

// ─── Admin: menyu, xona yaratish, ro'yxat ────────────────────────────────────

export async function sendZtAdminMenu(ctx: any) {
  await ctx.reply(
    "🔴 *Interaktiv Zakovat Stoli — Admin panel*\n\nYangi xona yarating yoki mavjud xonangizni oching:",
    {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard()
        .text("➕ Yangi xona yaratish", "zt:create").row()
        .text("📋 Mening xonalarim", "zt:myrooms"),
    }
  );
}

export async function handleZtCreateRoom(ctx: any, deps: ZtBotDeps) {
  const uid: number = ctx.from!.id;
  try {
    const state = await deps.apiPostOnBehalf(`/api/zakovat-table/rooms`, {}, uid);

    await ctx.reply(
      `🔴 *ZAKOVAT O'YINI YARATILDI*\n` +
      `🔑 Xona kodi: #${state.displayCode}\n\n` +
      `O'yinchilar ushbu kod orqali jamoaga qo'shilishlari mumkin. Muxlislar esa "O'yinni kuzatish" bo'limiga kodni kiritib, o'yinni guruhda tomosha qilishlari mumkin.\n\n` +
      `👥 Jamoa a'zolari (0/6): Kutilmoqda...`,
      { parse_mode: "Markdown" }
    );

    const { text, kb } = buildAdminPanelMessage(state);
    const sent = await ctx.reply(text, { parse_mode: "Markdown", reply_markup: kb });
    addRoomView(state.code, uid, { chatId: sent.chat.id, messageId: sent.message_id, kind: "admin" });
  } catch (e: any) {
    await ctx.reply(`❌ Xona yaratib bo'lmadi: ${e?.message}`, { reply_markup: deps.ADMIN_KB });
  }
}

export async function handleZtMyRooms(ctx: any, deps: ZtBotDeps) {
  const uid: number = ctx.from!.id;
  try {
    const rooms: any[] = await deps.apiGetOnBehalf(`/api/zakovat-table/admin/rooms`, uid);
    if (!rooms.length) {
      await ctx.reply("📋 *Hozircha xonalar yo'q.*", { parse_mode: "Markdown" });
      return;
    }
    const kb = new InlineKeyboard();
    for (const r of rooms) {
      const badge = r.status === "finished" ? "🏁" : "🟢";
      kb.row().text(
        `${badge} #${r.displayCode} — ${r.playerCount}/6 | ${r.teamScore}:${r.fansScore}`,
        `zt:open:${r.code}`
      );
    }
    await ctx.reply("📋 *Oxirgi xonalaringiz:*", { parse_mode: "Markdown", reply_markup: kb });
  } catch (e: any) {
    await ctx.reply(`❌ Ro'yxatni olib bo'lmadi: ${e?.message}`);
  }
}

export async function handleZtOpenRoom(ctx: any, deps: ZtBotDeps, roomCode: string) {
  const uid: number = ctx.from!.id;
  try {
    const state = await deps.apiGetOnBehalf(`/api/zakovat-table/rooms/${roomCode}/state`, uid);
    const { text, kb } = buildAdminPanelMessage(state);
    const sent = await ctx.reply(text, { parse_mode: "Markdown", reply_markup: kb });
    addRoomView(state.code, uid, { chatId: sent.chat.id, messageId: sent.message_id, kind: "admin" });
  } catch (e: any) {
    await ctx.reply(`❌ Xonani ochib bo'lmadi: ${e?.message}`);
  }
}

// ─── Matn xabarlari: state machine ────────────────────────────────────────────

/** bot.ts dagi `message:text` handleri bu funksiyani chaqiradi. true = ishlov berildi. */
export async function handleZtText(ctx: any, deps: ZtBotDeps): Promise<boolean> {
  const uid: number = ctx.from!.id;
  const text: string = ctx.message.text.trim();
  const st = deps.getState(uid) as ZtState;

  if (st.t === "zt_join_code") {
    const code = text.toUpperCase().trim();
    await doJoinPlayer(ctx, deps, uid, code);
    return true;
  }

  if (st.t === "zt_spectate_code") {
    const code = text.toUpperCase().trim();
    await doJoinSpectator(ctx, deps, uid, code);
    return true;
  }

  if (st.t === "zt_q_text") {
    if (!deps.isAdmin(uid)) { deps.clearState(uid); await ctx.reply("⛔ Admin huquqi kerak."); return true; }
    if (!text || text.startsWith("/")) {
      await ctx.reply("✏️ Savol matnini kiriting:");
      return true;
    }
    deps.setState(uid, { t: "zt_q_answer", roomCode: st.roomCode, collected: st.collected, pendingText: text } as ZtState);
    await ctx.reply(`✅ ${st.collected.length + 1}/${QUESTION_COUNT}-savol qabul qilindi.\n\n✏️ To'g'ri javobni kiriting:`);
    return true;
  }

  if (st.t === "zt_q_answer") {
    if (!deps.isAdmin(uid)) { deps.clearState(uid); await ctx.reply("⛔ Admin huquqi kerak."); return true; }
    if (!text || text.startsWith("/")) {
      await ctx.reply("✏️ To'g'ri javobni kiriting:");
      return true;
    }
    const collected = [...st.collected, { text: st.pendingText, answer: text }];
    if (collected.length < QUESTION_COUNT) {
      deps.setState(uid, { t: "zt_q_text", roomCode: st.roomCode, collected } as ZtState);
      await ctx.reply(`✏️ ${collected.length + 1}/${QUESTION_COUNT}-savol matnini kiriting:`);
    } else {
      deps.clearState(uid);
      try {
        await deps.apiPostOnBehalf(
          `/api/zakovat-table/admin/rooms/${st.roomCode}/questions`,
          { questions: collected },
          uid
        );
        await ctx.reply(
          "✅ *12 ta savol muvaffaqiyatli yuklandi!*\n\nEndi o'yinni boshlashingiz mumkin.",
          { parse_mode: "Markdown" }
        );
        await refreshRoomViews(deps, st.roomCode);
      } catch (e: any) {
        await ctx.reply(`❌ Savollarni yuklab bo'lmadi: ${e?.message}`);
      }
    }
    return true;
  }

  if (st.t === "zt_awaiting_captain_answer") {
    try {
      await deps.apiPostOnBehalf(
        `/api/zakovat-table/rooms/${st.roomCode}/answer`,
        { answer: text, isVoice: false },
        uid
      );
      deps.clearState(uid);
      await ctx.reply("✅ Javobingiz qabul qilindi. Admin baholamoqda...");
      await sendAdminVerifyPrompt(deps, st.roomCode, st.adminTelegramId, text, false);
      await refreshRoomViews(deps, st.roomCode);
    } catch (e: any) {
      deps.clearState(uid);
      await ctx.reply(`❌ Javobni yuborib bo'lmadi: ${e?.message}`);
    }
    return true;
  }

  return false;
}

/** bot.ts dagi `message:voice`/`message:audio` handleri bu funksiyani chaqiradi. */
export async function handleZtVoice(ctx: any, deps: ZtBotDeps): Promise<boolean> {
  const uid: number = ctx.from!.id;
  const st = deps.getState(uid) as ZtState;
  if (st.t !== "zt_awaiting_captain_answer") return false;

  const fileId: string = ctx.message.voice?.file_id ?? ctx.message.audio?.file_id ?? "";
  if (!fileId) return false;

  try {
    await deps.apiPostOnBehalf(
      `/api/zakovat-table/rooms/${st.roomCode}/answer`,
      { answer: "", isVoice: true },
      uid
    );
    deps.clearState(uid);
    await ctx.reply("✅ Ovozli javobingiz qabul qilindi. Admin baholamoqda...");
    try {
      await ctx.forwardMessage(st.adminTelegramId);
    } catch { /* forward qilinmasa ham javob baribir qabul qilindi */ }
    await sendAdminVerifyPrompt(deps, st.roomCode, st.adminTelegramId, "", true);
    await refreshRoomViews(deps, st.roomCode);
  } catch (e: any) {
    deps.clearState(uid);
    await ctx.reply(`❌ Javobni yuborib bo'lmadi: ${e?.message}`);
  }
  return true;
}

// ─── Callback query handleri ─────────────────────────────────────────────────

/** bot.ts `callback_query:data` handleri bu funksiyani chaqiradi. "zt:" prefiksi. */
export async function handleZtCallback(ctx: any, deps: ZtBotDeps): Promise<boolean> {
  const data: string = ctx.callbackQuery.data;
  if (!data.startsWith("zt:")) return false;

  const uid: number = ctx.from.id;

  if (data === "zt:menu") {
    await ctx.answerCallbackQuery();
    await sendZtUserMenu(ctx);
    return true;
  }

  if (data === "zt:back") {
    await ctx.answerCallbackQuery();
    try { await ctx.editMessageText("🏠 Bosh menyuga qaytdingiz. Davom etish uchun /start bosing."); } catch { /* jim */ }
    return true;
  }

  if (data === "zt:join_manual") {
    deps.setState(uid, { t: "zt_join_code" } as ZtState);
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "🚪 *Xonaga qo'shilish*\n\nXona kodini kiriting (masalan: 7845 yoki ZK-7845):\n\n/cancel — bekor qilish",
      { parse_mode: "Markdown" }
    );
    return true;
  }

  if (data === "zt:spectate_manual") {
    deps.setState(uid, { t: "zt_spectate_code" } as ZtState);
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "👁 *O'yinni kuzatish*\n\nXona kodini kiriting:\n\n/cancel — bekor qilish",
      { parse_mode: "Markdown" }
    );
    return true;
  }

  if (data === "zt:create") {
    if (!requireZtAdmin(ctx, deps)) return true;
    await ctx.answerCallbackQuery();
    await handleZtCreateRoom(ctx, deps);
    return true;
  }

  if (data === "zt:myrooms") {
    if (!requireZtAdmin(ctx, deps)) return true;
    await ctx.answerCallbackQuery();
    await handleZtMyRooms(ctx, deps);
    return true;
  }

  if (data.startsWith("zt:open:")) {
    if (!requireZtAdmin(ctx, deps)) return true;
    const roomCode = data.slice(8);
    await ctx.answerCallbackQuery();
    await handleZtOpenRoom(ctx, deps, roomCode);
    return true;
  }

  if (data.startsWith("zt:refresh:")) {
    const roomCode = data.slice(11).toUpperCase();
    try {
      const state = await deps.apiGetOnBehalf(`/api/zakovat-table/rooms/${roomCode}/state`, uid);
      await ctx.answerCallbackQuery();
      if (state.viewerIsAdmin) {
        const { text, kb } = buildAdminPanelMessage(state);
        await ctx.editMessageText(text, { parse_mode: "Markdown", reply_markup: kb });
      } else {
        const text = buildSpectatorMessage(state);
        await ctx.editMessageText(text, {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard().text("🔄 Yangilash", `zt:refresh:${roomCode}`),
        });
      }
    } catch (e: any) {
      await ctx.answerCallbackQuery(`❌ ${e?.message}`, { show_alert: true }).catch(() => {});
    }
    return true;
  }

  if (data.startsWith("zt:confirm:")) {
    if (!requireZtAdmin(ctx, deps)) return true;
    const roomCode = data.slice(11);
    await ctx.answerCallbackQuery("⏳ Tasdiqlanmoqda...");
    try {
      const state = await deps.apiPostOnBehalf(`/api/zakovat-table/admin/rooms/${roomCode}/confirm-team`, {}, uid);
      await refreshRoomViews(deps, roomCode);
      for (const p of state.players ?? []) {
        try {
          await deps.bot.api.sendMessage(p.telegramId, `✅ Jamoa tasdiqlandi! Boshlovchi savollarni tayyorlamoqda...`);
        } catch { /* jim */ }
      }
    } catch (e: any) {
      await ctx.answerCallbackQuery(`❌ ${e?.message}`, { show_alert: true }).catch(() => {});
    }
    return true;
  }

  if (data.startsWith("zt:upload:")) {
    if (!requireZtAdmin(ctx, deps)) return true;
    const roomCode = data.slice(10);
    deps.setState(uid, { t: "zt_q_text", roomCode, collected: [] } as ZtState);
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `📝 *Savollarni yuklash (${QUESTION_COUNT} ta)*\n\n1/${QUESTION_COUNT}-savol matnini kiriting:\n\n/cancel — bekor qilish`,
      { parse_mode: "Markdown" }
    );
    return true;
  }

  if (data.startsWith("zt:startgame:")) {
    if (!requireZtAdmin(ctx, deps)) return true;
    const roomCode = data.slice(13);
    await ctx.answerCallbackQuery("🎬 Boshlanmoqda...");
    try {
      const state = await deps.apiPostOnBehalf(`/api/zakovat-table/admin/rooms/${roomCode}/start`, {}, uid);
      await refreshRoomViews(deps, roomCode);
      for (const p of state.players ?? []) {
        try {
          await deps.bot.api.sendMessage(
            p.telegramId,
            `🎬 *O'yin boshlandi!*\n\nTez orada birinchi savol o'qiladi. Tayyor turing!`,
            { parse_mode: "Markdown" }
          );
        } catch { /* jim */ }
      }
    } catch (e: any) {
      await ctx.answerCallbackQuery(`❌ ${e?.message}`, { show_alert: true }).catch(() => {});
    }
    return true;
  }

  if (data.startsWith("zt:spin:")) {
    if (!requireZtAdmin(ctx, deps)) return true;
    const roomCode = data.slice(8);
    await runSpinFlow(ctx, deps, roomCode);
    return true;
  }

  if (data.startsWith("zt:verify:")) {
    if (!requireZtAdmin(ctx, deps)) return true;
    const parts = data.split(":");
    const roomCode = parts[2];
    const isCorrect = parts[3] === "1";
    await ctx.answerCallbackQuery(isCorrect ? "✅ To'g'ri" : "❌ Noto'g'ri");
    try {
      const result = await deps.apiPostOnBehalf(
        `/api/zakovat-table/admin/rooms/${roomCode}/verify`,
        { isCorrect },
        uid
      );
      try { await ctx.editMessageReplyMarkup(); } catch { /* jim */ }

      const resultText =
        `${isCorrect ? "✅ To'g'ri javob!" : "❌ Noto'g'ri javob!"}\n` +
        `💡 To'g'ri javob: ${md(result.correctAnswer ?? "")}\n` +
        `📊 Yangi hisob: 👥 Jamoa [${result.teamScore}] : [${result.fansScore}] 🧠 Muxlislar`;

      const recipients = new Set<number>();
      if (result.adminTelegramId) recipients.add(result.adminTelegramId);
      for (const p of result.players ?? []) recipients.add(p.telegramId);
      const views = roomViews.get(roomCode.toUpperCase());
      if (views) for (const tid of views.keys()) recipients.add(tid);

      for (const tid of recipients) {
        try { await deps.bot.api.sendMessage(tid, resultText, { parse_mode: "Markdown" }); } catch { /* jim */ }
      }

      if (result.gameOver) {
        await announceGameOver(deps, roomCode, result);
      } else {
        await refreshRoomViews(deps, roomCode);
      }
    } catch (e: any) {
      await ctx.answerCallbackQuery(`❌ ${e?.message}`, { show_alert: true }).catch(() => {});
    }
    return true;
  }

  await ctx.answerCallbackQuery();
  return true;
}
