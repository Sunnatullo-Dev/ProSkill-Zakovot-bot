import { AppError } from "../middleware/error.middleware";
import { supabase } from "../db/supabase";
import type { DbTeam, DbTeamMember, Team, TeamMember, TeamWithMembers } from "../types";

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 6;
const CODE_GENERATION_ATTEMPTS = 8;
const TEAM_COLUMNS = "id, name, code, owner_id, max_members, status, created_at";

function generateCode(): string {
  let code = "";

  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }

  return code;
}

function mapTeam(row: DbTeam): Team {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    ownerId: row.owner_id,
    maxMembers: row.max_members,
    status: row.status,
    createdAt: row.created_at
  };
}

type MemberRow = { telegram_id: number; joined_at: string };
type UserNameRow = { telegram_id: number; first_name: string | null; username: string | null };

async function fetchMembers(teamId: string): Promise<TeamMember[]> {
  const { data: memberRows, error: memberError } = await supabase
    .from("team_members")
    .select("telegram_id, joined_at")
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true })
    .returns<MemberRow[]>();

  if (memberError) {
    throw new AppError(500, "A'zolarni olib bo'lmadi");
  }

  const rows = memberRows ?? [];

  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.telegram_id);
  const { data: userRows, error: userError } = await supabase
    .from("users")
    .select("telegram_id, first_name, username")
    .in("telegram_id", ids)
    .returns<UserNameRow[]>();

  if (userError) {
    throw new AppError(500, "Foydalanuvchilarni olib bo'lmadi");
  }

  const userMap = new Map((userRows ?? []).map((row) => [row.telegram_id, row]));

  return rows.map((row) => ({
    telegramId: row.telegram_id,
    joinedAt: row.joined_at,
    firstName: userMap.get(row.telegram_id)?.first_name ?? null,
    username: userMap.get(row.telegram_id)?.username ?? null
  }));
}

