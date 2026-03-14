const errorHandler = (err, req, res, next) => {

  console.error(err.stack);

  // ─── MONGOOSE VALIDATION ERROR ──────────────────────
  // happens when required fields are missing
  if (err.name === 'ValidationError') {
    const errors = {};
    Object.keys(err.errors).forEach(key => {
      errors[key] = err.errors[key].message;
    });
    return res.status(400).json({
      message: 'Validation failed',
      errors
    });
  }

  // ─── MONGOOSE DUPLICATE KEY ERROR ───────────────────
  // happens when email already exists
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
    });
  }

  // ─── JWT EXPIRED ERROR ───────────────────────────────
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token has expired, please login again'
    });
  }

  // ─── JWT INVALID ERROR ───────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Token is invalid or expired'
    });
  }

  // ─── MONGOOSE CAST ERROR ─────────────────────────────
  // happens when an invalid ID is passed
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: `Invalid ${err.path}: ${err.value}`
    });
  }

  // ─── DEFAULT SERVER ERROR ────────────────────────────
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

// ─── 404 HANDLER ─────────────────────────────────────
// catches any route that doesn't exist
const notFound = (req, res, next) => {
  const error = new Error(`Route not found — ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = { errorHandler, notFound };