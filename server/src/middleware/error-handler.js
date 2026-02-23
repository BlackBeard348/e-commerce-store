export class AppError extends Error {
  constructor(code, message, statusCode = 500, details = {}) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(req, _res, next) {
  next(new AppError("NOT_FOUND", `Route not found: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(err, req, res, _next) {
  void _next;
  const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  const code = err?.code || "INTERNAL_ERROR";
  const message = err?.message || "Unexpected server error";
  const details = err?.details || {};

  if (statusCode >= 500) {
    console.error({ traceId: req.traceId, code, message, details, stack: err?.stack });
  }

  res.status(statusCode).json({
    code,
    message,
    traceId: req.traceId,
    details
  });
}
