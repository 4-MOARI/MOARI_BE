const axios = require('axios');

const concreteAnswerPattern = /\d|프로젝트|경험|역할|결과|활동|사례/;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const baseQuestionTemplates = [
  (club) => `${club.clubName}에 지원한 이유를 말해주세요.`,
  () => '팀 활동에서 갈등이 생겼을 때 어떻게 해결하시나요?',
  (club) => `${club.clubName}에서 본인이 기여할 수 있는 강점은 무엇인가요?`,
  () => '최근 가장 몰입해서 진행한 활동이나 프로젝트를 설명해주세요.',
  () => '동아리 활동과 학업을 함께 병행하기 위한 본인만의 방법이 있나요?',
  (club) => `${club.clubName} 활동에서 기대하는 성장 목표는 무엇인가요?`,
  () => '새로운 사람들과 협업할 때 중요하게 생각하는 태도는 무엇인가요?',
  () => '어려운 과제를 만났을 때 문제를 해결하는 방식을 설명해주세요.',
  () => '지원 분야와 관련해 최근 관심 있게 본 주제나 경험이 있나요?',
  (club) => `${club.clubName}에 들어온 뒤 가장 먼저 해보고 싶은 활동은 무엇인가요?`,
];

const hasConcreteAnswer = (answerText) =>
  concreteAnswerPattern.test(answerText);

const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    const matched = text.match(/\{[\s\S]*\}/);
    if (!matched) {
      return null;
    }

    try {
      return JSON.parse(matched[0]);
    } catch (parseError) {
      return null;
    }
  }
};

const callGeminiJson = async ({
  systemInstruction,
  prompt,
}) => {
  if (!GEMINI_API_KEY) {
    return null;
  }

  try {
    const { data } = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .join('')
        .trim();

    return text ? safeJsonParse(text) : null;
  } catch (error) {
    console.error('[AI_INTERVIEW_GEMINI_FALLBACK]', error.response?.data || error.message);
    return null;
  }
};

const createMockQuestion = ({
  club,
  questionIndex,
  questionType = 'BASE',
}) => {
  if (questionType === 'FOLLOW_UP') {
    return {
      questionType: 'FOLLOW_UP',
      sourceType: 'ANSWER_BASED',
      questionText:
        '방금 답변한 내용을 바탕으로, 더 구체적인 사례나 본인의 역할을 설명해주세요.',
    };
  }

  const template =
    baseQuestionTemplates[(questionIndex - 1) % baseQuestionTemplates.length];

  return {
    questionType: 'BASE',
    sourceType:
      club.briefDescription || club.description || club.activity
        ? 'CLUB_INFO'
        : 'GENERAL',
    questionText: template(club),
  };
};

exports.createQuestion = async ({
  club,
  questionIndex,
  questionType = 'BASE',
  answerText,
}) => {
  const fallback = createMockQuestion({
    club,
    questionIndex,
    questionType,
  });

  const generated = await callGeminiJson({
    systemInstruction:
      '너는 대학 동아리 면접관이다. 지원자가 실제 면접을 연습할 수 있도록 자연스럽고 구체적인 한국어 질문 1개만 생성한다. 반드시 JSON만 응답한다.',
    prompt: JSON.stringify({
      responseFormat: {
        questionType: 'BASE 또는 FOLLOW_UP',
        sourceType: 'CLUB_INFO 또는 ANSWER_BASED 또는 GENERAL',
        questionText: '질문 문장',
      },
      club: {
        clubName: club.clubName,
        briefDescription: club.briefDescription,
        description: club.description,
        activity: club.activity,
      },
      questionIndex,
      questionType,
      previousAnswer: answerText || null,
      instruction:
        questionType === 'FOLLOW_UP'
          ? '이전 답변이 짧거나 구체성이 낮으므로 꼬리질문을 생성한다.'
          : '동아리 정보와 일반 면접 기준을 반영해 기본 질문을 생성한다.',
    }),
  });

  if (!generated?.questionText) {
    return fallback;
  }

  return {
    questionType: generated.questionType || fallback.questionType,
    sourceType: generated.sourceType || fallback.sourceType,
    questionText: generated.questionText,
  };
};

