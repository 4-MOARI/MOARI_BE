const db = require('../database/db');

const createInterviewReview = async ({
  clubId,
  userId,
  hasInterview,
  interviewMethod,
  interviewType,
  atmosphere,
  difficulty,
  duration,
  competencies,
  questions,
  tip,
}) => {
  const [result] = await db.query(
    `
    INSERT INTO interview_reviews (
      clubId,
      userId,
      hasInterview,
      interviewMethod,
      interviewType,
      atmosphere,
      difficulty,
      duration,
      competencies,
      questions,
      tip
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      clubId,
      userId,
      hasInterview,
      interviewMethod,
      interviewType,
      atmosphere,
      difficulty,
      duration,
      JSON.stringify(competencies || []),
      JSON.stringify(questions || []),
      tip || null,
    ]
  );

  return result.insertId;
};

const findInterviewReviewsByClubId = async (clubId) => {
  const [rows] = await db.query(
    `
    SELECT
      interviewReviewId,
      clubId,
      userId,
      hasInterview,
      interviewMethod,
      interviewType,
      atmosphere,
      difficulty,
      duration,
      competencies,
      questions,
      tip,
      createdAt
    FROM interview_reviews
    WHERE clubId = ?
    ORDER BY createdAt DESC
    `,
    [clubId]
  );

  return rows;
};

const findClubById = async (clubId) => {
  const [rows] = await db.query(
    `
    SELECT clubId, clubName
    FROM clubs
    WHERE clubId = ?
    `,
    [clubId]
  );

  return rows[0];
};

module.exports = {
  createInterviewReview,
  findInterviewReviewsByClubId,
  findClubById,
};