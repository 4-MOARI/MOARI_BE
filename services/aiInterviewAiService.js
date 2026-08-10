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

exports.createQuestion = ({
  club,
  questionIndex,
  questionType = 'BASE',
  answerText,
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

exports.createAnswerFeedback = ({
  answerText,
}) => {
  const trimmedAnswer = answerText.trim();
  const isShortAnswer = trimmedAnswer.length < 40;

  return {
    feedbackText: isShortAnswer
      ? '답변의 방향은 확인되지만 구체적인 경험과 근거가 부족합니다.'
      : '답변에 본인의 생각이 드러나며 면접 질문에 맞게 응답했습니다.',
    improvementText: isShortAnswer
      ? '상황, 본인의 역할, 행동, 결과를 함께 말하면 답변의 설득력이 높아집니다.'
      : '답변 마지막에 동아리 활동과 어떻게 연결되는지 한 문장으로 정리하면 더 좋습니다.',
  };
};

exports.createInterviewResult = ({
  clubName,
  turns,
}) => {
  const answeredTurns = turns.filter((turn) => turn.answerText);
  const hasShortAnswer = answeredTurns.some(
    (turn) => turn.answerText.trim().length < 40
  );

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
  };
};
