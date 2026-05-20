import { AppError } from "../middleware/error.middleware";
import { battleRepository } from "../repositories/battle.repository";
import { questionRepository } from "../repositories/question.repository";
import { teamRepository } from "../repositories/team.repository";
import { userRepository } from "../repositories/user.repository";
import type {
  BattleChallenge,
  BattleRoundView,
  BattleState,
  BattleTeamView,
  DbBattleAnswer,
  TeamWithMembers
} from "../types";
import { checkAnswer } from "./gemini.service";

const TOTAL_ROUNDS = 10;
const ROUND_TIME_LIMIT_SECONDS = 15;
const TIMEOUT_GRACE_MS = 2000;
const MIN_QUESTIONS_FOR_BATTLE = 5;
const WINNER_BONUS = 5;

function teamScore(answers: DbBattleAnswer[], teamId: string): number {
  return answers.filter((answer) => answer.team_id === teamId && answer.is_correct === true).length;
}

export const battleService = {
  // Battle accepted bo'lganda chaqiriladi.
  async startGameFlow(battleId: string): Promise<void> {
    const challenge = await battleRepository.getChallengeById(battleId);

    if (!challenge) {
      throw new AppError(404, "Bellashuv topilmadi");
    }

    if (challenge.status !== "pending" && challenge.status !== "accepted") {
      throw new AppError(409, "Bellashuv allaqachon boshlangan");
    }

    const questions = await questionRepository.getRoundQuestions({
      count: TOTAL_ROUNDS,
      category: null,
      difficulty: null
    });

    if (questions.length < MIN_QUESTIONS_FOR_BATTLE) {
      throw new AppError(500, "Yetarli savol topilmadi");
    }

    const items = questions.map((question, index) => ({
      questionId: question.id,
      roundNumber: index + 1,
      timeLimitSeconds: ROUND_TIME_LIMIT_SECONDS
    }));

    await battleRepository.createRounds(battleId, items);
    await battleRepository.setCurrentRound(battleId, 1);
    await battleRepository.updateStatus(battleId, "in_progress", {
      startedAt: new Date().toISOString()
    });

    await teamRepository.updateStatus(challenge.challengerTeamId, "in_battle");
    await teamRepository.updateStatus(challenge.opponentTeamId, "in_battle");

    const firstRound = await battleRepository.getRoundByNumber(battleId, 1);

    if (firstRound) {
      await battleRepository.markRoundStarted(firstRound.id);
    }
  },

  async processAnswer(
    battleId: string,
    telegramId: number,
    roundId: string,
    userAnswer: string
  ): Promise<{ isCorrect: boolean; correctAnswer: string }> {
    const challenge = await battleRepository.getChallengeById(battleId);

    if (!challenge) {
      throw new AppError(404, "Bellashuv topilmadi");
    }

    if (challenge.status !== "in_progress") {
      throw new AppError(409, "Bellashuv hozir aktiv emas");
    }

    const membership = await teamRepository.findMembership(telegramId);

    if (
      !membership ||
      (membership.team_id !== challenge.challengerTeamId &&
        membership.team_id !== challenge.opponentTeamId)
    ) {
      throw new AppError(403, "Siz bu bellashuvda emassiz");
    }

    const round = await battleRepository.getRoundByNumber(battleId, challenge.currentRoundNumber);

    if (!round || round.id !== roundId) {
      throw new AppError(409, "Bu round aktiv emas");
    }

    if (round.endedAt) {
      throw new AppError(409, "Round tugagan");
    }

    const startedAt = round.startedAt ? new Date(round.startedAt).getTime() : Date.now();
    const elapsed = Date.now() - startedAt;

    if (elapsed > round.timeLimitSeconds * 1000 + TIMEOUT_GRACE_MS) {
      throw new AppError(409, "Vaqt tugadi");
    }

    const question = await questionRepository.getQuestionById(round.questionId);

    if (!question) {
      throw new AppError(500, "Savol topilmadi");
    }

    const trimmed = userAnswer.trim();
    const checkResult = trimmed
      ? await checkAnswer(question.text, question.correctAnswer, trimmed)
      : { status: "incorrect" as const, explanation: "" };
    const isCorrect = checkResult.status === "correct";

    const { duplicate } = await battleRepository.recordAnswer({
      battleId,
      roundId,
      telegramId,
      teamId: membership.team_id,
      answer: trimmed,
      isCorrect,
      responseTimeMs: elapsed
    });

    if (duplicate) {
      throw new AppError(409, "Siz bu round'ga javob bergansiz");
    }

    await battleService.maybeAdvanceRound(battleId);

    return { isCorrect, correctAnswer: question.correctAnswer };
  },

  async maybeAdvanceRound(battleId: string): Promise<void> {
    const challenge = await battleRepository.getChallengeById(battleId);

    if (!challenge || challenge.status !== "in_progress") {
      return;
    }

    const round = await battleRepository.getRoundByNumber(battleId, challenge.currentRoundNumber);

    if (!round || round.endedAt) {
      return;
    }

    const startedAt = round.startedAt ? new Date(round.startedAt).getTime() : Date.now();
    const elapsed = Date.now() - startedAt;
    const timeUp = elapsed > round.timeLimitSeconds * 1000;

    let allAnswered = false;

    if (!timeUp) {
      const [challengerTeam, opponentTeam, roundAnswers] = await Promise.all([
        teamRepository.getTeamWithMembers(challenge.challengerTeamId),
        teamRepository.getTeamWithMembers(challenge.opponentTeamId),
        battleRepository.getAnswersForRound(round.id)
      ]);

      const totalMembers = challengerTeam.members.length + opponentTeam.members.length;
      allAnswered = roundAnswers.length >= totalMembers && totalMembers > 0;
    }

    if (timeUp || allAnswered) {
      await battleService.advanceRound(battleId);
    }
  },

  async advanceRound(battleId: string): Promise<void> {
    const challenge = await battleRepository.getChallengeById(battleId);

    if (!challenge || challenge.status !== "in_progress") {
      return;
    }

    const current = await battleRepository.getRoundByNumber(battleId, challenge.currentRoundNumber);

    if (current && !current.endedAt) {
      await battleRepository.markRoundEnded(current.id);
    }

    const nextNumber = challenge.currentRoundNumber + 1;
    const nextRound = await battleRepository.getRoundByNumber(battleId, nextNumber);

    if (nextRound) {
      await battleRepository.setCurrentRound(battleId, nextNumber);
      await battleRepository.markRoundStarted(nextRound.id);
    } else {
      await battleService.finalizeBattle(battleId);
    }
  },

  async finalizeBattle(battleId: string): Promise<void> {
    const challenge = await battleRepository.getChallengeById(battleId);

    if (!challenge || challenge.status === "finished") {
      return;
    }

    const answers = await battleRepository.getAnswersForBattle(battleId);
    const challengerScore = teamScore(answers, challenge.challengerTeamId);
    const opponentScore = teamScore(answers, challenge.opponentTeamId);

    let winnerTeamId: string | null = null;

    if (challengerScore > opponentScore) {
      winnerTeamId = challenge.challengerTeamId;
    } else if (opponentScore > challengerScore) {
      winnerTeamId = challenge.opponentTeamId;
    }

    if (winnerTeamId) {
      try {
        const winningTeam = await teamRepository.getTeamWithMembers(winnerTeamId);

        for (const member of winningTeam.members) {
          try {
            await userRepository.addScore(member.telegramId, WINNER_BONUS);
          } catch (memberError) {
            console.error("addScore winner failed", memberError);
          }
        }
      } catch (winError) {
        console.error("finalizeBattle winner award failed", winError);
      }
    }

    await battleRepository.updateStatus(battleId, "finished", {
      finishedAt: new Date().toISOString()
    });

    try {
      await teamRepository.updateStatus(challenge.challengerTeamId, "open");
    } catch (e) {
      console.error("reset challenger team status failed", e);
    }

    try {
      await teamRepository.updateStatus(challenge.opponentTeamId, "open");
    } catch (e) {
      console.error("reset opponent team status failed", e);
    }
  },

  async getBattleState(battleId: string, telegramId: number): Promise<BattleState> {
    await battleService.maybeAdvanceRound(battleId);

    const challenge = await battleRepository.getChallengeById(battleId);

    if (!challenge) {
      throw new AppError(404, "Bellashuv topilmadi");
    }

    const [challengerTeam, opponentTeam, answers, rounds] = await Promise.all([
      teamRepository.getTeamWithMembers(challenge.challengerTeamId),
      teamRepository.getTeamWithMembers(challenge.opponentTeamId),
      battleRepository.getAnswersForBattle(battleId),
      battleRepository.getRounds(battleId)
    ]);

    const challengerScore = teamScore(answers, challenge.challengerTeamId);
    const opponentScore = teamScore(answers, challenge.opponentTeamId);

    let myTeamId: string | null = null;

    if (challengerTeam.members.some((m) => m.telegramId === telegramId)) {
      myTeamId = challengerTeam.id;
    } else if (opponentTeam.members.some((m) => m.telegramId === telegramId)) {
      myTeamId = opponentTeam.id;
    }

    let currentRound: BattleRoundView | null = null;

    if (challenge.status === "in_progress") {
      const round = await battleRepository.getRoundByNumber(battleId, challenge.currentRoundNumber);

      if (round) {
        const question = await questionRepository.getQuestionById(round.questionId);
        const startedAt = round.startedAt ? new Date(round.startedAt).getTime() : Date.now();
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, round.timeLimitSeconds * 1000 - elapsed);
        const myAnswered = answers.some(
          (answer) => answer.round_id === round.id && answer.telegram_id === telegramId
        );
        currentRound = {
          roundId: round.id,
          roundNumber: round.roundNumber,
          totalRounds: rounds.length || TOTAL_ROUNDS,
          questionText: question?.text ?? "",
          timeLimitSeconds: round.timeLimitSeconds,
          timeRemainingMs: remaining,
          myAnswered
        };
      }
    }

    const currentRoundId = currentRound?.roundId ?? null;

    function teamView(team: TeamWithMembers, score: number): BattleTeamView {
      return {
        id: team.id,
        name: team.name,
        score,
        members: team.members.map((member) => ({
          telegramId: member.telegramId,
          firstName: member.firstName,
          username: member.username,
          answeredCurrentRound: currentRoundId
            ? answers.some(
                (answer) => answer.round_id === currentRoundId && answer.telegram_id === member.telegramId
              )
            : false
        }))
      };
    }

    let winnerTeamId: string | null = null;

    if (challenge.status === "finished") {
      if (challengerScore > opponentScore) {
        winnerTeamId = challenge.challengerTeamId;
      } else if (opponentScore > challengerScore) {
        winnerTeamId = challenge.opponentTeamId;
      }
    }

    return {
      battleId: challenge.id,
      status: challenge.status,
      challengerTeam: teamView(challengerTeam, challengerScore),
      opponentTeam: teamView(opponentTeam, opponentScore),
      myTeamId,
      currentRound,
      finished: challenge.status === "finished",
      winnerTeamId
    };
  },

  async challenge(
    challengerOwnerTelegramId: number,
    opponentTeamCode: string
  ): Promise<BattleChallenge> {
    const challengerMembership = await teamRepository.findMembership(challengerOwnerTelegramId);

    if (!challengerMembership) {
      throw new AppError(403, "Avval jamoaga qo'shiling");
    }

    const challengerTeam = await teamRepository.getTeamById(challengerMembership.team_id);

    if (!challengerTeam) {
      throw new AppError(404, "Jamoa topilmadi");
    }

    if (challengerTeam.ownerId !== challengerOwnerTelegramId) {
      throw new AppError(403, "Faqat jamoa egasi taklif qila oladi");
    }

    if (challengerTeam.status !== "open") {
      throw new AppError(409, "Jamoangiz hozir o'yinda yoki yopiq");
    }

    const opponentTeam = await teamRepository.findTeamByCode(opponentTeamCode);

    if (!opponentTeam) {
      throw new AppError(404, "Raqib jamoa topilmadi");
    }

    if (opponentTeam.id === challengerTeam.id) {
      throw new AppError(400, "O'z jamoangizga taklif yubora olmaysiz");
    }

    if (opponentTeam.status !== "open") {
      throw new AppError(409, "Raqib jamoa hozir o'yinda yoki yopiq");
    }

    const existing = [
      ...(await battleRepository.getActiveChallengesForTeam(challengerTeam.id)),
      ...(await battleRepository.getActiveChallengesForTeam(opponentTeam.id))
    ];

    if (existing.length > 0) {
      throw new AppError(409, "Jamoalardan birida allaqachon faol taklif bor");
    }

    return battleRepository.createChallenge(challengerTeam.id, opponentTeam.id);
  },

  async acceptChallenge(battleId: string, opponentOwnerTelegramId: number): Promise<void> {
    const challenge = await battleRepository.getChallengeById(battleId);

    if (!challenge) {
      throw new AppError(404, "Bellashuv topilmadi");
    }

    if (challenge.status !== "pending") {
      throw new AppError(409, "Bu taklifni qabul qilish mumkin emas");
    }

    const opponentTeam = await teamRepository.getTeamById(challenge.opponentTeamId);

    if (!opponentTeam || opponentTeam.ownerId !== opponentOwnerTelegramId) {
      throw new AppError(403, "Faqat raqib jamoa egasi qabul qila oladi");
    }

    await battleService.startGameFlow(battleId);
  },

  async declineChallenge(battleId: string, opponentOwnerTelegramId: number): Promise<void> {
    const challenge = await battleRepository.getChallengeById(battleId);

    if (!challenge) {
      throw new AppError(404, "Bellashuv topilmadi");
    }

    if (challenge.status !== "pending") {
      throw new AppError(409, "Bu taklifni rad etish mumkin emas");
    }

    const opponentTeam = await teamRepository.getTeamById(challenge.opponentTeamId);

    if (!opponentTeam || opponentTeam.ownerId !== opponentOwnerTelegramId) {
      throw new AppError(403, "Faqat raqib jamoa egasi rad eta oladi");
    }

    await battleRepository.updateStatus(battleId, "declined");
  },

  async getPendingForUser(telegramId: number) {
    const membership = await teamRepository.findMembership(telegramId);

    if (!membership) {
      return [];
    }

    const challenges = await battleRepository.getActiveChallengesForTeam(membership.team_id);
    const result = [];

    for (const challenge of challenges) {
      if (challenge.status !== "pending" && challenge.status !== "accepted" && challenge.status !== "in_progress") {
        continue;
      }

      const [challengerTeam, opponentTeam] = await Promise.all([
        teamRepository.getTeamById(challenge.challengerTeamId),
        teamRepository.getTeamById(challenge.opponentTeamId)
      ]);

      if (!challengerTeam || !opponentTeam) {
        continue;
      }

      result.push({
        battleId: challenge.id,
        status: challenge.status,
        challengerTeam,
        opponentTeam,
        iAmOpponent: membership.team_id === challenge.opponentTeamId,
        createdAt: challenge.createdAt
      });
    }

    return result;
  }
};
