const {
  sendVerificationCodeService,
  verifyCodeService,
  signupService,
  loginService,
  findIdService,
  sendPasswordCodeService,
  resetPasswordService
} = require('../services/authService');

const handleError = (res, err) => {
  return res.status(err.status || 500).json({
    success: false,
    data: null,
    error: {
      code: err.code || 'SERVER_5000',
      message: err.message || '서버 오류가 발생했습니다.'
    }
  });
};

const sendVerificationCode = async (req, res) => {
  try {
    const { email, schoolId } = req.body;

    const result = await sendVerificationCodeService(email, schoolId);

    return res.status(200).json({
      success: true,
      data: result,
      error: null
    });
  } catch (err) {
    return handleError(res, err);
  }
};

const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    const result = await verifyCodeService(email, code);

    return res.status(200).json({
      success: true,
      data: result,
      error: null
    });
  } catch (err) {
    return handleError(res, err);
  }
};

const signup = async (req, res) => {
  try {
    const result = await signupService(req.body);

    return res.status(201).json({
      success: true,
      data: result,
      error: null
    });
  } catch (err) {
    return handleError(res, err);
  }
};

const login = async (req, res) => {
  try {
    const { userId, password } = req.body;

    const result = await loginService(userId, password);

    return res.status(200).json({
      success: true,
      data: result,
      error: null
    });
  } catch (err) {
    return handleError(res, err);
  }
};

const findId = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await findIdService(email);

    return res.status(200).json({
      success: true,
      data: result,
      error: null
    });
  } catch (err) {
    return handleError(res, err);
  }
};

const sendPasswordCode = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await sendPasswordCodeService(email);

    return res.status(200).json({
      success: true,
      data: result,
      error: null
    });
  } catch (err) {
    return handleError(res, err);
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body;

    const result = await resetPasswordService(
      email,
      code,
      newPassword,
      confirmPassword
    );

    return res.status(200).json({
      success: true,
      data: result,
      error: null
    });
  } catch (err) {
    return handleError(res, err);
  }
};

module.exports = {
  sendVerificationCode,
  verifyCode,
  signup,
  login,
  findId,
  sendPasswordCode,
  resetPassword
};