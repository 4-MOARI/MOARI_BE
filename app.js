const express = require('express');
const cors = require('cors');
const path = require('path');


const authRoutes = require('./routes/authRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const reportRoutes = require('./routes/reportRoutes');
const clubRoutes = require('./routes/clubRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const interviewReviewRoutes = require('./routes/interviewReviewRoutes');
const aiInterviewRoutes = require('./routes/aiInterviewRoutes');
const compatibilityRoutes = require('./routes/compatibilityRoute');
const comparisonRoutes = require('./routes/comparisonRoutes');
const { errorHandler } = require('./middlewares/errorHandler');
const db = require('./database/db');

const app = express();



app.use(cors());
app.use(express.json());



app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);




app.get('/', (req, res) => {
  res.send('서버 실행 중!');
});


// 헬스체크: 프로세스가 살아 있는지 (K8s livenessProbe 용)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 헬스체크: DB까지 연결되어 요청을 받을 준비가 됐는지 (K8s readinessProbe 용)
app.get('/health/ready', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'error', db: 'down' });
  }
});




app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);



app.use(reviewRoutes);



app.use('/api', reportRoutes);




app.use('/api', clubRoutes);




app.use('/api', favoriteRoutes);



app.use('/api', userRoutes);



app.use('/api', interviewReviewRoutes);



app.use('/api', aiInterviewRoutes);



app.use('/api/uploads', uploadRoutes);




app.use('/api/compatibility', compatibilityRoutes);
app.use('/api/comparison', comparisonRoutes);




app.use(errorHandler);


module.exports = app;