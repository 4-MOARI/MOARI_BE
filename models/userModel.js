const db = require('../database/db');

const DELETED_USER_PREFIX = 'deleted_';
const DELETED_USER_NAME = '알수없음';
const DELETED_USER_PASSWORD = 'deleted-user-placeholder';

exports.findPasswordByUserId = async (
  userId
) => {

  const [rows] = await db.query(
    `
    SELECT
      userId,
      password
    FROM users
    WHERE userId = ?
    `,
    [userId]
  );

  return rows[0];
};

exports.updatePassword = async ({
  userId,
  password
}) => {

  await db.query(
    `
    UPDATE users
    SET
      password = ?,
      updatedAt = CURRENT_TIMESTAMP
    WHERE userId = ?
    `,
    [password, userId]
  );
};

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

exports.deleteMyAccount = async (
  userId
) => {
  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();

    const [schoolRows] =
      await connection.query(
        `
        SELECT schoolId
        FROM users
        WHERE userId = ?
        `,
        [userId]
      );

    const fallbackSchoolId =
      schoolRows[0]?.schoolId || 1;
    const deletedUserId =
      `${DELETED_USER_PREFIX}${userId}`.slice(0, 50);
    const deletedUserEmail =
      `${deletedUserId}@moari.local`;

    await connection.query(
      `
      INSERT INTO users (
        userId,
        userName,
        password,
        email,
        isVerified,
        schoolId
      )
      VALUES (?, ?, ?, ?, TRUE, ?)
      ON DUPLICATE KEY UPDATE
        userName = VALUES(userName)
      `,
      [
        deletedUserId,
        DELETED_USER_NAME,
        DELETED_USER_PASSWORD,
        deletedUserEmail,
        fallbackSchoolId
      ]
    );

    const [clubRows] =
      await connection.query(
        `
        SELECT clubId
        FROM clubs
        WHERE lastModifiedBy = ?
        `,
        [userId]
      );

    const clubIds =
      clubRows.map((club) => club.clubId);

    await connection.query(
      `
      DELETE FROM favorites
      WHERE userId = ?
      `,
      [userId]
    );

    await connection.query(
      `
      UPDATE reviews
      SET userId = ?
      WHERE userId = ?
      `,
      [deletedUserId, userId]
    );

    await connection.query(
      `
      UPDATE reports
      SET userId = ?
      WHERE userId = ?
      `,
      [deletedUserId, userId]
    );

    await connection.query(
      `
      UPDATE histories
      SET userId = ?
      WHERE userId = ?
      `,
      [deletedUserId, userId]
    );

    await connection.query(
      `
      UPDATE clubs
      SET lastModifiedBy = ?
      WHERE lastModifiedBy = ?
      `,
      [deletedUserId, userId]
    );

    const [result] =
      await connection.query(
        `
        DELETE FROM users
        WHERE userId = ?
        `,
        [userId]
      );

    await connection.commit();

    return {
      deletedUserCount:
        result.affectedRows,
      deletedClubCount:
        0,
      preservedClubCount:
        clubIds.length
    };

  } catch (error) {
    await connection.rollback();
    throw error;

  } finally {
    connection.release();
  }
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

exports.countMyReviews = async (
  userId
) => {

  const [rows] = await db.query(
    `
    SELECT COUNT(*) AS totalCount
    FROM reviews
    WHERE userId = ?
    `,
    [userId]
  );

  return Number(rows[0].totalCount);
};

exports.findMyReviews = async ({
  userId,
  limit,
  offset
}) => {

  const [rows] = await db.query(
    `
    SELECT
      r.reviewId,
      r.userId,
      r.clubId,
      c.clubName,
      r.rating,
      r.content,
      r.createdAt
    FROM reviews r
    INNER JOIN clubs c
      ON r.clubId = c.clubId
    WHERE r.userId = ?
    ORDER BY r.createdAt DESC
    LIMIT ? OFFSET ?
    `,
    [userId, limit, offset]
  );

  return rows;
};
