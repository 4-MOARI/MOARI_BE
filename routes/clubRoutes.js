const express = require('express');
const router = express.Router();
const clubController = require('../controllers/clubController');

// 동아리 목록 조회 (검색/필터/정렬)
router.get('/clubs', clubController.getClubs);

module.exports = router;