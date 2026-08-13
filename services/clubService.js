const clubModel = require('../models/clubModel');

exports.getClubs = async ({ keyword, categoryId, isRecruiting, schoolType, sort, page, pageSize, userId, userSchoolId }) => {
  // sort 유효성 검사
  const validSorts = ['favoriteCount', 'rating', 'name'];
  if (sort && !validSorts.includes(sort)) {
    const error = new Error('올바르지 않은 정렬 기준입니다.');
    error.status = 400;
    error.code = 'CLUB_4001';
    throw error;
  }

  // ✅ 페이지네이션 값 정규화 (기본값: page=1, pageSize=10)
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedPageSize = Math.min(50, Math.max(1, parseInt(pageSize) || 10)); //최대50개제한

  const { clubs, totalCount } = await clubModel.getClubs({
    keyword,
    categoryId,
    isRecruiting,
    schoolType,
    sort,
    page: parsedPage,
    pageSize: parsedPageSize,
    userId,
    userSchoolId
  });

  // ✅ 페이지네이션 메타 계산
  const totalPages = Math.ceil(totalCount / parsedPageSize);

  return {
    totalCount,
    totalPages,
    currentPage: parsedPage,
    clubs
  };
};

exports.getClubHistory = async (clubId, { page, pageSize } = {}) => {
  if (!clubId || isNaN(clubId)) {
    const error = new Error('올바르지 않은 동아리 ID입니다.');
    error.status = 400;
    error.code = 'CLUB_400';
    throw error;
  }

  const club = await clubModel.findClubById(clubId);
  if (!club) {
    const error = new Error('해당 동아리를 찾을 수 없습니다.');
    error.status = 404;
    error.code = 'CLUB_404';
    throw error;
  }

  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedPageSize = Math.min(50, Math.max(1, parseInt(pageSize) || 10));

  const { history, totalCount } = await clubModel.getClubHistory(clubId, {
    page: parsedPage,
    pageSize: parsedPageSize
  });

  const totalPages = Math.ceil(totalCount / parsedPageSize);

  return {
    clubId: Number(clubId),
    clubName: club.clubName,
    profileImageUrl: club.profileImageUrl || null,
    totalCount,
    totalPages,
    currentPage: parsedPage,
    history
  };
};

// 크롤링 동아리 정보 + 링크 통합 적재 API 서비스
exports.crawlClubs = async (clubDataList) => {
  if (!Array.isArray(clubDataList) || clubDataList.length === 0) {
    const error = new Error('적재할 크롤링 데이터가 올바르지 않거나 비어있습니다.');
    error.status = 400;
    throw error;
  }

  const results = [];

  for (const clubData of clubDataList) {
    if (!clubData.clubName || clubData.clubName.trim() === '') {
      continue;
    }

    if (!clubData.categoryId || isNaN(clubData.categoryId)) {
      continue;
    }

    const safeClubData = {
      clubName: clubData.clubName,
      briefDescription: clubData.briefDescription || null,
      description: clubData.description || null,
      activity: clubData.activity || null,
      recruitStartAt: clubData.recruitStartAt || null,
      recruitEndAt: clubData.recruitEndAt || null,
      profileImageUrl: clubData.profileImageUrl || null,
      coverImageUrl: clubData.coverImageUrl || null,
      schoolId:
        clubData.schoolId === null || clubData.schoolId === undefined
          ? null
          : Number(clubData.schoolId),
      categoryId: Number(clubData.categoryId),
      lastModifiedBy: clubData.lastModifiedBy || 'test01'
    };
    const existingClub = await clubModel.findClubByNameAndSchool(
      safeClubData.clubName,
      safeClubData.schoolId
    );

    if (existingClub) {
      results.push({
        clubId: existingClub.clubId,
        clubName: existingClub.clubName,
        status: 'SKIPPED_DUPLICATE',
        savedLinkCount: 0
      });

      continue;
    }

    const newClubId = await clubModel.createCrawledClub(safeClubData);

    let savedLinks = [];

    if (
      clubData.links &&
      Array.isArray(clubData.links) &&
      clubData.links.length > 0
    ) {
      const formattedLinks = clubData.links
        .map(link => ({
          linkType: link.linkType,
          linkUrl: link.linkUrl
        }))
        .filter(link => link.linkType && link.linkUrl && link.linkUrl.trim() !== '');

      if (formattedLinks.length > 0) {
        savedLinks = await clubModel.insertClubLinks(newClubId, formattedLinks);
      }
    }

    results.push({
      clubId: newClubId,
      clubName: clubData.clubName,
      savedLinkCount: savedLinks.length
    });
  }

  return {
    status: 'SUCCESS',
    recordedCount: results.length,
    clubs: results
  };
};

