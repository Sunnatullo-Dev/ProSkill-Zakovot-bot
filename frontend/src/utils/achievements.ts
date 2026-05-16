export type Achievement = {
  id: string;
  label: string;
  icon: string;
  description: string;
  unlocked: boolean;
};

type AchievementInput = {
  gamesPlayed: number;
  totalScore: number;
  bestRoundScore: number;
  approvedSubmissions: number;
};

export function computeAchievements(input: AchievementInput): Achievement[] {
  return [
    {
      id: "first-game",
      label: "Birinchi qadam",
      icon: "\u{1F3AF}",
      description: "1 ta o'yin o'ynang",
      unlocked: input.gamesPlayed >= 1
    },
    {
      id: "ten-games",
      label: "Tajribali",
      icon: "\u{1F3AE}",
      description: "10 ta o'yin o'ynang",
      unlocked: input.gamesPlayed >= 10
    },
    {
      id: "score-100",
      label: "Zukko",
      icon: "\u{1F9E0}",
      description: "100 ball to'plang",
      unlocked: input.totalScore >= 100
    },
    {
      id: "score-500",
      label: "Daho",
      icon: "\u{1F31F}",
      description: "500 ball to'plang",
      unlocked: input.totalScore >= 500
    },
    {
      id: "best-round",
      label: "Rekordchi",
      icon: "\u{1F3C6}",
      description: "Bir raundda 20+ ball",
      unlocked: input.bestRoundScore >= 20
    },
    {
      id: "author",
      label: "Muallif",
      icon: "✍️",
      description: "Savolingiz tasdiqlansin",
      unlocked: input.approvedSubmissions >= 1
    }
  ];
}
