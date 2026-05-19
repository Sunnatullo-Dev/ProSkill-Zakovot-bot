const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || "zakovot_robot";

function botLink(startParam?: number): string {
  if (!BOT_USERNAME) {
    return "https://t.me";
  }

  return startParam ? `https://t.me/${BOT_USERNAME}?startapp=${startParam}` : `https://t.me/${BOT_USERNAME}`;
}

function openShare(linkUrl: string, text: string): void {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(linkUrl)}&text=${encodeURIComponent(text)}`;
  const telegram = window.Telegram?.WebApp;

  if (telegram?.openTelegramLink) {
    telegram.openTelegramLink(shareUrl);
    return;
  }

  window.open(shareUrl, "_blank", "noopener");
}

export function shareRoundResult(roundPoints: number, correctCount: number, totalQuestions: number): void {
  const text = `\u{1F9E0} Zakovat o'yinida ${roundPoints} ball to'pladim — ${correctCount}/${totalQuestions} to'g'ri javob! Sen ham sinab ko'r:`;

  openShare(botLink(), text);
}

export function shareInvite(referrerId: number): void {
  const text = "\u{1F9E0} Zakovat — bilim o'yiniga qo'shil! Birga o'ynab, kim ko'proq biladi sinab ko'ramiz:";

  openShare(botLink(referrerId), text);
}
