const reviewService = require('../services/reviewService');

exports.createReview = async (req, res, next) => {
  try {
    const clubId = Number(req.params.clubId);

    const { rating, content } = req.body;

    // 로그인 유저라고 가정
    // const userId = req.user.userId;
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

//특정 동아리 리뷰 전체 조회
exports.getClubReviews = async (req, res, next ) => {
    try {
        const clubId = Number(req.params.clubId);

        const result = 
            await reviewService.getClubReviews( clubId );

        return res.status(200).json({
            success: true,
            data: result,
            error: null
        });
    } catch (error) {
        next(error);
    }
};

//리뷰 삭제
exports.deleteReview = async (
    req,
    res,
    next
) => {
    try {
        const reviewId =
            Number(req.params.reviewId);

        //JWT 구현 전 임시 userId
        const userId = 1;

        //const userId =
        //  req.user.userId;

        await reviewService.deleteReview({
            reviewId,
            userId
        });

        return res.status(200).json({
            success: true,
            data: {
                message:
                    '리뷰가 성공적으로 삭제되었습니다.'
            },
            error: null
        });
    } catch (error) {
        next(error);
    }
};