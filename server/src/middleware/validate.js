import { AppError } from "./error-handler.js";

export function requireFields(payload, fields) {
  const missing = fields.filter((field) => {
    const value = payload?.[field];
    return value === undefined || value === null || value === "";
  });

  if (missing.length > 0) {
    throw new AppError("VALIDATION_ERROR", "Missing required fields", 400, { missing });
  }
}

export function assertEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
  if (!isValid) {
    throw new AppError("VALIDATION_ERROR", "Invalid email", 400, { field: "email" });
  }
  return normalized;
}

export function assertPassword(password) {
  const value = String(password || "");
  if (value.length < 8 || !/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Password must be at least 8 chars and include letters and numbers",
      400,
      { field: "password" }
    );
  }
  return value;
}

export function assertPositiveInteger(value, fieldName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError("VALIDATION_ERROR", `${fieldName} must be a positive integer`, 400, {
      field: fieldName,
      value
    });
  }
  return parsed;
}
