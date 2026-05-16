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
