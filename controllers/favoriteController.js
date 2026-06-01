const favoriteService =
  require('../services/favoriteService');

exports.createFavorite = async (
  req,
  res,
  next
) => {
  try {
    const clubId =
      Number(req.params.clubId);

    // const userId =
    //   req.user.userId;
    const userId = '1';

    const result =
      await favoriteService.createFavorite({
        userId,
        clubId
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

exports.deleteFavorite = async (
  req,
  res,
  next
) => {
  try {
    const clubId =
      Number(req.params.clubId);

    // const userId =
    //   req.user.userId;
    const userId = '1';

    const result =
      await favoriteService.deleteFavorite({
        userId,
        clubId
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

exports.getFavoriteStatus = async (
  req,
  res,
  next
) => {
  try {
    const clubId =
      Number(req.params.clubId);

    // const userId =
    //   req.user.userId;
    const userId = '1';

    const result =
      await favoriteService.getFavoriteStatus({
        userId,
        clubId
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
