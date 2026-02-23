import mongoose from "mongoose";
import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error-handler.js";
import { Order } from "../models/order.js";

function toOrderResponse(order) {
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

export function createOrdersRouter() {
  const router = Router();

  router.use(optionalAuth, requireAuth);

  router.get("/", async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit || "10", 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Order.find({ userId: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments({ userId: req.user._id })
    ]);

    res.status(200).json({
      items: items.map(toOrderResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  });

  router.get("/:id", async (req, res) => {
    const id = String(req.params.id || "");
    const filters = { userId: req.user._id };

    if (mongoose.isValidObjectId(id)) {
      filters._id = id;
    } else {
      filters.orderNumber = id;
    }

    const order = await Order.findOne(filters);
    if (!order) {
      throw new AppError("NOT_FOUND", "Order not found", 404);
    }

    res.status(200).json(toOrderResponse(order));
  });

  return router;
}
