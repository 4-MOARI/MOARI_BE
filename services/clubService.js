const clubModel = require('../models/clubModel');

exports.getClubs = async ({ keyword, categoryId, isRecruiting, schoolType, sort, page, pageSize, userId }) => {
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
    userId
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
exports.getClubDetail = async (clubId, { userId } = {}) => {
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

  const links = await clubModel.findClubLinksByClubId(clubId);

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
    briefDescription: clubDetail.briefDescription || '',
    description: clubDetail.description || '',
    activity: clubDetail.activity || '',
    profileImageUrl: clubDetail.profileImageUrl || null,
    coverImageUrl: clubDetail.coverImageUrl || null,
    categoryName: clubDetail.categoryName || '미지정',
    schoolType: clubDetail.schoolId ? '본인학교' : '외부',
    isRecruiting: recruitingStatus,
    favoriteCount: Number(clubDetail.favoriteCount || 0),
    isFavorite: Boolean(clubDetail.isFavorite),
    recruitPeriod: {
      start: clubDetail.recruitStartAt || null,
      end: clubDetail.recruitEndAt || null
    },
    warningMessage: clubDetail.warningMessage || null,
    links: links || []
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
  if (clubData.schoolType === '본인학교') {
    assignedSchoolId = clubData.schoolId ? Number(clubData.schoolId) : 1; 
  }

  let recruitStartAt = null;
  let recruitEndAt = null;
  if (clubData.isRecruiting === '모집중' && clubData.recruitPeriod) {
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
    lastModifiedBy: clubData.lastModifiedBy || 'test01'
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

  return { 
    message: '동아리가 성공적으로 등록되었습니다.', 
    clubId: newClubId 
  };
};

// 동아리 수정 API 서비스
exports.updateClub = async (clubId, updateData) => {
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
    profileImageUrl: updateData.profileImageUrl || null,
    coverImageUrl: updateData.coverImageUrl || null,
    categoryId: updateData.categoryId ? Number(updateData.categoryId) : club.categoryId, 
    lastModifiedBy: updateData.lastModifiedBy || 'test01'
  };

  await clubModel.updateClubInfo(clubId, safeUpdateData);
  await clubModel.deleteClubLinksByClubId(clubId); 

  if (updateData.links && Array.isArray(updateData.links) && updateData.links.length > 0) {
    const formattedLinks = updateData.links.map(link => ({
      linkType: link.linkType,
      linkUrl: link.linkUrl
    })).filter(link => link.linkUrl && link.linkUrl.trim() !== '');

    if (formattedLinks.length > 0) {
      await clubModel.insertClubLinks(clubId, formattedLinks);
    }
  }

  return { 
    message: '동아리 정보가 성공적으로 수정되었습니다.', 
    clubId: Number(clubId) 
  };
};
