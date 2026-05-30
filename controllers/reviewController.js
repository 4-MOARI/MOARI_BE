const reviewService = require('../services/reviewService');

exports.createReview = async (req, res, next) => {
  try {
    const clubId = Number(req.params.clubId);

    const { rating, content } = req.body;

    // 로그인 유저라고 가정
    //const userId = req.user.userId;
    //JWT 구현 전 임시 userId
    const userId = 1;

    const review =
      await reviewService.createReview({
        userId,
        clubId,
        rating,
        content
      });

    return res.status(201).json({
      success: true,
      data: review,
      error: null
    });

  } catch (error) {
    next(error);
  }
};