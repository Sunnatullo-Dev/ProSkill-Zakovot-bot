import { AppError } from "../middleware/error.middleware";
import { supabase } from "../db/supabase";
import type { DbQuestion, QuestionWithAnswer } from "../types";

export const questionRepository = {
  async getRandomQuestion(): Promise<QuestionWithAnswer | null> {
    const { count, error: countError } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true });

    if (countError) {
      throw new AppError(500, "Savollar sonini olishda xatolik yuz berdi.");
    }

    if (!count) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * count);
    const { data, error } = await supabase
      .from("questions")
      .select("id, question, correct_answer")
      .range(randomIndex, randomIndex)
      .single<DbQuestion>();

    if (error || !data) {
      throw new AppError(500, "Tasodifiy savolni olishda xatolik yuz berdi.");
    }

    return mapQuestion(data);
  },

  async getQuestionById(questionId: string): Promise<QuestionWithAnswer | null> {
    const { data, error } = await supabase
      .from("questions")
      .select("id, question, correct_answer")
      .eq("id", questionId)
      .maybeSingle<DbQuestion>();

    if (error) {
      throw new AppError(500, "Savolni olishda xatolik yuz berdi.");
    }

    return data ? mapQuestion(data) : null;
  }
};

function mapQuestion(question: DbQuestion): QuestionWithAnswer {
  return {
    id: question.id,
    question: question.question,
    correctAnswer: question.correct_answer
  };
}
