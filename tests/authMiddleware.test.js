const jwt = require('jsonwebtoken');
const request = require('supertest');

jest.mock('../database/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));

const authMiddleware = require('../middlewares/authMiddleware');
const app = require('../app');

const TEST_SECRET = 'test-jwt-secret';

// res.status(...).json(...) 형태로 호출되는 Express 응답 객체 흉내
const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authMiddleware (단위 테스트)', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  test('Authorization 헤더가 없으면 401 AUTH_4010', () => {
    const req = { headers: {} };
    const res = createMockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].error.code).toBe('AUTH_4010');
    expect(next).not.toHaveBeenCalled();
  });

  test('Bearer 형식이 아니면 401 AUTH_4010', () => {
    const req = { headers: { authorization: 'Token abc' } };
    const res = createMockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].error.code).toBe('AUTH_4010');
    expect(next).not.toHaveBeenCalled();
  });

  test('서명이 잘못된 토큰이면 401 AUTH_4012', () => {
    const badToken = jwt.sign({ userId: 1 }, 'wrong-secret');
    const req = { headers: { authorization: `Bearer ${badToken}` } };
    const res = createMockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].error.code).toBe('AUTH_4012');
    expect(next).not.toHaveBeenCalled();
  });

  test('만료된 토큰이면 401 AUTH_4012', () => {
    const expiredToken = jwt.sign(
      { userId: 1, exp: Math.floor(Date.now() / 1000) - 60 },
      TEST_SECRET
    );
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    const res = createMockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].error.code).toBe('AUTH_4012');
    expect(next).not.toHaveBeenCalled();
  });

  test('올바른 토큰이면 req.user를 채우고 next()를 호출한다', () => {
    const token = jwt.sign(
      { userId: 7, email: 'tester@example.com', schoolId: 12 },
      TEST_SECRET
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createMockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({
      userId: 7,
      email: 'tester@example.com',
      schoolId: 12,
    });
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('로그인이 필요한 API (통합 테스트)', () => {
  test('토큰 없이 GET /api/users/me 를 호출하면 401', async () => {
    const res = await request(app).get('/api/users/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTH_4010');
  });
});
