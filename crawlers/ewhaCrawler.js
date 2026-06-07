const API_URL = 'http://34.50.19.72:3000/api/crawl';
const axios = require('axios');
const cheerio = require('cheerio');

const SCHOOL_ID = 12;
const LAST_MODIFIED_BY = 'EWHA01';

const CATEGORY = {
  ACADEMIC: 1, // 학술
  SPORTS: 2, // 체육
  PERFORMANCE: 3, // 공연·예술
  VOLUNTEER: 4, // 봉사
  HOBBY: 5, // 취미·친목
  ETC: 8, // 기타
};

const PAGES = [
  {
    ewhaType: '공연',
    url: 'https://www.ewha.ac.kr/ewha/life/circles-show.do',
  },
  {
    ewhaType: '문화',
    url: 'https://www.ewha.ac.kr/ewha/life/circles-culture.do',
  },
  {
    ewhaType: '사회',
    url: 'https://www.ewha.ac.kr/ewha/life/circles-social.do',
  },
  {
    ewhaType: '종교',
    url: 'https://www.ewha.ac.kr/ewha/life/circles-religion.do',
  },
  {
    ewhaType: '체육',
    url: 'https://www.ewha.ac.kr/ewha/life/circles-sports.do',
  },
  {
    ewhaType: '학술',
    url: 'https://www.ewha.ac.kr/ewha/life/circles-academic.do',
  },
];

function normalizeText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function decideCategoryId(ewhaType, clubName, description) {
  const text = `${clubName} ${description}`;

  if (ewhaType === '공연') return CATEGORY.PERFORMANCE;
  if (ewhaType === '체육') return CATEGORY.SPORTS;
  if (ewhaType === '학술') return CATEGORY.ACADEMIC;
  if (ewhaType === '종교') return CATEGORY.ETC;

  if (ewhaType === '사회') {
    if (/봉사|나눔|기부|멘토링|교육봉사|사회공헌|캠페인|인권|장애|환경/.test(text)) {
      return CATEGORY.VOLUNTEER;
    }
    return CATEGORY.ETC;
  }

  if (ewhaType === '문화') {
    if (/서예|미술|그림|사진|영상|영화|연극|공연|음악|기타|합창|댄스|춤|문학|시|창작/.test(text)) {
      return CATEGORY.PERFORMANCE;
    }

    if (/책|독서|토론|스터디|공부|학문|연구|철학|역사|비평|학술/.test(text)) {
      return CATEGORY.ACADEMIC;
    }

    if (/친목|교류|취미|여행|보드게임|게임|요리|차|커피|다도|문화생활/.test(text)) {
      return CATEGORY.HOBBY;
    }

    if (/와인|주류|술/.test(text)) {
      return CATEGORY.ETC;
    }

    return CATEGORY.HOBBY;
  }

  return CATEGORY.ETC;
}

function parseClubsFromPage(html, ewhaType) {
  const $ = cheerio.load(html);
  const clubs = [];

  // 이화 페이지의 중앙동아리 본문 테이블/리스트에서 텍스트 수집
  const candidates = [];

  $('table tbody tr').each((_, tr) => {
    const cells = $(tr).find('td').map((__, td) => normalizeText($(td).text())).get();

    if (cells.length >= 2) {
      candidates.push(cells);
    }
  });

  // 테이블이 안 잡힐 경우 백업: dl 구조 대응
  if (candidates.length === 0) {
    $('dl').each((_, dl) => {
      const name = normalizeText($(dl).find('dt').first().text());
      const desc = normalizeText($(dl).find('dd').text());
      if (name && desc) candidates.push([name, desc]);
    });
  }

  for (const cells of candidates) {
    const clubName = normalizeText(cells[0]);
    const description = normalizeText(cells[1]);

    if (!clubName || !description) continue;
    if (clubName.includes('동아리명') || clubName.includes('소개')) continue;

    const categoryId = decideCategoryId(ewhaType, clubName, description);

    clubs.push({
      clubName,
      briefDescription: description.substring(0, 20),
      description,
      activity: description,
      recruitStartAt: null,
      recruitEndAt: null,
      profileImageUrl: null,
      coverImageUrl: null,
      schoolId: SCHOOL_ID,
      categoryId,
      lastModifiedBy: LAST_MODIFIED_BY,
      links: [],
    });
  }

  return clubs;
}

async function crawlEwha() {
  const allClubs = [];

  for (const page of PAGES) {
    console.log(`[이화여대 크롤링] ${page.ewhaType} 시작`);

    const response = await axios.get(page.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const clubs = parseClubsFromPage(response.data, page.ewhaType);

    console.log(`[이화여대 크롤링] ${page.ewhaType}: ${clubs.length}개`);

    allClubs.push(...clubs);
  }

  console.log(`[이화여대 크롤링] 총 ${allClubs.length}개 저장 시도`);

  const saveResponse = await axios.post(API_URL, allClubs, {
    headers: {
        'Content-Type': 'application/json',
    },
    });

    console.log('DB 저장 결과:');
    console.log(JSON.stringify(saveResponse.data, null, 2));
    process.exit(0);

  console.log(result);
  process.exit(0);
}

crawlEwha().catch((error) => {
  console.error('[이화여대 크롤링 실패]', error);
  process.exit(1);
});