const aiInterviewService = require('../services/aiInterviewService');

exports.getOptions = async (req, res, next) => {
  try {
    const clubId = Number(req.params.clubId);
    const user = req.user;

    const options = await aiInterviewService.getOptions({
      clubId,
      user,
    });

    return res.status(200).json({
      success: true,
      data: options,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

exports.createInterview = async (req, res, next) => {
  try {
    const user = req.user;
    const { clubId, questionCount } = req.body;

    const interview = await aiInterviewService.createInterview({
      user,
      clubId: Number(clubId),
      questionCount: Number(questionCount),
    });

    return res.status(201).json({
      success: true,
      data: interview,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

exports.getInterview = async (req, res, next) => {
  try {
    const interviewId = Number(req.params.interviewId);
    const user = req.user;

    const interview = await aiInterviewService.getInterview({
      interviewId,
      user,
    });

    return res.status(200).json({
      success: true,
      data: interview,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

exports.submitAnswer = async (req, res, next) => {
  try {
    const interviewId = Number(req.params.interviewId);
    const user = req.user;
    const { turnId, answerText } = req.body;

    const result = await aiInterviewService.submitAnswer({
      interviewId,
      user,
      turnId: Number(turnId),
      answerText,
    });

    return res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

exports.endInterview = async (req, res, next) => {
  try {
    const interviewId = Number(req.params.interviewId);
    const user = req.user;

    const result = await aiInterviewService.endInterview({
      interviewId,
      user,
    });

    return res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

exports.completeInterview = async (req, res, next) => {
  try {
    const interviewId = Number(req.params.interviewId);
    const user = req.user;

    const result = await aiInterviewService.completeInterview({
      interviewId,
      user,
    });

    return res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

exports.getResult = async (req, res, next) => {
  try {
    const interviewId = Number(req.params.interviewId);
    const user = req.user;

    const result = await aiInterviewService.getResult({
      interviewId,
      user,
    });

    return res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

exports.getFeedback = async (req, res, next) => {
  try {
    const interviewId = Number(req.params.interviewId);
    const user = req.user;

    const feedback = await aiInterviewService.getFeedback({
      interviewId,
      user,
    });

    return res.status(200).json({
      success: true,
      data: feedback,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};
