// Server-side yutuqlar ro'yxati — frontend `utils/achievements.ts` bilan
// bir xil sinxron bo'lishi kerak. Bonus ballar shu yerda hisoblanadi,
// bazaga `unlocked_achievements` orqali saqlanadi — qaytadan berib
// bo'lmaydi.

export type AchievementStats = {
  gamesPlayed: number;
  totalScore: number;
  bestRoundScore: number;
};

export type AchievementDef = {
  id: string;
  label: string;
  bonus: number;
  isUnlocked: (stats: AchievementStats) => boolean;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-game",
    label: "Birinchi qadam",
    bonus: 5,
    isUnlocked: (s) => s.gamesPlayed >= 1
  },
  {
    id: "ten-games",
    label: "Tajribali",
    bonus: 15,
    isUnlocked: (s) => s.gamesPlayed >= 10
  },
  {
    id: "score-100",
    label: "Zukko",
    bonus: 20,
    isUnlocked: (s) => s.totalScore >= 100
  },
  {
    id: "score-500",
    label: "Daho",
    bonus: 50,
    isUnlocked: (s) => s.totalScore >= 500
  },
  {
    id: "best-round",
    label: "Rekordchi",
    bonus: 25,
    isUnlocked: (s) => s.bestRoundScore >= 20
  }
];

export function findNewlyUnlocked(stats: AchievementStats, already: string[]): AchievementDef[] {
  const seen = new Set(already);

  return ACHIEVEMENTS.filter((a) => !seen.has(a.id) && a.isUnlocked(stats));
}
