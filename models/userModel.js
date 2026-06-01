const db = require('../database/db');

exports.findMyProfile = async (userId) => {

  const [rows] = await db.query(
    `
    SELECT
      u.userId,
      u.userName,
      u.email,
      u.isVerified,
      u.createdAt,
      u.updatedAt,
      s.schoolId,
      s.schoolName,
      s.schoolDomain
    FROM users u
    INNER JOIN schools s
      ON u.schoolId = s.schoolId
    WHERE u.userId = ?
    `,
    [userId]
  );

  return rows[0];
};

exports.countFavoriteClubs = async (
  userId
) => {

  const [rows] = await db.query(
    `
    SELECT COUNT(*) AS totalCount
    FROM favorites
    WHERE userId = ?
    `,
    [userId]
  );

  return Number(rows[0].totalCount);
};

exports.findFavoriteClubs = async ({
  userId,
  limit,
  offset
}) => {

  const [rows] = await db.query(
    `
    SELECT
      c.clubId,
      c.clubName,
      c.briefDescription,
      c.profileImageUrl,
      c.coverImageUrl,
      c.recruitStartAt,
      c.recruitEndAt,
      cat.categoryId,
      cat.categoryName,
      s.schoolId,
      s.schoolName,
      ROUND(AVG(r.rating), 1) AS averageRating,
      COUNT(DISTINCT r.reviewId) AS reviewCount,
      COUNT(DISTINCT f2.userId) AS favoriteCount,
      TRUE AS isFavorite
    FROM favorites f
    INNER JOIN clubs c
      ON f.clubId = c.clubId
    INNER JOIN categories cat
      ON c.categoryId = cat.categoryId
    LEFT JOIN schools s
      ON c.schoolId = s.schoolId
    LEFT JOIN reviews r
      ON c.clubId = r.clubId
    LEFT JOIN favorites f2
      ON c.clubId = f2.clubId
    WHERE f.userId = ?
    GROUP BY
      c.clubId,
      c.clubName,
      c.briefDescription,
      c.profileImageUrl,
      c.coverImageUrl,
      c.recruitStartAt,
      c.recruitEndAt,
      cat.categoryId,
      cat.categoryName,
      s.schoolId,
      s.schoolName
    ORDER BY f.createdAt DESC
    LIMIT ? OFFSET ?
    `,
    [userId, limit, offset]
  );

  return rows;
};

exports.countMyClubs = async (
  userId
) => {

  const [rows] = await db.query(
    `
    SELECT COUNT(*) AS totalCount
    FROM clubs
    WHERE lastModifiedBy = ?
    `,
    [userId]
  );

  return Number(rows[0].totalCount);
};

exports.findMyClubs = async ({
  userId,
  limit,
  offset
}) => {

  const [rows] = await db.query(
    `
    SELECT
      c.clubId,
      c.clubName,
      c.briefDescription,
      c.profileImageUrl,
      c.coverImageUrl,
      c.recruitStartAt,
      c.recruitEndAt,
      c.createdAt,
      c.updatedAt,
      cat.categoryId,
      cat.categoryName,
      s.schoolId,
      s.schoolName,
      ROUND(AVG(r.rating), 1) AS averageRating,
      COUNT(DISTINCT r.reviewId) AS reviewCount,
      COUNT(DISTINCT f.userId) AS favoriteCount
    FROM clubs c
    INNER JOIN categories cat
      ON c.categoryId = cat.categoryId
    LEFT JOIN schools s
      ON c.schoolId = s.schoolId
    LEFT JOIN reviews r
      ON c.clubId = r.clubId
    LEFT JOIN favorites f
      ON c.clubId = f.clubId
    WHERE c.lastModifiedBy = ?
    GROUP BY
      c.clubId,
      c.clubName,
      c.briefDescription,
      c.profileImageUrl,
      c.coverImageUrl,
      c.recruitStartAt,
      c.recruitEndAt,
      c.createdAt,
      c.updatedAt,
      cat.categoryId,
      cat.categoryName,
      s.schoolId,
      s.schoolName
    ORDER BY c.updatedAt DESC
    LIMIT ? OFFSET ?
    `,
    [userId, limit, offset]
  );

  return rows;
};
