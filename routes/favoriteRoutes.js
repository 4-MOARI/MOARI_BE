const express = require('express');

const router = express.Router();

const favoriteController =
  require('../controllers/favoriteController');

const verifyToken =
  require('../middlewares/authMiddleware');

router.post(
  '/clubs/:clubId/favorites',

  verifyToken,

  favoriteController.createFavorite
);

router.delete(
  '/clubs/:clubId/favorites',

  verifyToken,

  favoriteController.deleteFavorite
);

router.get(
  '/clubs/:clubId/favorites',

  verifyToken,

  favoriteController.getFavoriteStatus
);

module.exports = router;
