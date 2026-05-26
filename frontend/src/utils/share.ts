const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || "zakovot_robot";

export type ShareContent = {
  url: string;
  text: string;
};

function botLink(startParam?: number): string {
  const base = `https://t.me/${BOT_USERNAME}`;

  return startParam ? `${base}?startapp=${startParam}` : base;
}

function botStartLink(startParam: string): string {
  return `https://t.me/${BOT_USERNAME}?startapp=${encodeURIComponent(startParam)}`;
}

export function buildTeamInviteShare(teamCode: string, teamName: string): ShareContent {
  return {
    url: botStartLink(`join_${teamCode}`),
    text: `⚔️ "${teamName}" jamoasiga qo'shil va Zakovat bilim o'yinida birga o'yna! Havola orqali avtomatik qo'shilasiz:`
  };
}

export function buildBattleInviteShare(myTeamName: string, opponentTeamName: string): ShareContent {
  return {
    url: botStartLink("team"),
    text: `⚔️ "${myTeamName}" jamoasi "${opponentTeamName}" jamoasini bellashuvga chaqirdi! Zakovat o'yiniga kiring va jamoangiz sahifasida qabul qiling:`
  };
}

export function buildRoundShare(
  roundPoints: number,
  correctCount: number,
  totalQuestions: number
): ShareContent {
  return {
    url: botLink(),
    text: `\u{1F9E0} Zakovat o'yinida ${roundPoints} ball to'pladim — ${correctCount}/${totalQuestions} to'g'ri javob! Sen ham sinab ko'r:`
  };
}

export function buildInviteShare(referrerId: number): ShareContent {
  return {
    url: botLink(referrerId),
    text: "\u{1F9E0} Zakovat — bilim o'yiniga qo'shil! Birga o'ynab, kim ko'proq biladi sinab ko'ramiz:"
  };
}

function openExternal(url: string): void {
  const telegram = window.Telegram?.WebApp;

  if (telegram?.openLink) {
    telegram.openLink(url);
    return;
  }

  window.open(url, "_blank", "noopener");
}

export function shareToTelegram(content: ShareContent): void {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(content.url)}&text=${encodeURIComponent(content.text)}`;
  const telegram = window.Telegram?.WebApp;

  if (telegram?.openTelegramLink) {
    telegram.openTelegramLink(shareUrl);
    return;
  }

  window.open(shareUrl, "_blank", "noopener");
}

export function shareToWhatsApp(content: ShareContent): void {
  openExternal(`https://wa.me/?text=${encodeURIComponent(`${content.text} ${content.url}`)}`);
}

export async function copyShareLink(content: ShareContent): Promise<boolean> {
  const value = `${content.text} ${content.url}`;

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return legacyCopy(value);
  }
}

function legacyCopy(value: string): boolean {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);

    return ok;
  } catch {
    return false;
  }
}
