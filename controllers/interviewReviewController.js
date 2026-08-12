const {
  createInterviewReviewService,
  getInterviewReviewsService,
} = require('../services/interviewReviewService');

const createInterviewReview = async (req, res, next) => {
  try {
    const clubId = Number(req.params.clubId);
    const userId = req.user.userId;

    const result = await createInterviewReviewService({
      clubId,
      userId,
      ...req.body,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getInterviewReviews = async (req, res, next) => {
  try {
    const clubId = Number(req.params.clubId);

    const result = await getInterviewReviewsService(clubId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInterviewReview,
  getInterviewReviews,
};