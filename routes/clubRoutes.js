const express = require('express');
const router = express.Router();
const clubController = require('../controllers/clubController');


// 동아리 목록 조회 (검색/필터/정렬)
router.get('/clubs', clubController.getClubs);
// 동아리 수정 로그 조회
router.get('/clubs/:clubId/history', clubController.getClubHistory);

// 크롤링 동아리 정보 기본 적재 API
router.post('/crawl', clubController.crawlClubs);

// 크롤링 동아리 외부 링크 매핑 저장 API
router.post('/crawl/:clubId/links', clubController.saveClubLinks);

// 전체 카테고리 목록 조회 API
router.get('/categories', clubController.getCategories);

// 동아리 상세페이지 UI 데이터 조회 API
router.get('/:clubId', clubController.getClubDetail);


// 동아리 수정 API
router.patch('/clubs/:clubId/update', clubController.updateClub);
router.patch('/:clubId/update', clubController.updateClub);

// 동아리 등록 API
router.get('/clubs/:clubId', clubController.getClubDetail);
router.post('/register', clubController.registerClub);

module.exports = router;