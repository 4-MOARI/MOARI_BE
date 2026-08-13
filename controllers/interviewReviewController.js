const {
  createInterviewReviewService,
  getInterviewReviewsService,
  getMyInterviewReviewsService,
  deleteInterviewReviewService,
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


const getMyInterviewReviews = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.user.userId;

    const result =
      await getMyInterviewReviewsService(userId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};



const deleteInterviewReview = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.user.userId;

    const interviewReviewId = Number(
      req.params.interviewReviewId
    );

    const result =
      await deleteInterviewReviewService({
        interviewReviewId,
        userId,
      });

    return res.status(200).json({
      success: true,
      data: result,
      message: '면접 후기가 삭제되었습니다.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInterviewReview,
  getInterviewReviews,

  getMyInterviewReviews,
  deleteInterviewReview,
};