// 크롤링 동아리 외부 링크 매핑 저장 API 서비스
exports.saveClubLinks = async (clubId, linkData) => {
  if (!clubId || isNaN(clubId)) {
    const error = new Error('올바르지 않은 동아리 ID입니다.');
    error.status = 400;
    throw error;
  }

  const club = await clubModel.findClubById(clubId);
  if (!club) {
    const error = new Error('해당 동아리를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  if (!linkData || !Array.isArray(linkData.links)) {
    const error = new Error('링크 데이터 형식이 올바르지 않습니다.');
    error.status = 400;
    throw error;
  }

  const validLinks = linkData.links.map(link => ({
    linkType: link.linkType,
    linkUrl: link.linkUrl
  })).filter(link => link.linkType && link.linkUrl && link.linkUrl.trim() !== '');

  const savedLinks = await clubModel.insertClubLinks(clubId, validLinks);
  return { clubId: Number(clubId), savedLinks };
};

// 동아리 상세페이지 UI 데이터 조회 API 서비스
exports.getClubDetail = async (clubId, { userId, userSchoolId } = {}) => {
  if (!clubId || isNaN(clubId)) {
    const error = new Error('올바르지 않은 동아리 ID입니다.');
    error.status = 400;
    throw error;
  }

  const clubDetail = await clubModel.getClubDetailById(clubId, {
    userId
  });
  if (!clubDetail) {
    const error = new Error('해당 동아리의 상세 페이지 정보를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  if (clubDetail.schoolId !== null && clubDetail.schoolId !== userSchoolId) {
    const error = new Error('해당 동아리에 접근할 수 없습니다.');
    error.status = 403;
    error.code = 'CLUB_403_FORBIDDEN_SCHOOL';
    throw error;
  }

  const links = await clubModel.findClubLinksByClubId(clubId);

  const schedules = await clubModel.findClubSchedulesByClubId(clubId);

  let recruitingStatus = '마감';
  const now = new Date();
  if (clubDetail.recruitStartAt && clubDetail.recruitEndAt) {
    const start = new Date(clubDetail.recruitStartAt);
    const end = new Date(clubDetail.recruitEndAt);
    if (now >= start && now <= end) {
      recruitingStatus = '모집중';
    }
  }

  return {
    clubId: clubDetail.clubId,
    clubName: clubDetail.clubName,
    favoriteCount: Number(clubDetail.favoriteCount ?? 0),
    briefDescription: clubDetail.briefDescription || '',
    description: clubDetail.description || '',
    activity: clubDetail.activity || '',
    profileImageUrl: clubDetail.profileImageUrl || null,
    coverImageUrl: clubDetail.coverImageUrl || null,
    categoryName: clubDetail.categoryName || '미지정',
    schoolName: clubDetail.schoolId ? clubDetail.schoolName : '외부',
    schoolType: clubDetail.schoolId ? '본인학교' : '외부',

    updatedAt: clubDetail.updatedAt,
    yearsSinceUpdate: clubDetail.yearsSinceUpdate,
    displayWarning: Boolean(clubDetail.displayWarning),
    warningMessage: clubDetail.warningMessage,

    isRecruiting: recruitingStatus,

    recruitPeriod: {
      start: clubDetail.recruitStartAt,
      end: clubDetail.recruitEndAt,
    },

    links,
    schedules,
  };
};


// 전체 카테고리 목록 조회 API 서비스
exports.getCategories = async () => {
  const categories = await clubModel.getAllCategories();
  
  return { 
    totalCount: categories.length,
    categories 
  };
};

// 동아리 등록 API 서비스
exports.registerClub = async (clubData) => {
  if (!clubData.lastModifiedBy) {
    const error = new Error('로그인이 필요한 서비스입니다.');
    error.status = 401;
    error.code = 'AUTH_401';
    throw error;
  }

  if (!clubData.clubName || clubData.clubName.trim() === '') {
    const error = new Error('동아리 이름은 필수 입력 항목입니다.');
    error.status = 400;
    throw error;
  }
  if (!clubData.categoryId || isNaN(clubData.categoryId)) {
    const error = new Error('올바른 카테고리를 선택해야 합니다.');
    error.status = 400;
    throw error;
  }

  let assignedSchoolId = null;

  if (clubData.schoolType === '본인학교' || clubData.schoolType === 'internal') {
    if (!clubData.schoolId) {
      const error = new Error('교내 동아리는 학교 정보가 필요합니다.');
      error.status = 400;
      error.code = 'CLUB_400_SCHOOL_REQUIRED';
      throw error;
    }

    assignedSchoolId = Number(clubData.schoolId);
  }

  let recruitStartAt = null;
  let recruitEndAt = null;

  if (clubData.recruitPeriod) {
    recruitStartAt = clubData.recruitPeriod.start || null;
    recruitEndAt = clubData.recruitPeriod.end || null;
  }

  const safeClubData = {
    clubName: clubData.clubName,
    briefDescription: clubData.briefDescription || null,
    description: clubData.description || null,
    activity: clubData.activity || null,
    recruitStartAt,
    recruitEndAt,
    profileImageUrl: clubData.profileImageUrl || null,
    coverImageUrl: clubData.coverImageUrl || null,
    schoolId: assignedSchoolId,
    categoryId: Number(clubData.categoryId),
    lastModifiedBy: clubData.lastModifiedBy
  };

  const newClubId = await clubModel.createNewClub(safeClubData);

  if (clubData.links && Array.isArray(clubData.links) && clubData.links.length > 0) {
    const formattedLinks = clubData.links.map(link => ({
      linkType: link.linkType,
      linkUrl: link.linkUrl
    })).filter(link => link.linkUrl && link.linkUrl.trim() !== '');

    if (formattedLinks.length > 0) {
      await clubModel.insertClubLinks(newClubId, formattedLinks);
    }
  }

  if (clubData.schedules && Array.isArray(clubData.schedules) && clubData.schedules.length > 0) {
    await clubModel.insertClubSchedules(newClubId, clubData.schedules);
  }

  return { 
    message: '동아리가 성공적으로 등록되었습니다.', 
    clubId: newClubId 
  };
};

// 동아리 수정 API 서비스
exports.updateClub = async (clubId, updateData) => {
  if (!updateData.lastModifiedBy) {
    const error = new Error('로그인이 필요한 서비스입니다.');
    error.status = 401;
    error.code = 'AUTH_401';
    throw error;
  }

  if (!clubId || isNaN(clubId)) {
    const error = new Error('올바르지 않은 동아리 ID입니다.');
    error.status = 400;
    throw error;
  }

  const club = await clubModel.findClubById(clubId);
  if (!club) {
    const error = new Error('수정하려는 동아리를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }
  
  if (club.schoolId !== null && club.schoolId !== updateData.userSchoolId) {
    const error = new Error('해당 동아리를 수정할 권한이 없습니다.');
    error.status = 403;
    error.code = 'CLUB_403_FORBIDDEN_SCHOOL';
    throw error;
  }

  const beforeLinks = await clubModel.findClubLinksByClubId(clubId);
  const beforeSchedules = await clubModel.findClubSchedulesByClubId(clubId);

  let recruitStartAt = null;
  let recruitEndAt = null;
  if (updateData.isRecruiting === '모집중' && updateData.recruitPeriod) {
    recruitStartAt = updateData.recruitPeriod.start || null;
    recruitEndAt = updateData.recruitPeriod.end || null;
  }

  const safeUpdateData = {
    clubName: club.clubName,
    schoolId: club.schoolId,
    briefDescription: updateData.briefDescription || null,
    description: updateData.description || null,
    activity: updateData.activity || null,
    recruitStartAt,
    recruitEndAt,
    profileImageUrl: updateData.profileImageUrl || club.profileImageUrl || null,
    coverImageUrl: updateData.coverImageUrl || club.coverImageUrl || null,
    categoryId: updateData.categoryId ? Number(updateData.categoryId) : club.categoryId,
    lastModifiedBy: updateData.lastModifiedBy
  };

  const historyTargets = [
    'briefDescription',
    'description',
    'activity',
    'recruitStartAt',
    'recruitEndAt',
    'profileImageUrl',
    'coverImageUrl',
    'categoryId',
  ];

  const changedHistories = [];

  for (const field of historyTargets) {
    const oldValue = club[field] ?? null;
    const newValue = safeUpdateData[field] ?? null;

    if (String(oldValue ?? '') !== String(newValue ?? '')) {
      changedHistories.push({
        clubId,
        userId: updateData.lastModifiedBy,
        modifiedField: field,
        oldValue: oldValue === null ? '' : String(oldValue),
        newValue: newValue === null ? '' : String(newValue),
      });
    }
  }

  const normalizeLinksForHistory = (links = []) =>
    links
      .map((link) => ({
        type: link.type || link.linkType || link.title || link.linkTitle || '',
        url: link.url || link.linkUrl || '',
      }))
      .filter((link) => link.type && link.url)
      .sort((a, b) => `${a.type}${a.url}`.localeCompare(`${b.type}${b.url}`));

  const normalizeSchedulesForHistory = (schedules = []) =>
    schedules
      .map((schedule) => ({
        dayOfWeek: schedule.dayOfWeek || '',
        startTime: schedule.startTime || '',
        endTime: schedule.endTime || '',
      }))
      .sort((a, b) =>
        `${a.dayOfWeek}${a.startTime}${a.endTime}`.localeCompare(
          `${b.dayOfWeek}${b.startTime}${b.endTime}`
        )
      );

  const oldSchedulesValue = JSON.stringify(
    normalizeSchedulesForHistory(beforeSchedules)
  );

  const newSchedulesValue = JSON.stringify(
    normalizeSchedulesForHistory(updateData.schedules || [])
  );

  if (oldSchedulesValue !== newSchedulesValue) {
    changedHistories.push({
      clubId,
      userId: updateData.lastModifiedBy,
      modifiedField: 'schedules',
      oldValue: oldSchedulesValue,
      newValue: newSchedulesValue,
    });
  }

  const oldLinksValue = JSON.stringify(normalizeLinksForHistory(beforeLinks));
  const newLinksValue = JSON.stringify(normalizeLinksForHistory(updateData.links || []));

  if (oldLinksValue !== newLinksValue) {
    changedHistories.push({
      clubId,
      userId: updateData.lastModifiedBy,
      modifiedField: 'links',
      oldValue: oldLinksValue,
      newValue: newLinksValue,
    });
  }

  
  if (changedHistories.length === 0) {
    const error = new Error('수정사항이 없습니다.');
    error.status = 400;
    error.code = 'CLUB_400_NO_CHANGES';
    throw error;
  }

  await clubModel.updateClubInfo(clubId, safeUpdateData);
  await clubModel.deleteClubLinksByClubId(clubId);

  if (
    updateData.links &&
    Array.isArray(updateData.links) &&
    updateData.links.length > 0
  ) {
    const formattedLinks = updateData.links
      .map(link => ({
        linkType:
          link.linkType ||
          link.type ||
          link.title ||
          link.linkTitle,
        linkUrl: link.linkUrl || link.url,
      }))
      .filter(
        link =>
          link.linkType &&
          link.linkUrl &&
          link.linkUrl.trim() !== ''
      );

    if (formattedLinks.length > 0) {
      await clubModel.insertClubLinks(
        clubId,
        formattedLinks
      );
    }
  }

  await clubModel.deleteClubSchedulesByClubId(clubId);

  if (
    updateData.schedules &&
    Array.isArray(updateData.schedules) &&
    updateData.schedules.length > 0
  ) {
    const validSchedules = updateData.schedules
      .filter(
        schedule =>
          schedule.dayOfWeek &&
          schedule.startTime &&
          schedule.endTime
      )
      .map(schedule => ({
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      }));

    if (validSchedules.length > 0) {
      await clubModel.insertClubSchedules(clubId, validSchedules);
    }
  }

  for (const history of changedHistories) {
    await clubModel.insertClubHistory(history);
  }

  return {
    message: '동아리 정보가 성공적으로 수정되었습니다.',
    clubId: Number(clubId)
  };
};

exports.migrateClubSchedules = async (clubSchedules) => {
  if (!Array.isArray(clubSchedules)) {
    const error = new Error('동아리 활동시간 데이터가 올바르지 않습니다.');
    error.status = 400;
    throw error;
  }

  const results = [];

  for (const item of clubSchedules) {
    if (!item.clubName || !Array.isArray(item.schedules)) continue;

    const club = await clubModel.findClubByNameAndSchool(
      item.clubName,
      item.schoolId ?? null
    );

    if (!club) {
      results.push({
        clubName: item.clubName,
        status: 'NOT_FOUND'
      });
      continue;
    }

    if (item.schedules.length === 0) {
      results.push({
        clubName: item.clubName,
        clubId: club.clubId,
        status: 'NO_SCHEDULE'
      });
      continue;
    }

    await clubModel.deleteClubSchedulesByClubId(club.clubId);
    await clubModel.insertClubSchedulesBulk(
      club.clubId,
      item.schedules
    );

    results.push({
      clubName: item.clubName,
      clubId: club.clubId,
      status: 'SUCCESS',
      scheduleCount: item.schedules.length
    });
  }

  return results;
};
exports.getAllClubsForMigration = async () => {
  return await clubModel.getAllClubsForMigration();
};