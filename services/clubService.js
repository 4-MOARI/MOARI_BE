const clubModel = require('../models/clubModel');

exports.getClubs = async ({ keyword, categoryId, isRecruiting, schoolType, sort }) => {
  // sort 유효성 검사
  const validSorts = ['favoriteCount', 'rating', 'name'];
  if (sort && !validSorts.includes(sort)) {
    const error = new Error('올바르지 않은 정렬 기준입니다.');
    error.status = 400;
    error.code = 'CLUB_4001';
    throw error;
  }

  const clubs = await clubModel.getClubs({
    keyword,
    categoryId,
    isRecruiting,
    schoolType,
    sort
  });

  return {
    totalCount: clubs.length,
    clubs
  };
};

exports.getClubHistory = async (clubId) => {
  // clubId 유효성 검사
  if (!clubId || isNaN(clubId)) {
    const error = new Error('올바르지 않은 동아리 ID입니다.');
    error.status = 400;
    error.code = 'CLUB_400';
    throw error;
  }

  // 동아리 존재 여부 확인
  const club = await clubModel.findClubById(clubId);
  if (!club) {
    const error = new Error('해당 동아리를 찾을 수 없습니다.');
    error.status = 400;
    error.code = 'CLUB_404';
    throw error;
  }

  // 수정 로그 조회
  const history = await clubModel.getClubHistory(clubId);

  return {
    clubId: Number(clubId),
    history
  };
};