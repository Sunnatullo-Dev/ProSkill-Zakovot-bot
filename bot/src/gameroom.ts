/**
 * Online O'yin Xonasi — Telegram bot tomonlama logika.
 *
 * Admin flow:
 *   🎮 O'yin xonasi (ADMIN_KB) → xona yaratish / boshqarish
 *
 * Participant flow:
 *   /start room_<CODE>  yoki  "🚪 Xonaga kirish" tugmasi
 *
 * Bu modul bot.ts dan import qilinadi va shu faylning eksport qilingan
 * yordamchi funksiyalarini (apiGet, apiPost, apiPatch, apiDelete,
 * getState, setState, clearState, isAdmin, bot, ADMIN_KB, BACKEND_URL,
 * ADMIN_API_KEY) ishlatadi.
 */

import { Bot, InlineKeyboard, InputFile } from "grammy";

// ─── Tashqi bog'liqliklar (bot.ts dan import qilinadi) ───────────────────────

export interface GrBotDeps {
  bot: Bot<any>;
  BACKEND_URL: string;
  ADMIN_API_KEY: string;
  BOT_USERNAME: string; // onStart'da to'ldiriladi
  apiGet: (path: string) => Promise<any>;
  apiPost: (path: string, body: object) => Promise<any>;
  apiPatch: (path: string, body: object) => Promise<any>;
  apiDelete: (path: string) => Promise<any>;
  /** Bot ishtirokchi nomidan chaqiruv — X-On-Behalf-Of header qo'shiladi */
  apiPostOnBehalf: (path: string, body: object, telegramId: number) => Promise<any>;
  isAdmin: (id: number) => boolean;
  getState: (id: number) => BotState;
  setState: (id: number, s: BotState) => void;
  clearState: (id: number) => void;
  ADMIN_KB: any; // Keyboard instance
}

// ─── Binary API yordamchi (xlsx uchun — JSON parse qilinmaydi) ──────────────

async function apiBinaryGet(deps: GrBotDeps, path: string): Promise<Buffer> {
  const r = await fetch(`${deps.BACKEND_URL}${path}`, {
    headers: {
      Authorization: `bot ${deps.ADMIN_API_KEY}`,
    },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`GET ${path} → ${r.status}: ${t.slice(0, 200)}`);
  }
  const ab = await r.arrayBuffer();
  return Buffer.from(ab);
}

// ─── State turlari ───────────────────────────────────────────────────────────
// Bot.ts dagi State union'ga qo'shiladigan yangi holatlar.
// bot.ts da `type State = ExistingState | GrState` deb kengaytirish kerak.

export type GrState =
  // Admin: xona yaratish oqimi
  | { t: "gr_room_name" }
  | { t: "gr_room_password"; name: string }
  // Admin: savol push oqimi
  | { t: "gr_q_type"; roomCode: string }
  | { t: "gr_q_body"; roomCode: string; qType: "text" | "audio" | "image" }
  | { t: "gr_q_audio"; roomCode: string; qBody: string }
  | { t: "gr_q_photo"; roomCode: string; qBody: string }
  | { t: "gr_q_caption"; roomCode: string; qBody: string; mediaRef: string }
  | { t: "gr_q_answer"; roomCode: string; qBody: string; mediaRef: string; caption: string; qType: "text" | "audio" | "image" }
  | { t: "gr_q_timer"; roomCode: string; qBody: string; mediaRef: string; caption: string; qType: "text" | "audio" | "image"; correctAnswer: string }
  | { t: "gr_q_points"; roomCode: string; qBody: string; mediaRef: string; caption: string; qType: "text" | "audio" | "image"; correctAnswer: string; timer: number }
  // Admin: to'g'ri javob kiritish (auto-grade uchun)
  | { t: "gr_correct_answer"; roomCode: string; questionId: number }
  // Ishtirokchi: xonaga kirish oqimi
  | { t: "gr_join_code" }
  | { t: "gr_join_name"; roomCode: string; roomName: string; hasPassword: boolean }
  | { t: "gr_join_password"; roomCode: string; roomName: string; displayName: string }
  // Ishtirokchi: aktiv o'yinda javob kutilmoqda
  | { t: "gr_awaiting_answer"; roomCode: string; questionId: number; deadline: number }
  // Admin: savolni bekor qilishni tasdiqlash
  | { t: "gr_cancel_q_confirm"; roomCode: string; questionId: number };

// bot.ts dagi asosiy State union uchun type alias
export type BotState = { t: string; [key: string]: any };

// ─── Yordamchi konstantalar ──────────────────────────────────────────────────

const MEDALS = ["🥇", "🥈", "🥉"];

// Ishtirokchi muloqoti (xabar yuborish uchun) — roomCode → Set<telegramId>
// Bot qayta ishga tushganda yo'qoladi (in-memory)
const roomParticipants = new Map<string, Set<number>>();

function addRoomParticipant(roomCode: string, telegramId: number) {
  if (!roomParticipants.has(roomCode)) roomParticipants.set(roomCode, new Set());
  roomParticipants.get(roomCode)!.add(telegramId);
}

function getRoomParticipantIds(roomCode: string): number[] {
  return Array.from(roomParticipants.get(roomCode) ?? []);
}

// ─── Inline keyboard yordamchilari ──────────────────────────────────────────

function grAdminRoomKb(code: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("▶️ O'yinni boshlash", `gr:start:${code}`).row()
    .text("❓ Savol yuborish", `gr:pushq:${code}`).row()
    .text("👀 Javoblarni ko'rish", `gr:subs:${code}`).row()
    .text("✅ Savolni yopish", `gr:closeq:${code}`).text("🚫 Bekor qilish", `gr:cancelq:${code}`).row()
    .text("📊 Statistika", `gr:stats:${code}`).text("🏆 Reyting", `gr:lb:${code}`).row()
    .text("📥 Natijalar", `gr:results:${code}`).text("📊 Excel", `gr:xlsx:${code}`).row()
    .text("💾 Bankka saqlash", `gr:savebank:${code}`).text("🏁 Yakunlash", `gr:finish:${code}`);
}

function grTimerKb(roomCode: string, qBody: string, mediaRef: string, caption: string, qType: string, correctAnswer: string): InlineKeyboard {
  const base = `gr:timer:${roomCode}`;
  return new InlineKeyboard()
    .text("30s", `${base}:30`).text("1 daq", `${base}:60`).text("1:30", `${base}:90`).row()
    .text("2 daq", `${base}:120`).text("3 daq", `${base}:180`);
}

function grPointsKb(roomCode: string): InlineKeyboard {
  const base = `gr:pts:${roomCode}`;
  return new InlineKeyboard()
    .text("1 ball", `${base}:1`).text("2 ball", `${base}:2`).text("3 ball", `${base}:3`);
}

function grGradeKb(roomCode: string, submissionId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ To'g'ri", `gr:grade:${roomCode}:${submissionId}:1`)
    .text("❌ Noto'g'ri", `gr:grade:${roomCode}:${submissionId}:0`);
}

// ─── Formatlash yordamchilari ────────────────────────────────────────────────

function formatLeaderboard(leaderboard: any[]): string {
  if (!leaderboard.length) return "_Hozircha ishtirokchilar yo'q_";
  return leaderboard
    .slice(0, 15)
    .map((p, i) => {
      const medal = MEDALS[i] ?? `${i + 1}.`;
      return `${medal} *${p.displayName}* — ${p.totalPoints} ball`;
    })
    .join("\n");
}

