//(club 관련 함수 여기다가 추가하시면 됩니다!)
const db = require('../database/db');

// [보완] 서비스단의 수정 불가 로직 및 고정 검증을 위해 모든 필드를 조회하도록 수정
exports.findClubById = async (clubId) => {
  const [rows] = await db.query(
    `
    SELECT clubId, clubName, schoolId, categoryId, briefDescription, description, activity, profileImageUrl
    FROM clubs
    WHERE clubId = ?
    `,
    [clubId]
  );
  return rows[0];
}; 

exports.findClubByNameAndSchool = async (clubName, schoolId) => {
  const [rows] = await db.query(
    `
    SELECT clubId, clubName, schoolId
    FROM clubs
    WHERE clubName = ?
    AND schoolId = ?
    `,
    [clubName, schoolId]
  );

  return rows[0];
};

// 동아리 목록 조회 (검색/필터/정렬)
// ✅ 이렇게 수정
exports.getClubs = async ({
  keyword,
  categoryId,
  isRecruiting,
  schoolType,
  sort,
  page,
  pageSize,
  userId,
  userSchoolId
}) => {
  // ✅ WHERE 조건과 파라미터는 COUNT/목록 쿼리가 공유
  let whereClause = ` WHERE 1=1`;
  const params = [];

  // 학교 접근 제한
  if (userSchoolId) {
    whereClause += ` AND (c.schoolId IS NULL OR c.schoolId = ?)`;
    params.push(userSchoolId);
  } else {
    whereClause += ` AND 1=0`;
  }

  if (keyword) {
    whereClause += ` AND (c.clubName LIKE ? OR c.description LIKE ? OR c.activity LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (categoryId) {
    whereClause += ` AND c.categoryId = ?`;
    params.push(categoryId);
  }
  if (isRecruiting === 'true') {
    whereClause += ` AND c.recruitStartAt <= NOW() AND c.recruitEndAt >= NOW()`;
  } else if (isRecruiting === 'false') {
    whereClause += ` AND (c.recruitEndAt < NOW() OR c.recruitEndAt IS NULL)`;
  }
  if (schoolType === 'internal') {
    whereClause += ` AND c.schoolId IS NOT NULL`;
  } else if (schoolType === 'external') {
    whereClause += ` AND c.schoolId IS NULL`;
  }

  // ✅ 전체 개수 조회 (페이지네이션과 무관하게 필터 조건만 적용)
  const countQuery = `
    SELECT COUNT(DISTINCT c.clubId) AS totalCount
    FROM clubs c
    LEFT JOIN categories cat ON c.categoryId = cat.categoryId
    LEFT JOIN favorites f ON c.clubId = f.clubId
    LEFT JOIN reviews r ON c.clubId = r.clubId
    ${whereClause}
  `;
  const [[{ totalCount }]] = await db.query(countQuery, params);

  // 목록 쿼리
  let listQuery = `
    SELECT 
      c.clubId,
      c.clubName,
      c.briefDescription AS description,
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
      ${
        userId
          ? `MAX(CASE WHEN uf.userId IS NULL THEN 0 ELSE 1 END)`
          : `0`
      } AS isFavorite,
      ROUND(AVG(r.rating), 1) AS avgRating
    FROM clubs c
    LEFT JOIN categories cat ON c.categoryId = cat.categoryId
    LEFT JOIN favorites f ON c.clubId = f.clubId
    ${
      userId
        ? `LEFT JOIN favorites uf ON c.clubId = uf.clubId AND uf.userId = ?`
        : ``
    }
    LEFT JOIN reviews r ON c.clubId = r.clubId
    ${whereClause}

    

    GROUP BY
      c.clubId,
      c.clubName,
      c.briefDescription,
      c.categoryId,
      cat.categoryName,
      c.recruitStartAt,
      c.recruitEndAt,
      c.profileImageUrl,
      c.coverImageUrl,
      c.updatedAt,
      c.schoolId

  `;

  const staleDateThreshold = `DATE_SUB(NOW(), INTERVAL 1 YEAR)`;
  if (sort === 'favoriteCount') {
    listQuery += ` ORDER BY CASE WHEN c.updatedAt < ${staleDateThreshold} THEN 1 ELSE 0 END ASC, favoriteCount DESC`;
  } else if (sort === 'rating') {
    listQuery += ` ORDER BY CASE WHEN c.updatedAt < ${staleDateThreshold} THEN 1 ELSE 0 END ASC, avgRating DESC`;
  } else if (sort === 'name') {
    listQuery += ` ORDER BY CASE WHEN c.updatedAt < ${staleDateThreshold} THEN 1 ELSE 0 END ASC, c.clubName ASC`;
  } else {
    listQuery += ` ORDER BY CASE WHEN c.updatedAt < ${staleDateThreshold} THEN 1 ELSE 0 END ASC, c.updatedAt DESC`;
  }

  // ✅ LIMIT / OFFSET 추가
  const offset = (page - 1) * pageSize;
  listQuery += ` LIMIT ? OFFSET ?`;
  const listParams = userId
    ? [userId, ...params, pageSize, offset]
    : [...params, pageSize, offset];

  const [rows] = await db.query(listQuery, listParams);

  // ✅ totalCount와 clubs를 함께 반환 (서비스에서 totalPages 계산에 사용)
  return { clubs: rows, totalCount };
};

// 수정 로그 조회
exports.getClubHistory = async (clubId, { page, pageSize }) => {
  const [[{ totalCount }]] = await db.query(
    `SELECT COUNT(*) AS totalCount
     FROM histories
     WHERE clubId = ?
     AND createdAt >= DATE_SUB(NOW(), INTERVAL 1 YEAR)`,
    [clubId]
  );

  const offset = (page - 1) * pageSize;

  const [rows] = await db.query(
    `SELECT 
      h.historyId,
      u.userName AS modifier,
      h.modifiedField,
      h.oldValue,
      h.newValue,
      h.createdAt
    FROM histories h
    LEFT JOIN users u ON h.userId = u.userId
    WHERE h.clubId = ?
    AND h.createdAt >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
    ORDER BY h.createdAt DESC
    LIMIT ? OFFSET ?`,
    [clubId, pageSize, offset]
  );

  return { history: rows, totalCount };
};


// 크롤링 동아리 1개 적재
exports.createCrawledClub = async (clubData) => {
  const [result] = await db.query(
    `
    INSERT INTO clubs (
      clubName, briefDescription, description, activity,
      recruitStartAt, recruitEndAt, profileImageUrl, coverImageUrl,
      schoolId, categoryId, lastModifiedBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      clubData.clubName,
      clubData.briefDescription,
      clubData.description,
      clubData.activity,
      clubData.recruitStartAt,
      clubData.recruitEndAt,
      clubData.profileImageUrl,
      clubData.coverImageUrl,
      clubData.schoolId,
      clubData.categoryId,
      clubData.lastModifiedBy
    ]
  );

  return result.insertId;
};

