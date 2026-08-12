const interviewReviewModel = require('../models/interviewReviewModel');

const VALID_METHODS = [
  'FACE_TO_FACE',
  'ONLINE',
  'MIXED',
];

const VALID_TYPES = [
  'INDIVIDUAL',
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
  const club = await interviewReviewModel.findClubById(clubId);

  if (!club) {
    throw {
      status: 404,
      code: 'CLUB_4041',
      message: '존재하지 않는 동아리입니다.',
    };
  }

  if (typeof hasInterview !== 'boolean') {
    throw {
      status: 400,
      code: 'INTERVIEW_4001',
      message: '면접 여부를 선택해주세요.',
    };
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
      hasInterview: false,
    };
  }

  if (
    !interviewMethod ||
    !VALID_METHODS.includes(interviewMethod)
  ) {
    throw {
      status: 400,
      code: 'INTERVIEW_4002',
      message: '올바른 면접 방식을 선택해주세요.',
    };
  }

  if (
    !interviewType ||
    !VALID_TYPES.includes(interviewType)
  ) {
    throw {
      status: 400,
      code: 'INTERVIEW_4003',
      message: '올바른 면접 형태를 선택해주세요.',
    };
  }

  if (
    !atmosphere ||
    !VALID_ATMOSPHERES.includes(atmosphere)
  ) {
    throw {
      status: 400,
      code: 'INTERVIEW_4004',
      message: '면접 분위기를 선택해주세요.',
    };
  }

  if (
    !difficulty ||
    !VALID_DIFFICULTIES.includes(difficulty)
  ) {
    throw {
      status: 400,
      code: 'INTERVIEW_4005',
      message: '면접 난이도를 선택해주세요.',
    };
  }

  if (
    !duration ||
    !VALID_DURATIONS.includes(duration)
  ) {
    throw {
      status: 400,
      code: 'INTERVIEW_4006',
      message: '면접 시간을 선택해주세요.',
    };
  }

  const competencyList = competencies || [];

  const hasInvalidCompetency = competencyList.some(
    (competency) =>
      !VALID_COMPETENCIES.includes(competency)
  );

  if (hasInvalidCompetency) {
    throw {
      status: 400,
      code: 'INTERVIEW_4007',
      message: '올바르지 않은 역량 항목이 포함되어 있습니다.',
    };
  }

  const questionList = (questions || [])
    .map((question) => question.trim())
    .filter(Boolean);

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
  const club = await interviewReviewModel.findClubById(clubId);

  if (!club) {
    throw {
      status: 404,
      code: 'CLUB_4041',
      message: '존재하지 않는 동아리입니다.',
    };
  }

  const reviews =
    await interviewReviewModel.findInterviewReviewsByClubId(
      clubId
    );

  return {
    clubId: Number(clubId),
    clubName: club.clubName,
    reviews,
  };
};

module.exports = {
  createInterviewReviewService,
  getInterviewReviewsService,
};