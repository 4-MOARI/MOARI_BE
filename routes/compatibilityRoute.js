const express = require('express');
const router = express.Router();
const compatibilityController = require('../controllers/compatibilityController');
const { verifyToken } = require('../middlewares/authMiddleware'); // 팀 프로젝트의 인증 미들웨어 경로에 맞게 조절

// POST /api/compatibility/analyze
router.post('/analyze', verifyToken, compatibilityController.analyzeCompatibility);

module.exports = router;