const request = require('supertest');

// 실제 MySQL 없이 테스트하기 위해 DB 모듈을 가짜(mock)로 바꾼다.
jest.mock('../database/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));

const db = require('../database/db');
const app = require('../app');

describe('기본 경로', () => {
  test('GET / 는 서버 실행 메시지를 반환한다', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.text).toBe('서버 실행 중!');
  });

  test('없는 경로는 404를 반환한다', async () => {
    const res = await request(app).get('/this-route-does-not-exist');

    expect(res.status).toBe(404);
  });
});

describe('헬스체크', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('GET /health 는 DB와 무관하게 200 ok를 반환한다', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(db.query).not.toHaveBeenCalled();
  });

  test('GET /health/ready 는 DB가 응답하면 200을 반환한다', async () => {
    db.query.mockResolvedValue([[{ 1: 1 }]]);

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
    expect(db.query).toHaveBeenCalledWith('SELECT 1');
  });

  test('GET /health/ready 는 DB 연결이 실패하면 503을 반환한다', async () => {
    db.query.mockRejectedValue(new Error('connect ETIMEDOUT'));

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'error', db: 'down' });
  });
});
