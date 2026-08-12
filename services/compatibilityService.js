const { GoogleGenAI } = require('@google/genai');
const clubModel = require('../models/clubModel');

// @google/genai SDK는 환경 변수(process.env.GEMINI_API_KEY)를 자동 인식합니다.
const ai = new GoogleGenAI({});

/**
 * AI 동아리 궁합 분석 서비스 로직
 * @param {string} userId - 현재 로그인한 유저 ID (필요시 찜 목록 검증용)
 * @param {Array<number>} clubIds - 사용자가 찜한 동아리 중 선택한 ID 배열 (2~4개)
 */
exports.getCompatibilityResult = async (userId, clubIds) => {
  // 1. 개수 제약 검증 (최소 2개 ~ 최대 4개)
  if (!Array.isArray(clubIds) || clubIds.length < 2 || clubIds.length > 4) {
    const error = new Error('비교할 동아리는 2개 이상 4개 이하로 선택해야 합니다.');
    error.status = 400;
    error.code = 'COMPATIBILITY_400';
    throw error;
  }

  // 2. DB에서 선택된 동아리 정보 조회
  // (만약 찜한 동아리인지 검증하거나 실제 DB 모델을 쓸려면 아래처럼 쿼리합니다)
  const clubs = await clubModel.findClubsByIds(clubIds);

  if (!clubs || clubs.length !== clubIds.length) {
    const error = new Error('존재하지 않거나 유효하지 않은 동아리가 포함되어 있습니다.');
    error.status = 404;
    error.code = 'CLUB_404';
    throw error;
  }
  
//   // [임시 테스트용 매핑] 실제 DB 연결 시 해당 동아리 테이블에서 정보를 가져오면 됩니다.
//   const dummyClubsData = {
//     1: { clubName: "A동아리", intro: "코딩 스터디", schedule: "월요일 18시", budget: "3만원" },
//     2: { clubName: "B동아리", intro: "영상 제작", schedule: "화요일 19시", budget: "2만원" },
//     3: { clubName: "C동아리", intro: "학술 친목", schedule: "수요일 18시", budget: "3만원" },
//     4: { clubName: "D동아리", intro: "창업 소모임", schedule: "목요일 20시", budget: "5만원" },
//     5: { clubName: "E동아리", intro: "독서 모임", schedule: "금요일 19시", budget: "1만원" }
//   };

  const selectedClubsInfo = clubIds.map(id => {
    return dummyClubsData[id] || { clubName: `동아리${id}`, intro: "정보 없음", schedule: "미정", budget: "정보 없음" };
  });

  const selectedClubNames = selectedClubsInfo.map(c => c.clubName);

  // 3. AI에게 전달할 프롬프트 구성
  const prompt = `
너는 대학 동아리 궁합 분석 AI 전문가야.
사용자가 찜한 동아리 중 엄선한 아래 동아리들의 정보(소개, 정기모임 시간, 회비 등)를 바탕으로 일정 충돌 여부, 활동 시너지, 병행 강도, 예산 부담도를 분석해서 **오직 순수 JSON 포맷으로만** 응답해줘. 
마크다운(\`\`\`json)이나 다른 설명 텍스트는 절대 포함하지 마.

[선택된 동아리 정보]
${JSON.stringify(selectedClubsInfo, null, 2)}

[응답 JSON 스키마 요구사항]
{
  "selectedClubs": ${JSON.stringify(selectedClubNames)},
  "conflictScore": (1~5 정수, 높을수록 충돌 적음),
  "conflictDesc": (문자열 요약, 예: "거의 없음"),
  "synergyScore": (1~5 정수),
  "synergyDesc": (문자열 요약, 예: "학술 + 친목 균형"),
  "intensityScore": (1~5 정수),
  "intensityDesc": (문자열 요약, 예: "보통"),
  "budgetScore": (1~5 정수),
  "budgetDesc": (문자열 요약, 예: "보통 (추가 비용 있음)"),
  "recommendationScore": (1~5 정수),
  "recommendationReason": (문자열, 추천 이유 상세 설명),
  "cautionNote": (문자열, 주의사항)
}
`;

  try {
    // 4. Gemini 모델 호출
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let rawText = response.text.trim();

    // 마크다운 백틱 제거 가공
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    // 5. JSON 파싱 후 반환
    const analysisResult = JSON.parse(rawText);
    return analysisResult;

  } catch (error) {
    console.error('Gemini API 분석 오류:', error);
    const apiError = new Error('AI 분석 처리 중 오류가 발생했습니다.');
    apiError.status = 500;
    apiError.code = 'AI_ANALYSIS_ERROR';
    throw apiError;
  }
};