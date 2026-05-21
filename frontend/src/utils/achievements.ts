export type Achievement = {
  id: string;
  label: string;
  icon: string;
  description: string;
  bonus: number;
  unlocked: boolean;
};

type AchievementInput = {
  gamesPlayed: number;
  totalScore: number;
  bestRoundScore: number;
};

const DEFINITIONS = [
  {
    id: "first-game",
    label: "Birinchi qadam",
    icon: "\u{1F3AF}",
    description: "1 ta o'yin o'ynang",
    bonus: 5,
    isUnlocked: (input: AchievementInput) => input.gamesPlayed >= 1
  },
  {
    id: "ten-games",
    label: "Tajribali",
    icon: "\u{1F3AE}",
    description: "10 ta o'yin o'ynang",
    bonus: 15,
    isUnlocked: (input: AchievementInput) => input.gamesPlayed >= 10
  },
  {
    id: "score-100",
    label: "Zukko",
    icon: "\u{1F9E0}",
    description: "100 ball to'plang",
    bonus: 20,
    isUnlocked: (input: AchievementInput) => input.totalScore >= 100
  },
  {
    id: "score-500",
    label: "Daho",
    icon: "\u{1F31F}",
    description: "500 ball to'plang",
    bonus: 50,
    isUnlocked: (input: AchievementInput) => input.totalScore >= 500
  },
  {
    id: "best-round",
    label: "Rekordchi",
    icon: "\u{1F3C6}",
    description: "Bir raundda 20+ ball",
    bonus: 25,
    isUnlocked: (input: AchievementInput) => input.bestRoundScore >= 20
  }
];

export function computeAchievements(input: AchievementInput): Achievement[] {
  return DEFINITIONS.map(({ isUnlocked, ...rest }) => ({
    ...rest,
    unlocked: isUnlocked(input)
  }));
}
