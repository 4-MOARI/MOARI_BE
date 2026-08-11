//리뷰 등록(수정 26.08.11)
const db = require('../database/db');

exports.findByUserIdAndClubId = async (
  userId,
  clubId
) => {

  const [rows] = await db.query(
    `
    SELECT reviewId
    FROM reviews
    WHERE userId = ?
      AND clubId = ?
    `,
    [userId, clubId]
  );

  return rows[0];
};

exports.createReview = async ({
  userId,
  clubId,
  rating,
  activityRating,
  sociabilityRating,
  content
}, connection = db ) => {// 트랜잭션 연결 객체를 받을 수 있도록 기본값 처리

  const [result] = await db.query(
    `
    INSERT INTO reviews
    (
      userId,
      clubId,
      rating,
      activityRating,
      sociabilityRating,
      content
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      clubId,
      rating,
      activityRating,
      sociabilityRating,
      content
    ]
  );

  return result.insertId;
};

// [추가] 키워드 다중 매핑 저장 함수
exports.createReviewKeywords = async (reviewId, keywordIds, connection = db) => {
  if (!keywordIds || keywordIds.length === 0) return;
  
  const mappingValues = keywordIds.map(keywordId => [reviewId, keywordId]);
  const query = `
    INSERT INTO reviewKeywordMappings (reviewId, keywordId) 
    VALUES ?
  `;
  await connection.query(query, [mappingValues]);
};


/**
 * 리뷰 평균 별점 + 리뷰 개수 조회
 */
exports.getReviewStatsByClubId = async (
  clubId
) => {

  const [rows] = await db.query(
    `
    SELECT
      ROUND(AVG(rating), 1)
        AS averageRating,

      COUNT(*) AS reviewCount

    FROM reviews
    WHERE clubId = ?
    `,
    [clubId]
  );

  return rows[0];
};


/**
 * 특정 동아리 리뷰 전체 조회(최신순이 디폴트!)
 */
exports.getReviewsByClubId = async (
  clubId
) => {

  const [rows] = await db.query(
    `
    SELECT
      reviewId,
      userId,
      rating,
      activityRating,
      sociabilityRating,
      content,
      createdAt

    FROM reviews
    WHERE clubId = ?

    ORDER BY createdAt DESC
    `,
    [clubId]
  );

  return rows;
};


/**
 * reviewId로 리뷰 조회
 */
exports.findByReviewId = async (
  reviewId
) => {

  const [rows] = await db.query(
    `
    SELECT
      reviewId,
      userId
    FROM reviews
    WHERE reviewId = ?
    `,
    [reviewId]
  );

  return rows[0];
};


/**
 * 리뷰 삭제
 */
exports.deleteReview = async (
  reviewId
) => {

  await db.query(
    `
    DELETE FROM reviews
    WHERE reviewId = ?
    `,
    [reviewId]
  );
};


