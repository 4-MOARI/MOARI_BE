const express = require('express');

const router = express.Router();

const reportController =
  require('../controllers/reportController');

const verifyToken =
  require('../middlewares/authMiddleware');

// 동아리 신고 API
router.post(
  '/clubs/:clubId/reports',

  verifyToken,

  reportController.createClubReport
);

// 동아리 신고 요약 조회 API
router.get(
  '/clubs/:clubId/reports/summary',

  verifyToken,
  
  reportController.getReportSummary
);

module.exports = router;