const clubModel = require('../models/clubModel');

exports.getComparisonData = async (clubIds) => {
  if (!Array.isArray(clubIds) || clubIds.length < 2 || clubIds.length > 4) {
    const error = new Error('비교할 동아리는 2개 이상 5개 이하로 선택해야 합니다.');
    error.status = 400;
    error.code = 'COMPARISON_400';
    throw error;
  }

  const normalizedIds = [...new Set(clubIds.map(Number))];

  if (
    normalizedIds.length !== clubIds.length ||
    normalizedIds.some((id) => !Number.isInteger(id) || id <= 0)
  ) {
    const error = new Error('올바르지 않은 동아리 ID가 포함되어 있습니다.');
    error.status = 400;
    error.code = 'COMPARISON_INVALID_CLUB_ID';
    throw error;
  }

  const clubs = await clubModel.findClubsByIds(normalizedIds);

  if (clubs.length !== normalizedIds.length) {
    const error = new Error('존재하지 않는 동아리가 포함되어 있습니다.');
    error.status = 404;
    error.code = 'CLUB_404';
    throw error;
  }

  const schedulesByClubId = {};

  for (const clubId of normalizedIds) {
    schedulesByClubId[clubId] =
      await clubModel.findClubSchedulesByClubId(clubId);
  }

  return normalizedIds.map((clubId) => {
    const club = clubs.find((item) => item.clubId === clubId);

    return {
      clubId: club.clubId,
      clubName: club.clubName,
      categoryId: club.categoryId,
      categoryName: club.categoryName || '미지정',

      briefDescription: club.briefDescription || '',
      description: club.description || '',
      activity: club.activity || '',

      avgRating: Number(club.avgRating || 0),
      favoriteCount: Number(club.favoriteCount || 0),

      recruitStartAt: club.recruitStartAt,
      recruitEndAt: club.recruitEndAt,

      profileImageUrl: club.profileImageUrl || null,
      coverImageUrl: club.coverImageUrl || null,

      schedules: schedulesByClubId[clubId] || [],
    };
  });
};