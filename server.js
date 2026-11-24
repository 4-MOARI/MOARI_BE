const dotenv = require('dotenv');

dotenv.config();

const app = require('./app');
const db = require('./database/db');

// .env에 PORT가 없어도 서버가 뜨도록 기본값을 둔다.
const PORT = process.env.PORT || 3000;

(async () => {
  try {
    const connection = await db.getConnection();

    console.log('DB 연결 성공!');

    connection.release();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (err) {
    console.log('DB 연결 실패');
    console.log(err);
    // 실패한 채로 살아 있으면 Docker/K8s가 재시작하지 못하므로 종료 코드 1로 끝낸다.
    process.exit(1);
  }
})();
