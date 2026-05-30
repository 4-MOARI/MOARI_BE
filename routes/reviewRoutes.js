const express = require('express');
const router = express.Router();

const reviewController = require('../controllers/reviewController');

router.post(
  '/api/clubs/:clubId/reviews',
  reviewController.createReview
);

module.exports = router;