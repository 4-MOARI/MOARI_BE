const clubService = require('../services/clubService');

// 동아리 목록 조회 (검색/필터/정렬)
exports.getClubs = async (req, res, next) => {
  try {
    const { keyword, categoryId, isRecruiting, schoolType, sort } = req.query;

    const result = await clubService.getClubs({
      keyword,
      categoryId,
      isRecruiting,
      schoolType,
      sort
    });

    return res.status(200).json({
      success: true,
      data: result,
      error: null
    });
  } catch (error) {
    next(error);
  }
};