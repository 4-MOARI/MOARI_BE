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