function formatSeconds(s: number): string {
  if (s < 60) return `${s} soniya`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m} daq ${rem}s` : `${m} daqiqa`;
}

function formatQuestion(q: any, idx?: number): string {
  const num = idx !== undefined ? `#${idx} ` : "";
  const typeLabel =
    q.questionType === "audio" ? "🎵 Audio savol" :
    q.questionType === "image" ? "🖼 Rasmli savol" :
    "📝 Savol";
  const bonus = q.isBonus ? " ⭐ Bonus" : "";
  const quick = q.isQuick ? " ⚡ Tez" : "";
  const pts = `${q.pointValue} ball`;
  const timer = formatSeconds(q.timeLimitSeconds);
  return (
    `${typeLabel}${bonus}${quick} ${num}(${pts}, ${timer})\n\n` +
    `${q.body}` +
    (q.caption ? `\n\n_${q.caption}_` : "")
  );
}

// ─── Backend API yordamchilari ───────────────────────────────────────────────

async function grApiPost(deps: GrBotDeps, path: string, body: object): Promise<any> {
  return deps.apiPost(path, body);
}

async function grApiGet(deps: GrBotDeps, path: string): Promise<any> {
  return deps.apiGet(path);
}

// ─── Xona yaratish ───────────────────────────────────────────────────────────

export async function handleGrRoomCreate(ctx: any, deps: GrBotDeps) {
  const uid: number = ctx.from!.id;
  deps.setState(uid, { t: "gr_room_name" } as GrState);
  await ctx.reply(
    "🏟 *Yangi o'yin xonasi yaratish*\n\nXona nomini kiriting:\n\n/cancel — bekor qilish",
    { parse_mode: "Markdown" }
  );
}

// ─── Admin savol push oqimi ─────────────────────────────────────────────────

export async function handleGrPushQuestion(ctx: any, deps: GrBotDeps, roomCode: string) {
  const uid: number = ctx.from!.id;
  deps.setState(uid, { t: "gr_q_type", roomCode } as GrState);
  await ctx.reply(
    `🎯 *Savol turi*\n\nQanday savol yubormoqchisiz?`,
    {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard()
        .text("📝 Matnli", `gr:qtype:${roomCode}:text`).row()
        .text("🎵 Audio/Ovoz", `gr:qtype:${roomCode}:audio`).row()
        .text("🖼 Rasmli", `gr:qtype:${roomCode}:image`),
    }
  );
}

// ─── Broadcast: savol barcha ishtirokchilarga yuborish ──────────────────────

async function broadcastQuestion(bot: Bot<any>, roomCode: string, question: any) {
  const ids = getRoomParticipantIds(roomCode);
  if (!ids.length) return;

  const timer = formatSeconds(question.timeLimitSeconds);
  const header =
    `🔔 *Yangi savol!*\n` +
    `⏱ Vaqt: *${timer}*\n` +
    `💰 Ball: *${question.pointValue}*` +
    (question.isBonus ? ` ⭐ Bonus` : "") +
    `\n\n`;

  for (const tid of ids) {
    try {
      if (question.questionType === "audio" && question.mediaRef) {
        await bot.api.sendAudio(tid, question.mediaRef, {
          caption: header + question.body + (question.caption ? `\n\n_${question.caption}_` : ""),
          parse_mode: "Markdown",
        });
      } else if (question.questionType === "image" && question.mediaRef) {
        await bot.api.sendPhoto(tid, question.mediaRef, {
          caption: header + question.body + (question.caption ? `\n\n_${question.caption}_` : ""),
          parse_mode: "Markdown",
        });
      } else {
        await bot.api.sendMessage(tid, header + question.body, { parse_mode: "Markdown" });
      }
      // Javob yo'riqnomasi
      await bot.api.sendMessage(
        tid,
        `✍️ Javobingizni matn sifatida yuboring.\n⏰ Vaqt: ${timer}\n\n_Deadline'gacha qayta yuborsangiz, javobingiz yangilanadi._`,
        { parse_mode: "Markdown" }
      );
    } catch {
      // Foydalanuvchi botni bloklagan bo'lishi mumkin — jim o'tamiz
    }
  }
}

async function broadcastMessage(bot: Bot<any>, roomCode: string, text: string) {
  const ids = getRoomParticipantIds(roomCode);
  for (const tid of ids) {
    try {
      await bot.api.sendMessage(tid, text, { parse_mode: "Markdown" });
    } catch { /* jim */ }
  }
}

// ─── Matn xabarlari: state machine ──────────────────────────────────────────

/**
 * bot.ts dagi `message:text` handleri bu funksiyani chaqiradi.
 * Agar holat gameroom ga tegishli bo'lsa — true qaytaradi (ishlov berildi).
 * Aks holda false qaytaradi (bot.ts o'zi handle qilsin).
 */
export async function handleGrText(ctx: any, deps: GrBotDeps): Promise<boolean> {
  const uid: number = ctx.from!.id;
  const text: string = ctx.message.text.trim();
  const st = deps.getState(uid) as GrState;

  // ── Admin: xona yaratish oqimi ──
  if (st.t === "gr_room_name") {
    if (text.length < 2) {
      await ctx.reply("❌ Xona nomi kamida 2 ta belgi bo'lishi kerak:");
      return true;
    }
    deps.setState(uid, { t: "gr_room_password", name: text } as GrState);
    await ctx.reply(
      `✅ Xona nomi: *${text}*\n\n🔒 Parol o'rnating (ixtiyoriy):\n/skip — paroolsiz xona`,
      { parse_mode: "Markdown" }
    );
    return true;
  }

  if (st.t === "gr_room_password") {
    const password = text.startsWith("/") ? "" : text;
    await doCreateRoom(ctx, deps, uid, st.name, password);
    return true;
  }

  // ── Admin: savol matni ──
  if (st.t === "gr_q_body") {
    if (!text || text.startsWith("/")) {
      await ctx.reply("✏️ Savol matnini kiriting:");
      return true;
    }
    const { roomCode, qType } = st;
    // Audio va rasm uchun keyingi holat media yuklash
    if (qType === "audio") {
      deps.setState(uid, { t: "gr_q_audio", roomCode, qBody: text } as GrState);
      await ctx.reply(
        "🎵 *Audio faylni yuboring*\n\nOvoz xabari yoki audio fayl yuboring:\n\n/cancel — bekor qilish",
        { parse_mode: "Markdown" }
      );
    } else if (qType === "image") {
      deps.setState(uid, { t: "gr_q_photo", roomCode, qBody: text } as GrState);
      await ctx.reply(
        "🖼 *Rasmni yuboring*\n\nFoto yuboring:\n\n/cancel — bekor qilish",
        { parse_mode: "Markdown" }
      );
    } else {
      // Matnli savol — to'g'ri javob so'rash
      deps.setState(uid, {
        t: "gr_q_answer", roomCode, qBody: text,
        mediaRef: "", caption: "", qType,
      } as GrState);
      await ctx.reply(
        "✅ Savol qabul qilindi.\n\n✏️ To'g'ri javobni kiriting:\n/skip — keyinroq kiritish",
        { parse_mode: "Markdown" }
      );
    }
    return true;
  }

  // ── Admin: to'g'ri javob kiritish ──
  if (st.t === "gr_q_answer") {
    const correctAnswer = text.startsWith("/") ? "" : text;
    deps.setState(uid, { ...st, t: "gr_q_timer", correctAnswer } as GrState);
    await ctx.reply(
      "⏱ *Vaqt limitini tanlang:*",
      { parse_mode: "Markdown", reply_markup: grTimerKb(st.roomCode, st.qBody, st.mediaRef, st.caption, st.qType, correctAnswer) }
    );
    return true;
  }

  // ── Admin: caption kiritish (rasm uchun) ──
  if (st.t === "gr_q_caption") {
    const caption = text.startsWith("/") ? "" : text;
    deps.setState(uid, { ...st, t: "gr_q_answer", caption } as GrState);
    await ctx.reply(
      "✅ Izoh qabul qilindi.\n\n✏️ To'g'ri javobni kiriting:\n/skip — keyinroq kiritish",
      { parse_mode: "Markdown" }
    );
    return true;
  }

  // ── Admin: to'g'ri javob alohida o'rnatish ──
  if (st.t === "gr_correct_answer") {
    if (!text || text.startsWith("/")) {
      await ctx.reply("✏️ To'g'ri javobni kiriting:");
      return true;
    }
    try {
      await deps.apiPatch(
        `/api/gamerooms/admin/rooms/${st.roomCode}/questions/${st.questionId}/correct-answer`,
        { correctAnswer: text }
      );
      deps.clearState(uid);
      await ctx.reply(
        `✅ To'g'ri javob o'rnatildi: *${text}*\n\nEndi avto-baholash yoki qo'lda baholash qilishingiz mumkin.`,
        { parse_mode: "Markdown", reply_markup: deps.ADMIN_KB }
      );
    } catch (e: any) {
      deps.clearState(uid);
      await ctx.reply(`❌ O'rnatib bo'lmadi: ${e?.message}`, { reply_markup: deps.ADMIN_KB });
    }
    return true;
  }

  // ── Ishtirokchi: xona kodi qo'lda kiritish ──
  if (st.t === "gr_join_code") {
    const code = text.toUpperCase().trim();
    await handleJoinCodeEntered(ctx, deps, uid, code);
    return true;
  }

  // ── Ishtirokchi: taxallus kiritish ──
  if (st.t === "gr_join_name") {
    if (!text || text.length < 2) {
      await ctx.reply("❌ Taxallus kamida 2 ta belgi bo'lishi kerak:");
      return true;
    }
    if (st.hasPassword) {
      deps.setState(uid, { t: "gr_join_password", roomCode: st.roomCode, roomName: st.roomName, displayName: text } as GrState);
      await ctx.reply(
        `✅ Taxallus: *${text}*\n\n🔒 Xona paroli zarur. Parolni kiriting:`,
        { parse_mode: "Markdown" }
      );
    } else {
      await doJoinRoom(ctx, deps, uid, st.roomCode, st.roomName, text, "");
    }
    return true;
  }

  // ── Ishtirokchi: parol kiritish ──
  if (st.t === "gr_join_password") {
    await doJoinRoom(ctx, deps, uid, st.roomCode, st.roomName, st.displayName, text);
    return true;
  }

  // ── Ishtirokchi: javob yuborish ──
  if (st.t === "gr_awaiting_answer") {
    const now = Date.now();
    if (now > st.deadline + 2000) {
      // Grace period o'tdi — rad qilamiz
      deps.clearState(uid);
      await ctx.reply(
        "⏰ *Vaqt tugadi!*\n\nBu savolga javob qabul qilinmaydi.",
        { parse_mode: "Markdown" }
      );
      return true;
    }
    await doSubmitAnswer(ctx, deps, uid, st.roomCode, st.questionId, text, st.deadline);
    return true;
  }

  return false;
}

