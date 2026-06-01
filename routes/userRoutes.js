const express = require('express');

const router = express.Router();

const userController =
  require('../controllers/userController');

// authMiddleware 구현 후 활성화 예정
// const verifyToken =
//   require('../middlewares/authMiddleware');

router.get(
  '/users/me',

  // verifyToken,

  userController.getMyProfile
);

router.get(
  '/users/me/favorites',

  // verifyToken,

  userController.getMyFavoriteClubs
);

router.get(
  '/users/me/clubs',

  // verifyToken,

  userController.getMyClubs
);

module.exports = router;
