const favoriteModel =
  require('../models/favoriteModel');

const clubModel =
  require('../models/clubModel');

const validateClubId = (clubId) => {
  if (
    !clubId ||
    !Number.isInteger(clubId)
  ) {
    const error =
      new Error(
        '올바른 동아리 ID가 아닙니다.'
      );

    error.status = 400;
    error.code = 'FAVORITE_400';

    throw error;
  }
};

const validateClubExists = async (
  clubId
) => {
  const club =
    await clubModel.findClubById(
      clubId
    );

  if (!club) {
    const error =
      new Error(
        '존재하지 않는 동아리입니다.'
      );

    error.status = 404;
    error.code = 'CLUB_404';

    throw error;
  }
};

exports.createFavorite = async ({
  userId,
  clubId
}) => {
  validateClubId(clubId);
  await validateClubExists(clubId);

  const favorite =
    await favoriteModel.findByUserIdAndClubId(
      userId,
      clubId
    );

  if (favorite) {
    const error =
      new Error(
        '이미 찜한 동아리입니다.'
      );

    error.status = 409;
    error.code = 'FAVORITE_ALREADY_EXISTS';

    throw error;
  }

  await favoriteModel.createFavorite({
    userId,
    clubId
  });

  return {
    userId,
    clubId,
    isFavorite: true
  };
};

exports.deleteFavorite = async ({
  userId,
  clubId
}) => {
  validateClubId(clubId);
  await validateClubExists(clubId);

  const favorite =
    await favoriteModel.findByUserIdAndClubId(
      userId,
      clubId
    );

  if (!favorite) {
    const error =
      new Error(
        '찜하지 않은 동아리입니다.'
      );

    error.status = 404;
    error.code = 'FAVORITE_NOT_FOUND';

    throw error;
  }

  await favoriteModel.deleteFavorite({
    userId,
    clubId
  });

  return {
    userId,
    clubId,
    isFavorite: false
  };
};

exports.getFavoriteStatus = async ({
  userId,
  clubId
}) => {
  validateClubId(clubId);
  await validateClubExists(clubId);

  const favorite =
    await favoriteModel.findByUserIdAndClubId(
      userId,
      clubId
    );

  return {
    userId,
    clubId,
    isFavorite: Boolean(favorite)
  };
};