// ─── Audio/Photo xabar handleri ─────────────────────────────────────────────

export async function handleGrMedia(ctx: any, deps: GrBotDeps, mediaType: "audio" | "photo"): Promise<boolean> {
  const uid: number = ctx.from!.id;
  const st = deps.getState(uid) as GrState;

  if (mediaType === "audio" && (st.t === "gr_q_audio")) {
    const msg = ctx.message;
    const fileId: string =
      msg.audio?.file_id ?? msg.voice?.file_id ?? "";
    if (!fileId) {
      await ctx.reply("❌ Audio fayl topilmadi. Audio yoki ovoz xabarini yuboring:");
      return true;
    }
    // Caption so'rash
    deps.setState(uid, { t: "gr_q_caption", roomCode: st.roomCode, qBody: st.qBody, mediaRef: fileId, qType: "audio" } as GrState);
    await ctx.reply(
      "✅ Audio qabul qilindi.\n\n📝 Izoh kiriting (ixtiyoriy):\n/skip — izohlarsiz",
      { parse_mode: "Markdown" }
    );
    return true;
  }

  if (mediaType === "photo" && (st.t === "gr_q_photo")) {
    const msg = ctx.message;
    const photos = msg.photo;
    if (!photos || photos.length === 0) {
      await ctx.reply("❌ Rasm topilmadi. Foto yuboring:");
      return true;
    }
    // Eng katta o'lchamdagi rasmni olamiz
    const fileId: string = photos[photos.length - 1].file_id;
    deps.setState(uid, { t: "gr_q_caption", roomCode: st.roomCode, qBody: st.qBody, mediaRef: fileId, qType: "image" } as GrState);
    await ctx.reply(
      "✅ Rasm qabul qilindi.\n\n📝 Izoh kiriting (ixtiyoriy):\n/skip — izohlarsiz",
      { parse_mode: "Markdown" }
    );
    return true;
  }

  return false;
}

// ─── /skip handleri ─────────────────────────────────────────────────────────

export async function handleGrSkip(ctx: any, deps: GrBotDeps): Promise<boolean> {
  const uid: number = ctx.from!.id;
  const st = deps.getState(uid) as GrState;

  if (st.t === "gr_room_password") {
    await doCreateRoom(ctx, deps, uid, st.name, "");
    return true;
  }
  if (st.t === "gr_q_caption") {
    // Izohlarsiz — to'g'ri javob so'rash
    deps.setState(uid, { ...st, t: "gr_q_answer", caption: "" } as GrState);
    await ctx.reply(
      "✏️ To'g'ri javobni kiriting:\n/skip — keyinroq kiritish",
      { parse_mode: "Markdown" }
    );
    return true;
  }
  if (st.t === "gr_q_answer") {
    // To'g'ri javovsiz — timer tanlash
    deps.setState(uid, { ...st, t: "gr_q_timer", correctAnswer: "" } as GrState);
    await ctx.reply(
      "⏱ *Vaqt limitini tanlang:*",
      {
        parse_mode: "Markdown",
        reply_markup: grTimerKb(st.roomCode, st.qBody, st.mediaRef, st.caption, st.qType, ""),
      }
    );
    return true;
  }
  return false;
}

// ─── Callback query handleri ─────────────────────────────────────────────────

/**
 * bot.ts `callback_query:data` handleri bu funksiyani chaqiradi.
 * "gr:" prefiksi bilan boshlanadigan callbacklarni qabul qiladi.
 * true qaytarsa — ishlov berildi. false qaytarsa — bot.ts davom etadi.
 */