// 동아리 외부 링크 저장
exports.insertClubLinks = async (clubId, links) => {
  if (!links || links.length === 0) return [];
  
  const savedLinks = [];

  for (const link of links) {
    await db.query(
      `
      INSERT INTO clubLinks (clubId, linkType, linkUrl)
      VALUES (?, ?, ?)
      `,
      [
        clubId,
        link.linkType,
        link.linkUrl
      ]
    );

    savedLinks.push(link);
  }

  return savedLinks;
};

// [추가 스펙] 수정 시 기존 동적 URL을 깨끗하게 비워주기 위한 삭제 메서드
exports.deleteClubLinksByClubId = async (clubId) => {
  const [result] = await db.query(
    `
    DELETE FROM clubLinks 
    WHERE clubId = ?
    `,
    [clubId]
  );
  return result.affectedRows;
};

// 동아리 상세페이지 UI 데이터 조회
exports.getClubDetailById = async (clubId, { userId } = {}) => {
  const [rows] = await db.query(
    `
    SELECT 
      c.clubId,
      c.clubName,
      c.briefDescription,
      c.description,
      c.activity,
      c.profileImageUrl,
      c.coverImageUrl,
      c.schoolId,
      s.schoolName,
      cat.categoryName,
      c.recruitStartAt,
      c.recruitEndAt,
      c.updatedAt,
      TIMESTAMPDIFF(YEAR, c.updatedAt, NOW()) AS yearsSinceUpdate,
      CASE
        WHEN c.updatedAt < DATE_SUB(NOW(), INTERVAL 1 YEAR) THEN 1
        ELSE 0
      END AS displayWarning,
      CASE
        WHEN c.updatedAt < DATE_SUB(NOW(), INTERVAL 1 YEAR)
        THEN CONCAT(
          TIMESTAMPDIFF(YEAR, c.updatedAt, NOW()),
          '년 이상 업데이트가 이루어지지 않은 동아리입니다. 현재 실제 활동 여부나 정보가 다를 수 있으니 확인 후 이용해주세요.'
        )
        ELSE NULL
      END AS warningMessage,
      COUNT(DISTINCT f.userId) AS favoriteCount,
      ${
        userId
          ? `MAX(CASE WHEN uf.userId IS NULL THEN 0 ELSE 1 END)`
          : `0`
      } AS isFavorite
    FROM clubs c
    LEFT JOIN categories cat ON c.categoryId = cat.categoryId
    LEFT JOIN schools s ON c.schoolId = s.schoolId
    LEFT JOIN favorites f ON c.clubId = f.clubId
    ${
      userId
        ? `LEFT JOIN favorites uf ON c.clubId = uf.clubId AND uf.userId = ?`
        : ``
    }
    WHERE c.clubId = ?
    GROUP BY c.clubId, c.clubName, c.briefDescription, c.description, c.activity,
         c.profileImageUrl, c.coverImageUrl, c.schoolId, s.schoolName, cat.categoryName,
         c.recruitStartAt, c.recruitEndAt, c.updatedAt`,
    userId ? [userId, clubId] : [clubId]
  );
  return rows[0];
};

