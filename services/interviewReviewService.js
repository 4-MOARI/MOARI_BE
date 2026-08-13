const interviewReviewModel = require('../models/interviewReviewModel');

const VALID_METHODS = [
  'FACE_TO_FACE',
  'OFFLINE',
  'ONLINE',
  'MIXED',
];

const VALID_TYPES = [
  'INDIVIDUAL',
  'PERSONAL',
  'GROUP',
  'MANY_TO_ONE',
  'MANY_TO_MANY',
];

const VALID_ATMOSPHERES = [
  'COMFORTABLE',
  'NORMAL',
  'PRESSURE',
];

const VALID_DIFFICULTIES = [
  'EASY',
  'NORMAL',
  'HARD',
];

const VALID_DURATIONS = [
  'UNDER_10',
  'MIN_10_20',
  'MIN_20_30',
  'OVER_30',
];

const VALID_COMPETENCIES = [
  'MOTIVATION',
  'TEAMWORK',
  'PROJECT_EXPERIENCE',
  'PROBLEM_SOLVING',
  'COMMUNICATION',
  'RESPONSIBILITY',
  'ACTIVENESS',
  'LEADERSHIP',
  'MAJOR_KNOWLEDGE',
  'CREATIVITY',
];

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

const validateClubId = (clubId) => {
  if (!Number.isInteger(clubId) || clubId <= 0) {
    throw createError({
      status: 400,
      code: 'INTERVIEW_REVIEW_400',
      message: '올바른 동아리 ID가 아닙니다.',
    });
  }
};

const validateIncluded = ({
  value,
  validValues,
  code,
  message,
}) => {
  if (!value || !validValues.includes(value)) {
    throw createError({
      status: 400,
      code,
      message,
    });
  }
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

const createInterviewReviewService = async ({
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
  validateClubId(clubId);

  const club = await interviewReviewModel.findClubById(clubId);
  if (!club) {
    throw createError({
      status: 404,
      code: 'CLUB_4041',
      message: '존재하지 않는 동아리입니다.',
    });
  }

  if (typeof hasInterview !== 'boolean') {
    throw createError({
      status: 400,
      code: 'INTERVIEW_4001',
      message: '면접 여부를 선택해주세요.',
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

  if (!hasInterview) {
    const interviewReviewId =
      await interviewReviewModel.createInterviewReview({
        clubId,
        userId,
        hasInterview: false,
        interviewMethod: null,
        interviewType: null,
        atmosphere: null,
        difficulty: null,
        duration: null,
        competencies: [],
        questions: [],
        tip: null,
      });

    return {
      interviewReviewId,
      clubId,
      clubName: club.clubName,
      userId,
      hasInterview: false,
    };
  }

  validateIncluded({
    value: interviewMethod,
    validValues: VALID_METHODS,
    code: 'INTERVIEW_4002',
    message: '올바른 면접 방식을 선택해주세요.',
  });

  validateIncluded({
    value: interviewType,
    validValues: VALID_TYPES,
    code: 'INTERVIEW_4003',
    message: '올바른 면접 형태를 선택해주세요.',
  });

  validateIncluded({
    value: atmosphere,
    validValues: VALID_ATMOSPHERES,
    code: 'INTERVIEW_4004',
    message: '면접 분위기를 선택해주세요.',
  });

  validateIncluded({
    value: difficulty,
    validValues: VALID_DIFFICULTIES,
    code: 'INTERVIEW_4005',
    message: '면접 난이도를 선택해주세요.',
  });

  validateIncluded({
    value: duration,
    validValues: VALID_DURATIONS,
    code: 'INTERVIEW_4006',
    message: '면접 시간을 선택해주세요.',
  });

  const competencyList = normalizeStringArray(competencies);
  const hasInvalidCompetency = competencyList.some(
    (competency) => !VALID_COMPETENCIES.includes(competency)
  );

  if (hasInvalidCompetency) {
    throw createError({
      status: 400,
      code: 'INTERVIEW_4007',
      message: '올바르지 않은 역량 항목이 포함되어 있습니다.',
    });
  }

  const questionList = normalizeStringArray(questions);

  if (questionList.length === 0) {
    throw createError({
      status: 400,
      code: 'INTERVIEW_REVIEW_QUESTION_REQUIRED',
      message: '면접 질문을 1개 이상 입력해주세요.',
    });
  }

  const interviewReviewId =
    await interviewReviewModel.createInterviewReview({
      clubId,
      userId,
      hasInterview,
      interviewMethod,
      interviewType,
      atmosphere,
      difficulty,
      duration,
      competencies: competencyList,
      questions: questionList,
      tip,
    });

  return {
    interviewReviewId,
    clubId,
    clubName: club.clubName,
    userId,
    hasInterview,
    interviewMethod,
    interviewType,
    atmosphere,
    difficulty,
    duration,
    competencies: competencyList,
    questions: questionList,
    tip: tip || null,
  };
};

const getInterviewReviewsService = async (clubId) => {
  validateClubId(clubId);

  const club = await interviewReviewModel.findClubById(clubId);
  if (!club) {
    throw createError({
      status: 404,
      code: 'CLUB_4041',
      message: '존재하지 않는 동아리입니다.',
    });
  }

  const reviews = await interviewReviewModel.findByClubId(clubId);

  return {
    clubId: Number(clubId),
    clubName: club.clubName,
    totalCount: reviews.length,
    reviews: reviews.map(formatReview),
  };
};

// 내가 작성한 면접 후기 조회
const getMyInterviewReviewsService = async (userId) => {
  const reviews =
    await interviewReviewModel.findInterviewReviewsByUserId(
      userId
    );

  const parsedReviews = reviews.map((review) => ({
    ...review,

    competencies:
      typeof review.competencies === 'string'
        ? JSON.parse(review.competencies)
        : review.competencies || [],

    questions:
      typeof review.questions === 'string'
        ? JSON.parse(review.questions)
        : review.questions || [],
  }));

  return {
    totalCount: parsedReviews.length,
    reviews: parsedReviews,
  };
};


const deleteInterviewReviewService = async ({
  interviewReviewId,
  userId,
}) => {
  const review =
    await interviewReviewModel.findInterviewReviewById(
      interviewReviewId
    );

  if (!review) {
    throw {
      status: 404,
      code: 'INTERVIEW_4041',
      message: '존재하지 않는 면접 후기입니다.',
    };
  }


  if (review.userId !== userId) {
    throw {
      status: 403,
      code: 'INTERVIEW_4031',
      message: '본인이 작성한 면접 후기만 삭제할 수 있습니다.',
    };
  }

  await interviewReviewModel.deleteInterviewReviewById(
    interviewReviewId
  );

  return {
    interviewReviewId: Number(interviewReviewId),
  };
};

module.exports = {
  createInterviewReviewService,
  getInterviewReviewsService,
  getMyInterviewReviewsService,
  deleteInterviewReviewService,
};
