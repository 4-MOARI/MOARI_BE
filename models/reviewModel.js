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