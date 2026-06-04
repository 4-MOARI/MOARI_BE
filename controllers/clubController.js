const clubService = require('../services/clubService');

// 동아리 목록 조회 (검색/필터/정렬)
exports.getClubs = async (req, res, next) => {
  try {
    const { keyword, categoryId, isRecruiting, schoolType, sort, page, pageSize } = req.query;

    const result = await clubService.getClubs({
      keyword,
      categoryId,
      isRecruiting,
      schoolType,
      sort,
      page,
      pageSize
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

// 동아리 수정 로그 조회
exports.getClubHistory = async (req, res, next) => {
  try {
    const clubId = Number(req.params.clubId);
    const { page, pageSize } = req.query;

    const result = await clubService.getClubHistory(clubId, { page, pageSize });

    return res.status(200).json({
      success: true,
      data: result,
      error: null
    });
  } catch (error) {
    next(error);
  }
};


// 크롤링 동아리 정보 기본 적재 API
exports.crawlClubs = async (req, res, next) => {
  try {
    // req.body로 들어오는 크롤링 데이터를 서비스로 전달
    const result = await clubService.crawlClubs(req.body);
    return res.status(201).json({
      success: true,
      data: result,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

// 크롤링 동아리 외부 링크 매핑 저장 API
exports.saveClubLinks = async (req, res, next) => {
  try {
    const clubId = Number(req.params.clubId);
    const result = await clubService.saveClubLinks(clubId, req.body);
    return res.status(201).json({
      success: true,
      data: result,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

// 동아리 상세페이지 UI 데이터 조회 API
exports.getClubDetail = async (req, res, next) => {
  try {
    const clubId = Number(req.params.clubId);
    const result = await clubService.getClubDetail(clubId);
    return res.status(200).json({
      success: true,
      data: result,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

// 전체 카테고리 목록 조회 API
exports.getCategories = async (req, res, next) => {
  try {
    const result = await clubService.getCategories();
    return res.status(200).json({
      success: true,
      data: result,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

// 동아리 수정 API
exports.updateClub = async (req, res, next) => {
  try {
    const clubId = Number(req.params.clubId);
    const result = await clubService.updateClub(clubId, req.body);
    return res.status(200).json({
      success: true,
      data: result,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

// 동아리 등록 API
exports.registerClub = async (req, res, next) => {
  try {
    const result = await clubService.registerClub(req.body);
    return res.status(201).json({
      success: true,
      data: result,
      error: null
    });
  } catch (error) {
    next(error);
  }
};