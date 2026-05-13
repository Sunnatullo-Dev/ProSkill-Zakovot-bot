import { AppError } from "../middleware/error.middleware";
import { questionRepository } from "../repositories/question.repository";

export const questionService = {
  async getRandomQuestion() {
    const question = await questionRepository.getRandomQuestion();

    if (!question) {
      throw new AppError(404, "Question not found");
    }

    return question;
  },

  async getQuestionWithAnswer(questionId: string) {
    const question = await questionRepository.getQuestionById(questionId);

    if (!question) {
      throw new AppError(404, "Question not found");
    }

    return question;
  }
};
