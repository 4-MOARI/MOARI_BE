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