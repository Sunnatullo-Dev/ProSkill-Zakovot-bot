import { AppError } from "../middleware/error.middleware";
import { supabase } from "../db/supabase";
import type { AppUser, DbUser, TelegramUser } from "../types";

export const userRepository = {
  async upsertTelegramUser(telegramUser: TelegramUser): Promise<AppUser> {
    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          telegram_id: telegramUser.id,
          first_name: telegramUser.first_name ?? null,
          last_name: telegramUser.last_name ?? null,
          username: telegramUser.username ?? null,
          updated_at: new Date().toISOString()
        },
        { onConflict: "telegram_id" }
      )
      .select("id, telegram_id, first_name, last_name, username, score")
      .single<DbUser>();

    if (error || !data) {
      throw new AppError(500, "Foydalanuvchini saqlashda xatolik yuz berdi.");
    }

    return mapUser(data);
  },

  async findByTelegramId(telegramId: number): Promise<AppUser | null> {
    const { data, error } = await supabase
      .from("users")
      .select("id, telegram_id, first_name, last_name, username, score")
      .eq("telegram_id", telegramId)
      .maybeSingle<DbUser>();

    if (error) {
      throw new AppError(500, "Foydalanuvchini olishda xatolik yuz berdi.");
    }

    return data ? mapUser(data) : null;
  },

  async incrementScore(telegramId: number): Promise<AppUser> {
    const user = await userRepository.findByTelegramId(telegramId);

    if (!user) {
      throw new AppError(404, "Foydalanuvchi topilmadi.");
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
      throw new AppError(500, "Ballni yangilashda xatolik yuz berdi.");
    }

    return mapUser(data);
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
