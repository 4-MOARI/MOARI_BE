const API_URL = 'http://34.50.19.72:3000/api/crawl';

const axios = require('axios');
const cheerio = require('cheerio');

const URL = 'https://www.sungshin.ac.kr/main_kor/14217/subview.do';

const tableCategoryMap = [
  { originalCategory: '공연', categoryId: 3 },
  { originalCategory: '봉사', categoryId: 4 },
  { originalCategory: '종교', categoryId: 8 },
  { originalCategory: '취미', categoryId: 5 },
  { originalCategory: '학술', categoryId: 1 },
  { originalCategory: '예술창작', categoryId: 3 },
  { originalCategory: '체육', categoryId: 2 },
];

const makeBriefDescription = (mainActivity, field) => {
  if (mainActivity && mainActivity.trim()) {
    return mainActivity.trim().slice(0, 25);
  }

  if (field && field.trim()) {
    return `${field.trim()} 분야 동아리`.slice(0, 25);
  }

  return null;
};

async function crawlSungshin() {
  try {
    const response = await axios.get(URL);
    const $ = cheerio.load(response.data);

    const clubs = [];

    $('table').each((tableIndex, table) => {
      const categoryInfo = tableCategoryMap[tableIndex];
      if (!categoryInfo) return;

      $(table)
        .find('tbody tr')
        .each((rowIndex, row) => {
          const cells = $(row)
            .find('td')
            .map((i, cell) =>
              $(cell).text().replace(/\s+/g, ' ').trim()
            )
            .get();

          if (cells.length < 5) return;

          const [
            clubName,
            field,
            clubRoom,
            clubStatus,
            mainActivity,
          ] = cells;

          if (!clubName) return;

          clubs.push({
            clubName,
            briefDescription: makeBriefDescription(mainActivity, field),
            description: null,
            activity:
            `분야: ${field || '-'}
            동아리실: ${clubRoom || '-'}
            동아리 지위: ${clubStatus || '-'}
            주요 활동: ${mainActivity || '-'}`,
            categoryId: categoryInfo.categoryId,
            schoolId: 1,
            profileImageUrl: null,
            coverImageUrl: null,
            recruitStartAt: null,
            recruitEndAt: null,
            lastModifiedBy: 'test01',
            links: []
          });
        });
    });

    console.log(`총 ${clubs.length}개 동아리 추출 완료`);
    console.log(JSON.stringify(clubs.slice(0, 5), null, 2));

    const saveResponse = await axios.post(API_URL, clubs, {
        headers: {
            'Content-Type': 'application/json',
        },
        });

        console.log('DB 저장 결과:');
        console.log(JSON.stringify(saveResponse.data, null, 2));
  } catch (error) {
        console.log('===== 서버 응답 =====');

        if (error.response) {
            console.log('status:', error.response.status);
            console.log(
            JSON.stringify(error.response.data, null, 2)
            );
        } else {
            console.log(error);
        }

        console.log('===================');
        }
}

crawlSungshin();