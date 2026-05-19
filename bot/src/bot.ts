import "dotenv/config";
import { Bot } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
const miniAppUrl = process.env.MINI_APP_URL;
const adminId = process.env.ADMIN_ID;

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN bot/.env faylida ko'rsatilmagan");
}

const bot = new Bot(token);

bot.command("start", async (ctx) => {
  const fullName = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(" ") || "do'st";
  const text = `Assalomu Aleykum, ${fullName}!\n\nPastdagi tugmani bosing \u{1F447}`;

  if (miniAppUrl) {
    await ctx.reply(text, {
      reply_markup: {
        inline_keyboard: [[{ text: "\u{1F9E0} Zakovat o'yinini ochish", web_app: { url: miniAppUrl } }]]
      }
    });
    return;
  }

  await ctx.reply(`${text}\n\n⚠️ MINI_APP_URL bot/.env faylida ko'rsatilmagan.`);
});

bot.catch((error) => {
  console.error("Bot xatosi", error);
});

void bot.start({
  onStart: () => {
    console.log("Zakovat bot ishga tushdi");

    if (!adminId) {
      console.warn("ADMIN_ID bot/.env faylida ko'rsatilmagan");
    }
  }
});
