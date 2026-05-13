import { AppError } from "../middleware/error.middleware";
import { supabase } from "../db/supabase";
import type { DbQuestion, Question, QuestionWithAnswer } from "../types";

export const questionRepository = {
  async getRandomQuestion(): Promise<Question | null> {
    try {
      const { count, error: countError } = await supabase
        .from("questions")
        .select("id", { count: "exact", head: true });

      if (countError) {
        throw new AppError(500, "Question count failed");
      }

      if (!count) {
        return null;
      }

      const randomIndex = Math.floor(Math.random() * count);
      const { data, error } = await supabase
        .from("questions")
        .select("id, text, correct_answer, category, difficulty")
        .range(randomIndex, randomIndex)
        .single<DbQuestion>();

      if (error || !data) {
        throw new AppError(500, "Random question failed");
      }

      return mapQuestion(data);
    } catch (error) {
      console.error("getRandomQuestion failed", error);
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
