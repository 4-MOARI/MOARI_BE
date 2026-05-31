const express = require('express');
const cors = require('cors');
//리뷰 API 추가
const reviewRoutes = require('./routes/reviewRoutes');

//신고 API 추가
const reportRoutes =
    require('./routes/reportRoutes');

const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('서버 실행 중!');
});
//리뷰 API 추가
app.use(reviewRoutes);

//신고 API 추가
app.use('/api', reportRoutes);

app.use(errorHandler);

module.exports = app;

