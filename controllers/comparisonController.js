const comparisonService = require('../services/comparisonService');

exports.getComparisonData = async (req, res, next) => {
  try {
    const { clubIds } = req.body;

    const result = await comparisonService.getComparisonData(clubIds);

    return res.status(200).json({
      success: true,
      data: {
        clubs: result,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};