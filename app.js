const express = require('express');
const cors = require('cors');
const path = require('path');

const reviewRoutes = require('./routes/reviewRoutes');
const reportRoutes = require('./routes/reportRoutes');
// 검색 API 추가
const clubRoutes = require('./routes/clubRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const aiInterviewRoutes = require('./routes/aiInterviewRoutes');

const compatibilityRoutes = require('./routes/compatibilityRoute');

const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('서버 실행 중!');
});

app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

app.use(reviewRoutes);
app.use('/api', reportRoutes);
// 검색 API 추가
app.use('/api', clubRoutes);
app.use('/api', favoriteRoutes);
app.use('/api', userRoutes);
app.use('/api', aiInterviewRoutes);
app.use('/api/uploads', uploadRoutes);

app.use(errorHandler);

module.exports = app;
