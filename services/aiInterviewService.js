const aiInterviewModel = require('../models/aiInterviewModel');
const clubModel = require('../models/clubModel');
const aiInterviewAiService = require('./aiInterviewAiService');

const VALID_QUESTION_COUNTS = [5, 7, 10];

const createError = ({
  status,
  code,
  message,
}) => {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
};

const validateClubId = (clubId) => {
  if (!Number.isInteger(clubId) || clubId <= 0) {
    throw createError({
      status: 400,
      code: 'AI_INTERVIEW_400',
      message: '올바른 동아리 ID가 아닙니다.',
    });
  }
};

const validateInterviewId = (interviewId) => {
  if (!Number.isInteger(interviewId) || interviewId <= 0) {
    throw createError({
      status: 400,
      code: 'AI_INTERVIEW_400',
      message: '올바른 모의면접 ID가 아닙니다.',
    });
  }
};

const validateQuestionCount = (questionCount) => {
  if (!VALID_QUESTION_COUNTS.includes(questionCount)) {
    throw createError({
      status: 400,
      code: 'AI_INTERVIEW_INVALID_QUESTION_COUNT',
      message: '질문 수는 5, 7, 10개 중 하나만 선택할 수 있습니다.',
    });
  }
};

const assertClubAccessible = (club, user) => {
  if (!club) {
    throw createError({
      status: 404,
      code: 'CLUB_404',
      message: '존재하지 않는 동아리입니다.',
    });
  }

  if (club.schoolId && user.schoolId && Number(club.schoolId) !== Number(user.schoolId)) {
    throw createError({
      status: 403,
      code: 'AI_INTERVIEW_403',
      message: '본인 학교의 동아리 모의면접만 이용할 수 있습니다.',
    });
  }
};

const getOwnedSession = async ({
  interviewId,
  user,
}) => {
  validateInterviewId(interviewId);

  const session = await aiInterviewModel.findSessionById(interviewId);

  if (!session) {
    throw createError({
      status: 404,
      code: 'AI_INTERVIEW_404',
      message: 'AI 모의면접 정보를 찾을 수 없습니다.',
    });
  }

  if (session.userId !== user.userId) {
    throw createError({
      status: 403,
      code: 'AI_INTERVIEW_403',
      message: '해당 모의면접에 접근할 권한이 없습니다.',
    });
  }

  return session;
};

const formatTurn = (turn) => ({
  turnId: turn.turnId,
  questionIndex: turn.questionIndex,
  questionType: turn.questionType,
  questionText: turn.questionText,
  answerText: turn.answerText,
  sourceType: turn.sourceType,
});

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    return [];
  }
};

const formatInterviewReviewSources = (reviews) =>
  reviews.map((review) => ({
    interviewReviewId: review.interviewReviewId,
    interviewMethod: review.interviewMethod,
    interviewType: review.interviewType,
    atmosphere: review.atmosphere,
    difficulty: review.difficulty,
    duration: review.duration,
    competencies: parseJsonArray(review.competencies),
    questions: parseJsonArray(review.questions),
    tip: review.tip,
  }));

const getInterviewReviewSources = async (clubId) => {
  const reviews = await aiInterviewModel.findInterviewReviewSourcesByClubId({
    clubId,
    limit: 5,
  });

  return formatInterviewReviewSources(reviews);
};

const createResultIfReady = async ({
  interviewId,
  session,
}) => {
  const existingResult = await aiInterviewModel.findResultByInterviewId(interviewId);

  if (existingResult) {
    return existingResult;
  }

  const turns = await aiInterviewModel.findTurnsByInterviewId(interviewId);
  const answeredTurns = turns.filter((turn) => turn.answerText);

  if (answeredTurns.length < session.questionCount) {
    throw createError({
      status: 400,
      code: 'AI_INTERVIEW_RESULT_NOT_READY',
      message: '모든 질문에 답변한 뒤 결과를 조회할 수 있습니다.',
    });
  }

  const result = await aiInterviewAiService.createInterviewResult({
    clubName: session.clubName,
    turns: answeredTurns,
  });

  const resultId = await aiInterviewModel.createResult({
    interviewId,
    ...result,
  });

  await aiInterviewModel.updateSessionProgress({
    interviewId,
    status: 'COMPLETED',
  });

  return {
    resultId,
    ...result,
    createdAt: new Date(),
  };
};

