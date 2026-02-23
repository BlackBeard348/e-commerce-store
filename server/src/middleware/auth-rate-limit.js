import { createHash } from "node:crypto";
import { AppError } from "./error-handler.js";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 25;
const attempts = new Map();

function anonymize(input) {
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

function keyFor(req) {
  const ip = req.ip || "unknown-ip";
  const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "unknown-email";
  return `${ip}:${email}`;
}

export function authRateLimit(req, _res, next) {
  const now = Date.now();
  const key = keyFor(req);
  const entry = attempts.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now });
    return next();
  }

  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    console.warn({
      traceId: req.traceId,
      event: "auth_rate_limit_exceeded",
      anonIp: anonymize(req.ip || "unknown-ip"),
      anonEmail: anonymize((req.body?.email || "unknown-email").toLowerCase())
    });

    throw new AppError("RATE_LIMITED", "Too many authentication attempts", 429, {
      retryAfterSeconds: Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000)
    });
  }

  next();
}
