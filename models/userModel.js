const db = require('../database/db');

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

    if (clubIds.length > 0) {
      await connection.query(
        `
        DELETE FROM favorites
        WHERE clubId IN (?)
        `,
        [clubIds]
      );

      await connection.query(
        `
        DELETE FROM reviews
        WHERE clubId IN (?)
        `,
        [clubIds]
      );

      await connection.query(
        `
        DELETE FROM reports
        WHERE clubId IN (?)
        `,
        [clubIds]
      );

      await connection.query(
        `
        DELETE FROM clubLinks
        WHERE clubId IN (?)
        `,
        [clubIds]
      );

      await connection.query(
        `
        DELETE FROM histories
        WHERE clubId IN (?)
        `,
        [clubIds]
      );
    }

    await connection.query(
      `
      DELETE FROM favorites
      WHERE userId = ?
      `,
      [userId]
    );

    await connection.query(
      `
      DELETE FROM reviews
      WHERE userId = ?
      `,
      [userId]
    );

    await connection.query(
      `
      DELETE FROM reports
      WHERE userId = ?
      `,
      [userId]
    );

    await connection.query(
      `
      DELETE FROM histories
      WHERE userId = ?
      `,
      [userId]
    );

    if (clubIds.length > 0) {
      await connection.query(
        `
        DELETE FROM clubs
        WHERE clubId IN (?)
        `,
        [clubIds]
      );
    }

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
