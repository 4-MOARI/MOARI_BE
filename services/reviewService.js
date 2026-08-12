const reviewModel = require('../models/reviewModel');
const clubModel = require('../models/clubModel');
const db = require('../database/db'); // 트랜잭션 처리를 위한 db 객체 import

exports.createReview = async ({
  userId,
  clubId,
  rating,
  activityRating,
  sociabilityRating,
  content,
  keywordIds
}) => {

  // 1.입력값 검증(rating, activityRating, sociabilityRating 모두 1~5 정수 검증)
  if (
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    (activityRating && (!Number.isInteger(activityRating) || activityRating < 1 || activityRating > 5)) ||
    (sociabilityRating && (!Number.isInteger(sociabilityRating) || sociabilityRating < 1 || sociabilityRating > 5)) ||
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

  // 2. 동아리 존재 확인
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

  // 3. 중복 리뷰 확인
  const existingReview =
    await reviewModel.findByUserIdAndClubId(
      userId,
      clubId
    );

  if (existingReview) {

    const error = new Error(
      '이미 해당 동아리에 리뷰를 작성했습니다.'
    );

    error.status = 409;
    error.code = 'REVIEW_409';

    throw error;
  }

  // 트랜잭션 시작 (리뷰 테이블과 키워드 매핑 테이블을 동시에 안전하게 저장하기 위함)
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 4. 리뷰 저장
    const finalActivityRating = activityRating || 3;
    const finalSociabilityRating = sociabilityRating || 3;

    const reviewId = await reviewModel.createReview({
      userId,
      clubId,
      rating,
      activityRating: finalActivityRating,
      sociabilityRating: finalSociabilityRating,
      content
    }, connection);

    // 5. 키워드 매핑 저장
    if (keywordIds && Array.isArray(keywordIds) && keywordIds.length > 0) {
      await reviewModel.createReviewKeywords(reviewId, keywordIds, connection);
    }

    await connection.commit();

    // 6. 반환 데이터 구성 
    return {
      reviewId,
      userId,
      clubId: Number(clubId),
      rating,
      activityRating: finalActivityRating,
      sociabilityRating: finalSociabilityRating,
      content,
      keywordIds: keywordIds || [],
      createdAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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

  const reviewsWithMine =
  reviews.map((review) => {

  

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





