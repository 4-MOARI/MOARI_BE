CREATE DATABASE moari_db;

USE moari_db;

CREATE TABLE schools (
  schoolId BIGINT PRIMARY KEY AUTO_INCREMENT,

  schoolName VARCHAR(100) NOT NULL,
  schoolDomain VARCHAR(100) NOT NULL
);

CREATE TABLE categories (
  categoryId BIGINT PRIMARY KEY AUTO_INCREMENT,

  categoryName VARCHAR(100) NOT NULL
);

CREATE TABLE users (
  userId VARCHAR(50) PRIMARY KEY,

  userName VARCHAR(10) NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,

  isVerified BOOLEAN NOT NULL DEFAULT FALSE,

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  schoolId BIGINT NOT NULL,

  FOREIGN KEY (schoolId)
  REFERENCES schools(schoolId)
);

CREATE TABLE clubs (
  clubId BIGINT PRIMARY KEY AUTO_INCREMENT,

  clubName VARCHAR(100) NOT NULL,
  briefDescription VARCHAR(90),
  description TEXT,
  activity TEXT,

  recruitStartAt DATETIME,
  recruitEndAt DATETIME,

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  profileImageUrl VARCHAR(255),
  coverImageUrl VARCHAR(255),

  schoolId BIGINT,
  categoryId BIGINT NOT NULL,

  lastModifiedBy VARCHAR(50) NOT NULL,

  FOREIGN KEY (schoolId)
  REFERENCES schools(schoolId),

  FOREIGN KEY (categoryId)
  REFERENCES categories(categoryId),

  FOREIGN KEY (lastModifiedBy)
  REFERENCES users(userId)
);

CREATE TABLE favorites (
  userId VARCHAR(50),
  clubId BIGINT,

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (userId, clubId),

  FOREIGN KEY (userId)
  REFERENCES users(userId),

  FOREIGN KEY (clubId)
  REFERENCES clubs(clubId)
);

CREATE TABLE reviews (
  reviewId BIGINT PRIMARY KEY AUTO_INCREMENT,

  userId VARCHAR(50) NOT NULL,
  clubId BIGINT NOT NULL,

  rating INT NOT NULL,
  content TEXT,

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (userId, clubId),

  FOREIGN KEY (userId)
  REFERENCES users(userId),

  FOREIGN KEY (clubId)
  REFERENCES clubs(clubId)
);

CREATE TABLE reports (
  reportId BIGINT PRIMARY KEY AUTO_INCREMENT,

  reasonType VARCHAR(50) NOT NULL,
  content TEXT,

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  userId VARCHAR(50) NOT NULL,
  clubId BIGINT NOT NULL,

  UNIQUE (userId, clubId),

  FOREIGN KEY (userId)
  REFERENCES users(userId),

  FOREIGN KEY (clubId)
  REFERENCES clubs(clubId)
);

CREATE TABLE clubLinks (
  linkId BIGINT PRIMARY KEY AUTO_INCREMENT,

  linkType VARCHAR(30) NOT NULL,
  linkUrl VARCHAR(255) NOT NULL,

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  clubId BIGINT NOT NULL,

  FOREIGN KEY (clubId)
  REFERENCES clubs(clubId)
);

CREATE TABLE histories (
  historyId BIGINT PRIMARY KEY AUTO_INCREMENT,

  modifiedField VARCHAR(50) NOT NULL,

  oldValue TEXT,
  newValue TEXT,

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  clubId BIGINT NOT NULL,
  userId VARCHAR(50) NOT NULL,

  FOREIGN KEY (clubId)
  REFERENCES clubs(clubId),

  FOREIGN KEY (userId)
  REFERENCES users(userId)
);

CREATE TABLE aiInterviewSessions (
  interviewId BIGINT PRIMARY KEY AUTO_INCREMENT,

  userId VARCHAR(50) NOT NULL,
  clubId BIGINT NOT NULL,

  questionCount INT NOT NULL,
  currentQuestionIndex INT NOT NULL DEFAULT 1,
  followUpUsed BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completedAt DATETIME,

  FOREIGN KEY (userId)
  REFERENCES users(userId),

  FOREIGN KEY (clubId)
  REFERENCES clubs(clubId)
);

CREATE TABLE aiInterviewTurns (
  turnId BIGINT PRIMARY KEY AUTO_INCREMENT,

  interviewId BIGINT NOT NULL,

  questionIndex INT NOT NULL,
  questionType VARCHAR(20) NOT NULL,
  questionText TEXT NOT NULL,
  sourceType VARCHAR(30) NOT NULL,

  answerText TEXT,

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  answeredAt DATETIME,

  FOREIGN KEY (interviewId)
  REFERENCES aiInterviewSessions(interviewId)
);

CREATE TABLE aiInterviewResults (
  resultId BIGINT PRIMARY KEY AUTO_INCREMENT,

  interviewId BIGINT NOT NULL UNIQUE,

  overallSummary TEXT NOT NULL,
  strengths TEXT,
  improvements TEXT,
  evaluationItems TEXT,

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (interviewId)
  REFERENCES aiInterviewSessions(interviewId)
);

CREATE TABLE aiInterviewFeedbacks (
  feedbackId BIGINT PRIMARY KEY AUTO_INCREMENT,

  interviewId BIGINT NOT NULL,
  turnId BIGINT NOT NULL UNIQUE,

  status VARCHAR(30) NOT NULL DEFAULT 'NEEDS_IMPROVEMENT',
  goodPoints TEXT,
  missingPoints TEXT,
  improvementDirection TEXT,

  feedbackText TEXT NOT NULL,
  improvementText TEXT NOT NULL,

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (interviewId)
  REFERENCES aiInterviewSessions(interviewId),

  FOREIGN KEY (turnId)
  REFERENCES aiInterviewTurns(turnId)
);
