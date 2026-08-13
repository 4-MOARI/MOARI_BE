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

  const [result] = await connection.query(
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

// 키워드 다중 매핑 저장 함수
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
      r.reviewId,
      r.userId,
      r.rating,
      r.activityRating,
      r.sociabilityRating,
      r.content,
      r.createdAt,
      CASE 
        WHEN COUNT(rk.keywordId) = 0 THEN JSON_ARRAY()
        ELSE JSON_ARRAYAGG(
          JSON_OBJECT('keywordId', rk.keywordId, 'keywordName', rk.keywordName)
        )
      END AS keywords
    FROM reviews r
    LEFT JOIN reviewKeywordMappings rkm ON r.reviewId = rkm.reviewId
    LEFT JOIN reviewKeywords rk ON rkm.keywordId = rk.keywordId
    WHERE r.clubId = ?
    GROUP BY r.reviewId
    ORDER BY r.createdAt DESC
    `,
    [clubId]
  );

  return rows;
};

/**
 * 여러 동아리의 리뷰를 한 번에 조회 (궁합 분석용)
 */
exports.getReviewsByClubIds = async (clubIds) => {
  if (!Array.isArray(clubIds) || clubIds.length === 0) return [];

  const placeholders = clubIds.map(() => '?').join(', ');

  const [rows] = await db.query(
    `
    SELECT
      r.reviewId,
      r.clubId,
      r.userId,
      r.rating,
      r.activityRating,
      r.sociabilityRating,
      r.content,
      r.createdAt,
      CASE 
        WHEN COUNT(rk.keywordId) = 0 THEN JSON_ARRAY()
        ELSE JSON_ARRAYAGG(
          JSON_OBJECT('keywordId', rk.keywordId, 'keywordName', rk.keywordName)
        )
      END AS keywords
    FROM reviews r
    LEFT JOIN reviewKeywordMappings rkm ON r.reviewId = rkm.reviewId
    LEFT JOIN reviewKeywords rk ON rkm.keywordId = rk.keywordId
    WHERE r.clubId IN (${placeholders})
    GROUP BY r.reviewId
    ORDER BY r.clubId, r.createdAt DESC
    `,
    clubIds
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


