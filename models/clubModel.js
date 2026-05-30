//clubId를 이용해서 동아리를 조회하는 함수
const db = require('../database/db');

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