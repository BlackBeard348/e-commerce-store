import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error-handler.js";
import { requireFields } from "../middleware/validate.js";
import { Cart } from "../models/cart.js";
import { Order } from "../models/order.js";
import { PaymentEvent } from "../models/payment-event.js";
import { Product } from "../models/product.js";

function assertShippingAddress(shippingAddress) {
  requireFields(shippingAddress, ["name", "line1", "city", "postcode", "country"]);
  const postcode = String(shippingAddress.postcode || "").trim();
  const country = String(shippingAddress.country || "").trim();

  if (postcode.length < 3 || postcode.length > 12) {
    throw new AppError("VALIDATION_ERROR", "Invalid postcode", 400, { field: "shippingAddress.postcode" });
  }

  if (country.length !== 2 && country.length !== 3) {
    throw new AppError("VALIDATION_ERROR", "Country must be ISO 2/3 code", 400, {
      field: "shippingAddress.country"
    });
  }

  return {
    name: String(shippingAddress.name).trim(),
    line1: String(shippingAddress.line1).trim(),
    city: String(shippingAddress.city).trim(),
    postcode,
    country: country.toUpperCase()
  };
}

function orderToResponse(order) {
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    status: order.status,
    lineItems: order.lineItems,
    totals: order.totals,
    shippingAddress: order.shippingAddress,
    payment: order.payment,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

async function getUserCart(userId) {
  let cart = await Cart.findOne({ ownerType: "user", ownerId: String(userId) });
  if (!cart) {
    cart = await Cart.create({ ownerType: "user", ownerId: String(userId), items: [] });
  }
  return cart;
}

async function buildLineItems(cart) {
  if (cart.items.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Cart is empty", 400);
  }

  const productIds = cart.items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds }, active: true });
  const productsById = new Map(products.map((product) => [String(product._id), product]));

  const lineItems = [];
  for (const item of cart.items) {
    const product = productsById.get(String(item.productId));
    if (!product || product.stockStatus === "out_of_stock") {
      throw new AppError("OUT_OF_STOCK", "One or more cart items are unavailable", 400, {
        productId: String(item.productId)
      });
    }

    lineItems.push({
      productId: item.productId,
      name: product.name,
      unitPriceCents: product.priceCents,
      qty: item.qty
    });
  }

  return lineItems;
}

function totalsFromLineItems(lineItems) {
  const subtotalCents = lineItems.reduce((sum, item) => sum + item.unitPriceCents * item.qty, 0);
  const shippingCents = subtotalCents >= 10000 ? 0 : 799;
  const taxCents = Math.round(subtotalCents * 0.08);
  const totalCents = subtotalCents + shippingCents + taxCents;

  return { subtotalCents, shippingCents, taxCents, totalCents };
}

function generateOrderNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `ORD-${stamp}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export function createCheckoutRouter() {
  const router = Router();
  router.use(optionalAuth);

  router.post("/", requireAuth, async (req, res) => {
    const idempotencyKey = String(req.header("Idempotency-Key") || "").trim();
    if (!idempotencyKey) {
      throw new AppError("VALIDATION_ERROR", "Idempotency-Key header is required", 400);
    }

    requireFields(req.body, ["shippingAddress"]);
    const shippingAddress = assertShippingAddress(req.body.shippingAddress);

    const existingOrder = await Order.findOne({ userId: req.user._id, idempotencyKey });
    if (existingOrder) {
      return res.status(200).json({
        order: orderToResponse(existingOrder),
        checkoutUrl: `https://mockpay.local/checkout/${existingOrder.orderNumber}`,
        idempotentReplay: true
      });
    }

    const cart = await getUserCart(req.user._id);
    const lineItems = await buildLineItems(cart);
    const totals = totalsFromLineItems(lineItems);

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      userId: req.user._id,
      status: "created",
      lineItems,
      totals,
      shippingAddress,
      payment: {
        provider: "mockpay",
        providerRef: `sess_${randomUUID().replace(/-/g, "")}`,
        status: "pending"
      },
      idempotencyKey
    });

    res.status(201).json({
      order: orderToResponse(order),
      checkoutUrl: `https://mockpay.local/checkout/${order.orderNumber}`,
      idempotentReplay: false
    });
  });

  return router;
}

export function createWebhookRouter() {
  const router = Router();

  router.post("/payment", async (req, res) => {
    const signature = req.header("x-webhook-signature");
    const expected = process.env.WEBHOOK_SECRET || "dev-webhook-secret";
    if (!signature || signature !== expected) {
      throw new AppError("UNAUTHORIZED", "Invalid webhook signature", 401);
    }

    requireFields(req.body, ["providerEventId", "orderId", "eventType"]);

    const providerEventId = String(req.body.providerEventId);
    const orderId = String(req.body.orderId);
    const eventType = String(req.body.eventType);

    if (!mongoose.isValidObjectId(orderId)) {
      throw new AppError("VALIDATION_ERROR", "Invalid orderId", 400, { orderId });
    }

    const duplicate = await PaymentEvent.findOne({ providerEventId });
    if (duplicate) {
      return res.status(200).json({ processed: true, duplicate: true });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError("NOT_FOUND", "Order not found", 404);
    }

    if (eventType === "payment.succeeded") {
      order.payment.status = "succeeded";
      order.status = "paid";
    } else if (eventType === "payment.failed") {
      order.payment.status = "failed";
    }

    await order.save();

    await PaymentEvent.create({
      providerEventId,
      orderId: order._id,
      eventType,
      payload: req.body
    });

    res.status(200).json({ processed: true, duplicate: false });
  });

  return router;
}
