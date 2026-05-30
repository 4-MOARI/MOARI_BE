const reviewModel = require('../models/reviewModel');
const clubModel = require('../models/clubModel');

exports.createReview = async ({
  userId,
  clubId,
  rating,
  content
}) => {

  // 입력값 검증
  if (
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    !content ||
    content.trim() === ''
  ) {

    const error = new Error(
      '별점은 1점에서 5점 사이여야 하며, 리뷰 내용은 필수입니다.'
    );

    error.status = 400;
    error.code = 'REVIEW_400';

    throw error;
  }

  // 1. 동아리 존재 확인
  const club =
    await clubModel.findClubById(clubId);

  if (!club) {

    const error = new Error(
      '리뷰를 작성하려는 동아리가 존재하지 않습니다.'
    );

    error.status = 404;
    error.code = 'CLUB_404';

    throw error;
  }

  // 2. 중복 리뷰 확인
  const existingReview =
    await reviewModel.findByUserIdAndClubId(
      userId,
      clubId
    );

  if (existingReview) {

    const error = new Error(
      '이미 해당 동아리에 리뷰를 작성했습니다.'
    );

    error.status = 400;
    error.code = 'REVIEW_ALREADY_EXISTS';

    throw error;
  }

  // 3. 리뷰 저장
  const reviewId =
    await reviewModel.createReview({
      userId,
      clubId,
      rating,
      content
    });

  // 4. 반환
  return {
    reviewId,
    userId,
    clubId,
    rating,
    content,
    createdAt: new Date()
  };
};

