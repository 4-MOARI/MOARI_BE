const express = require('express');
const router = express.Router();

const {
  sendVerificationCode,
  verifyCode,
  signup,
  login,
  findId,
  sendPasswordCode,
  resetPassword
} = require('../controllers/authController');

router.post('/verify/send', sendVerificationCode);
router.post('/verify/confirm', verifyCode);

router.post('/signup', signup);
router.post('/login', login);

router.post('/find-id', findId);

router.post('/password/send', sendPasswordCode);
router.patch('/password/reset', resetPassword);

module.exports = router;