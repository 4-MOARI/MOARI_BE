//리뷰 등록
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
  content
}) => {

  const [result] = await db.query(
    `
    INSERT INTO reviews
    (
      userId,
      clubId,
      rating,
      content
    )
    VALUES (?, ?, ?, ?)
    `,
    [
      userId,
      clubId,
      rating,
      content
    ]
  );

  return result.insertId;
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
 * 특정 동아리 리뷰 전체 조회
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

