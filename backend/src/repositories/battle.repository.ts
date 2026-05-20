import { AppError } from "../middleware/error.middleware";
import { supabase } from "../db/supabase";
import type {
  BattleChallenge,
  BattleRound,
  BattleStatus,
  DbBattleAnswer,
  DbBattleChallenge,
  DbBattleRound,
  NewBattleAnswer
} from "../types";

const CHALLENGE_COLUMNS =
  "id, challenger_team_id, opponent_team_id, status, current_round_number, created_at, started_at, finished_at";
const ROUND_COLUMNS =
  "id, battle_id, question_id, round_number, time_limit_seconds, started_at, ended_at";
const ANSWER_COLUMNS =
  "id, battle_id, round_id, telegram_id, team_id, answer, is_correct, answered_at, response_time_ms";

function mapChallenge(row: DbBattleChallenge): BattleChallenge {
  return {
    id: row.id,
    challengerTeamId: row.challenger_team_id,
    opponentTeamId: row.opponent_team_id,
    status: row.status,
    currentRoundNumber: row.current_round_number,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at
  };
}

function mapRound(row: DbBattleRound): BattleRound {
  return {
    id: row.id,
    battleId: row.battle_id,
    questionId: row.question_id,
    roundNumber: row.round_number,
    timeLimitSeconds: row.time_limit_seconds,
    startedAt: row.started_at,
    endedAt: row.ended_at
  };
}

type RoundInput = { questionId: string; roundNumber: number; timeLimitSeconds: number };