const createMockAnswerFeedback = ({
  answerText,
}) => {
  const trimmedAnswer = answerText.trim();
  const isShortAnswer = trimmedAnswer.length < 40;
  const isConcrete = hasConcreteAnswer(trimmedAnswer);
  const status =
    !isShortAnswer && isConcrete
      ? 'SUFFICIENT'
      : 'NEEDS_IMPROVEMENT';

  return {
    status,
    goodPoints: status === 'SUFFICIENT'
      ? [
          '질문 의도에 맞게 답변했습니다.',
          '답변 안에 경험이나 역할 단서가 포함되어 있습니다.',
        ]
      : [
          '지원 의도나 생각의 방향은 확인됩니다.',
        ],
    missingPoints: status === 'SUFFICIENT'
      ? [
          '답변을 동아리 활동 목표와 더 직접적으로 연결하면 좋습니다.',
        ]
      : [
          '구체적인 사례, 본인의 역할, 결과 설명이 부족합니다.',
        ],
    improvementDirection: status === 'SUFFICIENT'
      ? '답변 마지막에 동아리에서 하고 싶은 활동과 연결해 정리해보세요.'
      : '상황, 본인의 역할, 행동, 결과 순서로 답변을 보완해보세요.',
    feedbackText: status === 'SUFFICIENT'
      ? '답변에 본인의 경험 단서가 드러나며 질문 의도에 맞게 응답했습니다.'
      : '답변의 방향은 확인되지만 구체적인 경험과 근거가 부족합니다.',
    improvementText: status === 'SUFFICIENT'
      ? '답변 마지막에 동아리 활동과 어떻게 연결되는지 한 문장으로 정리하면 더 좋습니다.'
      : '상황, 본인의 역할, 행동, 결과를 함께 말하면 답변의 설득력이 높아집니다.',
  };
};

exports.createAnswerFeedback = async ({
  questionText,
  answerText,
}) => {
  const fallback = createMockAnswerFeedback({
    answerText,
  });

  const generated = await callGeminiJson({
    systemInstruction:
      '너는 대학 동아리 면접 코치다. 지원자의 답변을 평가하고 보완 방향을 한국어로 짧고 실용적으로 제공한다. 반드시 JSON만 응답한다.',
    prompt: JSON.stringify({
      responseFormat: {
        status: 'SUFFICIENT 또는 NEEDS_IMPROVEMENT',
        goodPoints: ['잘한 점 1', '잘한 점 2'],
        missingPoints: ['부족한 점 1'],
        improvementDirection: '개선 방향 한 문장',
        feedbackText: '전체 피드백 한두 문장',
        improvementText: '다음 답변에서 바로 적용할 개선 문장',
      },
      questionText,
      answerText,
      rule:
        '답변이 짧거나 구체적인 경험, 역할, 결과가 부족하면 NEEDS_IMPROVEMENT로 평가한다.',
    }),
  });

  if (!generated?.status) {
    return fallback;
  }

  return {
    status:
      generated.status === 'SUFFICIENT'
        ? 'SUFFICIENT'
        : 'NEEDS_IMPROVEMENT',
    goodPoints: Array.isArray(generated.goodPoints)
      ? generated.goodPoints.slice(0, 3)
      : fallback.goodPoints,
    missingPoints: Array.isArray(generated.missingPoints)
      ? generated.missingPoints.slice(0, 3)
      : fallback.missingPoints,
    improvementDirection:
      generated.improvementDirection || fallback.improvementDirection,
    feedbackText: generated.feedbackText || fallback.feedbackText,
    improvementText: generated.improvementText || fallback.improvementText,
  };
};

exports.shouldCreateFollowUp = ({
  answerText,
}) => {
  const trimmedAnswer = answerText.trim();

  if (trimmedAnswer.length < 40) {
    return true;
  }

  return !hasConcreteAnswer(trimmedAnswer);
};

