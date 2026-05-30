exports.errorHandler = (
  error,
  req,
  res,
  next
) => {

  return res.status(error.status || 500).json({
    success: false,
    data: null,
    error: {
      code:
        error.code || 'INTERNAL_SERVER_ERROR',

      message:
        error.message || '서버 오류'
    }
  });
};