const compatibilityService = require('../services/compatibilityService');

exports.analyzeCompatibility = async (req, res, next) => {
  try {
    const { clubIds } = req.body;

    // 1. 유효성 검증 (2개 이상 4개 이하 확인)
    if (!clubIds || !Array.isArray(clubIds) || clubIds.length < 2 || clubIds.length > 4) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'COMPATIBILITY_400',
          message: '비교할 동아리는 2개 이상 4개 이하로 선택해야 합니다.'
        }
      });
    }

    // 2. 서비스 계층에서 분석 결과 생성
    const result = await compatibilityService.getCompatibilityResult(clubIds);

    // 3. 성공 응답 반환 (명세서 규격 준수)
    return res.status(200).json({
      success: true,
      data: result,
      error: null
    });

  } catch (error) {
    next(error);
  }
};