export const teamRepository = {
  async findMembership(telegramId: number): Promise<DbTeamMember | null> {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("id, team_id, telegram_id, joined_at")
        .eq("telegram_id", telegramId)
        .maybeSingle<DbTeamMember>();

      if (error) {
        throw new AppError(500, "Jamoa a'zoligini tekshirib bo'lmadi");
      }

      return data;
    } catch (error) {
      console.error("findMembership failed", error);
      throw error;
    }
  },

  async createTeam(name: string, ownerId: number): Promise<Team> {
    try {
      let code = "";

      for (let attempt = 0; attempt < CODE_GENERATION_ATTEMPTS; attempt += 1) {
        const candidate = generateCode();
        const { data: existing, error: lookupError } = await supabase
          .from("teams")
          .select("id")
          .eq("code", candidate)
          .maybeSingle<{ id: string }>();

        if (lookupError) {
          throw new AppError(500, "Kod tekshirib bo'lmadi");
        }

        if (!existing) {
          code = candidate;
          break;
        }
      }

      if (!code) {
        throw new AppError(500, "Yagona kod yaratib bo'lmadi, qaytadan urinib ko'ring");
      }

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({ name, code, owner_id: ownerId })
        .select(TEAM_COLUMNS)
        .single<DbTeam>();

      if (teamError || !team) {
        throw new AppError(500, "Jamoa yaratish muvaffaqiyatsiz");
      }

      const { error: memberError } = await supabase
        .from("team_members")
        .insert({ team_id: team.id, telegram_id: ownerId });

      if (memberError) {
        await supabase.from("teams").delete().eq("id", team.id);
        throw new AppError(500, "Egasini a'zo sifatida qo'shib bo'lmadi");
      }

      return mapTeam(team);
    } catch (error) {
      console.error("createTeam failed", error);
      throw error;
    }
  },

  async getTeamWithMembers(teamId: string): Promise<TeamWithMembers> {
    try {
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select(TEAM_COLUMNS)
        .eq("id", teamId)
        .maybeSingle<DbTeam>();

      if (teamError) {
        throw new AppError(500, "Jamoani olib bo'lmadi");
      }

      if (!team) {
        throw new AppError(404, "Jamoa topilmadi");
      }

      const members = await fetchMembers(teamId);

      return { ...mapTeam(team), members };
    } catch (error) {
      console.error("getTeamWithMembers failed", error);
      throw error;
    }
  },

  async getTeamByTelegramId(telegramId: number): Promise<TeamWithMembers | null> {
    const membership = await teamRepository.findMembership(telegramId);

    if (!membership) {
      return null;
    }

    return teamRepository.getTeamWithMembers(membership.team_id);
  },

  async joinTeamByCode(code: string, telegramId: number): Promise<TeamWithMembers> {
    try {
      const normalizedCode = code.trim().toUpperCase();
      const { data: team, error: lookupError } = await supabase
        .from("teams")
        .select(TEAM_COLUMNS)
        .eq("code", normalizedCode)
        .maybeSingle<DbTeam>();

      if (lookupError) {
        throw new AppError(500, "Jamoani qidirib bo'lmadi");
      }

      if (!team) {
        throw new AppError(404, "Bu kod bilan jamoa topilmadi");
      }

      if (team.status !== "open") {
        throw new AppError(409, "Bu jamoa hozir o'yinda yoki yopiq");
      }

      const { count, error: countError } = await supabase
        .from("team_members")
        .select("id", { count: "exact", head: true })
        .eq("team_id", team.id);

      if (countError) {
        throw new AppError(500, "A'zolar sonini olib bo'lmadi");
      }

      if ((count ?? 0) >= team.max_members) {
        throw new AppError(409, "Jamoa to'lib qolgan");
      }

      const { error: insertError } = await supabase
        .from("team_members")
        .insert({ team_id: team.id, telegram_id: telegramId });

      if (insertError) {
        const code = (insertError as { code?: string }).code;

        if (code === "23505") {
          throw new AppError(409, "Siz allaqachon boshqa jamoadasiz");
        }

        throw new AppError(500, "A'zo qo'shib bo'lmadi");
      }

      return teamRepository.getTeamWithMembers(team.id);
    } catch (error) {
      console.error("joinTeamByCode failed", error);
      throw error;
    }
  },

  async getTeamById(teamId: string): Promise<Team | null> {
    const { data, error } = await supabase
      .from("teams")
      .select(TEAM_COLUMNS)
      .eq("id", teamId)
      .maybeSingle<DbTeam>();

    if (error) {
      throw new AppError(500, "Jamoani olib bo'lmadi");
    }

    return data ? mapTeam(data) : null;
  },

  async findTeamByCode(code: string): Promise<Team | null> {
    const normalized = code.trim().toUpperCase();
    const { data, error } = await supabase
      .from("teams")
      .select(TEAM_COLUMNS)
      .eq("code", normalized)
      .maybeSingle<DbTeam>();

    if (error) {
      throw new AppError(500, "Jamoani qidirib bo'lmadi");
    }

    return data ? mapTeam(data) : null;
  },

  async updateStatus(teamId: string, status: "open" | "in_battle" | "closed"): Promise<void> {
    const { error } = await supabase.from("teams").update({ status }).eq("id", teamId);

    if (error) {
      throw new AppError(500, "Jamoa holatini yangilab bo'lmadi");
    }
  },

  async leaveTeam(telegramId: number): Promise<void> {
    try {
      const membership = await teamRepository.findMembership(telegramId);

      if (!membership) {
        return;
      }

      const teamId = membership.team_id;
      const { error: deleteError } = await supabase
        .from("team_members")
        .delete()
        .eq("id", membership.id);

      if (deleteError) {
        throw new AppError(500, "Jamoadan chiqib bo'lmadi");
      }

      const { data: remaining, error: remainingError } = await supabase
        .from("team_members")
        .select("telegram_id")
        .eq("team_id", teamId)
        .order("joined_at", { ascending: true })
        .limit(1)
        .returns<Array<{ telegram_id: number }>>();

      if (remainingError) {
        throw new AppError(500, "Qolgan a'zolarni tekshirib bo'lmadi");
      }

      if (!remaining || remaining.length === 0) {
        await supabase.from("teams").delete().eq("id", teamId);
        return;
      }

      const { data: teamRow, error: teamError } = await supabase
        .from("teams")
        .select("owner_id")
        .eq("id", teamId)
        .maybeSingle<{ owner_id: number }>();

      if (teamError) {
        throw new AppError(500, "Jamoani tekshirib bo'lmadi");
      }

      if (teamRow && teamRow.owner_id === telegramId) {
        await supabase
          .from("teams")
          .update({ owner_id: remaining[0].telegram_id })
          .eq("id", teamId);
      }
    } catch (error) {
      console.error("leaveTeam failed", error);
      throw error;
    }
  }
};
