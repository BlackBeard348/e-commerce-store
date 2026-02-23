import { randomUUID } from "node:crypto";

export function traceIdMiddleware(req, res, next) {
  const traceId = req.header("x-trace-id") || randomUUID();
  req.traceId = traceId;
  res.setHeader("x-trace-id", traceId);
  next();
}
