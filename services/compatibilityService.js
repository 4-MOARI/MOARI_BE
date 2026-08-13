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

  const activityRatings = reviews.map((r) => r.activityRating).filter((v) => v != null);
  const sociabilityRatings = reviews.map((r) => r.sociabilityRating).filter((v) => v != null);

  const avg = (arr) =>
    arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

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

/**
 * 주어진 인덱스 배열에서 크기 2 이상인 모든 부분집합(조합)을 생성합니다.
 * n <= 4 이므로 비트마스크로 전수 탐색해도 최대 11개 조합밖에 안 나와 성능 문제 없음.
 */
function getAllSubsets(indices) {
  const n = indices.length;
  const subsets = [];

  for (let mask = 1; mask < (1 << n); mask++) {
    const subset = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(indices[i]);
    }
    if (subset.length >= 2) subsets.push(subset);
  }

  return subsets;
}

const DEFAULT_CAUTION_NOTE = '주의사항 없습니다.';

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

  const allReviews = await reviewModel.getReviewsByClubIds(clubIds);

  const reviewsByClub = {};
  allReviews.forEach((r) => {
    if (!reviewsByClub[r.clubId]) reviewsByClub[r.clubId] = [];
    reviewsByClub[r.clubId].push(r);
  });

  const selectedClubsInfo = clubs.map((club) => {
    const reviewSummary = summarizeReviews(reviewsByClub[club.clubId]);

    return {
      clubId: club.clubId,
      clubName: club.clubName,
      category: club.categoryName,
      intro: club.briefDescription || club.description || '정보 없음',
      activity: club.activity || '정보 없음',
      schedule:
        Array.isArray(club.schedules) && club.schedules.length > 0
          ? club.schedules.map((s) => `${s.dayOfWeek} ${s.startTime}-${s.endTime}`).join(', ')
          : '정기 활동 없음',
      avgRating: club.avgRating ?? null,
      reviewCount: reviewSummary.reviewCount,
      avgActivityRating: reviewSummary.avgActivityRating,
      avgSociabilityRating: reviewSummary.avgSociabilityRating,
      topKeywords: reviewSummary.topKeywords,
      recentComments: reviewSummary.recentComments,
    };
  });

  // 2개~4개짜리 모든 하위 조합을 후보로 생성 (인덱스 기준)
  const indices = selectedClubsInfo.map((_, i) => i);
  const combinationIndexSets = getAllSubsets(indices);

  const candidateCombinations = combinationIndexSets.map((idxSet, comboIndex) => ({
    comboIndex,
    clubNames: idxSet.map((i) => selectedClubsInfo[i].clubName),
  }));

  const prompt = `
너는 대학 동아리 궁합 분석 AI 전문가야.
아래는 사용자가 선택한 동아리들의 상세 정보(소개, 활동 내용, 정기모임 시간, 평균 평점, 리뷰 기반 활동 강도/친목 비중/대표 키워드/최근 리뷰 요약)야.
그리고 그 아래에는 이 동아리들로 만들 수 있는 "병행 가능한 모든 조합 후보(2~4개짜리)" 목록이 comboIndex와 함께 주어져.

너의 작업:
1. 각 후보 조합에 대해 일정 충돌 여부, 활동 시너지, 병행 강도, 예산 부담도를 내부적으로 비교 평가해.
2. 그중에서 실제로 함께 병행하기에 가장 좋다고 판단되는 "단 하나의 최적 조합"만 최종 선택해.
3. 선택하지 않은 나머지 조합에 대한 분석 내용은 응답에 절대 포함하지 마. 오직 최종 선택된 조합 하나에 대한 분석만 응답해.
4. 아래 스키마 그대로, **오직 순수 JSON 포맷으로만** 응답해. 마크다운(\`\`\`json) 이나 다른 설명 텍스트는 절대 포함하지 마.
5. cautionNote 필드는 반드시 채워야 해. 일정 충돌, 체력/시간 부담 등 특별히 주의할 사항이 하나라도 있으면 그 내용을 적고, 정말 아무 문제가 없다고 판단되면 다른 표현 없이 정확히 "주의사항 없습니다." 라는 문자열을 그대로 출력해. 빈 문자열이나 null, 필드 생략은 절대 허용하지 않아.

[동아리 상세 정보]
${JSON.stringify(selectedClubsInfo, null, 2)}

[평가할 후보 조합 목록 (comboIndex 기준)]
${JSON.stringify(candidateCombinations, null, 2)}

[응답 JSON 스키마]
{
  "bestComboIndex": (위 후보 목록 중 최종 선택한 조합의 comboIndex 정수),
  "selectedClubs": (선택한 조합에 포함된 동아리 이름 문자열 배열),
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
  "cautionNote": (특별한 주의사항이 없으면 반드시 "주의사항 없습니다.")
}
`;

  let parsed;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
    });

    let rawText = response.text.trim();

    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    parsed = JSON.parse(rawText);
  } catch (error) {
    console.error('Gemini API 분석 오류:', error);
    const apiError = new Error('AI 분석 처리 중 오류가 발생했습니다.');
    apiError.status = 500;
    apiError.code = 'AI_ANALYSIS_ERROR';
    throw apiError;
  }

  // AI가 고른 조합 인덱스를 서버에서 다시 실제 데이터와 매핑 (이름 오기 등 방어)
  const chosenCombo =
    candidateCombinations.find((c) => c.comboIndex === parsed.bestComboIndex) ??
    candidateCombinations[0];

  const chosenIndices = combinationIndexSets[chosenCombo.comboIndex] ?? combinationIndexSets[0];
  const chosenClubs = chosenIndices.map((i) => selectedClubsInfo[i]);

  const cautionNote =
    typeof parsed.cautionNote === 'string' && parsed.cautionNote.trim().length > 0
      ? parsed.cautionNote.trim()
      : DEFAULT_CAUTION_NOTE;

  return {
    selectedClubs: chosenClubs.map((c) => c.clubName),
    selectedClubIds: chosenClubs.map((c) => c.clubId),
    conflictScore: parsed.conflictScore,
    conflictDesc: parsed.conflictDesc,
    synergyScore: parsed.synergyScore,
    synergyDesc: parsed.synergyDesc,
    intensityScore: parsed.intensityScore,
    intensityDesc: parsed.intensityDesc,
    budgetScore: parsed.budgetScore,
    budgetDesc: parsed.budgetDesc,
    recommendationScore: parsed.recommendationScore,
    recommendationReason: parsed.recommendationReason,
    cautionNote,
  };
};