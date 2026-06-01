const db = require('../database/db');

exports.findByUserIdAndClubId = async (
  userId,
  clubId
) => {

  const [rows] = await db.query(
    `
    SELECT
      userId,
      clubId,
      createdAt
    FROM favorites
    WHERE userId = ?
      AND clubId = ?
    `,
    [userId, clubId]
  );

  return rows[0];
};

exports.createFavorite = async ({
  userId,
  clubId
}) => {

  await db.query(
    `
    INSERT INTO favorites (
      userId,
      clubId
    )
    VALUES (?, ?)
    `,
    [userId, clubId]
  );

  return {
    userId,
    clubId
  };
};

exports.deleteFavorite = async ({
  userId,
  clubId
}) => {

  await db.query(
    `
    DELETE FROM favorites
    WHERE userId = ?
      AND clubId = ?
    `,
    [userId, clubId]
  );
};
