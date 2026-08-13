const express = require('express');

const router = express.Router();



const reviewController = require('../controllers/reviewController');

// authMiddleware 구현 후 활성화 예정 

const verifyToken = 

    require('../middlewares/authMiddleware');

//리뷰 등록

router.post(

  '/api/clubs/:clubId/reviews',

  verifyToken,

  reviewController.createReview

);



//리뷰 전체 조회

router.get(
    '/api/clubs/:clubId/reviews',
    verifyToken,
    reviewController.getClubReviews,  
);

// 리뷰 대표 키워드 조회
router.get(
    '/api/clubs/:clubId/reviews/top-keywords',
    verifyToken,
    reviewController.getTopKeywords
);

//리뷰 삭제
router.delete(
    '/api/reviews/:reviewId',
    verifyToken,
    reviewController.deleteReview
);



module.exports = router;