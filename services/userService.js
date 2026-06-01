const userModel =
  require('../models/userModel');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 50;

const createNotFoundError = () => {
  const error =
    new Error(
      '사용자 정보를 찾을 수 없습니다.'
    );

  error.status = 404;
  error.code = 'USER_404';

  return error;
};

const getPagination = ({
  page,
  limit
}) => {
  const parsedPage =
    Number(page || DEFAULT_PAGE);

  const parsedLimit =
    Number(limit || DEFAULT_LIMIT);

  if (
    !Number.isInteger(parsedPage) ||
    parsedPage < 1 ||
    !Number.isInteger(parsedLimit) ||
    parsedLimit < 1 ||
    parsedLimit > MAX_LIMIT
  ) {
    const error =
      new Error(
        '올바른 페이지 요청이 아닙니다.'
      );

    error.status = 400;
    error.code = 'USER_400';

    throw error;
  }

  return {
    page: parsedPage,
    limit: parsedLimit,
    offset:
      (parsedPage - 1) * parsedLimit
  };
};

const formatClub = (club) => ({
  clubId: club.clubId,
  clubName: club.clubName,
  briefDescription:
    club.briefDescription,
  profileImageUrl:
    club.profileImageUrl,
  coverImageUrl:
    club.coverImageUrl,
  categoryId:
    club.categoryId,
  categoryName:
    club.categoryName,
  schoolId:
    club.schoolId,
  schoolName:
    club.schoolName,
  recruitStartAt:
    club.recruitStartAt,
  recruitEndAt:
    club.recruitEndAt,
  isRecruiting:
    Boolean(
      club.recruitStartAt &&
      club.recruitEndAt &&
      new Date(club.recruitStartAt) <= new Date() &&
      new Date(club.recruitEndAt) >= new Date()
    ),
  averageRating:
    Number(club.averageRating || 0),
  reviewCount:
    Number(club.reviewCount || 0),
  favoriteCount:
    Number(club.favoriteCount || 0)
});

exports.getMyProfile = async (
  userId
) => {
  const user =
    await userModel.findMyProfile(
      userId
    );

  if (!user) {
    throw createNotFoundError();
  }

  return {
    userId: user.userId,
    userName: user.userName,
    email: user.email,
    isVerified:
      Boolean(user.isVerified),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    school: {
      schoolId: user.schoolId,
      schoolName:
        user.schoolName,
      schoolDomain:
        user.schoolDomain
    }
  };
};

exports.getMyFavoriteClubs = async ({
  userId,
  page,
  limit
}) => {
  const pagination =
    getPagination({
      page,
      limit
    });

  const totalCount =
    await userModel.countFavoriteClubs(
      userId
    );

  const clubs =
    await userModel.findFavoriteClubs({
      userId,
      limit: pagination.limit,
      offset: pagination.offset
    });

  return {
    page: pagination.page,
    limit: pagination.limit,
    totalCount,
    totalPages:
      Math.ceil(
        totalCount / pagination.limit
      ),
    clubs:
      clubs.map((club) => ({
        ...formatClub(club),
        isFavorite: true
      }))
  };
};

exports.getMyClubs = async ({
  userId,
  page,
  limit
}) => {
  const pagination =
    getPagination({
      page,
      limit
    });

  const totalCount =
    await userModel.countMyClubs(
      userId
    );

  const clubs =
    await userModel.findMyClubs({
      userId,
      limit: pagination.limit,
      offset: pagination.offset
    });

  return {
    page: pagination.page,
    limit: pagination.limit,
    totalCount,
    totalPages:
      Math.ceil(
        totalCount / pagination.limit
      ),
    clubs:
      clubs.map((club) => ({
        ...formatClub(club),
        createdAt: club.createdAt,
        updatedAt: club.updatedAt
      }))
  };
};