exports.getOptions = async ({
  clubId,
  user,
}) => {
  validateClubId(clubId);

  const club = await clubModel.findClubById(clubId);
  assertClubAccessible(club, user);

  const interviewReviewSources = await getInterviewReviewSources(clubId);

  return {
    clubId: club.clubId,
    clubName: club.clubName,
    questionCountOptions: VALID_QUESTION_COUNTS,
    defaultQuestionCount: 5,
    hasInterviewReviewData: interviewReviewSources.length > 0,
  };
};

exports.createInterview = async ({
  user,
  clubId,
  questionCount,
}) => {
  validateClubId(clubId);
  validateQuestionCount(questionCount);

  const club = await clubModel.findClubById(clubId);
  assertClubAccessible(club, user);

  const interviewReviewSources = await getInterviewReviewSources(clubId);

  const interviewId = await aiInterviewModel.createSession({
    userId: user.userId,
    clubId,
    questionCount,
  });

  const question = await aiInterviewAiService.createQuestion({
    club,
    questionIndex: 1,
    interviewReviewSources,
  });

  const turnId = await aiInterviewModel.createTurn({
    interviewId,
    questionIndex: 1,
    ...question,
  });

  return {
    interviewId,
    clubId: club.clubId,
    clubName: club.clubName,
    questionCount,
    status: 'IN_PROGRESS',
    currentQuestionIndex: 1,
    question: {
      turnId,
      questionIndex: 1,
      ...question,
    },
  };
};

exports.getInterview = async ({
  interviewId,
  user,
}) => {
  const session = await getOwnedSession({
    interviewId,
    user,
  });

  const turns = await aiInterviewModel.findTurnsByInterviewId(interviewId);

  return {
    interviewId: session.interviewId,
    clubId: session.clubId,
    clubName: session.clubName,
    questionCount: session.questionCount,
    status: session.status,
    currentQuestionIndex: session.currentQuestionIndex,
    turns: turns.map(formatTurn),
  };
};

