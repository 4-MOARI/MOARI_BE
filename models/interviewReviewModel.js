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


const findInterviewReviewsByUserId = async (userId) => {
  const [rows] = await db.query(
    `
    SELECT
      ir.interviewReviewId,
      ir.clubId,
      ir.userId,
      ir.hasInterview,
      ir.interviewMethod,
      ir.interviewType,
      ir.atmosphere,
      ir.difficulty,
      ir.duration,
      ir.competencies,
      ir.questions,
      ir.tip,
      ir.createdAt,
      ir.updatedAt,

      c.clubName,
      c.profileImageUrl

    FROM interview_reviews ir

    JOIN clubs c
      ON ir.clubId = c.clubId

    WHERE ir.userId = ?

    ORDER BY ir.createdAt DESC
    `,
    [userId]
  );

  return rows;
};



const findInterviewReviewById = async (interviewReviewId) => {
  const [rows] = await db.query(
    `
    SELECT *
    FROM interview_reviews
    WHERE interviewReviewId = ?
    `,
    [interviewReviewId]
  );

  return rows[0] || null;
};



const deleteInterviewReviewById = async (
  interviewReviewId
) => {
  const [result] = await db.query(
    `
    DELETE FROM interview_reviews
    WHERE interviewReviewId = ?
    `,
    [interviewReviewId]
  );

  return result.affectedRows;
};

module.exports = {
  findClubById,
  createInterviewReview,
  findInterviewReviewsByClubId,

  findInterviewReviewsByUserId,
  findInterviewReviewById,
  deleteInterviewReviewById,
};