export async function handleGrCallback(ctx: any, deps: GrBotDeps): Promise<boolean> {
  const data: string = ctx.callbackQuery.data;
  if (!data.startsWith("gr:")) return false;

  const uid: number = ctx.from.id;

  // ── Savol turi tanlash ──
  // gr:qtype:<roomCode>:<type>
  if (data.startsWith("gr:qtype:")) {
    const parts = data.split(":");
    const roomCode = parts[2];
    const qType = parts[3] as "text" | "audio" | "image";
    deps.setState(uid, { t: "gr_q_body", roomCode, qType } as GrState);
    await ctx.answerCallbackQuery();
    const prompt =
      qType === "audio"
        ? "📝 Savol matnini kiriting (audio oldida chiqadi):"
        : qType === "image"
        ? "📝 Savol matnini kiriting (rasm ostida chiqadi):"
        : "📝 Savol matnini kiriting:";
    await ctx.editMessageText(
      `${prompt}\n\n/cancel — bekor qilish`,
      { parse_mode: "Markdown" }
    );
    return true;
  }

  // ── Vaqt tanlash ──
  // gr:timer:<roomCode>:<seconds>
  if (data.startsWith("gr:timer:")) {
    const parts = data.split(":");
    const roomCode = parts[2];
    const timer = parseInt(parts[3], 10);
    const st = deps.getState(uid) as GrState;
    if (st.t !== "gr_q_timer" || st.roomCode !== roomCode) {
      await ctx.answerCallbackQuery();
      return true;
    }
    deps.setState(uid, { ...st, t: "gr_q_points", timer } as GrState);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `✅ Vaqt: *${formatSeconds(timer)}*\n\n💰 Ball miqdorini tanlang:`,
      { parse_mode: "Markdown", reply_markup: grPointsKb(roomCode) }
    );
    return true;
  }

  // ── Ball tanlash va savolni push qilish ──
  // gr:pts:<roomCode>:<points>
  if (data.startsWith("gr:pts:")) {
    const parts = data.split(":");
    const roomCode = parts[2];
    const pointValue = parseInt(parts[3], 10);
    const st = deps.getState(uid) as GrState;
    if (st.t !== "gr_q_points" || st.roomCode !== roomCode) {
      await ctx.answerCallbackQuery();
      return true;
    }
    deps.clearState(uid);
    await ctx.answerCallbackQuery("⏳ Savol yuborilmoqda...");
    await ctx.editMessageText("⏳ Savol push qilinmoqda...");
    try {
      const question = await deps.apiPost(
        `/api/gamerooms/admin/rooms/${roomCode}/questions`,
        {
          questionType: st.qType,
          body: st.qBody,
          mediaRef: st.mediaRef || "",
          caption: st.caption || "",
          correctAnswer: st.correctAnswer || "",
          timeLimitSeconds: st.timer,
          pointValue,
          isBonus: false,
          isQuick: st.timer <= 30,
        }
      );
      const summaryLines = [
        `✅ *Savol push qilindi!*`,
        ``,
        `📝 ${question.body?.slice(0, 80) ?? st.qBody.slice(0, 80)}`,
        `⏱ Vaqt: ${formatSeconds(question.timeLimitSeconds)}`,
        `💰 Ball: ${question.pointValue}`,
        question.correctAnswer ? `✓ To'g'ri javob: ${question.correctAnswer}` : `⚠️ To'g'ri javob kiritilmagan — keyin o'rnating`,
        ``,
        `👥 Ishtirokchilarga xabar yuborilmoqda...`,
      ];
      await ctx.editMessageText(summaryLines.join("\n"), { parse_mode: "Markdown" });
      // Barcha ishtirokchilarga broadcast
      await broadcastQuestion(deps.bot, roomCode, question);
      // Admin uchun boshqaruv klaviatura
      await deps.bot.api.sendMessage(
        uid,
        `📋 *${roomCode} — Savol #${question.orderIndex} aktiv*\n\nAdmin amallarini tanlang:`,
        { parse_mode: "Markdown", reply_markup: grAdminRoomKb(roomCode) }
      );
    } catch (e: any) {
      await ctx.editMessageText(`❌ Savol yuborib bo'lmadi: ${e?.message}`);
      await deps.bot.api.sendMessage(uid, "Admin panel:", { reply_markup: deps.ADMIN_KB });
    }
    return true;
  }

  // ── O'yinni boshlash ──
  // gr:start:<roomCode>
  if (data.startsWith("gr:start:")) {
    const roomCode = data.slice(9);
    await ctx.answerCallbackQuery("▶️ Boshlanmoqda...");
    try {
      const state = await deps.apiPost(
        `/api/gamerooms/admin/rooms/${roomCode}/start`,
        {}
      );
      const count = state.participantCount ?? 0;
      await ctx.editMessageText(
        `▶️ *O'yin boshlandi!* Xona: \`${roomCode}\`\n\n👥 Ishtirokchilar: ${count} ta\n\nSavol yuborish uchun tugmani bosing:`,
        { parse_mode: "Markdown", reply_markup: grAdminRoomKb(roomCode) }
      );
      await broadcastMessage(deps.bot, roomCode, `🎮 *O'yin boshlandi!* Xona: \`${roomCode}\`\n\nAdmin birinchi savolni yuboradi. Tayyor bo'ling!`);
    } catch (e: any) {
      await ctx.answerCallbackQuery(`❌ ${e?.message}`, { show_alert: true });
    }
    return true;
  }

  // ── Savol push qilish (admin panel tugmasidan) ──
  if (data.startsWith("gr:pushq:")) {
    const roomCode = data.slice(9);
    await ctx.answerCallbackQuery();
    await handleGrPushQuestion(ctx, deps, roomCode);
    return true;
  }

  // ── Aktiv savolni yopish ──
  if (data.startsWith("gr:closeq:")) {
    const roomCode = data.slice(10);
    await ctx.answerCallbackQuery("⏳ Yopilmoqda...");
    try {
      // Joriy aktiv savolni topish
      const state = await deps.apiGet(`/api/gamerooms/rooms/${roomCode}/state?adminView=1`);
      const cq = state.currentQuestion;
      if (!cq) {
        await ctx.answerCallbackQuery("❌ Hozir aktiv savol yo'q", { show_alert: true });
        return true;
      }
      await deps.apiPost(
        `/api/gamerooms/admin/rooms/${roomCode}/questions/${cq.id}/close`,
        {}
      );
      await ctx.editMessageText(
        `✅ Savol yopildi.\n\n📋 Endi javoblarni ko'rish yoki baholashingiz mumkin:`,
        { reply_markup: grAdminRoomKb(roomCode) }
      );
      await broadcastMessage(deps.bot, roomCode, `⏰ *Savol yopildi!*\n\nJavoblar qabul qilinmaydi. Admin natijalarni ko'rib chiqmoqda...`);
    } catch (e: any) {
      await ctx.answerCallbackQuery(`❌ ${e?.message}`, { show_alert: true });
    }
    return true;
  }

  // ── Javoblarni ko'rish ──
  if (data.startsWith("gr:subs:")) {
    const roomCode = data.slice(8);
    await ctx.answerCallbackQuery("⏳ Yuklanmoqda...");
    await showSubmissions(ctx, deps, uid, roomCode);
    return true;
  }

  // ── Auto-grade ──
  // gr:autograde:<roomCode>:<questionId>
  if (data.startsWith("gr:autograde:")) {
    const parts = data.split(":");
    const roomCode = parts[2];
    const questionId = parseInt(parts[3], 10);
    await ctx.answerCallbackQuery("🤖 Baholanmoqda...");
    try {
      const result = await deps.apiPost(
        `/api/gamerooms/admin/rooms/${roomCode}/questions/${questionId}/auto-grade`,
        {}
      );
      await ctx.editMessageText(
        `🤖 *Avto-baholash tugadi!*\n\n` +
        `✅ To'g'ri: ${result.correctCount}\n` +
        `❌ Noto'g'ri: ${(result.gradedCount ?? 0) - (result.correctCount ?? 0)}\n` +
        `⏭ O'tkazildi: ${result.skippedCount ?? 0}\n\n` +
        `Keyingi amal:`,
        { parse_mode: "Markdown", reply_markup: grAdminRoomKb(roomCode) }
      );
    } catch (e: any) {
      // Agar to'g'ri javob kiritilmagan bo'lsa — set_correct_answer oqimiga o'tamiz
      if (e?.message?.includes("To'g'ri javob kiritilmagan") || e?.message?.includes("set_correct_answer")) {
        deps.setState(uid, { t: "gr_correct_answer", roomCode, questionId } as GrState);
        await ctx.editMessageText(
          `⚠️ To'g'ri javob kiritilmagan!\n\n✏️ To'g'ri javobni kiriting:`,
          { parse_mode: "Markdown" }
        );
      } else {
        await ctx.answerCallbackQuery(`❌ ${e?.message}`, { show_alert: true });
      }
    }
    return true;
  }

  // ── Manual grade ──
  // gr:grade:<roomCode>:<submissionId>:<1|0>
  if (data.startsWith("gr:grade:")) {
    const parts = data.split(":");
    const roomCode = parts[2];
    const submissionId = parseInt(parts[3], 10);
    const isCorrect = parts[4] === "1";
    await ctx.answerCallbackQuery(isCorrect ? "✅ To'g'ri" : "❌ Noto'g'ri");
    try {
      await deps.apiPatch(
        `/api/gamerooms/admin/rooms/${roomCode}/submissions/${submissionId}/grade`,
        { isCorrect }
      );
      // Xabarni yangilab keyingi submission'ga o'tamiz
      await ctx.editMessageText(
        `${isCorrect ? "✅ To'g'ri" : "❌ Noto'g'ri"} deb belgilandi.`,
        { reply_markup: grAdminRoomKb(roomCode) }
      );
    } catch (e: any) {
      await ctx.answerCallbackQuery(`❌ ${e?.message}`, { show_alert: true });
    }
    return true;
  }

  // ── Statistika ──
  if (data.startsWith("gr:stats:")) {
    const roomCode = data.slice(9);
    await ctx.answerCallbackQuery("📊 Yuklanmoqda...");
    await showRoomStats(ctx, deps, roomCode);
    return true;
  }

  // ── Leaderboard ──
  if (data.startsWith("gr:lb:")) {
    const roomCode = data.slice(6);
    await ctx.answerCallbackQuery("🏆 Yuklanmoqda...");
    await showLeaderboard(ctx, deps, roomCode);
    return true;
  }

  // ── Natijalar eksport ──
  if (data.startsWith("gr:results:")) {
    const roomCode = data.slice(11);
    await ctx.answerCallbackQuery("📥 Tayyorlanmoqda...");
    await exportResults(ctx, deps, uid, roomCode);
    return true;
  }

  // ── O'yinni yakunlash ──
  if (data.startsWith("gr:finish:")) {
    const roomCode = data.slice(10);
    await ctx.answerCallbackQuery("🏁 Yakunlanmoqda...");
    try {
      const state = await deps.apiPost(
        `/api/gamerooms/admin/rooms/${roomCode}/finish`,
        {}
      );
      const lb = state.leaderboard ?? [];
      const top = lb.slice(0, 3);
      const podiumLines = top.map((p: any, i: number) =>
        `${MEDALS[i] ?? `${i + 1}.`} *${p.displayName}* — ${p.totalPoints} ball`
      ).join("\n");

      await ctx.editMessageText(
        `🏁 *O'yin yakunlandi!* Xona: \`${roomCode}\`\n\n🏆 *Yakuniy reyting:*\n\n${podiumLines || "_Ishtirokchilar yo'q_"}`,
        { parse_mode: "Markdown" }
      );
      // Ishtirokchilarga xabar
      await broadcastMessage(
        deps.bot, roomCode,
        `🏁 *O'yin tugadi!*\n\n🏆 *Yakuniy reyting:*\n\n${podiumLines || "_Ishtirokchilar yo'q_"}\n\n🎉 O'ynaganliklari uchun rahmat!`
      );
      await deps.bot.api.sendMessage(uid, "Admin panel:", { reply_markup: deps.ADMIN_KB });
    } catch (e: any) {
      await ctx.answerCallbackQuery(`❌ ${e?.message}`, { show_alert: true });
    }
    return true;
  }

  // ── Admin: panel tugmasi (submissions ko'rish sahifasidan qaytish) ──
  if (data.startsWith("gr:panel:")) {
    const roomCode = data.slice(9);
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `📋 *${roomCode}* — Admin paneli:`,
      { parse_mode: "Markdown", reply_markup: grAdminRoomKb(roomCode) }
    );
    return true;
  }

  // ── Excel yuklab olish ──
  // gr:xlsx:<roomCode>
  if (data.startsWith("gr:xlsx:")) {
    if (!deps.isAdmin(uid)) { await ctx.answerCallbackQuery(); return true; }
    const roomCode = data.slice(8);
    await ctx.answerCallbackQuery("📊 Excel tayyorlanmoqda...");
    await exportResultsXlsx(ctx, deps, uid, roomCode);
    return true;
  }

  // ── Savolni bekor qilish (tasdiqlash) ──
  // gr:cancelq:<roomCode>
  if (data.startsWith("gr:cancelq:")) {
    if (!deps.isAdmin(uid)) { await ctx.answerCallbackQuery(); return true; }
    const roomCode = data.slice(11);
    await ctx.answerCallbackQuery("⏳ Tekshirilmoqda...");
    try {
      const state = await deps.apiGet(`/api/gamerooms/rooms/${roomCode}/state?adminView=1`);
      const cq = state.currentQuestion;
      if (!cq) {
        await ctx.answerCallbackQuery("❌ Hozir aktiv savol yo'q", { show_alert: true });
        return true;
      }
      deps.setState(uid, { t: "gr_cancel_q_confirm", roomCode, questionId: cq.id } as GrState);
      await ctx.reply(
        `⚠️ *Savol bekor qilinsinmi?*\n\n` +
        `❓ #${cq.orderIndex}: ${(cq.body ?? "").slice(0, 80)}\n\n` +
        `Bekor qilinsa, ushbu savol o'chiriladi va barcha yuborilgan javoblar hamda ball qaytariladi.`,
        {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard()
            .text("🚫 Ha, bekor qilish", `gr:cancelq_do:${roomCode}:${cq.id}`)
            .text("↩️ Yo'q", `gr:panel:${roomCode}`),
        }
      );
    } catch (e: any) {
      await ctx.answerCallbackQuery(`❌ ${e?.message}`, { show_alert: true });
    }
    return true;
  }

  // gr:cancelq_do:<roomCode>:<questionId>
  if (data.startsWith("gr:cancelq_do:")) {
    if (!deps.isAdmin(uid)) { await ctx.answerCallbackQuery(); return true; }
    const parts = data.split(":");
    const roomCode = parts[2];
    const questionId = parseInt(parts[3], 10);
    await ctx.answerCallbackQuery("🚫 Bekor qilinmoqda...");
    try {
      const result = await deps.apiPost(
        `/api/gamerooms/admin/rooms/${roomCode}/questions/${questionId}/cancel`,
        {}
      );
      deps.clearState(uid);
      const deleted = result.deletedSubmissionsCount ?? 0;
      const reversed = (result.pointsReversedFor ?? []).length;
      await ctx.editMessageText(
        `🚫 *Savol bekor qilindi!*\n\n` +
        `🗑 O'chirilgan javoblar: ${deleted} ta\n` +
        `↩️ Ball qaytarilgan ishtirokchilar: ${reversed} ta\n\n` +
        `Keyingi savolni yuboring:`,
        { parse_mode: "Markdown", reply_markup: grAdminRoomKb(roomCode) }
      );
    } catch (e: any) {
      deps.clearState(uid);
      await ctx.answerCallbackQuery(`❌ ${e?.message}`, { show_alert: true });
      await deps.bot.api.sendMessage(uid, "Admin paneli:", { reply_markup: grAdminRoomKb(roomCode) });
    }
    return true;
  }

  // ── Bankka saqlash ──
  // gr:savebank:<roomCode>
  if (data.startsWith("gr:savebank:")) {
    if (!deps.isAdmin(uid)) { await ctx.answerCallbackQuery(); return true; }
    const roomCode = data.slice(12);
    await ctx.answerCallbackQuery("💾 Saqlanmoqda...");
    try {
      const result = await deps.apiPost(
        `/api/gamerooms/admin/rooms/${roomCode}/save-to-bank`,
        {}
      );
      const saved = result.savedCount ?? 0;
      const skipped = result.skippedCount ?? 0;
      const already = result.alreadySavedCount ?? 0;
      const total = result.totalTextQuestions ?? 0;
      await ctx.reply(
        `💾 *Savol bankka saqlash natijasi*\n\n` +
        `✅ Saqlandi: ${saved} ta\n` +
        `⏭ O'tkazib yuborildi: ${skipped} ta\n` +
        (already > 0 ? `🔁 Avval saqlangan: ${already} ta\n` : "") +
        `📝 Jami matnli savollar: ${total} ta`,
        { parse_mode: "Markdown", reply_markup: grAdminRoomKb(roomCode) }
      );
    } catch (e: any) {
      await ctx.reply(`❌ Saqlashda xatolik: ${e?.message}`, { reply_markup: grAdminRoomKb(roomCode) });
    }
    return true;
  }

  // ── Oldingi o'yinlar ro'yxati ──
  // gr:myrooms
  if (data === "gr:myrooms") {
    if (!deps.isAdmin(uid)) { await ctx.answerCallbackQuery(); return true; }
    await ctx.answerCallbackQuery("📋 Yuklanmoqda...");
    await showAdminRooms(ctx, deps);
    return true;
  }

  // ── Oldingi xona ochish ──
  // gr:openroom:<roomCode>
  if (data.startsWith("gr:openroom:")) {
    if (!deps.isAdmin(uid)) { await ctx.answerCallbackQuery(); return true; }
    const roomCode = data.slice(12);
    await ctx.answerCallbackQuery("📋 Yuklanmoqda...");
    await openAdminRoom(ctx, deps, roomCode);
    return true;
  }

  // ── Ishtirokchi: xona kodi qo'lda kiritish boshlash ──
  if (data === "gr:join_manual") {
    deps.setState(uid, { t: "gr_join_code" } as GrState);
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "🎮 *Xonaga kirish*\n\n6 belgili xona kodini kiriting:\n\n/cancel — bekor qilish",
      { parse_mode: "Markdown" }
    );
    return true;
  }

  // ── Ishtirokchi: o'z reytingini ko'rish ──
  // gr:myrk:<roomCode>
  if (data.startsWith("gr:myrk:")) {
    const roomCode = data.slice(8);
    await ctx.answerCallbackQuery("🏆 Yuklanmoqda...");
    await showParticipantLeaderboard(ctx, deps, uid, roomCode);
    return true;
  }

  await ctx.answerCallbackQuery();
  return true;
}

