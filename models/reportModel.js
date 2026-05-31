const db = require('../database/db');

exports.createClubReport = async ({
  clubId,
  userId,
  reasonCode,
  customReason
}) => {

  const sql = `
    INSERT INTO reports (
      reasonType,
      content,
      userId,
      clubId
    )
    VALUES (?, ?, ?, ?)
  `;

  const values = [
    reasonCode,
    customReason,
    userId,
    clubId
  ];

  const [result] =
    await db.query(sql, values);

  return {
    reportId: result.insertId,
    userId,
    clubId,
    reasonCode,
    customReason,
    createdAt: new Date()
  };
};

//총 신고 수 조회
exports.getTotalReportCount =
  async (clubId) => {

    const [rows] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM reports
      WHERE clubId = ?
      `,
      [clubId]
    );

    return rows[0].count;
};

//최다 신고 사유 조회 
exports.getMostFrequentReason =
  async (clubId) => {

    const [rows] = await db.query(
      `
      SELECT reasonType,
             COUNT(*) AS count
      FROM reports
      WHERE clubId = ?
      GROUP BY reasonType
      ORDER BY count DESC
      LIMIT 1
      `,
      [clubId]
    );

    return rows[0]?.reasonType || null;
};