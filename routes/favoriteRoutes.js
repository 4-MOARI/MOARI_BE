const express = require('express');

const router = express.Router();

const favoriteController =
  require('../controllers/favoriteController');

// authMiddleware 구현 후 활성화 예정
// const verifyToken =
//   require('../middlewares/authMiddleware');

router.post(
  '/clubs/:clubId/favorites',

  // verifyToken,

  favoriteController.createFavorite
);

router.delete(
  '/clubs/:clubId/favorites',

  // verifyToken,

  favoriteController.deleteFavorite
);

router.get(
  '/clubs/:clubId/favorites',

  // verifyToken,

  favoriteController.getFavoriteStatus
);

module.exports = router;
