import mongoose from "mongoose";
import { Router } from "express";
import { ensureGuestId, optionalAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error-handler.js";
import { assertPositiveInteger, requireFields } from "../middleware/validate.js";
import { Cart } from "../models/cart.js";
import { Product } from "../models/product.js";

function ownerFromRequest(req, res) {
  if (req.user) {
    return { ownerType: "user", ownerId: String(req.user._id) };
  }

  const guestId = ensureGuestId(req, res);
  return { ownerType: "guest", ownerId: guestId };
}

async function getOrCreateCart(ownerType, ownerId) {
  let cart = await Cart.findOne({ ownerType, ownerId });
  if (!cart) {
    cart = await Cart.create({ ownerType, ownerId, items: [] });
  }
  return cart;
}

async function enrichCart(cart) {
  const productIds = cart.items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds }, active: true });
  const productById = new Map(products.map((product) => [String(product._id), product]));

  const items = cart.items
    .map((item) => {
      const product = productById.get(String(item.productId));
      if (!product) {
        return null;
      }
      return {
        productId: String(item.productId),
        qty: item.qty,
        name: product.name,
        priceCents: product.priceCents,
        stockStatus: product.stockStatus,
        image: product.images?.[0] || null
      };
    })
    .filter(Boolean);

  const subtotalCents = items.reduce((sum, item) => sum + item.priceCents * item.qty, 0);

  return {
    id: String(cart._id),
    ownerType: cart.ownerType,
    items,
    totals: {
      subtotalCents,
      itemCount: items.reduce((sum, item) => sum + item.qty, 0)
    },
    updatedAt: cart.updatedAt
  };
}

export function createCartRouter() {
  const router = Router();

  router.use(optionalAuth);

  router.get("/", async (req, res) => {
    const owner = ownerFromRequest(req, res);
    const cart = await getOrCreateCart(owner.ownerType, owner.ownerId);
    res.status(200).json(await enrichCart(cart));
  });

  router.post("/items", async (req, res) => {
    requireFields(req.body, ["productId", "qty"]);
    const productId = String(req.body.productId || "");
    const qty = assertPositiveInteger(req.body.qty, "qty");

    if (!mongoose.isValidObjectId(productId)) {
      throw new AppError("VALIDATION_ERROR", "Invalid productId", 400, { field: "productId" });
    }

    const product = await Product.findOne({ _id: productId, active: true });
    if (!product) {
      throw new AppError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    const owner = ownerFromRequest(req, res);
    const cart = await getOrCreateCart(owner.ownerType, owner.ownerId);
    const existing = cart.items.find((item) => String(item.productId) === productId);

    if (existing) {
      existing.qty += qty;
    } else {
      cart.items.push({ productId, qty });
    }

    await cart.save();
    res.status(200).json(await enrichCart(cart));
  });

  router.patch("/items/:productId", async (req, res) => {
    requireFields(req.body, ["qty"]);
    const productId = String(req.params.productId || "");
    const qty = assertPositiveInteger(req.body.qty, "qty");

    if (!mongoose.isValidObjectId(productId)) {
      throw new AppError("VALIDATION_ERROR", "Invalid productId", 400, { field: "productId" });
    }

    const owner = ownerFromRequest(req, res);
    const cart = await getOrCreateCart(owner.ownerType, owner.ownerId);
    const existing = cart.items.find((item) => String(item.productId) === productId);

    if (!existing) {
      throw new AppError("NOT_FOUND", "Cart item not found", 404);
    }

    existing.qty = qty;
    await cart.save();

    res.status(200).json(await enrichCart(cart));
  });

  router.delete("/items/:productId", async (req, res) => {
    const productId = String(req.params.productId || "");
    if (!mongoose.isValidObjectId(productId)) {
      throw new AppError("VALIDATION_ERROR", "Invalid productId", 400, { field: "productId" });
    }

    const owner = ownerFromRequest(req, res);
    const cart = await getOrCreateCart(owner.ownerType, owner.ownerId);
    cart.items = cart.items.filter((item) => String(item.productId) !== productId);
    await cart.save();

    res.status(200).json(await enrichCart(cart));
  });

  return router;
}
