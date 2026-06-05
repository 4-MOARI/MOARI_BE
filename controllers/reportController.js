const reportService =
  require('../services/reportService');

exports.createClubReport = async (
  req,
  res,
  next
) => {

  try {

    const clubId =
      Number(req.params.clubId);

    const userId =
      req.user.userId;
    //const userId = 1;

    const {
      reasonCode,
      customReason
    } = req.body;

    const result =
      await reportService.createClubReport({
        clubId,
        userId,
        reasonCode,
        customReason
      });

    return res.status(201).json({
      success: true,
      data: result,
      error: null
    });

  } catch (error) {
    next(error);
  }
};

exports.getReportSummary = async (
  req,
  res,
  next
) => {

  try {

    const clubId =
      Number(req.params.clubId);

    const result =
      await reportService.getReportSummary(
        clubId
      );

    return res.status(200).json({
      success: true,
      data: result,
      error: null
    });

  } catch (error) {
    next(error);
  }
};