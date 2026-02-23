import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { AppError } from "./error-handler.js";
import { User } from "../models/user.js";

const COOKIE_NAME = "authToken";
const GUEST_COOKIE_NAME = "guestId";

export function getJwtSecret() {
  return process.env.JWT_SECRET || "dev-insecure-jwt-secret";
}

export function createAuthToken(user) {
  const secret = getJwtSecret();
  return jwt.sign(
    {
      sub: String(user._id),
      roles: user.roles,
      email: user.email,
      passwordChangedAt: user.passwordChangedAt ? user.passwordChangedAt.getTime() : 0
    },
    secret,
    { expiresIn: "7d" }
  );
}

function readAuthToken(req) {
  const authHeader = req.header("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  return req.cookies?.[COOKIE_NAME] || null;
}

export async function optionalAuth(req, _res, next) {
  const token = readAuthToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.sub);
    if (!user) {
      req.user = null;
      return next();
    }

    const changedAtMs = user.passwordChangedAt ? user.passwordChangedAt.getTime() : 0;
    if ((decoded.passwordChangedAt || 0) < changedAtMs) {
      req.user = null;
      return next();
    }

    req.user = user;
    return next();
  } catch {
    req.user = null;
    return next();
  }
}

export function requireAuth(req, _res, next) {
  if (!req.user) {
    throw new AppError("UNAUTHENTICATED", "Authentication required", 401);
  }
  next();
}

export function requireAdmin(req, _res, next) {
  if (!req.user) {
    throw new AppError("UNAUTHENTICATED", "Authentication required", 401);
  }

  if (!req.user.roles.includes("admin")) {
    throw new AppError("FORBIDDEN", "Admin access required", 403);
  }

  next();
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: false
  });
}

export function ensureGuestId(req, res) {
  const existing = req.cookies?.[GUEST_COOKIE_NAME];
  if (existing) {
    return existing;
  }

  const guestId = randomUUID();
  res.cookie(GUEST_COOKIE_NAME, guestId, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return guestId;
}
