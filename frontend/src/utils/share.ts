const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? "";

export function shareRoundResult(roundPoints: number, correctCount: number, totalQuestions: number): void {
  const text = `\u{1F9E0} Zakovat o'yinida ${roundPoints} ball to'pladim — ${correctCount}/${totalQuestions} to'g'ri javob! Sen ham sinab ko'r:`;
  const botUrl = BOT_USERNAME ? `https://t.me/${BOT_USERNAME}` : "https://t.me";
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botUrl)}&text=${encodeURIComponent(text)}`;
  const telegram = window.Telegram?.WebApp;

  if (telegram?.openTelegramLink) {
    telegram.openTelegramLink(shareUrl);
    return;
  }

  window.open(shareUrl, "_blank", "noopener");
}
