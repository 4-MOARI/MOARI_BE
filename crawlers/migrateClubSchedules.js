const axios = require('axios');
const cheerio = require('cheerio');

const API_BASE_URL = 'http://34.64.200.191:3000/api';

const CLUB_LIST_API = `${API_BASE_URL}/clubs/migration/clubs`;
const SCHEDULE_SAVE_API = `${API_BASE_URL}/crawl/schedules`;

const CAMPUSPICK_BASE_URL = 'https://www.campuspick.com';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


// --------------------------------------------------
// 시간 변환
// --------------------------------------------------

function normalizeTime(hour, minute = '00', ampm = '') {
  let h = Number(hour);
  const m = String(minute).padStart(2, '0');

  if (ampm.includes('오후') && h < 12) {
    h += 12;
  }

  if (ampm.includes('오전') && h === 12) {
    h = 0;
  }

  if (h > 23 || Number(m) > 59) {
    return null;
  }

  return `${String(h).padStart(2, '0')}:${m}:00`;
}


// --------------------------------------------------
// 활동시간 파싱
// --------------------------------------------------

function parseSchedules(text) {
  if (!text) return [];

  const schedules = [];

  const cleaned = String(text)
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const dayMap = {
    '월': '월요일',
    '화': '화요일',
    '수': '수요일',
    '목': '목요일',
    '금': '금요일',
    '토': '토요일',
    '일': '일요일',
  };

  const dayPattern = '(월|화|수|목|금|토|일)(?:요일)?';

  /*
   * 예:
   * 매주 토요일 14:00 ~ 18:00
   * 매주 금요일 19시 ~ 21시
   * 토요일 14:00-18:00
   */

  const regex = new RegExp(
    `${dayPattern}[^0-9]{0,20}` +
    `(오전|오후)?\\s*(\\d{1,2})(?::|시)\\s*(\\d{0,2})?` +
    `\\s*(?:~|-|–|—|부터)\\s*` +
    `(오전|오후)?\\s*(\\d{1,2})(?::|시)\\s*(\\d{0,2})?`,
    'gi'
  );

  let match;

  while ((match = regex.exec(cleaned)) !== null) {
    const [
      ,
      day,
      startAmpm,
      startHour,
      startMinute,
      endAmpm,
      endHour,
      endMinute
    ] = match;

    const startTime = normalizeTime(
      startHour,
      startMinute || '00',
      startAmpm || ''
    );

    const endTime = normalizeTime(
      endHour,
      endMinute || '00',
      endAmpm || startAmpm || ''
    );

    if (!startTime || !endTime) continue;

    schedules.push({
      dayOfWeek: dayMap[day],
      startTime,
      endTime
    });
  }

  /*
   * 중복 제거
   */

  return [
    ...new Map(
      schedules.map(schedule => [
        `${schedule.dayOfWeek}-${schedule.startTime}-${schedule.endTime}`,
        schedule
      ])
    ).values()
  ];
}


// --------------------------------------------------
// CampusPick 상세 URL 찾기
// --------------------------------------------------

async function findCampusPickUrl(clubName) {
  try {
    const response = await axios.get(
      `${CAMPUSPICK_BASE_URL}/club`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    const $ = cheerio.load(response.data);

    let foundUrl = null;

    $('a[href*="/club/view"]').each((_, el) => {
      if (foundUrl) return;

      const href = $(el).attr('href');
      const name = $(el).text().replace(/\s+/g, ' ').trim();

      if (!href || !name) return;

      if (name === clubName || name.includes(clubName)) {
        foundUrl = href.startsWith('http')
          ? href
          : `${CAMPUSPICK_BASE_URL}${href}`;
      }
    });

    return foundUrl;
  } catch (error) {
    console.log(
      `[CampusPick 검색 실패] ${clubName}`,
      error.message
    );

    return null;
  }
}


// --------------------------------------------------
// CampusPick 상세페이지 활동시간 추출
// --------------------------------------------------

function extractActivityText(html) {
  const match = html.match(
    /\{"adServerUrl":[\s\S]*?"managerName":"[^"]*"\}/
  );

  if (!match) {
    return '';
  }

  try {
    const pageData = JSON.parse(match[0]);

    const club = pageData.club || {};
    const recruit = pageData.recruit || {};

    return [
      club.description,
      recruit.description,
      recruit.title
    ]
      .filter(Boolean)
      .join('\n');
  } catch {
    return '';
  }
}


// --------------------------------------------------
// 정기활동시간 저장
// --------------------------------------------------

async function saveSchedules(clubId, schedules) {
  if (!schedules.length) return;

  await axios.post(
    SCHEDULE_SAVE_API,
    {
      clubId,
      schedules
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}


// --------------------------------------------------
// 메인
// --------------------------------------------------

async function migrateClubSchedules() {
  console.log('======================================');
  console.log(' 기존 동아리 정기활동시간 일괄 등록');
  console.log('======================================');

  /*
   * 1. 배포 DB의 기존 동아리 조회
   */

  const clubResponse = await axios.get(CLUB_LIST_API);

  console.log('API 응답:', JSON.stringify(clubResponse.data, null, 2));

  const clubs =
    clubResponse.data?.data?.clubs ||
    clubResponse.data?.data ||
    [];

    console.log(`기존 동아리 ${clubs.length}개 조회 완료`);

  console.log(`기존 동아리 ${clubs.length}개 조회 완료`);

  let successCount = 0;
  let noScheduleCount = 0;
  let failedCount = 0;

  /*
   * 2. 동아리별 크롤링
   */

  for (const club of clubs) {
    try {
      console.log('');
      console.log(`▶ ${club.clubName}`);

      const detailUrl = await findCampusPickUrl(
        club.clubName
      );

      if (!detailUrl) {
        console.log('  → CampusPick 페이지를 찾지 못함');
        failedCount++;
        continue;
      }

      console.log(`  → ${detailUrl}`);

      const response = await axios.get(detailUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      const activityText = extractActivityText(
        response.data
      );

      const schedules = parseSchedules(
        activityText
      );

      if (schedules.length === 0) {
        console.log('  → 활동시간 없음/파싱 실패');
        noScheduleCount++;
        continue;
      }

      console.log(
        `  → ${schedules.length}개 시간 발견`
      );

      for (const schedule of schedules) {
        console.log(
          `     ${schedule.dayOfWeek} ${schedule.startTime} ~ ${schedule.endTime}`
        );
      }

      /*
       * 실제 DB 저장
       */

      await saveSchedules(
        club.clubId,
        schedules
      );

      console.log('  → 저장 완료');

      successCount++;

      /*
       * 서버에 너무 빠르게 요청하지 않도록 대기
       */

      await sleep(300);

    } catch (error) {
      console.log(
        `  → 처리 실패:`,
        error.response?.data || error.message
      );

      failedCount++;
    }
  }

  console.log('');
  console.log('======================================');
  console.log(' 완료');
  console.log('======================================');

  console.log(`성공: ${successCount}`);
  console.log(`시간 없음: ${noScheduleCount}`);
  console.log(`실패: ${failedCount}`);
}

migrateClubSchedules()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('전체 작업 실패:', error);
    process.exit(1);
  });