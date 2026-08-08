const express = require('express');

const {
  createInterviewReview,
  getInterviewReviews,
} = require('../controllers/interviewReviewController');

const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

/*
GET
/clubs/:clubId/interview-reviews
*/
router.get(
  '/clubs/:clubId/interview-reviews',
  getInterviewReviews
);

/*
POST
/clubs/:clubId/interview-reviews
*/
router.post(
  '/clubs/:clubId/interview-reviews',
  authMiddleware,
  createInterviewReview
);

module.exports = router;