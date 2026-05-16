import { AppError } from "../middleware/error.middleware";
import { supabase } from "../db/supabase";
import type { GameStats, NewGameResult } from "../types";

type StatsRow = {
  correct_count: number;
  total_count: number;
  round_score: number;
};

export const gameResultRepository = {
  async createGameResult(input: NewGameResult): Promise<void> {
    try {
      const { error } = await supabase.from("game_results").insert({
        telegram_id: input.telegramId,
        correct_count: input.correctCount,
        total_count: input.totalCount,
        round_score: input.roundScore
      });

      if (error) {
        throw new AppError(500, "Game result create failed");
      }
    } catch (error) {
      console.error("createGameResult failed", error);
      throw error;
    }
  },

  async getStats(telegramId: number): Promise<GameStats> {
    try {
      const { data, error } = await supabase
        .from("game_results")
        .select("correct_count, total_count, round_score")
        .eq("telegram_id", telegramId)
        .returns<StatsRow[]>();

      if (error) {
        throw new AppError(500, "Game stats lookup failed");
      }

      const rows = data ?? [];
      const totalCorrect = rows.reduce((sum, row) => sum + row.correct_count, 0);
      const totalQuestions = rows.reduce((sum, row) => sum + row.total_count, 0);
      const bestRoundScore = rows.reduce((best, row) => Math.max(best, row.round_score), 0);

      return {
        gamesPlayed: rows.length,
        accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
        bestRoundScore,
        totalCorrect
      };
    } catch (error) {
      console.error("getStats failed", error);
      throw error;
    }
  }
};
