//(club 관련 함수 여기다가 추가하시면 됩니다!)
const db = require('../database/db');

//clubId를 이용해서 동아리를 조회하는 함수
exports.findClubById = async (clubId) => {

  const [rows] = await db.query(
    `
    SELECT clubId
    FROM clubs
    WHERE clubId = ?
    `,
    [clubId]
  );

  return rows[0];
};

// 동아리 목록 조회 (검색/필터/정렬)
exports.getClubs = async ({ keyword, categoryId, isRecruiting, schoolType, sort }) => {
  let query = `
    SELECT 
      c.clubId,
      c.clubName,
      c.briefDescription,
      c.categoryId,
      cat.categoryName,
      c.recruitStartAt,
      c.recruitEndAt,
      c.coverImageUrl,
      c.updatedAt,
      CASE 
        WHEN c.schoolId IS NULL THEN 'external'
        ELSE 'internal'
      END AS schoolType,
      COUNT(DISTINCT f.userId) AS favoriteCount,
      ROUND(AVG(r.rating), 1) AS avgRating
    FROM clubs c
    LEFT JOIN categories cat ON c.categoryId = cat.categoryId
    LEFT JOIN favorites f ON c.clubId = f.clubId
    LEFT JOIN reviews r ON c.clubId = r.clubId
    WHERE 1=1
  `;

  const params = [];

  if (keyword) {
    query += ` AND (c.clubName LIKE ? OR c.description LIKE ? OR c.activity LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  if (categoryId) {
    query += ` AND c.categoryId = ?`;
    params.push(categoryId);
  }

  if (isRecruiting === 'true') {
    query += ` AND c.recruitStartAt <= NOW() AND c.recruitEndAt >= NOW()`;
  } else if (isRecruiting === 'false') {
    query += ` AND (c.recruitEndAt < NOW() OR c.recruitEndAt IS NULL)`;
  }

  if (schoolType === 'internal') {
    query += ` AND c.schoolId IS NOT NULL`;
  } else if (schoolType === 'external') {
    query += ` AND c.schoolId IS NULL`;
  }

  query += ` GROUP BY c.clubId, c.clubName, c.briefDescription, c.categoryId, cat.categoryName, c.recruitStartAt, c.recruitEndAt, c.coverImageUrl, c.updatedAt, c.schoolId`;

  // 정렬: 오래된 동아리(6개월 이상) 하단으로
  const staleDateThreshold = `DATE_SUB(NOW(), INTERVAL 6 MONTH)`;

  if (sort === 'favoriteCount') {
    query += ` ORDER BY CASE WHEN c.updatedAt < ${staleDateThreshold} THEN 1 ELSE 0 END ASC, favoriteCount DESC`;
  } else if (sort === 'rating') {
    query += ` ORDER BY CASE WHEN c.updatedAt < ${staleDateThreshold} THEN 1 ELSE 0 END ASC, avgRating DESC`;
  } else if (sort === 'name') {
    query += ` ORDER BY CASE WHEN c.updatedAt < ${staleDateThreshold} THEN 1 ELSE 0 END ASC, c.clubName ASC`;
  } else {
    query += ` ORDER BY CASE WHEN c.updatedAt < ${staleDateThreshold} THEN 1 ELSE 0 END ASC, c.updatedAt DESC`;
  }

  const [rows] = await db.query(query, params);
  return rows;
};