// ─── Ishtirokchi: xona join ──────────────────────────────────────────────────

/** /start room_<CODE> deep link yoki qo'lda kod kiritganda chaqiriladi */
export async function handleDeepLinkJoin(ctx: any, deps: GrBotDeps, code: string) {
  const uid: number = ctx.from!.id;
  // Avval xona mavjudligini tekshirish (state endpoint'i)
  try {
    const state = await deps.apiGet(`/api/gamerooms/rooms/${code}/state`);
    if (state.status === "finished") {
      await ctx.reply(`❌ *${code}* xonasi tugagan — kirib bo'lmaydi.`, { parse_mode: "Markdown" });
      return;
    }
    deps.setState(uid, {
      t: "gr_join_name",
      roomCode: code,
      roomName: state.name ?? code,
      hasPassword: state.hasPassword ?? false,
    } as GrState);
    await ctx.reply(
      `🎮 *${state.name ?? code}* xonasiga kirish\n\n` +
      `👥 Ishtirokchilar: ${state.participantCount ?? 0}\n` +
      `🔒 Parol: ${state.hasPassword ? "kerak" : "shart emas"}\n\n` +
      `✏️ Taxallusingizni kiriting (xonada ko'rinadigan ism):`,
      { parse_mode: "Markdown" }
    );
  } catch (e: any) {
    await ctx.reply(
      `❌ Xona topilmadi: \`${code}\`\n\nKodni tekshirib qaytadan urinib ko'ring.`,
      { parse_mode: "Markdown" }
    );
  }
}