// 특정 동아리에 연결된 링크들 조회
exports.findClubLinksByClubId = async (clubId) => {
  const [rows] = await db.query(
    `
    SELECT 
      linkType AS type,
      linkType AS title,
      linkUrl AS url
    FROM clubLinks 
    WHERE clubId = ?
    `,
    [clubId]
  );

  return rows;
};

// 전체 카테고리 목록 조회
exports.getAllCategories = async () => {
  const [rows] = await db.query(
    `
    SELECT categoryId, categoryName 
    FROM categories
    `
  );
  return rows;
};

// [정밀 보완] 기획서 스펙 누락 필드 완벽 복원 및 매핑 연동 (동아리 정보 수정)
exports.updateClubInfo = async (clubId, updateData) => {
  const [result] = await db.query(
    `
    UPDATE clubs
    SET 
      clubName = ?,
      briefDescription = ?,
      description = ?,
      activity = ?,
      recruitStartAt = ?,
      recruitEndAt = ?,
      profileImageUrl = ?,
      coverImageUrl = ?,
      schoolId = ?,
      categoryId = ?,
      lastModifiedBy = ?
    WHERE clubId = ?
    `,
    [
      updateData.clubName,       // 서비스 단에서 원본 보존 처리됨
      updateData.briefDescription,
      updateData.description,
      updateData.activity,
      updateData.recruitStartAt,
      updateData.recruitEndAt,
      updateData.profileImageUrl,
      updateData.coverImageUrl,
      updateData.schoolId,       // 서비스 단에서 원본 보존 처리됨
      updateData.categoryId,
      updateData.lastModifiedBy,
      clubId
    ]
  );
  return result.affectedRows;
};

// [정밀 보완] 기획서 스펙 누락 필드 완벽 복원 및 매핑 연동 (동아리 신규 등록)
exports.createNewClub = async (clubData) => {
  const [result] = await db.query(
    `
    INSERT INTO clubs (
      clubName, briefDescription, description, activity, 
      recruitStartAt, recruitEndAt, profileImageUrl, coverImageUrl, 
      schoolId, categoryId, lastModifiedBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      clubData.clubName,
      clubData.briefDescription,
      clubData.description,
      clubData.activity,
      clubData.recruitStartAt,
      clubData.recruitEndAt,
      clubData.profileImageUrl,
      clubData.coverImageUrl,
      clubData.schoolId,
      clubData.categoryId,
      clubData.lastModifiedBy
    ]
  );
  return result.insertId;
};


exports.insertClubHistory = async ({
  clubId,
  userId,
  modifiedField,
  oldValue,
  newValue,
}) => {
  const [result] = await db.query(
    `
    INSERT INTO histories (
      clubId,
      userId,
      modifiedField,
      oldValue,
      newValue
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      clubId,
      userId,
      modifiedField,
      oldValue,
      newValue,
    ]
  );

  return result.insertId;
};