export const battleRepository = {
  async createChallenge(challengerTeamId: string, opponentTeamId: string): Promise<BattleChallenge> {
    try {
      const { data, error } = await supabase
        .from("battle_challenges")
        .insert({
          challenger_team_id: challengerTeamId,
          opponent_team_id: opponentTeamId,
          status: "pending"
        })
        .select(CHALLENGE_COLUMNS)
        .single<DbBattleChallenge>();

      if (error || !data) {
        throw new AppError(500, "Bellashuv yaratib bo'lmadi");
      }

      return mapChallenge(data);
    } catch (error) {
      console.error("createChallenge failed", error);
      throw error;
    }
  },

  async getChallengeById(id: string): Promise<BattleChallenge | null> {
    try {
      const { data, error } = await supabase
        .from("battle_challenges")
        .select(CHALLENGE_COLUMNS)
        .eq("id", id)
        .maybeSingle<DbBattleChallenge>();

      if (error) {
        throw new AppError(500, "Bellashuvni olib bo'lmadi");
      }

      return data ? mapChallenge(data) : null;
    } catch (error) {
      console.error("getChallengeById failed", error);
      throw error;
    }
  },

  async getActiveChallengesForTeam(teamId: string): Promise<BattleChallenge[]> {
    try {
      const { data, error } = await supabase
        .from("battle_challenges")
        .select(CHALLENGE_COLUMNS)
        .or(`challenger_team_id.eq.${teamId},opponent_team_id.eq.${teamId}`)
        .in("status", ["pending", "accepted", "in_progress"])
        .order("created_at", { ascending: false })
        .returns<DbBattleChallenge[]>();

      if (error) {
        console.error("getActiveChallengesForTeam supabase error", error);
        throw new AppError(500, "Bellashuvlarni olib bo'lmadi");
      }

      return (data ?? []).map(mapChallenge);
    } catch (error) {
      console.error("getActiveChallengesForTeam failed", error);
      throw error;
    }
  },

  async updateStatus(
    id: string,
    status: BattleStatus,
    extra: { startedAt?: string | null; finishedAt?: string | null } = {}
  ): Promise<void> {
    try {
      const update: Record<string, unknown> = { status };

      if (extra.startedAt !== undefined) {
        update.started_at = extra.startedAt;
      }

      if (extra.finishedAt !== undefined) {
        update.finished_at = extra.finishedAt;
      }

      const { error } = await supabase.from("battle_challenges").update(update).eq("id", id);

      if (error) {
        throw new AppError(500, "Bellashuv holatini yangilab bo'lmadi");
      }
    } catch (error) {
      console.error("updateStatus failed", error);
      throw error;
    }
  },

  async setCurrentRound(id: string, roundNumber: number): Promise<void> {
    try {
      const { error } = await supabase
        .from("battle_challenges")
        .update({ current_round_number: roundNumber })
        .eq("id", id);

      if (error) {
        throw new AppError(500, "Round raqamini yangilab bo'lmadi");
      }
    } catch (error) {
      console.error("setCurrentRound failed", error);
      throw error;
    }
  },

  async createRounds(battleId: string, items: RoundInput[]): Promise<void> {
    try {
      const rows = items.map((item) => ({
        battle_id: battleId,
        question_id: item.questionId,
        round_number: item.roundNumber,
        time_limit_seconds: item.timeLimitSeconds
      }));

      const { error } = await supabase.from("battle_rounds").insert(rows);

      if (error) {
        throw new AppError(500, "Round'larni yaratib bo'lmadi");
      }
    } catch (error) {
      console.error("createRounds failed", error);
      throw error;
    }
  },

  async getRounds(battleId: string): Promise<BattleRound[]> {
    try {
      const { data, error } = await supabase
        .from("battle_rounds")
        .select(ROUND_COLUMNS)
        .eq("battle_id", battleId)
        .order("round_number", { ascending: true })
        .returns<DbBattleRound[]>();

      if (error) {
        throw new AppError(500, "Round'larni olib bo'lmadi");
      }

      return (data ?? []).map(mapRound);
    } catch (error) {
      console.error("getRounds failed", error);
      throw error;
    }
  },

  async getRoundByNumber(battleId: string, roundNumber: number): Promise<BattleRound | null> {
    try {
      const { data, error } = await supabase
        .from("battle_rounds")
        .select(ROUND_COLUMNS)
        .eq("battle_id", battleId)
        .eq("round_number", roundNumber)
        .maybeSingle<DbBattleRound>();

      if (error) {
        throw new AppError(500, "Round'ni olib bo'lmadi");
      }

      return data ? mapRound(data) : null;
    } catch (error) {
      console.error("getRoundByNumber failed", error);
      throw error;
    }
  },

  async markRoundStarted(roundId: string): Promise<void> {
    const { error } = await supabase
      .from("battle_rounds")
      .update({ started_at: new Date().toISOString() })
      .eq("id", roundId);

    if (error) {
      throw new AppError(500, "Round'ni boshlab bo'lmadi");
    }
  },

  async markRoundEnded(roundId: string): Promise<void> {
    const { error } = await supabase
      .from("battle_rounds")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", roundId);

    if (error) {
      throw new AppError(500, "Round'ni yakunlab bo'lmadi");
    }
  },

  // Atomik helperlar — concurrent polling vaqtidagi race condition'lardan saqlaydi.
  // Har biri "faqat WHERE shartiga mos qatorga" UPDATE qiladi va qaytarilgan
  // qatorlar soni bilan bizning chaqiruv "g'olib" bo'lganini bildiradi.

  async tryStartGame(battleId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("battle_challenges")
      .update({
        status: "in_progress",
        started_at: new Date().toISOString(),
        current_round_number: 1
      })
      .eq("id", battleId)
      .eq("status", "pending")
      .select("id");

    if (error) {
      throw new AppError(500, "Bellashuvni boshlab bo'lmadi");
    }

    return (data ?? []).length > 0;
  },

  async tryAdvanceCurrentRound(
    battleId: string,
    fromRoundNumber: number,
    toRoundNumber: number
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from("battle_challenges")
      .update({ current_round_number: toRoundNumber })
      .eq("id", battleId)
      .eq("status", "in_progress")
      .eq("current_round_number", fromRoundNumber)
      .select("id");

    if (error) {
      throw new AppError(500, "Roundni o'tkazib bo'lmadi");
    }

    return (data ?? []).length > 0;
  },

  async tryFinalize(battleId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("battle_challenges")
      .update({
        status: "finished",
        finished_at: new Date().toISOString()
      })
      .eq("id", battleId)
      .eq("status", "in_progress")
      .select("id");

    if (error) {
      throw new AppError(500, "Bellashuvni yakunlab bo'lmadi");
    }

    return (data ?? []).length > 0;
  },

  async tryEndRound(roundId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("battle_rounds")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", roundId)
      .is("ended_at", null)
      .select("id");

    if (error) {
      throw new AppError(500, "Round'ni yakunlab bo'lmadi");
    }

    return (data ?? []).length > 0;
  },

  async tryCancelOrDecline(battleId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("battle_challenges")
      .update({ status: "declined" })
      .eq("id", battleId)
      .eq("status", "pending")
      .select("id");

    if (error) {
      throw new AppError(500, "Bellashuvni bekor qilib bo'lmadi");
    }

    return (data ?? []).length > 0;
  },

  async recordAnswer(input: NewBattleAnswer): Promise<{ duplicate: boolean }> {
    try {
      const { error } = await supabase.from("battle_answers").insert({
        battle_id: input.battleId,
        round_id: input.roundId,
        telegram_id: input.telegramId,
        team_id: input.teamId,
        answer: input.answer,
        is_correct: input.isCorrect,
        response_time_ms: input.responseTimeMs
      });

      if (error) {
        const code = (error as { code?: string }).code;

        if (code === "23505") {
          return { duplicate: true };
        }

        throw new AppError(500, "Javobni yozib bo'lmadi");
      }

      return { duplicate: false };
    } catch (error) {
      console.error("recordAnswer failed", error);
      throw error;
    }
  },

  async getAnswersForRound(roundId: string): Promise<DbBattleAnswer[]> {
    try {
      const { data, error } = await supabase
        .from("battle_answers")
        .select(ANSWER_COLUMNS)
        .eq("round_id", roundId)
        .returns<DbBattleAnswer[]>();

      if (error) {
        throw new AppError(500, "Javoblarni olib bo'lmadi");
      }

      return data ?? [];
    } catch (error) {
      console.error("getAnswersForRound failed", error);
      throw error;
    }
  },

  async getAnswersForBattle(battleId: string): Promise<DbBattleAnswer[]> {
    try {
      const { data, error } = await supabase
        .from("battle_answers")
        .select(ANSWER_COLUMNS)
        .eq("battle_id", battleId)
        .returns<DbBattleAnswer[]>();

      if (error) {
        throw new AppError(500, "Bellashuv javoblarini olib bo'lmadi");
      }

      return data ?? [];
    } catch (error) {
      console.error("getAnswersForBattle failed", error);
      throw error;
    }
  }
};
