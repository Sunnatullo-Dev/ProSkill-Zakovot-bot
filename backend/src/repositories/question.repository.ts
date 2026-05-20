import { AppError } from "../middleware/error.middleware";
import { supabase } from "../db/supabase";
import type { DbQuestion, NewQuestion, Question, QuestionWithAnswer, ReportedQuestion } from "../types";

type RoundFilter = {
  count: number;
  category: string | null;
  difficulty: string | null;
};

export const questionRepository = {
  async getRoundQuestions(filter: RoundFilter): Promise<Question[]> {
    try {
      let idQuery = supabase.from("questions").select("id");

      if (filter.category) {
        idQuery = idQuery.eq("category", filter.category);
      }

      if (filter.difficulty) {
        idQuery = idQuery.eq("difficulty", filter.difficulty);
      }

      const { data: idRows, error: idError } = await idQuery.returns<Array<{ id: string }>>();

      if (idError) {
        throw new AppError(500, "Question ids lookup failed");
      }

      const ids = shuffle((idRows ?? []).map((row) => row.id)).slice(0, filter.count);

      if (ids.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from("questions")
        .select("id, text, category, difficulty")
        .in("id", ids)
        .returns<DbQuestion[]>();

      if (error) {
        throw new AppError(500, "Round questions lookup failed");
      }

      return shuffle((data ?? []).map(mapQuestion));
    } catch (error) {
      console.error("getRoundQuestions failed", error);
      throw error;
    }
  },

  async getCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("category")
        .returns<Array<{ category: string | null }>>();

      if (error) {
        throw new AppError(500, "Categories lookup failed");
      }

      const categories = new Set<string>();

      for (const row of data ?? []) {
        if (row.category) {
          categories.add(row.category);
        }
      }

      return [...categories].sort((left, right) => left.localeCompare(right));
    } catch (error) {
      console.error("getCategories failed", error);
      throw error;
    }
  },

  async getQuestionById(id: string): Promise<QuestionWithAnswer | null> {
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("id, text, correct_answer, category, difficulty")
        .eq("id", id)
        .maybeSingle<DbQuestion>();

      if (error) {
        throw new AppError(500, "Question lookup failed");
      }

      return data ? mapQuestionWithAnswer(data) : null;
    } catch (error) {
      console.error("getQuestionById failed", error);
      throw error;
    }
  },

  async createQuestion(input: NewQuestion): Promise<void> {
    try {
      const { error } = await supabase.from("questions").insert({
        text: input.text,
        correct_answer: input.correctAnswer,
        category: input.category,
        difficulty: input.difficulty
      });

      if (error) {
        throw new AppError(500, "Question create failed");
      }
    } catch (error) {
      console.error("createQuestion failed", error);
      throw error;
    }
  },

  async updateQuestion(
    id: string,
    input: {
      text?: string;
      correctAnswer?: string;
      category?: string | null;
      difficulty?: string | null;
    }
  ): Promise<void> {
    try {
      const update: Record<string, unknown> = {};

      if (input.text !== undefined) {
        update.text = input.text;
      }

      if (input.correctAnswer !== undefined) {
        update.correct_answer = input.correctAnswer;
      }

      if (input.category !== undefined) {
        update.category = input.category;
      }

      if (input.difficulty !== undefined) {
        update.difficulty = input.difficulty;
      }

      if (Object.keys(update).length === 0) {
        return;
      }

      const { error } = await supabase.from("questions").update(update).eq("id", id);

      if (error) {
        throw new AppError(500, "Question update failed");
      }
    } catch (error) {
      console.error("updateQuestion failed", error);
      throw error;
    }
  },

  async listAllQuestions(filter: {
    search: string | null;
    category: string | null;
    difficulty: string | null;
    limit: number;
    offset: number;
  }): Promise<{ items: QuestionWithAnswer[]; total: number }> {
    try {
      let query = supabase
        .from("questions")
        .select("id, text, correct_answer, category, difficulty", { count: "exact" });

      if (filter.category) {
        query = query.eq("category", filter.category);
      }

      if (filter.difficulty) {
        query = query.eq("difficulty", filter.difficulty);
      }

      if (filter.search) {
        const escaped = filter.search.replace(/[%_]/g, "\\$&");
        query = query.ilike("text", `%${escaped}%`);
      }

      const from = filter.offset;
      const to = filter.offset + filter.limit - 1;
      const { data, error, count } = await query
        .order("text", { ascending: true })
        .range(from, to)
        .returns<DbQuestion[]>();

      if (error) {
        throw new AppError(500, "Questions list failed");
      }

      return {
        items: (data ?? []).map(mapQuestionWithAnswer),
        total: count ?? 0
      };
    } catch (error) {
      console.error("listAllQuestions failed", error);
      throw error;
    }
  },

  async getCategoryStats(): Promise<Array<{ category: string; count: number }>> {
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("category")
        .returns<Array<{ category: string | null }>>();

      if (error) {
        throw new AppError(500, "Category stats failed");
      }

      const counts = new Map<string, number>();

      for (const row of data ?? []) {
        if (row.category) {
          counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
        }
      }

      return [...counts.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((left, right) => right.count - left.count);
    } catch (error) {
      console.error("getCategoryStats failed", error);
      throw error;
    }
  },

  async renameCategory(oldName: string, newName: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("questions")
        .update({ category: newName })
        .eq("category", oldName)
        .select("id");

      if (error) {
        throw new AppError(500, "Category rename failed");
      }

      return (data ?? []).length;
    } catch (error) {
      console.error("renameCategory failed", error);
      throw error;
    }
  },

  async countAll(): Promise<number> {
    const { count, error } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true });

    if (error) {
      throw new AppError(500, "Questions count failed");
    }

    return count ?? 0;
  },

  async reportQuestion(questionId: string, reportedBy: number): Promise<void> {
    try {
      const { error } = await supabase
        .from("question_reports")
        .insert({ question_id: questionId, reported_by: reportedBy });

      if (error) {
        throw new AppError(500, "Question report failed");
      }
    } catch (error) {
      console.error("reportQuestion failed", error);
      throw error;
    }
  },

  async getReportedQuestions(): Promise<ReportedQuestion[]> {
    try {
      const { data: reports, error: reportsError } = await supabase
        .from("question_reports")
        .select("question_id")
        .returns<Array<{ question_id: string }>>();

      if (reportsError) {
        throw new AppError(500, "Reports lookup failed");
      }

      const counts = new Map<string, number>();

      for (const report of reports ?? []) {
        counts.set(report.question_id, (counts.get(report.question_id) ?? 0) + 1);
      }

      const ids = [...counts.keys()];

      if (ids.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from("questions")
        .select("id, text, correct_answer, category, difficulty")
        .in("id", ids)
        .returns<DbQuestion[]>();

      if (error) {
        throw new AppError(500, "Reported questions lookup failed");
      }

      return (data ?? []).map((question) => ({
        ...mapQuestionWithAnswer(question),
        reportCount: counts.get(question.id) ?? 0
      }));
    } catch (error) {
      console.error("getReportedQuestions failed", error);
      throw error;
    }
  },

  async deleteQuestion(id: string): Promise<void> {
    try {
      await supabase.from("question_reports").delete().eq("question_id", id);

      const { error } = await supabase.from("questions").delete().eq("id", id);

      if (error) {
        throw new AppError(500, "Question delete failed");
      }
    } catch (error) {
      console.error("deleteQuestion failed", error);
      throw error;
    }
  }
};

function mapQuestion(question: DbQuestion): Question {
  return {
    id: question.id,
    text: question.text,
    category: question.category,
    difficulty: question.difficulty
  };
}

function mapQuestionWithAnswer(question: DbQuestion): QuestionWithAnswer {
  return {
    ...mapQuestion(question),
    correctAnswer: question.correct_answer
  };
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}