async function handleJoinCodeEntered(ctx: any, deps: GrBotDeps, uid: number, code: string) {
  if (code.length !== 6) {
    await ctx.reply("❌ Xona kodi 6 ta belgidan iborat bo'lishi kerak. Qaytadan kiriting:");
    return;
  }
  try {
    const state = await deps.apiGet(`/api/gamerooms/rooms/${code}/state`);
    if (state.status === "finished") {
      deps.clearState(uid);
      await ctx.reply(`❌ *${code}* xonasi tugagan — kirib bo'lmaydi.`, { parse_mode: "Markdown" });
      return;
    }
    deps.setState(uid, {
      t: "gr_join_name",
      roomCode: code,
      roomName: state.name ?? code,
      hasPassword: state.hasPassword ?? false,
    } as GrState);
    await ctx.reply(
      `✅ Xona topildi: *${state.name ?? code}*\n\n✏️ Taxallusingizni kiriting:`,
      { parse_mode: "Markdown" }
    );
  } catch (e: any) {
    deps.clearState(uid);
    await ctx.reply(`❌ Xona topilmadi. Kodni tekshiring va qaytadan urinib ko'ring.`);
  }
}

async function doJoinRoom(
  ctx: any,
  deps: GrBotDeps,
  uid: number,
  roomCode: string,
  roomName: string,
  displayName: string,
  joinPassword: string,
) {
  try {
    const result = await deps.apiPostOnBehalf(
      `/api/gamerooms/rooms/${roomCode}/join`,
      { displayName, joinPassword },
      uid,
    );
    // Ishtirokchini xonaning in-memory ro'yxatiga qo'shamiz (broadcast uchun)
    addRoomParticipant(roomCode, uid);

    const status = result.status;
    const count = result.participantCount ?? 0;
    const cq = result.currentQuestion;

    let statusMsg =
      status === "waiting"
        ? "⏳ O'yin hali boshlanmagan. Admin o'yinni boshlaganida xabar olasiz."
        : status === "active"
        ? "🎮 O'yin jarayonda!"
        : "🏁 O'yin tugagan.";

    deps.setState(uid, { t: "idle" } as BotState);

    await ctx.reply(
      `✅ *${roomName}* xonasiga qo'shildingiz!\n\n` +
      `👤 Taxallus: *${displayName}*\n` +
      `👥 Ishtirokchilar: ${count}\n\n` +
      `${statusMsg}`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard()
          .text("🏆 Reytingni ko'rish", `gr:myrk:${roomCode}`),
      }
    );

    // Agar aktiv savol bo'lsa — darhol yuborish
    if (cq && cq.status === "active" && !cq.isExpired) {
      const deadline = cq.activatedAt
        ? new Date(cq.activatedAt).getTime() + cq.timeLimitSeconds * 1000
        : Date.now() + cq.timeRemainingMs;
      deps.setState(uid, { t: "gr_awaiting_answer", roomCode, questionId: cq.id, deadline } as GrState);
      const remaining = Math.round(cq.timeRemainingMs / 1000);
      await ctx.reply(
        `❓ *Hozir aktiv savol bor!*\n\n${formatQuestion(cq)}\n\n⏰ Qolgan vaqt: ~${remaining}s`,
        { parse_mode: "Markdown" }
      );
      await ctx.reply(
        `✍️ Javobingizni matn sifatida yuboring.\n_Deadline'gacha qayta yuborsangiz, javobingiz yangilanadi._`,
        { parse_mode: "Markdown" }
      );
    }
  } catch (e: any) {
    deps.clearState(uid);
    const msg = e?.message ?? "Noma'lum xato";
    if (msg.includes("parol") || msg.includes("Noto'g'ri")) {
      await ctx.reply(`❌ ${msg}\n\nQaytadan urinib ko'ring yoki /cancel`);
    } else {
      await ctx.reply(`❌ Xonaga kirib bo'lmadi: ${msg}`);
    }
  }
}

// ─── Ishtirokchi: javob yuborish ─────────────────────────────────────────────

