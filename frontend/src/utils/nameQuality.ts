// Telegram'dan keladigan ism "g'alati" emasligini tekshirish.
// "G'alati" deganda:
//  - emoji (har qanday Unicode emoji bloki)
//  - nuqta `.` belgisi (foydalanuvchi nuqta bilan yashiringan)
//  - Telegram sticker placeholderlar
//  - 2 ta belgidan kam (juda qisqa)
//  - faqat tinish belgilari
//
// Bunday holatda biz foydalanuvchidan haqiqiy ismini so'raymiz.

const EMOJI_RE = /\p{Extended_Pictographic}/u;
const ONLY_PUNCT_RE = /^[\s\p{P}\p{S}]+$/u;

export function isCleanName(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length < 2) return false;
  if (trimmed.length > 60) return false; // Telegram'da bunday uzunlik anomaliya
  if (EMOJI_RE.test(trimmed)) return false;
  if (trimmed.includes(".")) return false;
  if (ONLY_PUNCT_RE.test(trimmed)) return false;
  return true;
}
