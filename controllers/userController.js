const userService =
  require('../services/userService');

exports.getMyProfile = async (
  req,
  res,
  next
) => {
  try {
    const userId =
      req.user.userId;

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

exports.verifyMyPassword = async (
  req,
  res,
  next
) => {
  try {
    const userId =
      req.user.userId;

    const result =
      await userService.verifyMyPassword({
        userId,
        password:
          req.body.password
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

exports.changeMyPassword = async (
  req,
  res,
  next
) => {
  try {
    const userId =
      req.user.userId;

    const result =
      await userService.changeMyPassword({
        userId,
        currentPassword:
          req.body.currentPassword,
        newPassword:
          req.body.newPassword
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

exports.deleteMyAccount = async (
  req,
  res,
  next
) => {
  try {
    const userId =
      req.user.userId;

    const result =
      await userService.deleteMyAccount(
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
    const userId =
      req.user.userId;

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
    const userId =
      req.user.userId;

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
