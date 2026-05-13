import { AppError } from "../middleware/error.middleware";
import { userRepository } from "../repositories/user.repository";

export const scoreService = {
  async applyAnswerResult(telegramId: number, isCorrect: boolean) {
    if (isCorrect) {
      const user = await userRepository.incrementScore(telegramId);
      return user.score;
    }

    const user = await userRepository.findByTelegramId(telegramId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    return user.score;
  }
};