const createMockInterviewResult = ({
  clubName,
  turns,
}) => {
  const answeredTurns = turns.filter((turn) => turn.answerText);
  const hasShortAnswer = answeredTurns.some(
    (turn) => turn.answerText.trim().length < 40
  );
  const hasAnyConcreteAnswer = answeredTurns.some(
    (turn) => hasConcreteAnswer(turn.answerText)
  );
  const allQuestionsAnswered =
    answeredTurns.length === turns.length;

  return {
    overallSummary: hasShortAnswer
      ? `${clubName} 모의면접에서 기본적인 지원 의도는 확인되었지만, 일부 답변은 사례와 근거가 더 필요합니다.`
      : `${clubName} 모의면접에서 답변 흐름이 안정적이며, 질문 의도에 맞는 설명이 이루어졌습니다.`,
    strengths: [
      '지원 동기를 스스로 정리할 수 있음',
      '질문에 맞춰 핵심 내용을 답변하려는 태도가 있음',
    ],
    improvements: [
      '구체적인 경험과 본인의 역할을 함께 설명하기',
      '답변을 동아리 활동 목표와 연결해 마무리하기',
    ],
    evaluationItems: [
      {
        key: 'motivation',
        label: '지원동기',
        status: hasShortAnswer ? 'NEEDS_IMPROVEMENT' : 'SUFFICIENT',
        summary: hasShortAnswer
          ? '지원 이유를 더 구체적으로 설명할 필요가 있습니다.'
          : '지원 이유가 비교적 명확하게 드러납니다.',
      },
      {
        key: 'logic',
        label: '논리성',
        status: answeredTurns.length >= 3 ? 'SUFFICIENT' : 'NEEDS_IMPROVEMENT',
        summary: answeredTurns.length >= 3
          ? '여러 질문에 대해 답변 흐름을 이어갔습니다.'
          : '답변 흐름을 더 충분히 쌓을 필요가 있습니다.',
      },
      {
        key: 'experienceSpecificity',
        label: '경험의 구체성',
        status: hasAnyConcreteAnswer ? 'SUFFICIENT' : 'NEEDS_IMPROVEMENT',
        summary: hasAnyConcreteAnswer
          ? '경험이나 활동 단서가 답변에 포함되어 있습니다.'
          : '구체적인 경험, 역할, 결과 설명이 부족합니다.',
      },
      {
        key: 'answerConsistency',
        label: '답변 일관성',
        status: allQuestionsAnswered ? 'SUFFICIENT' : 'NEEDS_IMPROVEMENT',
        summary: allQuestionsAnswered
          ? '선택한 질문 수에 맞춰 답변을 완료했습니다.'
          : '아직 모든 질문에 대한 답변이 완료되지 않았습니다.',
      },
    ],
  };
};

exports.createInterviewResult = async ({
  clubName,
  turns,
}) => {
  const fallback = createMockInterviewResult({
    clubName,
    turns,
  });

  const generated = await callGeminiJson({
    systemInstruction:
      '너는 대학 동아리 모의면접 결과 리포트를 작성하는 평가자다. 전체 답변을 종합해 지원동기, 논리성, 경험의 구체성, 답변 일관성을 평가한다. 반드시 JSON만 응답한다.',
    prompt: JSON.stringify({
      responseFormat: {
        overallSummary: '전체 요약',
        strengths: ['강점 1', '강점 2'],
        improvements: ['보완점 1', '보완점 2'],
        evaluationItems: [
          {
            key: 'motivation',
            label: '지원동기',
            status: 'SUFFICIENT 또는 NEEDS_IMPROVEMENT',
            summary: '평가 요약',
          },
          {
            key: 'logic',
            label: '논리성',
            status: 'SUFFICIENT 또는 NEEDS_IMPROVEMENT',
            summary: '평가 요약',
          },
          {
            key: 'experienceSpecificity',
            label: '경험의 구체성',
            status: 'SUFFICIENT 또는 NEEDS_IMPROVEMENT',
            summary: '평가 요약',
          },
          {
            key: 'answerConsistency',
            label: '답변 일관성',
            status: 'SUFFICIENT 또는 NEEDS_IMPROVEMENT',
            summary: '평가 요약',
          },
        ],
      },
      clubName,
      turns: turns.map((turn) => ({
        questionIndex: turn.questionIndex,
        questionType: turn.questionType,
        questionText: turn.questionText,
        answerText: turn.answerText,
      })),
    }),
  });

  if (!generated?.overallSummary) {
    return fallback;
  }

  return {
    overallSummary: generated.overallSummary,
    strengths: Array.isArray(generated.strengths)
      ? generated.strengths.slice(0, 5)
      : fallback.strengths,
    improvements: Array.isArray(generated.improvements)
      ? generated.improvements.slice(0, 5)
      : fallback.improvements,
    evaluationItems:
      Array.isArray(generated.evaluationItems) &&
      generated.evaluationItems.length > 0
        ? generated.evaluationItems
        : fallback.evaluationItems,
  };
};
