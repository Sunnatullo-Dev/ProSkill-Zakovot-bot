import { env } from "../config/env";

const API_BASE = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

type InlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; web_app?: { url: string } }>>;
};

function miniAppKeyboard(): InlineKeyboard | undefined {
  const url = env.MINI_APP_URL;

  if (!url || !url.startsWith("https://")) {
    return undefined;
  }

  return {
    inline_keyboard: [[{ text: "\u{1F9E0} Mini Appni ochish", web_app: { url } }]]
  };
}

export async function sendMessage(
  chatId: number,
  text: string,
  options: { withMiniAppButton?: boolean } = {}
): Promise<void> {
  if (chatId <= 0) {
    return; // guest yoki noto'g'ri ID
  }

  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true
    };

    if (options.withMiniAppButton !== false) {
      const keyboard = miniAppKeyboard();

      if (keyboard) {
        body.reply_markup = keyboard;
      }
    }

    const response = await fetch(`${API_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const responseText = await response.text();

      console.warn("Telegram sendMessage failed", {
        chatId,
        status: response.status,
        body: responseText.slice(0, 200)
      });
    }
  } catch (error) {
    console.warn("Telegram sendMessage error", { chatId, error });
  }
}

export async function notifyMembers(memberIds: number[], text: string): Promise<void> {
  const unique = Array.from(new Set(memberIds.filter((id) => id > 0)));

  await Promise.all(unique.map((id) => sendMessage(id, text)));
}
