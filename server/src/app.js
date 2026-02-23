import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { optionalAuth } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { traceIdMiddleware } from "./middleware/trace-id.js";
import { createAuthRouter } from "./routes/auth.js";
import { createCartRouter } from "./routes/cart.js";
import { createCheckoutRouter, createWebhookRouter } from "./routes/checkout.js";
import { createOrdersRouter } from "./routes/orders.js";
import { createProductsRouter } from "./routes/products.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(traceIdMiddleware);
  app.use(optionalAuth);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/products", createProductsRouter());
  app.use("/api/auth", createAuthRouter());
  app.use("/api/cart", createCartRouter());
  app.use("/api/checkout", createCheckoutRouter());
  app.use("/api/webhooks", createWebhookRouter());
  app.use("/api/orders", createOrdersRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
