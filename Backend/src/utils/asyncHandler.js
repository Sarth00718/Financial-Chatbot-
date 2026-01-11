/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors automatically
 * This eliminates the need for try-catch blocks in every controller
 */

const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
