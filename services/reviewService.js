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


/**
 * 특정 동아리 리뷰 전체 조회
 */
exports.getClubReviews = async (clubId, loginUserId ) => {

  // clubId 검증
  if (!clubId || isNaN(clubId)) {

    const error = new Error(
      '올바른 동아리 ID가 아닙니다.'
    );

    error.status = 400;
    error.code = 'REVIEW_400';

    throw error;
  }

  // 동아리 존재 여부 확인
  const club =
    await clubModel.findClubById(clubId);

  if (!club) {

    const error = new Error(
      '존재하지 않는 동아리입니다.'
    );

    error.status = 404;
    error.code = 'CLUB_404';

    throw error;
  }

  // 평균 별점 + 리뷰 수 조회
  const stats =
    await reviewModel.getReviewStatsByClubId(
      clubId
    );

  // 리뷰 목록 조회
  const reviews =
    await reviewModel.getReviewsByClubId(
      clubId
    );
    //내가 쓴 리뷰
//   const reviewsWithMine =
//   reviews.map((review) => ({
//     ...review,
//     isMine:
//       Number(review.userId) ===
//       Number(loginUserId),
//   }));
//콘솔찍어봄!(삭제예정)
const reviewsWithMine =
reviews.map((review) => {

  console.log(
    "review.userId =",
    review.userId
  );

  console.log(
    "loginUserId =",
    loginUserId
  );

  return {
    ...review,
    isMine:
      review.userId === loginUserId,
  };
});
 

  return {
    clubId,
    averageRating:
      Number(stats.averageRating || 0),
    reviewCount:
      Number(stats.reviewCount || 0),
    reviews: reviewsWithMine
  };
};


/**
 * 리뷰 삭제
 */
exports.deleteReview = async ({
  reviewId,
  userId
}) => {

  // reviewId 검증
  if (
    !reviewId ||
    isNaN(reviewId)
  ) {

    const error = new Error(
      '올바른 리뷰 ID가 아닙니다.'
    );

    error.status = 400;
    error.code = 'REVIEW_400';

    throw error;
  }

  // 리뷰 존재 여부 확인
  const review =
    await reviewModel.findByReviewId(
      reviewId
    );

  if (!review) {

    const error = new Error(
      '존재하지 않는 리뷰입니다.'
    );

    error.status = 404;
    error.code = 'REVIEW_404';

    throw error;
  }

  // 본인 리뷰 여부 확인
  if (
    review.userId !== userId
  ) {

    const error = new Error(
      '본인이 작성한 리뷰만 삭제할 수 있습니다.'
    );

    error.status = 403;
    error.code = 'REVIEW_403';

    throw error;
  }

  // 리뷰 삭제
  await reviewModel.deleteReview(
    reviewId
  );
};





