const express = require('express');
const cors = require('cors');

const reviewRoutes = require('./routes/reviewRoutes');
const reportRoutes =
    require('./routes/reportRoutes');
//검색 API 추가
const clubRoutes = require('./routes/clubRoutes');
const favoriteRoutes =
    require('./routes/favoriteRoutes');

const { errorHandler } = require('./middlewares/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('서버 실행 중!');
});


app.use(reviewRoutes);
app.use('/api', reportRoutes);
//검색 API 추가
app.use('/api', clubRoutes);
app.use('/api', favoriteRoutes);

app.use(errorHandler);

module.exports = app;
