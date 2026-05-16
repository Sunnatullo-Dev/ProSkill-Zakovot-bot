import { AppError } from "../middleware/error.middleware";
import { supabase } from "../db/supabase";
import type { DbSubmission, NewSubmission, Submission, SubmissionStatus } from "../types";

const SUBMISSION_COLUMNS = "id, text, correct_answer, category, difficulty, submitted_by, status, created_at";

export const submissionRepository = {
  async createSubmission(input: NewSubmission): Promise<Submission> {
    try {
      const { data, error } = await supabase
        .from("question_submissions")
        .insert({
          text: input.text,
          correct_answer: input.correctAnswer,
          category: input.category,
          difficulty: input.difficulty,
          submitted_by: input.submittedBy,
          status: "pending"
        })
        .select(SUBMISSION_COLUMNS)
        .single<DbSubmission>();

      if (error || !data) {
        throw new AppError(500, "Submission create failed");
      }

      return mapSubmission(data);
    } catch (error) {
      console.error("createSubmission failed", error);
      throw error;
    }
  },

  async getPendingSubmissions(): Promise<Submission[]> {
    try {
      const { data, error } = await supabase
        .from("question_submissions")
        .select(SUBMISSION_COLUMNS)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .returns<DbSubmission[]>();

      if (error) {
        throw new AppError(500, "Pending submissions lookup failed");
      }

      return (data ?? []).map(mapSubmission);
    } catch (error) {
      console.error("getPendingSubmissions failed", error);
      throw error;
    }
  },

  async getSubmissionsByUser(telegramId: number): Promise<Submission[]> {
    try {
      const { data, error } = await supabase
        .from("question_submissions")
        .select(SUBMISSION_COLUMNS)
        .eq("submitted_by", telegramId)
        .order("created_at", { ascending: false })
        .returns<DbSubmission[]>();

      if (error) {
        throw new AppError(500, "User submissions lookup failed");
      }

      return (data ?? []).map(mapSubmission);
    } catch (error) {
      console.error("getSubmissionsByUser failed", error);
      throw error;
    }
  },

  async getSubmissionById(id: string): Promise<Submission | null> {
    try {
      const { data, error } = await supabase
        .from("question_submissions")
        .select(SUBMISSION_COLUMNS)
        .eq("id", id)
        .maybeSingle<DbSubmission>();

      if (error) {
        throw new AppError(500, "Submission lookup failed");
      }

      return data ? mapSubmission(data) : null;
    } catch (error) {
      console.error("getSubmissionById failed", error);
      throw error;
    }
  },

  async updateStatus(id: string, status: SubmissionStatus): Promise<void> {
    try {
      const { error } = await supabase
        .from("question_submissions")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        throw new AppError(500, "Submission update failed");
      }
    } catch (error) {
      console.error("updateStatus failed", error);
      throw error;
    }
  }
};

function mapSubmission(submission: DbSubmission): Submission {
  return {
    id: submission.id,
    text: submission.text,
    correctAnswer: submission.correct_answer,
    category: submission.category,
    difficulty: submission.difficulty,
    submittedBy: submission.submitted_by,
    status: submission.status,
    createdAt: submission.created_at
  };
}
