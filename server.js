const dotenv = require('dotenv');

dotenv.config();

const app = require('./app');
const db = require('./database/db');

const PORT = process.env.PORT;

(async () => {
  try {
    const connection = await db.getConnection();

    console.log('DB 연결 성공!');

    connection.release();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (err) {
    console.log('DB 연결 실패');
    console.log(err);
  }
})();

