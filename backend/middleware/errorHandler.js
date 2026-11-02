function errorHandler(err, req, res, next) {
  console.error(err.stack);

  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL';
  const message = err.message || 'An internal server error occurred';

  res.status(status).json({
    success: false,
    error: message,
    code
  });
}

module.exports = { errorHandler };