async function doSubmitAnswer(
  ctx: any,
  deps: GrBotDeps,
  uid: number,
  roomCode: string,
  questionId: number,
  answerText: string,
  deadline: number,
) {
  try {
    await deps.apiPostOnBehalf(
      `/api/gamerooms/rooms/${roomCode}/answer`,
      { questionId, answer: answerText },
      uid,
    );
    const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
    await ctx.reply(
      `✅ *Javob qabul qilindi!*\n\n📝 Javobingiz: _${answerText}_\n\n⏰ Qolgan vaqt: ~${remaining}s\n\n_Deadline'gacha yana yuborsangiz, yangilanadi._`,
      { parse_mode: "Markdown" }
    );
    // Holat saqlanadi — qayta yuborish mumkin
  } catch (e: any) {
    const msg = e?.message ?? "Noma'lum xato";
    if (msg.includes("Vaqt tugadi") || msg.includes("aktiv emas")) {
      deps.clearState(uid);
      await ctx.reply(`⏰ *Vaqt tugadi!* Javob qabul qilinmaydi.`, { parse_mode: "Markdown" });
    } else if (msg.includes("ro'yxatdan o'tmagan")) {
      deps.clearState(uid);
      await ctx.reply(`❌ Siz bu xonada ro'yxatdan o'tmagansiz. /start orqali qaytadan kirish.`);
    } else {
      await ctx.reply(`❌ Javob yuborib bo'lmadi: ${msg}`);
    }
  }
}

// ─── Admin: submissions ko'rish ─────────────────────────────────────────────

async function showSubmissions(ctx: any, deps: GrBotDeps, uid: number, roomCode: string) {
  try {
    // Joriy aktiv/yopiq savolni topish
    const state = await deps.apiGet(`/api/gamerooms/rooms/${roomCode}/state?adminView=1`);
    const cq = state.currentQuestion;
    if (!cq) {
      await ctx.reply(
        "❌ Hozir aktiv savol yo'q.\n\nSavol push qiling yoki avval savolni yoping.",
        { reply_markup: grAdminRoomKb(roomCode) }
      );
      return;
    }
    const subs = await deps.apiGet(
      `/api/gamerooms/admin/rooms/${roomCode}/questions/${cq.id}/submissions`
    );
    const submissions: any[] = subs.submissions ?? [];
    if (!submissions.length) {
      await ctx.reply(
        `📋 *Savol #${cq.orderIndex}:* ${cq.body?.slice(0, 60)}\n\nHozircha javoblar yo'q.`,
        { parse_mode: "Markdown", reply_markup: grAdminRoomKb(roomCode) }
      );
      return;
    }

    const lines = submissions.map((s: any, i: number) => {
      const status =
        s.isCorrect === true ? "✅" :
        s.isCorrect === false ? "❌" :
        "⏳";
      return `${i + 1}. ${status} *${s.participantName}*: _${s.answerText?.slice(0, 60)}_`;
    }).join("\n");

    const ungraded = submissions.filter((s: any) => s.isCorrect === null);
    const gradingKb = new InlineKeyboard();

    // Auto-grade tugmasi
    gradingKb.row().text("🤖 Avto-baholash", `gr:autograde:${roomCode}:${cq.id}`);

    // Baholanmagan har biriga qo'lda baholash tugmalari (max 5 ta ko'rsatamiz)
    const show = ungraded.slice(0, 5);
    for (const s of show) {
      gradingKb.row()
        .text(`✅ ${s.participantName?.slice(0, 12)}`, `gr:grade:${roomCode}:${s.submissionId}:1`)
        .text(`❌ ${s.participantName?.slice(0, 12)}`, `gr:grade:${roomCode}:${s.submissionId}:0`);
    }
    gradingKb.row().text("🔄 Yangilash", `gr:subs:${roomCode}`).text("⬅️ Panel", `gr:panel:${roomCode}`);

    await ctx.reply(
      `📋 *Savol #${cq.orderIndex}* — ${cq.status === "active" ? "🔴 Aktiv" : "⚫ Yopiq"}\n\n` +
      `❓ ${cq.body?.slice(0, 80)}\n` +
      (subs.correctAnswer ? `✓ To'g'ri: _${subs.correctAnswer}_\n` : "") +
      `\n👥 Javoblar (${submissions.length} ta):\n\n${lines}`,
      { parse_mode: "Markdown", reply_markup: gradingKb }
    );
  } catch (e: any) {
    await ctx.reply(`❌ Javoblarni olib bo'lmadi: ${e?.message}`, { reply_markup: grAdminRoomKb(roomCode) });
  }
}

// ─── Admin: statistika ───────────────────────────────────────────────────────

async function showRoomStats(ctx: any, deps: GrBotDeps, roomCode: string) {
  try {
    const stats = await deps.apiGet(`/api/gamerooms/admin/rooms/${roomCode}/stats`);
    const qCount = stats.questionCount ?? 0;
    const pCount = stats.participantCount ?? 0;
    const qLines = (stats.questionStats ?? []).slice(0, 8).map((q: any) =>
      `  #${q.orderIndex}. ${q.body?.slice(0, 40)} — ✅${q.correctCount}/${q.totalSubmissions} (${q.correctRate}%)`
    ).join("\n");

    const hardest = stats.hardestQuestion;
    const hardLine = hardest
      ? `\n\n🔴 *Eng qiyin:* #${hardest.orderIndex}. ${hardest.body?.slice(0, 40)} (${hardest.correctRate}%)`
      : "";

    await ctx.reply(
      `📊 *${stats.roomName}* statistikasi\n\n` +
      `👥 Ishtirokchilar: ${pCount}\n` +
      `❓ Savollar: ${qCount}\n\n` +
      `📋 *Savollar bo'yicha:*\n${qLines || "_Savollar yo'q_"}` +
      hardLine,
      { parse_mode: "Markdown", reply_markup: grAdminRoomKb(roomCode) }
    );
  } catch (e: any) {
    await ctx.reply(`❌ Statistikani olib bo'lmadi: ${e?.message}`);
  }
}

// ─── Admin: leaderboard ──────────────────────────────────────────────────────

async function showLeaderboard(ctx: any, deps: GrBotDeps, roomCode: string) {
  try {
    const data = await deps.apiGet(`/api/gamerooms/rooms/${roomCode}/leaderboard`);
    const lb: any[] = data.leaderboard ?? [];
    const winners: any[] = data.winners ?? [];

    const podiumText = winners.length
      ? `🏆 *G'oliblar:*\n${winners.map((p: any, i: number) => `${MEDALS[i]} *${p.displayName}* — ${p.totalPoints} ball`).join("\n")}\n\n`
      : "";

    await ctx.reply(
      `🏆 *${data.roomName}* reytingi\n\n` +
      podiumText +
      `👥 *Barcha ishtirokchilar:*\n${formatLeaderboard(lb)}`,
      { parse_mode: "Markdown", reply_markup: grAdminRoomKb(roomCode) }
    );
  } catch (e: any) {
    await ctx.reply(`❌ Reytingni olib bo'lmadi: ${e?.message}`);
  }
}

// ─── Ishtirokchi: leaderboard ────────────────────────────────────────────────

async function showParticipantLeaderboard(ctx: any, deps: GrBotDeps, uid: number, roomCode: string) {
  try {
    const data = await deps.apiGet(`/api/gamerooms/rooms/${roomCode}/leaderboard`);
    const lb: any[] = data.leaderboard ?? [];
    const myEntry = lb.find((p: any) => p.telegramId === uid);
    const myRank = myEntry ? lb.indexOf(myEntry) + 1 : null;

    const myLine = myEntry
      ? `\n\n👤 *Sizning o'rningiz: ${myRank}* — ${myEntry.totalPoints} ball`
      : "";

    await ctx.reply(
      `🏆 *${data.roomName}* reytingi\n\n${formatLeaderboard(lb)}${myLine}`,
      { parse_mode: "Markdown" }
    );
  } catch (e: any) {
    await ctx.reply(`❌ Reytingni olib bo'lmadi: ${e?.message}`);
  }
}

