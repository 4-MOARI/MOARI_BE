const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

(async () => {
    try {
        const connection = await db.getConnection();
        console.log('DB 연결 성공!');
        connection.release();
    } catch (err) {
        console.log('DB 연결 실패');
        console.log(err);
    }
})();

app.get('/', (req, res) => {
  res.send('서버 실행 중!');
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});