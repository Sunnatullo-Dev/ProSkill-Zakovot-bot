import { AppError } from "../middleware/error.middleware";
import { supabase } from "../db/supabase";
import type { AppUser, DbUser } from "../types";

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

  async incrementScore(telegramId: number): Promise<AppUser> {
    try {
      const user = await userRepository.findByTelegramId(telegramId);

      if (!user) {
        throw new AppError(404, "User not found");
      }

      const { data, error } = await supabase
        .from("users")
        .update({
          score: user.score + 1,
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
      console.error("incrementScore failed", error);
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