// ─── Admin: natijalar CSV eksport ────────────────────────────────────────────

async function exportResults(ctx: any, deps: GrBotDeps, uid: number, roomCode: string) {
  try {
    const data = await deps.apiGet(`/api/gamerooms/admin/rooms/${roomCode}/results`);
    const questions: any[] = data.questions ?? [];
    const participants: any[] = data.participants ?? [];

    // CSV yaratish
    const BOM = "﻿";
    const qHeaders = questions.map((q: any) => `"Savol #${q.orderIndex}: ${(q.body ?? "").replace(/"/g, '""').slice(0, 40)}"`).join(",");
    const header = `O'rin,Ism,Jami ball,${qHeaders}`;

    const rows = participants.map((p: any) => {
      const answers = questions.map((q: any) => {
        const ans = p.answers?.find((a: any) => a.questionId === q.id);
        if (!ans || ans.answerText == null) return '""';
        const correctMark = ans.isCorrect === true ? "✓" : ans.isCorrect === false ? "✗" : "?";
        return `"${correctMark} ${(ans.answerText ?? "").replace(/"/g, '""')}"`;
      }).join(",");
      return `${p.rank},"${(p.displayName ?? "").replace(/"/g, '""')}",${p.totalPoints},${answers}`;
    });

    const csv = BOM + [header, ...rows].join("\n");
    const buf = Buffer.from(csv, "utf-8");
    const date = new Date().toISOString().slice(0, 10);

    await ctx.replyWithDocument(
      new InputFile(buf, `zakovat_room_${roomCode}_${date}.csv`),
      {
        caption:
          `📥 *${data.roomName}* natijalar\n` +
          `👥 Ishtirokchilar: ${participants.length}\n` +
          `❓ Savollar: ${questions.length}\n` +
          `📅 ${date}`,
        parse_mode: "Markdown",
      }
    );
  } catch (e: any) {
    await ctx.reply(`❌ Eksport xatoligi: ${e?.message}`);
  }
}

// ─── Admin: Excel eksport ────────────────────────────────────────────────────

async function exportResultsXlsx(ctx: any, deps: GrBotDeps, uid: number, roomCode: string) {
  try {
    const buf = await apiBinaryGet(deps, `/api/gamerooms/admin/rooms/${roomCode}/results.xlsx`);
    const date = new Date().toISOString().slice(0, 10);
    await ctx.replyWithDocument(
      new InputFile(buf, `zakovat_room_${roomCode}_${date}.xlsx`),
      {
        caption:
          `📊 *${roomCode}* — Excel natijalar\n📅 ${date}`,
        parse_mode: "Markdown",
      }
    );
  } catch (e: any) {
    await ctx.reply(`❌ Excel yuklab bo'lmadi: ${e?.message}`);
  }
}

// ─── Admin: o'z xonalari ro'yxati ───────────────────────────────────────────

function statusLabel(status: string): string {
  if (status === "waiting") return "⏳ Kutilmoqda";
  if (status === "active") return "🟢 Aktiv";
  if (status === "finished") return "🏁 Tugagan";
  return status;
}

async function showAdminRooms(ctx: any, deps: GrBotDeps) {
  try {
    const rooms: any[] = await deps.apiGet("/api/gamerooms/admin/rooms");
    if (!rooms.length) {
      await ctx.reply(
        "📋 *Oldingi o'yinlar*\n\n_Hozircha xonalar yo'q._",
        { parse_mode: "Markdown" }
      );
      return;
    }

    const lines = rooms.slice(0, 10).map((r: any, i: number) => {
      const date = r.createdAt ? new Date(r.createdAt).toLocaleDateString("uz-UZ") : "—";
      return (
        `${i + 1}. *${r.name}* [\`${r.code}\`]\n` +
        `   ${statusLabel(r.status)} | 👥 ${r.participantCount ?? 0} | ❓ ${r.questionCount ?? 0} | 📅 ${date}`
      );
    }).join("\n\n");

    const kb = new InlineKeyboard();
    for (const r of rooms.slice(0, 10)) {
      kb.row().text(
        `${statusLabel(r.status)} ${r.name} [${r.code}]`,
        `gr:openroom:${r.code}`
      );
    }

    await ctx.reply(
      `📋 *Oldingi o'yinlar* (${rooms.length} ta)\n\n${lines}`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  } catch (e: any) {
    await ctx.reply(`❌ O'yinlar ro'yxatini olib bo'lmadi: ${e?.message}`);
  }
}

async function openAdminRoom(ctx: any, deps: GrBotDeps, roomCode: string) {
  try {
    // Xona holatini olish
    const state = await deps.apiGet(`/api/gamerooms/rooms/${roomCode}/state`);
    const status: string = state.status ?? "waiting";

    if (status === "finished") {
      // Tugagan xona — statistika/reyting/excel amallarni ko'rsatish
      const kb = new InlineKeyboard()
        .text("📊 Statistika", `gr:stats:${roomCode}`).text("🏆 Reyting", `gr:lb:${roomCode}`).row()
        .text("📥 Natijalar (CSV)", `gr:results:${roomCode}`).text("📊 Excel", `gr:xlsx:${roomCode}`);

      const date = state.finishedAt
        ? new Date(state.finishedAt).toLocaleDateString("uz-UZ")
        : "—";

      await ctx.reply(
        `🏁 *${state.name ?? roomCode}* — Tugagan\n\n` +
        `🔑 Kod: \`${roomCode}\`\n` +
        `👥 Ishtirokchilar: ${state.participantCount ?? 0}\n` +
        `📅 Tugagan: ${date}\n\n` +
        `Natijalarni ko'rish uchun tugmani bosing:`,
        { parse_mode: "Markdown", reply_markup: kb }
      );
    } else {
      // Aktiv yoki kutilayotgan xona — admin panelini ko'rsatish
      const count = state.participantCount ?? 0;
      await ctx.reply(
        `${status === "active" ? "🟢" : "⏳"} *${state.name ?? roomCode}* — ${statusLabel(status)}\n\n` +
        `🔑 Kod: \`${roomCode}\`\n` +
        `👥 Ishtirokchilar: ${count}\n\n` +
        `Boshqarish uchun tugmalardan foydalaning:`,
        { parse_mode: "Markdown", reply_markup: grAdminRoomKb(roomCode) }
      );
    }
  } catch (e: any) {
    await ctx.reply(`❌ Xonani ochib bo'lmadi: ${e?.message}`);
  }
}

// ─── Xona yaratish ───────────────────────────────────────────────────────────

async function doCreateRoom(
  ctx: any,
  deps: GrBotDeps,
  uid: number,
  name: string,
  password: string,
) {
  deps.clearState(uid);
  try {
    const result = await deps.apiPost("/api/gamerooms/admin/rooms", {
      name,
      joinPassword: password || "",
    });
    const code: string = result.code;
    const deepLink = `https://t.me/${deps.BOT_USERNAME}?start=room_${code}`;

    const msg =
      `🏟 *Xona yaratildi!*\n\n` +
      `📛 Nomi: *${name}*\n` +
      `🔑 Kod: \`${code}\`\n` +
      (password ? `🔒 Parol: \`${password}\`\n` : `🔓 Parolsiz\n`) +
      `\n🔗 *Deep-link:*\n${deepLink}\n\n` +
      `_Bu havolani ulashib, ishtirokchilar to'g'ridan-to'g'ri qo'shilishi mumkin._`;

    await ctx.reply(msg, {
      parse_mode: "Markdown",
      reply_markup: grAdminRoomKb(code),
    });
    await deps.bot.api.sendMessage(uid, "Admin panel:", { reply_markup: deps.ADMIN_KB });
  } catch (e: any) {
    await ctx.reply(`❌ Xona yaratib bo'lmadi: ${e?.message}`, { reply_markup: deps.ADMIN_KB });
  }
}
