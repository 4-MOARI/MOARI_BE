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

CREATE TABLE clubSchedules (
scheduleId BIGINT PRIMARY KEY AUTO_INCREMENT,

clubId BIGINT NOT NULL,
dayOfWeek VARCHAR(20) NOT NULL,
startTime TIME NOT NULL,
endTime TIME NOT NULL,

FOREIGN KEY (clubId)
REFERENCES clubs(clubId)
ON DELETE CASCADE
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
  activityRating INT NOT NULL DEFAULT 3,
  sociabilityRating INT NOT NULL DEFAULT 3,
  activityIntensity INT NOT NULL DEFAULT 3,
  socialLevel INT NOT NULL DEFAULT 3,
  content TEXT,

  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (userId, clubId),

  FOREIGN KEY (userId)
  REFERENCES users(userId),

  FOREIGN KEY (clubId)
  REFERENCES clubs(clubId)
);

CREATE TABLE reviewKeywords (
    keywordId BIGINT PRIMARY KEY AUTO_INCREMENT,
    keywordName VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE reviewKeywordMappings (
    reviewId BIGINT,
    keywordId BIGINT,
    PRIMARY KEY (reviewId, keywordId),
    FOREIGN KEY (reviewId) REFERENCES reviews(reviewId) ON DELETE CASCADE,
    FOREIGN KEY (keywordId) REFERENCES reviewKeywords(keywordId) ON DELETE CASCADE
);

CREATE TABLE clubMetrics (
    metricId BIGINT PRIMARY KEY AUTO_INCREMENT,
    clubId BIGINT NOT NULL UNIQUE,
    
    avgActivityRating DECIMAL(3,2) DEFAULT 0.00,     -- 활동 강도 평균값
    avgSociabilityRating DECIMAL(3,2) DEFAULT 0.00,  -- 친목 비중 평균값
    conflictPotentialScore INT DEFAULT 3,            -- 일정 충돌 예상 점수
    budgetBurdenScore INT DEFAULT 3,                 -- 예산 부담도 예상 점수
    
    FOREIGN KEY (clubId) REFERENCES clubs(clubId) ON DELETE CASCADE
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

-- 초기 리뷰 키워드 기본 데이터 삽입
INSERT INTO reviewKeywords (keywordName) VALUES 
('친목 많아요'), 
('개인적이에요'), 
('뒷풀이 잦아요'), 
('추가비용 있어요'), 
('소규모에요'), 
('체계적이에요');
