const userModel =
  require('../models/userModel');
const bcrypt =
  require('bcrypt');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 50;
const PASSWORD_SALT_ROUNDS = 10;

const createNotFoundError = () => {
  const error =
    new Error(
      '사용자 정보를 찾을 수 없습니다.'
    );

  error.status = 404;
  error.code = 'USER_404';

  return error;
};

const createBadRequestError = (
  message = '잘못된 요청입니다.'
) => {
  const error =
    new Error(message);

  error.status = 400;
  error.code = 'USER_400';

  return error;
};

const createPasswordMismatchError = () => {
  const error =
    new Error(
      '비밀번호가 일치하지 않습니다.'
    );

  error.status = 401;
  error.code = 'PASSWORD_MISMATCH';

  return error;
};

const isBcryptHash = (password) => (
  typeof password === 'string' &&
  /^\$2[aby]\$\d{2}\$/.test(password)
);

const comparePassword = async ({
  plainPassword,
  savedPassword
}) => {
  if (isBcryptHash(savedPassword)) {
    return bcrypt.compare(
      plainPassword,
      savedPassword
    );
  }

  return plainPassword === savedPassword;
};

const validatePasswordInput = ({
  currentPassword,
  newPassword
}) => {
  if (
    typeof currentPassword !== 'string' ||
    currentPassword.trim() === ''
  ) {
    throw createBadRequestError(
      '현재 비밀번호를 입력해주세요.'
    );
  }

  if (
    typeof newPassword !== 'string' ||
    newPassword.trim() === ''
  ) {
    throw createBadRequestError(
      '새 비밀번호를 입력해주세요.'
    );
  }

  if (
    newPassword.length < 8 ||
    newPassword.length > 50
  ) {
    throw createBadRequestError(
      '새 비밀번호는 8자 이상 50자 이하로 입력해주세요.'
    );
  }
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

exports.verifyMyPassword = async ({
  userId,
  password
}) => {
  if (
    typeof password !== 'string' ||
    password.trim() === ''
  ) {
    throw createBadRequestError(
      '비밀번호를 입력해주세요.'
    );
  }

  const user =
    await userModel.findPasswordByUserId(
      userId
    );

  if (!user) {
    throw createNotFoundError();
  }

  const isMatched =
    await comparePassword({
      plainPassword: password,
      savedPassword:
        user.password
    });

  if (!isMatched) {
    throw createPasswordMismatchError();
  }

  return {
    isMatched: true
  };
};

exports.changeMyPassword = async ({
  userId,
  currentPassword,
  newPassword
}) => {
  validatePasswordInput({
    currentPassword,
    newPassword
  });

  const user =
    await userModel.findPasswordByUserId(
      userId
    );

  if (!user) {
    throw createNotFoundError();
  }

  const isMatched =
    await comparePassword({
      plainPassword:
        currentPassword,
      savedPassword:
        user.password
    });

  if (!isMatched) {
    throw createPasswordMismatchError();
  }

  const hashedPassword =
    await bcrypt.hash(
      newPassword,
      PASSWORD_SALT_ROUNDS
    );

  await userModel.updatePassword({
    userId,
    password:
      hashedPassword
  });

  return {
    userId
  };
};

exports.deleteMyAccount = async (
  userId
) => {
  const user =
    await userModel.findPasswordByUserId(
      userId
    );

  if (!user) {
    throw createNotFoundError();
  }

  const result =
    await userModel.deleteMyAccount(
      userId
    );

  return {
    userId,
    deletedClubCount:
      result.deletedClubCount,
    preservedClubCount:
      result.preservedClubCount
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

exports.getMyReviews = async ({
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
    await userModel.countMyReviews(
      userId
    );

  const reviews =
    await userModel.findMyReviews({
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
    reviews:
      reviews.map((review) => ({
        reviewId: review.reviewId,
        userId: review.userId,
        clubId: review.clubId,
        clubName: review.clubName,
        rating: Number(review.rating || 0),
        content: review.content,
        createdAt: review.createdAt
      }))
  };
};
