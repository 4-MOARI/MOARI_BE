const axios = require('axios');
const cheerio = require('cheerio');

const API_URL = process.env.CRAWL_API_URL || 'http://localhost:3000/api/crawl';

const BASE_URL = 'https://www.campuspick.com';
const LIST_URL = 'https://www.campuspick.com/club';

const DEFAULT_CATEGORY_ID = 8;

const CAMPUSPICK_CATEGORY_MAP = {
  1: 3,
  2: 4,
  3: 8,
  4: 1,
  5: 1,
  6: 2,
  7: 5,
  8: 8,
};

const EXTRA_DETAIL_URLS = [
    //예외 창업취업
  {
    url: 'https://www.campuspick.com/club/view?id=24550&menu=about',
    categoryId: 6,
  },
  {
    url: 'https://www.campuspick.com/club/view?id=26203&menu=about',
    categoryId: 6,
  },
  {
    url: 'https://www.campuspick.com/club/view?id=26633&menu=about',
    categoryId: 6,
  },
  {
    url: 'https://www.campuspick.com/club/view?id=26584&menu=about',
    categoryId: 6,
  },

  // 어학
  {
    url: 'https://www.campuspick.com/club/view?id=26613&menu=about',
    categoryId: 7,
  },
  {
    url: 'https://www.campuspick.com/club/view?id=26628&menu=about',
    categoryId: 7,
  },
  {
    url: 'https://www.campuspick.com/club/view?id=26319&menu=about',
    categoryId: 7,
  },
  {
    url: 'https://www.campuspick.com/club/view?id=25968&menu=about',
    categoryId: 7,
  },
];

const makeAbsoluteUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
};

const extractPageData = (html) => {
  const fallback = html.match(/\{"adServerUrl":[\s\S]*?"managerName":"[^"]*"\}/);
  if (!fallback) return null;

  try {
    return JSON.parse(fallback[0]);
  } catch {
    return null;
  }
};

const cleanText = (text = '') => {
  return String(text)
    .replace(/\r/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[�]+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const removeLinks = (text = '') => {
  return text.replace(/https?:\/\/[^\s"'<>]+/g, '').trim();
};

const shortenText = (text = '', maxLength = 650) => {
  const cleaned = removeLinks(cleanText(text));
  if (cleaned.length <= maxLength) return cleaned;

  return cleaned.slice(0, maxLength).trim();
};

const extractActivitySection = (text = '') => {
  const cleaned = cleanText(text);

  const keywords = [
    '활동내용',
    '활동 내용',
    '주요 활동',
    '정기 활동',
    '활동 안내',
    '활동 방식',
    '활동 일시',
    '활동 기간',
    '활동 장소',
  ];

  let startIndex = -1;

  for (const keyword of keywords) {
    const index = cleaned.indexOf(keyword);
    if (index !== -1 && (startIndex === -1 || index < startIndex)) {
      startIndex = index;
    }
  }

  if (startIndex === -1) {
    return shortenText(cleaned, 700);
  }

  return shortenText(cleaned.slice(startIndex), 900);
};

const makeDescription = (clubDescription, recruitDescription, recruitTitle) => {
  const base = clubDescription || recruitDescription || recruitTitle || '';
  let description = shortenText(base, 650);

  const cutKeywords = [
    '모집 대상',
    '모집 절차',
    '모집 일정',
    '지원 방법',
    '지원링크',
    '신청 링크',
    '회비',
    '문의',
  ];

  for (const keyword of cutKeywords) {
    const index = description.indexOf(keyword);
    if (index !== -1 && index > 120) {
      description = description.slice(0, index).trim();
      break;
    }
  }

  return description;
};

const extractExternalLinks = (text = '') => {
  const urls = text.match(/https?:\/\/[^\s"'<>]+/g) || [];

  return [...new Set(urls)]
    .filter((url) => !url.includes('campuspick.com'))
    .slice(0, 5)
    .map((url) => ({
      linkType: 'homepage',
      linkUrl: url,
    }));
};

async function crawlCampuspick() {
  try {
    const response = await axios.get(LIST_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const $ = cheerio.load(response.data);
    const detailUrls = new Set();

    $('a[href*="/club/view"]').each((_, el) => {
      const fullUrl = makeAbsoluteUrl($(el).attr('href'));
      if (fullUrl) {
        detailUrls.add(fullUrl.split('&')[0]);
      }
    });

    for (const item of EXTRA_DETAIL_URLS) {
      detailUrls.add(item.url.split('&')[0]);
    }

    console.log(`상세페이지 링크 ${detailUrls.size}개 발견`);

    const clubs = [];
    const seenClubNames = new Set();

    for (const detailUrl of detailUrls) {
      const detailResponse = await axios.get(detailUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      const pageData = extractPageData(detailResponse.data);

      if (!pageData) {
        console.log(`상세 데이터 추출 실패: ${detailUrl}`);
        continue;
      }

      const club = pageData.club || {};
      const recruit = pageData.recruit || {};

      const clubName = club.name || recruit.title || '외부동아리';
      const clubNameKey = clubName.toLowerCase();

      if (seenClubNames.has(clubNameKey)) {
        continue;
      }

      seenClubNames.add(clubNameKey);

      const manualExtra = EXTRA_DETAIL_URLS.find(
        (item) => item.url.split('&')[0] === detailUrl
      );

      const campuspickCategoryId = Number(club.categoryId || 8);

      const mappedCategoryId = manualExtra
        ? manualExtra.categoryId
        : CAMPUSPICK_CATEGORY_MAP[campuspickCategoryId] || DEFAULT_CATEGORY_ID;

      const recruitDescription = cleanText(recruit.description || '');
      const clubDescription = cleanText(club.description || '');
      const recruitTitle = cleanText(recruit.title || '');

      clubs.push({
        clubName: clubName.slice(0, 50),
        briefDescription: (recruitTitle || clubDescription || '').slice(0, 25),
        description: makeDescription(
          clubDescription,
          recruitDescription,
          recruitTitle
        ),
        activity: extractActivitySection(
          recruitDescription || clubDescription || recruitTitle
        ),
        categoryId: mappedCategoryId,
        schoolId: null,
        profileImageUrl: pageData.clubImage || null,
        coverImageUrl: recruit.image || null,
        recruitStartAt: recruit.startDate || null,
        recruitEndAt: recruit.endDate || null,
        lastModifiedBy: 'test01',
        links: extractExternalLinks(recruitDescription),
      });

      console.log(
        `${clubName} | campuspick:${campuspickCategoryId} → moari:${mappedCategoryId}`
      );
    }

    console.log(`총 ${clubs.length}개 외부동아리 추출 완료`);
    console.log(JSON.stringify(clubs.slice(0, 3), null, 2));

    console.log('DB 저장 시작');

    for (const club of clubs) {
      try {
        await axios.post(API_URL, [club], {
          headers: { 'Content-Type': 'application/json' },
        });

        console.log(`저장 성공: ${club.clubName}`);
      } catch (error) {
        console.log(`저장 실패: ${club.clubName}`);
        console.log(error.response?.data || error.message);
      }
    }

    console.log('DB 저장 완료');
  } catch (error) {
    console.log('===== 오류 =====');
    console.log(error.response?.data || error.message);
    console.log('===============');
  }
}

crawlCampuspick();