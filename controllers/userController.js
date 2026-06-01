const userService =
  require('../services/userService');

exports.getMyProfile = async (
  req,
  res,
  next
) => {
  try {
    // const userId =
    //   req.user.userId;
    const userId = '1';

    const result =
      await userService.getMyProfile(
        userId
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

exports.getMyFavoriteClubs = async (
  req,
  res,
  next
) => {
  try {
    // const userId =
    //   req.user.userId;
    const userId = '1';

    const result =
      await userService.getMyFavoriteClubs({
        userId,
        page: req.query.page,
        limit: req.query.limit
      });

    return res.status(200).json({
      success: true,
      data: result,
      error: null
    });

  } catch (error) {
    next(error);
  }
};

exports.getMyClubs = async (
  req,
  res,
  next
) => {
  try {
    // const userId =
    //   req.user.userId;
    const userId = '1';

    const result =
      await userService.getMyClubs({
        userId,
        page: req.query.page,
        limit: req.query.limit
      });

    return res.status(200).json({
      success: true,
      data: result,
      error: null
    });

  } catch (error) {
    next(error);
  }
};
