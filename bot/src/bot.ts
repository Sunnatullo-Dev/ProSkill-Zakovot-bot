import "dotenv/config";
import { Bot, GrammyError, HttpError } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
const miniAppUrl = process.env.MINI_APP_URL;
const adminId = process.env.ADMIN_ID;

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN bot/.env faylida ko'rsatilmagan");
}

// Telegram WebApp HTTPS talab qiladi — http URL bot ishga tushishni to'xtatadi.
if (miniAppUrl && !miniAppUrl.startsWith("https://")) {
  throw new Error(
    `MINI_APP_URL HTTPS bo'lishi shart (Telegram WebApp talabi). Hozirgi: ${miniAppUrl}`
  );
}

const bot = new Bot(token);

bot.command("start", async (ctx) => {
  const fullName =
    [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(" ") || "do'st";
  const text = `Assalomu Aleykum, ${fullName}!\n\nPastdagi tugmani bosing \u{1F447}`;

  try {
    if (miniAppUrl) {
      await ctx.reply(text, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "\u{1F9E0} Zakovat o'yinini ochish", web_app: { url: miniAppUrl } }]
          ]
        }
      });
      return;
    }

    await ctx.reply(`${text}\n\n⚠️ MINI_APP_URL bot/.env faylida ko'rsatilmagan.`);
  } catch (error) {
    console.error("/start javobi yuborilmadi", error);
  }
});

// Grammy global error handler — alohida turdagi xatolarni log qilamiz,
// bot ishlashda davom etadi.
bot.catch((err) => {
  const ctx = err.ctx;
  const updateId = ctx?.update?.update_id;

  if (err.error instanceof GrammyError) {
    console.error(`[bot] Telegram API xatosi update=${updateId}`, err.error.description);
  } else if (err.error instanceof HttpError) {
    console.error(`[bot] Tarmoq xatosi update=${updateId}`, err.error.message);
  } else {
    console.error(`[bot] Kutilmagan xato update=${updateId}`, err.error);
  }
});

// Graceful shutdown — kontainerlar SIGTERM yuborganda toza yopiladi.
const stop = (signal: string) => {
  console.log(`Bot ${signal} signali oldi, to'xtatilmoqda...`);
  void bot.stop().finally(() => process.exit(0));
};
process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));

void bot.start({
  onStart: (botInfo) => {
    console.log(`Zakovat bot ishga tushdi: @${botInfo.username}`);

    if (!adminId) {
      console.warn("ADMIN_ID bot/.env faylida ko'rsatilmagan");
    }
    if (!miniAppUrl) {
      console.warn("MINI_APP_URL ko'rsatilmagan — /start tugmasiz xabar yuboradi");
    }
  }
});
