const express = require('express');

const router = express.Router();

const aiInterviewController = require('../controllers/aiInterviewController');
const verifyToken = require('../middlewares/authMiddleware');

router.get(
  '/clubs/:clubId/ai-interview/options',
  verifyToken,
  aiInterviewController.getOptions
);

router.post(
  '/ai-interviews',
  verifyToken,
  aiInterviewController.createInterview
);

router.get(
  '/ai-interviews/:interviewId',
  verifyToken,
  aiInterviewController.getInterview
);

router.post(
  '/ai-interviews/:interviewId/answers',
  verifyToken,
  aiInterviewController.submitAnswer
);

router.post(
  '/ai-interviews/:interviewId/end',
  verifyToken,
  aiInterviewController.endInterview
);

router.post(
  '/ai-interviews/:interviewId/complete',
  verifyToken,
  aiInterviewController.completeInterview
);

router.get(
  '/ai-interviews/:interviewId/result',
  verifyToken,
  aiInterviewController.getResult
);

router.get(
  '/ai-interviews/:interviewId/feedback',
  verifyToken,
  aiInterviewController.getFeedback
);

module.exports = router;
