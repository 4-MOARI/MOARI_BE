const db = require('../database/db');

exports.createSession = async ({
  userId,
  clubId,
  questionCount,
}) => {
  const [result] = await db.query(
    `
    INSERT INTO aiInterviewSessions (
      userId,
      clubId,
      questionCount
    )
    VALUES (?, ?, ?)
    `,
    [userId, clubId, questionCount]
  );

  return result.insertId;
};

exports.findSessionById = async (interviewId) => {
  const [rows] = await db.query(
    `
    SELECT
      s.interviewId,
      s.userId,
      s.clubId,
      c.clubName,
      c.schoolId,
      c.categoryId,
      c.briefDescription,
      c.description,
      c.activity,
      s.questionCount,
      s.currentQuestionIndex,
      s.followUpUsed,
      s.status,
      s.createdAt,
      s.completedAt
    FROM aiInterviewSessions s
    INNER JOIN clubs c
      ON s.clubId = c.clubId
    WHERE s.interviewId = ?
    `,
    [interviewId]
  );

  return rows[0];
};

exports.createTurn = async ({
  interviewId,
  questionIndex,
  questionType,
  questionText,
  sourceType,
}) => {
  const [result] = await db.query(
    `
    INSERT INTO aiInterviewTurns (
      interviewId,
      questionIndex,
      questionType,
      questionText,
      sourceType
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      interviewId,
      questionIndex,
      questionType,
      questionText,
      sourceType,
    ]
  );

  return result.insertId;
};

exports.findTurnById = async ({
  interviewId,
  turnId,
}) => {
  const [rows] = await db.query(
    `
    SELECT
      turnId,
      interviewId,
      questionIndex,
      questionType,
      questionText,
      sourceType,
      answerText,
      createdAt,
      answeredAt
    FROM aiInterviewTurns
    WHERE interviewId = ?
      AND turnId = ?
    `,
    [interviewId, turnId]
  );

  return rows[0];
};

exports.findTurnsByInterviewId = async (interviewId) => {
  const [rows] = await db.query(
    `
    SELECT
      turnId,
      interviewId,
      questionIndex,
      questionType,
      questionText,
      sourceType,
      answerText,
      createdAt,
      answeredAt
    FROM aiInterviewTurns
    WHERE interviewId = ?
    ORDER BY questionIndex ASC, turnId ASC
    `,
    [interviewId]
  );

  return rows;
};

exports.updateTurnAnswer = async ({
  turnId,
  answerText,
}) => {
  const [result] = await db.query(
    `
    UPDATE aiInterviewTurns
    SET answerText = ?,
        answeredAt = NOW()
    WHERE turnId = ?
    `,
    [answerText, turnId]
  );

  return result.affectedRows;
};

exports.updateSessionProgress = async ({
  interviewId,
  currentQuestionIndex,
  followUpUsed,
  status,
}) => {
  const fields = [];
  const params = [];

  if (currentQuestionIndex !== undefined) {
    fields.push('currentQuestionIndex = ?');
    params.push(currentQuestionIndex);
  }

  if (followUpUsed !== undefined) {
    fields.push('followUpUsed = ?');
    params.push(followUpUsed);
  }

  if (status !== undefined) {
    fields.push('status = ?');
    params.push(status);
  }

  fields.push('updatedAt = NOW()');

  if (status === 'COMPLETED') {
    fields.push('completedAt = NOW()');
  }

  params.push(interviewId);

  const [result] = await db.query(
    `
    UPDATE aiInterviewSessions
    SET ${fields.join(', ')}
    WHERE interviewId = ?
    `,
    params
  );

  return result.affectedRows;
};

exports.createFeedback = async ({
  interviewId,
  turnId,
  status,
  goodPoints,
  missingPoints,
  improvementDirection,
  feedbackText,
  improvementText,
}) => {
  const [result] = await db.query(
    `
    INSERT INTO aiInterviewFeedbacks (
      interviewId,
      turnId,
      status,
      goodPoints,
      missingPoints,
      improvementDirection,
      feedbackText,
      improvementText
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      interviewId,
      turnId,
      status,
      JSON.stringify(goodPoints),
      JSON.stringify(missingPoints),
      improvementDirection,
      feedbackText,
      improvementText,
    ]
  );

  return result.insertId;
};

exports.findFeedbackByInterviewId = async (interviewId) => {
  const [rows] = await db.query(
    `
    SELECT
      f.feedbackId,
      f.interviewId,
      f.turnId,
      t.questionIndex,
      t.questionText,
      t.answerText,
      f.status,
      f.goodPoints,
      f.missingPoints,
      f.improvementDirection,
      f.feedbackText,
      f.improvementText,
      f.createdAt
    FROM aiInterviewFeedbacks f
    INNER JOIN aiInterviewTurns t
      ON f.turnId = t.turnId
    WHERE f.interviewId = ?
    ORDER BY t.questionIndex ASC, f.feedbackId ASC
    `,
    [interviewId]
  );

  return rows;
};

exports.createResult = async ({
  interviewId,
  overallSummary,
  strengths,
  improvements,
  evaluationItems,
}) => {
  const [result] = await db.query(
    `
    INSERT INTO aiInterviewResults (
      interviewId,
      overallSummary,
      strengths,
      improvements,
      evaluationItems
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      interviewId,
      overallSummary,
      JSON.stringify(strengths),
      JSON.stringify(improvements),
      JSON.stringify(evaluationItems),
    ]
  );

  return result.insertId;
};

exports.findResultByInterviewId = async (interviewId) => {
  const [rows] = await db.query(
    `
    SELECT
      resultId,
      interviewId,
      overallSummary,
      strengths,
      improvements,
      evaluationItems,
      createdAt
    FROM aiInterviewResults
    WHERE interviewId = ?
    `,
    [interviewId]
  );

  return rows[0];
};

exports.findInterviewReviewSourcesByClubId = async ({
  clubId,
  limit = 5,
}) => {
  const [rows] = await db.query(
    `
    SELECT
      interviewReviewId,
      interviewMethod,
      interviewType,
      atmosphere,
      difficulty,
      duration,
      competencies,
      questions,
      tip
    FROM interview_reviews
    WHERE clubId = ?
      AND hasInterview = TRUE
    ORDER BY createdAt DESC
    LIMIT ?
    `,
    [clubId, limit]
  );

  return rows;
};