exports.submitAnswer = async ({
  interviewId,
  user,
  turnId,
  answerText,
}) => {
  const session = await getOwnedSession({
    interviewId,
    user,
  });

  if (session.status !== 'IN_PROGRESS') {
    throw createError({
      status: 409,
      code: 'AI_INTERVIEW_ALREADY_COMPLETED',
      message: '이미 종료되었거나 완료된 모의면접입니다.',
    });
  }

  if (!Number.isInteger(turnId) || turnId <= 0) {
    throw createError({
      status: 400,
      code: 'AI_INTERVIEW_400',
      message: '올바른 질문 ID가 아닙니다.',
    });
  }

  if (!answerText || answerText.trim() === '') {
    throw createError({
      status: 400,
      code: 'AI_INTERVIEW_400',
      message: '답변 내용을 입력해주세요.',
    });
  }

  const turn = await aiInterviewModel.findTurnById({
    interviewId,
    turnId,
  });

  if (!turn) {
    throw createError({
      status: 404,
      code: 'AI_INTERVIEW_404',
      message: 'AI 모의면접 질문을 찾을 수 없습니다.',
    });
  }

  if (turn.answerText) {
    throw createError({
      status: 409,
      code: 'AI_INTERVIEW_ANSWER_ALREADY_SUBMITTED',
      message: '이미 답변한 질문입니다.',
    });
  }

  await aiInterviewModel.updateTurnAnswer({
    turnId,
    answerText: answerText.trim(),
  });

  const feedback = await aiInterviewAiService.createAnswerFeedback({
    questionText: turn.questionText,
    answerText,
  });

  await aiInterviewModel.createFeedback({
    interviewId,
    turnId,
    ...feedback,
  });

  const nextQuestionIndex = turn.questionIndex + 1;

  if (nextQuestionIndex > session.questionCount) {
    await aiInterviewModel.updateSessionProgress({
      interviewId,
      currentQuestionIndex: session.questionCount,
    });

    return {
      interviewId,
      submittedTurnId: turnId,
      isCompleted: true,
      nextQuestion: null,
    };
  }

  const shouldCreateFollowUp =
    !session.followUpUsed &&
    turn.questionType === 'BASE' &&
    aiInterviewAiService.shouldCreateFollowUp({
      answerText,
    });

  const interviewReviewSources = shouldCreateFollowUp
    ? []
    : await getInterviewReviewSources(session.clubId);

  const nextQuestion = await aiInterviewAiService.createQuestion({
    club: session,
    questionIndex: nextQuestionIndex,
    questionType: shouldCreateFollowUp ? 'FOLLOW_UP' : 'BASE',
    answerText,
    interviewReviewSources,
  });

  const nextTurnId = await aiInterviewModel.createTurn({
    interviewId,
    questionIndex: nextQuestionIndex,
    ...nextQuestion,
  });

  await aiInterviewModel.updateSessionProgress({
    interviewId,
    currentQuestionIndex: nextQuestionIndex,
    followUpUsed: shouldCreateFollowUp ? true : undefined,
  });

  return {
    interviewId,
    submittedTurnId: turnId,
    isCompleted: false,
    nextQuestion: {
      turnId: nextTurnId,
      questionIndex: nextQuestionIndex,
      ...nextQuestion,
    },
  };
};

exports.endInterview = async ({
  interviewId,
  user,
}) => {
  const session = await getOwnedSession({
    interviewId,
    user,
  });

  if (session.status !== 'IN_PROGRESS') {
    return {
      interviewId: session.interviewId,
      status: session.status,
    };
  }

  await aiInterviewModel.updateSessionProgress({
    interviewId,
    status: 'ENDED',
  });

  return {
    interviewId,
    status: 'ENDED',
  };
};

exports.completeInterview = async ({
  interviewId,
  user,
}) => {
  const session = await getOwnedSession({
    interviewId,
    user,
  });

  const result = await createResultIfReady({
    interviewId,
    session,
  });

  return {
    interviewId,
    status: 'COMPLETED',
    resultId: result.resultId,
  };
};

exports.getResult = async ({
  interviewId,
  user,
}) => {
  const session = await getOwnedSession({
    interviewId,
    user,
  });

  const result = await createResultIfReady({
    interviewId,
    session,
  });

  return {
    interviewId,
    clubName: session.clubName,
    overallSummary: result.overallSummary,
    strengths: parseJsonArray(result.strengths),
    improvements: parseJsonArray(result.improvements),
    evaluationItems: parseJsonArray(result.evaluationItems),
    createdAt: result.createdAt,
  };
};

exports.getFeedback = async ({
  interviewId,
  user,
}) => {
  await getOwnedSession({
    interviewId,
    user,
  });

  const feedbacks = await aiInterviewModel.findFeedbackByInterviewId(interviewId);

  return {
    interviewId,
    feedbacks: feedbacks.map((feedback) => ({
      turnId: feedback.turnId,
      questionIndex: feedback.questionIndex,
      questionText: feedback.questionText,
      answerText: feedback.answerText,
      status: feedback.status,
      goodPoints: parseJsonArray(feedback.goodPoints),
      missingPoints: parseJsonArray(feedback.missingPoints),
      improvementDirection: feedback.improvementDirection,
      feedbackText: feedback.feedbackText,
      improvementText: feedback.improvementText,
    })),
  };
};
