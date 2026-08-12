const clubModel = require('../models/clubModel');
const interviewReviewModel = require('../models/interviewReviewModel');

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

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    return [];
  }
};

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
};

const formatReview = (review) => ({
  interviewReviewId: review.interviewReviewId,
  clubId: review.clubId,
  userId: review.userId,
  userName: review.userName || '알 수 없음',
  hasInterview: Boolean(review.hasInterview),
  interviewMethod: review.interviewMethod,
  interviewType: review.interviewType,
  atmosphere: review.atmosphere,
  difficulty: review.difficulty,
  duration: review.duration,
  competencies: parseJsonArray(review.competencies),
  questions: parseJsonArray(review.questions),
  tip: review.tip,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
});

exports.createInterviewReviewService = async ({
  clubId,
  userId,
  hasInterview,
  interviewMethod,
  interviewType,
  atmosphere,
  difficulty,
  duration,
  competencies,
  questions,
  tip,
}) => {
  if (!Number.isInteger(clubId) || clubId <= 0) {
    throw createError({
      status: 400,
      code: 'INTERVIEW_REVIEW_400',
      message: '올바른 동아리 ID가 아닙니다.',
    });
  }

  const club = await clubModel.findClubById(clubId);
  if (!club) {
    throw createError({
      status: 404,
      code: 'CLUB_404',
      message: '존재하지 않는 동아리입니다.',
    });
  }

  const existingReview = await interviewReviewModel.findByUserIdAndClubId({
    userId,
    clubId,
  });

  if (existingReview) {
    throw createError({
      status: 409,
      code: 'INTERVIEW_REVIEW_ALREADY_EXISTS',
      message: '이미 해당 동아리의 면접 후기를 작성했습니다.',
    });
  }

  const normalizedQuestions = normalizeStringArray(questions);
  const normalizedCompetencies = normalizeStringArray(competencies);

  if (hasInterview && normalizedQuestions.length === 0) {
    throw createError({
      status: 400,
      code: 'INTERVIEW_REVIEW_QUESTION_REQUIRED',
      message: '면접 질문을 1개 이상 입력해주세요.',
    });
  }

  const interviewReviewId = await interviewReviewModel.createInterviewReview({
    clubId,
    userId,
    hasInterview: Boolean(hasInterview),
    interviewMethod: interviewMethod || null,
    interviewType: interviewType || null,
    atmosphere: atmosphere || null,
    difficulty: difficulty || null,
    duration: duration || null,
    competencies: normalizedCompetencies,
    questions: normalizedQuestions,
    tip: tip || null,
  });

  return {
    interviewReviewId,
    clubId,
    userId,
    hasInterview: Boolean(hasInterview),
    interviewMethod: interviewMethod || null,
    interviewType: interviewType || null,
    atmosphere: atmosphere || null,
    difficulty: difficulty || null,
    duration: duration || null,
    competencies: normalizedCompetencies,
    questions: normalizedQuestions,
    tip: tip || null,
  };
};

exports.getInterviewReviewsService = async (clubId) => {
  if (!Number.isInteger(clubId) || clubId <= 0) {
    throw createError({
      status: 400,
      code: 'INTERVIEW_REVIEW_400',
      message: '올바른 동아리 ID가 아닙니다.',
    });
  }

  const club = await clubModel.findClubById(clubId);
  if (!club) {
    throw createError({
      status: 404,
      code: 'CLUB_404',
      message: '존재하지 않는 동아리입니다.',
    });
  }

  const reviews = await interviewReviewModel.findByClubId(clubId);

  return {
    clubId,
    totalCount: reviews.length,
    reviews: reviews.map(formatReview),
  };
};
