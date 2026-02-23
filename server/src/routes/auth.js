import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { authRateLimit } from "../middleware/auth-rate-limit.js";
import { AppError } from "../middleware/error-handler.js";
import { assertEmail, assertPassword, requireFields } from "../middleware/validate.js";
import { createAuthToken, clearAuthCookie, optionalAuth, requireAuth, setAuthCookie } from "../middleware/auth.js";
import { User } from "../models/user.js";

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function toAuthPayload(user) {
  return {
    id: String(user._id),
    email: user.email,
    roles: user.roles,
    emailVerified: user.emailVerified
  };
}

export function createAuthRouter() {
  const router = Router();

  router.post("/signup", authRateLimit, async (req, res) => {
    requireFields(req.body, ["email", "password"]);
    const email = assertEmail(req.body.email);
    const password = assertPassword(req.body.password);

    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError("CONFLICT", "Email is already registered", 409, { field: "email" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      passwordHash,
      roles: ["customer"],
      passwordChangedAt: new Date()
    });

    const token = createAuthToken(user);
    setAuthCookie(res, token);

    res.status(201).json({ user: toAuthPayload(user) });
  });

  router.post("/login", authRateLimit, async (req, res) => {
    requireFields(req.body, ["email", "password"]);
    const email = assertEmail(req.body.email);
    const password = String(req.body.password || "");

    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new AppError("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    const token = createAuthToken(user);
    setAuthCookie(res, token);

    res.status(200).json({ user: toAuthPayload(user) });
  });

  router.post("/logout", optionalAuth, (_req, res) => {
    clearAuthCookie(res);
    res.status(200).json({ success: true });
  });

  router.post("/password/forgot", authRateLimit, async (req, res) => {
    requireFields(req.body, ["email"]);
    const email = assertEmail(req.body.email);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ success: true });
    }

    const rawToken = randomBytes(24).toString("hex");
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    // Dev-mode behavior to complete the flow without email provider wiring.
    res.status(200).json({ success: true, resetToken: rawToken });
  });

  router.post("/password/reset", authRateLimit, async (req, res) => {
    requireFields(req.body, ["token", "newPassword"]);
    const token = String(req.body.token || "");
    const newPassword = assertPassword(req.body.newPassword);
    const tokenHash = hashToken(token);

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      throw new AppError("INVALID_TOKEN", "Reset token is invalid or expired", 400);
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordChangedAt = new Date();
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    clearAuthCookie(res);
    res.status(200).json({ success: true });
  });

  router.get("/me", optionalAuth, requireAuth, async (req, res) => {
    res.status(200).json({ user: toAuthPayload(req.user) });
  });

  return router;
}
