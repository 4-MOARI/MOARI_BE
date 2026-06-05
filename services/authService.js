const { sendVerificationEmail } = require('./mailService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../database/db');

const verificationCodes = {};

const createCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const isValidPassword = (password) => {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password);
};

const maskUserId = (userId) => {
  if (userId.length <= 4) return userId[0] + '*'.repeat(userId.length - 1);

  const front = userId.slice(0, 2);
  const back = userId.slice(-2);
  return front + '*'.repeat(userId.length - 4) + back;
};

const query = async (sql, params) => {
  const [rows] = await db.query(sql, params);
  return rows;
};

const sendVerificationCodeService = async (email, schoolId) => {
  const schools = await query(
    'SELECT * FROM schools WHERE schoolId = ?',
    [schoolId]
  );

  if (schools.length === 0) {
    throw { status: 404, code: 'SCHOOL_4041', message: '존재하지 않는 학교입니다.' };
  }

  const school = schools[0];

  if (!email.endsWith(`@${school.schoolDomain}`)) {
    throw { status: 400, code: 'EMAIL_4002', message: '해당 학교 이메일 형식이 아닙니다.' };
  }

  const code = createCode();

  verificationCodes[email] = {
    code,
    schoolId,
    isVerified: false,
  };

  console.log(`[회원가입 이메일 인증번호] ${email}: ${code}`);

  await sendVerificationEmail(email, code);

  return {
    message: '인증번호가 발송되었습니다.',
  };
};

const verifyCodeService = async (email, code) => {
  const saved = verificationCodes[email];

  if (!saved || saved.code !== code) {
    throw { status: 401, code: 'EMAIL_4011', message: '인증번호가 일치하지 않습니다.' };
  }

  verificationCodes[email].isVerified = true;

  return {
    email,
    schoolId: saved.schoolId,
    isVerified: true,
  };
};

const signupService = async ({ userId, userName, password, email }) => {
  if (!userId || !userName || !password || !email) {
    throw { status: 400, code: 'USER_4001', message: '필수 입력값이 누락되었습니다.' };
  }

  if (!isValidPassword(password)) {
    throw { status: 400, code: 'USER_4002', message: '비밀번호는 8자리 이상이며 영문과 숫자를 포함해야 합니다.' };
  }

  const verifiedInfo = verificationCodes[email];

  if (!verifiedInfo || verifiedInfo.isVerified !== true) {
    throw { status: 403, code: 'USER_4031', message: '이메일 인증이 완료되지 않았습니다.' };
  }

  const existingUsers = await query(
    'SELECT * FROM users WHERE userId = ? OR email = ?',
    [userId, email]
  );

  if (existingUsers.length > 0) {
    throw { status: 409, code: 'USER_4091', message: '이미 가입된 아이디 또는 이메일입니다.' };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await query(
    `INSERT INTO users
    (userId, userName, password, email, isVerified, schoolId)
    VALUES (?, ?, ?, ?, true, ?)`,
    [userId, userName, hashedPassword, email, verifiedInfo.schoolId]
  );

  return {
    userId,
    userName,
    email,
    isVerified: true,
    schoolId: verifiedInfo.schoolId,
  };
};

const loginService = async (userId, password) => {
  const users = await query(
    'SELECT * FROM users WHERE userId = ?',
    [userId]
  );

  if (users.length === 0) {
    throw { status: 404, code: 'AUTH_4041', message: '존재하지 않는 사용자입니다.' };
  }

  const user = users[0];

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw { status: 401, code: 'AUTH_4011', message: '비밀번호가 일치하지 않습니다.' };
  }

  const token = jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      schoolId: user.schoolId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    }
  );

  return {
    token,
    user: {
      userId: user.userId,
      userName: user.userName,
      email: user.email,
      schoolId: user.schoolId,
      isVerified: user.isVerified,
    },
  };
};

const findIdService = async (email) => {
  const users = await query(
    'SELECT userId FROM users WHERE email = ?',
    [email]
  );

  if (users.length === 0) {
    throw { status: 404, code: 'USER_4041', message: '가입된 이메일이 없습니다.' };
  }

  return {
    maskedUserId: maskUserId(users[0].userId),
  };
};

const sendPasswordCodeService = async (email) => {
  const users = await query(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );

  if (users.length === 0) {
    throw { status: 404, code: 'USER_4041', message: '가입된 이메일이 없습니다.' };
  }

  const code = createCode();

  verificationCodes[email] = {
    code,
    isVerified: false,
    type: 'PASSWORD_RESET',
  };

  console.log(`[비밀번호 재설정 인증번호] ${email}: ${code}`);

  await sendVerificationEmail(email, code);

  return {
    message: '비밀번호 재설정 인증번호가 발송되었습니다.',
  };
};

const resetPasswordService = async (email, code, newPassword, confirmPassword) => {
  if (!email || !code || !newPassword || !confirmPassword) {
    throw { status: 400, code: 'PASSWORD_4001', message: '필수 입력값이 누락되었습니다.' };
  }

  if (newPassword !== confirmPassword) {
    throw { status: 400, code: 'PASSWORD_4002', message: '비밀번호 확인이 일치하지 않습니다.' };
  }

  if (!isValidPassword(newPassword)) {
    throw { status: 400, code: 'PASSWORD_4003', message: '비밀번호는 8자리 이상이며 영문과 숫자를 포함해야 합니다.' };
  }

  const saved = verificationCodes[email];

  if (!saved || saved.code !== code) {
    throw { status: 401, code: 'PASSWORD_4011', message: '인증번호가 일치하지 않습니다.' };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await query(
    'UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE email = ?',
    [hashedPassword, email]
  );

  return {
    message: '비밀번호가 변경되었습니다.',
  };
};

module.exports = {
  sendVerificationCodeService,
  verifyCodeService,
  signupService,
  loginService,
  findIdService,
  sendPasswordCodeService,
  resetPasswordService,
};