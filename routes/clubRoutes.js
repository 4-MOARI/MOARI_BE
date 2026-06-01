const express = require('express');
const router = express.Router();
const clubController = require('../controllers/clubController');

// 동아리 목록 조회 (검색/필터/정렬)
router.get('/clubs', clubController.getClubs);
// 동아리 수정 로그 조회
router.get('/clubs/:clubId/history', clubController.getClubHistory);

module.exports = router;