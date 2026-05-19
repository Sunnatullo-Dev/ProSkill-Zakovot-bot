import { AppError } from "../middleware/error.middleware";
import { supabase } from "../db/supabase";
import type { AppUser, DbUser, ReferralEntry } from "../types";

const REFERRAL_LEADERBOARD_LIMIT = 20;

export const userRepository = {
  async upsertUser(
    telegramId: number,
    firstName?: string,
    lastName?: string,
    username?: string
  ): Promise<AppUser> {
    try {
      const { data, error } = await supabase
        .from("users")
        .upsert(
          {
            telegram_id: telegramId,
            first_name: firstName ?? null,
            last_name: lastName ?? null,
            username: username ?? null,
            updated_at: new Date().toISOString()
          },
          { onConflict: "telegram_id" }
        )
        .select("id, telegram_id, first_name, last_name, username, score")
        .single<DbUser>();

      if (error || !data) {
        throw new AppError(500, "User upsert failed");
      }

      return mapUser(data);
    } catch (error) {
      console.error("upsertUser failed", error);
      throw error;
    }
  },

  async findByTelegramId(telegramId: number): Promise<AppUser | null> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, telegram_id, first_name, last_name, username, score")
        .eq("telegram_id", telegramId)
        .maybeSingle<DbUser>();

      if (error) {
        throw new AppError(500, "User lookup failed");
      }

      return data ? mapUser(data) : null;
    } catch (error) {
      console.error("findByTelegramId failed", error);
      throw error;
    }
  },

  async addScore(telegramId: number, amount: number): Promise<AppUser> {
    try {
      const user = await userRepository.findByTelegramId(telegramId);

      if (!user) {
        throw new AppError(404, "User not found");
      }

      const { data, error } = await supabase
        .from("users")
        .update({
          score: user.score + amount,
          updated_at: new Date().toISOString()
        })
        .eq("telegram_id", telegramId)
        .select("id, telegram_id, first_name, last_name, username, score")
        .single<DbUser>();

      if (error || !data) {
        throw new AppError(500, "Score update failed");
      }

      return mapUser(data);
    } catch (error) {
      console.error("addScore failed", error);
      throw error;
    }
  },

  async getTopUsers(limit = 10): Promise<AppUser[]> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, telegram_id, first_name, last_name, username, score")
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(limit)
        .returns<DbUser[]>();

      if (error) {
        throw new AppError(500, "Top users lookup failed");
      }

      return (data ?? []).map(mapUser);
    } catch (error) {
      console.error("getTopUsers failed", error);
      throw error;
    }
  },

  async getUserRank(telegramId: number): Promise<number> {
    try {
      const user = await userRepository.findByTelegramId(telegramId);

      if (!user) {
        return 0;
      }

      const { count, error } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .gt("score", user.score);

      if (error) {
        throw new AppError(500, "User rank lookup failed");
      }

      return (count ?? 0) + 1;
    } catch (error) {
      console.error("getUserRank failed", error);
      throw error;
    }
  },

  async setReferrer(userTelegramId: number, referrerTelegramId: number): Promise<void> {
    try {
      if (referrerTelegramId === userTelegramId) {
        return;
      }

      const referrer = await userRepository.findByTelegramId(referrerTelegramId);

      if (!referrer) {
        return;
      }

      const { error } = await supabase
        .from("users")
        .update({ referred_by: referrerTelegramId })
        .eq("telegram_id", userTelegramId)
        .is("referred_by", null);

      if (error) {
        throw new AppError(500, "Referrer update failed");
      }
    } catch (error) {
      console.error("setReferrer failed", error);
      throw error;
    }
  },

  async getReferralCount(telegramId: number): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("referred_by", telegramId);

      if (error) {
        throw new AppError(500, "Referral count failed");
      }

      return count ?? 0;
    } catch (error) {
      console.error("getReferralCount failed", error);
      throw error;
    }
  },

  async getReferralLeaderboard(): Promise<ReferralEntry[]> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("referred_by")
        .not("referred_by", "is", null)
        .returns<Array<{ referred_by: number }>>();

      if (error) {
        throw new AppError(500, "Referral leaderboard failed");
      }

      const counts = new Map<number, number>();

      for (const row of data ?? []) {
        counts.set(row.referred_by, (counts.get(row.referred_by) ?? 0) + 1);
      }

      const top = [...counts.entries()]
        .sort(([, left], [, right]) => right - left)
        .slice(0, REFERRAL_LEADERBOARD_LIMIT);

      if (top.length === 0) {
        return [];
      }

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, telegram_id, first_name, last_name, username, score")
        .in(
          "telegram_id",
          top.map(([id]) => id)
        )
        .returns<DbUser[]>();

      if (usersError) {
        throw new AppError(500, "Referral users lookup failed");
      }

      const userMap = new Map((users ?? []).map((user) => [user.telegram_id, mapUser(user)]));

      return top
        .filter(([id]) => userMap.has(id))
        .map(([id, count]) => ({ user: userMap.get(id) as AppUser, count }));
    } catch (error) {
      console.error("getReferralLeaderboard failed", error);
      throw error;
    }
  }
};

function mapUser(user: DbUser): AppUser {
  return {
    id: user.id,
    telegramId: user.telegram_id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    score: user.score
  };
}
