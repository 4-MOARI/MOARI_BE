const express = require('express');

const router = express.Router();

const userController =
  require('../controllers/userController');

const verifyToken =
  require('../middlewares/authMiddleware');

router.get(
  '/users/me',

  verifyToken,

  userController.getMyProfile
);

router.post(
  '/users/me/password/verify',

  verifyToken,

  userController.verifyMyPassword
);

router.patch(
  '/users/me/password',

  verifyToken,

  userController.changeMyPassword
);

router.delete(
  '/users/me',

  verifyToken,

  userController.deleteMyAccount
);

router.get(
  '/users/me/favorites',

  verifyToken,

  userController.getMyFavoriteClubs
);

router.get(
  '/users/me/clubs',

  verifyToken,

  userController.getMyClubs
);

router.get(
  '/users/me/reviews',

  verifyToken,

  userController.getMyReviews
);

module.exports = router;
