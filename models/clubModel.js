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