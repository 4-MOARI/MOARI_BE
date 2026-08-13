const express = require('express');
const router = express.Router();

const comparisonController = require('../controllers/comparisonController');
/*const authMiddleware = require('../middlewares/authMiddleware');

router.post(
  '/',
  authMiddleware,
  comparisonController.getComparisonData
);*/

router.post(
  '/analyze',
  comparisonController.getComparisonData
);

module.exports = router;