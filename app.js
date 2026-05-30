const express = require('express');
const cors = require('cors');
//리뷰 API 추가
const reviewRoutes = require('./routes/reviewRoutes');

const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('서버 실행 중!');
});
//리뷰 API 추가
app.use(reviewRoutes);

app.use(errorHandler);

module.exports = app;

