const { GoogleGenAI } = require('@google/genai');
const clubModel = require('../models/clubModel');
const reviewModel = require('../models/reviewModel'); 

const ai = new GoogleGenAI({});

// 리뷰 배열을 받아서 동아리별 요약 통계로 가공
function summarizeReviews(reviews) {
  if (!reviews || reviews.length === 0) {
    return {
      reviewCount: 0,
      avgActivityRating: null,
      avgSociabilityRating: null,
      topKeywords: [],
      recentComments: [],
    };
  }

  const activityRatings = reviews
    .map((r) => r.activityRating)
    .filter((v) => v != null);
  const sociabilityRatings = reviews
    .map((r) => r.sociabilityRating)
    .filter((v) => v != null);

  const avg = (arr) =>
    arr.length > 0
      ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
      : null;

  // 키워드 빈도 집계
  const keywordCount = {};
  reviews.forEach((r) => {
    const keywords = Array.isArray(r.keywords)
      ? r.keywords
      : typeof r.keywords === 'string'
      ? JSON.parse(r.keywords)
      : [];
    keywords.forEach((k) => {
      const name = k.keywordName;
      if (!name) return;
      keywordCount[name] = (keywordCount[name] || 0) + 1;
    });
  });

  const topKeywords = Object.entries(keywordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  // 최신 리뷰 2~3개만 짧게 발췌 (프롬프트 크기 제어)
  const recentComments = reviews
    .slice(0, 3)
    .map((r) => (r.content || '').slice(0, 80))
    .filter(Boolean);

  return {
    reviewCount: reviews.length,
    avgActivityRating: avg(activityRatings),
    avgSociabilityRating: avg(sociabilityRatings),
    topKeywords,
    recentComments,
  };
}

exports.getCompatibilityResult = async (clubIds) => {
  if (!Array.isArray(clubIds) || clubIds.length < 2 || clubIds.length > 4) {
    const error = new Error('비교할 동아리는 2개 이상 4개 이하로 선택해야 합니다.');
    error.status = 400;
    error.code = 'COMPATIBILITY_400';
    throw error;
  }

  const clubs = await clubModel.findClubsByIds(clubIds);

  if (!clubs || clubs.length !== clubIds.length) {
    const error = new Error('존재하지 않거나 유효하지 않은 동아리가 포함되어 있습니다.');
    error.status = 404;
    error.code = 'CLUB_404';
    throw error;
  }

  // 선택된 동아리들의 리뷰를 한 번에 조회
  const allReviews = await reviewModel.getReviewsByClubIds(clubIds);

  // clubId별로 리뷰 그룹핑
  const reviewsByClub = {};
  allReviews.forEach((r) => {
    if (!reviewsByClub[r.clubId]) reviewsByClub[r.clubId] = [];
    reviewsByClub[r.clubId].push(r);
  });

  const selectedClubsInfo = clubs.map((club) => {
    const reviewSummary = summarizeReviews(reviewsByClub[club.clubId]);

    return {
      clubName: club.clubName,
      category: club.categoryName,
      intro: club.briefDescription || club.description || '정보 없음',
      activity: club.activity || '정보 없음',
      schedule:
        Array.isArray(club.schedules) && club.schedules.length > 0
          ? club.schedules
              .map((s) => `${s.dayOfWeek} ${s.startTime}-${s.endTime}`)
              .join(', ')
          : '정기 활동 없음',
      avgRating: club.avgRating ?? null,

      // 리뷰 기반 정보 추가
      reviewCount: reviewSummary.reviewCount,
      avgActivityRating: reviewSummary.avgActivityRating, // 활동 강도 (리뷰 평균)
      avgSociabilityRating: reviewSummary.avgSociabilityRating, // 친목 비중 (리뷰 평균)
      topKeywords: reviewSummary.topKeywords, // 대표 키워드
      recentComments: reviewSummary.recentComments, // 최근 리뷰 발췌
    };
  });

  const selectedClubNames = selectedClubsInfo.map((c) => c.clubName);

  const prompt = `
너는 대학 동아리 궁합 분석 AI 전문가야.
아래 동아리들의 정보(소개, 활동 내용, 정기모임 시간, 평균 평점, 리뷰 기반 활동 강도/친목 비중/대표 키워드/최근 리뷰 요약)를 종합적으로 분석해서, 일정 충돌 여부, 활동 시너지, 병행 강도, 예산 부담도를 판단하고 **오직 순수 JSON 포맷으로만** 응답해줘.
특히 avgActivityRating(활동 강도), avgSociabilityRating(친목 비중), topKeywords, recentComments는 실제 회원들의 리뷰에서 나온 정성적 정보이니 synergyDesc/intensityDesc/recommendationReason을 작성할 때 반드시 참고해줘.
마크다운(\`\`\`json)이나 다른 설명 텍스트는 절대 포함하지 마.

[선택된 동아리 정보]
${JSON.stringify(selectedClubsInfo, null, 2)}

[응답 JSON 스키마 요구사항]
{
  "selectedClubs": ${JSON.stringify(selectedClubNames)},
  "conflictScore": (1~5 정수, 높을수록 충돌 적음),
  "conflictDesc": (문자열 요약),
  "synergyScore": (1~5 정수),
  "synergyDesc": (문자열 요약),
  "intensityScore": (1~5 정수),
  "intensityDesc": (문자열 요약),
  "budgetScore": (1~5 정수),
  "budgetDesc": (문자열 요약),
  "recommendationScore": (1~5 정수),
  "recommendationReason": (문자열),
  "cautionNote": (문자열)
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let rawText = response.text.trim();

    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    return JSON.parse(rawText);
  } catch (error) {
    console.error('Gemini API 분석 오류:', error);
    const apiError = new Error('AI 분석 처리 중 오류가 발생했습니다.');
    apiError.status = 500;
    apiError.code = 'AI_ANALYSIS_ERROR';
    throw apiError;
  }
};