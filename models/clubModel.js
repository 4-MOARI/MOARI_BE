//(club 관련 함수 여기다가 추가하시면 됩니다!)
const db = require('../database/db');

// [보완] 서비스단의 수정 불가 로직 및 고정 검증을 위해 모든 필드를 조회하도록 수정
exports.findClubById = async (clubId) => {
  const [rows] = await db.query(
    `
    SELECT clubId, clubName, schoolId, categoryId, briefDescription, description, activity
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

// 수정 로그 조회
exports.getClubHistory = async (clubId) => {
  const [rows] = await db.query(
    `
    SELECT 
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
    `,
    [clubId]
  );
  return rows;
};


// 크롤링 동아리 정보 대량 적재 (Bulk Insert)
exports.bulkInsertCrawlClubs = async (clubDataList) => {
  let insertedCount = 0;
  for (const club of clubDataList) {
    const [result] = await db.query(
      `
      INSERT INTO clubs (clubName, briefDescription, description, categoryId, coverImageUrl, activity, recruitStartAt, recruitEndAt, lastModifiedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        club.clubName,
        club.briefDescription || null,
        club.description || null,
        club.categoryId || null,
        club.coverImageUrl || null,
        club.activity || null,
        club.recruitStartAt || null,
        club.recruitEndAt || null,
        'test_user_1'
      ]
    );
    if (result.affectedRows > 0) insertedCount++;
  }
  return insertedCount;
};

// 크롤링 동아리 외부 링크 매핑 저장 (기본 데이터 규격화 유지)
exports.insertClubLinks = async (clubId, links) => {
  if (!links || links.length === 0) return [];
  
  const savedLinks = [];
  for (const link of links) {
    // 테이블 스펙이 clublinks 일 수 있으므로 매핑 (기존 코드의 소문자 table명 대응)
    await db.query(
      `
      INSERT INTO clublinks (clubId, linkType, linkUrl)
      VALUES (?, ?, ?)
      `,
      [clubId, link.linkType, link.linkUrl]
    );
    savedLinks.push(link);
  }
  return savedLinks;
};

// [추가 스펙] 수정 시 기존 동적 URL을 깨끗하게 비워주기 위한 삭제 메서드
exports.deleteClubLinksByClubId = async (clubId) => {
  const [result] = await db.query(
    `
    DELETE FROM clublinks 
    WHERE clubId = ?
    `,
    [clubId]
  );
  return result.affectedRows;
};

// 동아리 상세페이지 UI 데이터 조회
exports.getClubDetailById = async (clubId) => {
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
      cat.categoryName,
      c.recruitStartAt,
      c.recruitEndAt
    FROM clubs c
    LEFT JOIN categories cat ON c.categoryId = cat.categoryId
    WHERE c.clubId = ?
    `,
    [clubId]
  );
  return rows[0];
};

// 특정 동아리에 연결된 링크들 조회
exports.findClubLinksByClubId = async (clubId) => {
  const [rows] = await db.query(
    `
    SELECT linkType, linkUrl 
    FROM clublinks 
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