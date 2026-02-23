import { Router } from "express";
import mongoose from "mongoose";
import { AppError } from "../middleware/error-handler.js";
import { Product } from "../models/product.js";

const MAX_LIMIT = 60;
const DEFAULT_LIMIT = 12;
const ALLOWED_SORTS = new Set(["newest", "price_asc", "price_desc"]);

function parseIntegerParam(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

function buildSort(sort) {
  if (sort === "price_asc") {
    return { priceCents: 1, _id: 1 };
  }
  if (sort === "price_desc") {
    return { priceCents: -1, _id: 1 };
  }
  return { createdAt: -1, _id: 1 };
}

function productToResponse(product) {
  return {
    id: String(product._id),
    sku: product.sku,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    currency: product.currency,
    category: product.category,
    tags: product.tags,
    featured: product.featured,
    active: product.active,
    stockStatus: product.stockStatus,
    images: product.images,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
}

export function createProductsRouter() {
  const router = Router();

  router.get("/", async (req, res) => {
    const query = (req.query.query || "").trim();
    const category = (req.query.category || "").trim();
    const sort = (req.query.sort || "newest").trim();

    if (!ALLOWED_SORTS.has(sort)) {
      throw new AppError("VALIDATION_ERROR", "Invalid sort value", 400, { sort });
    }

    const page = Math.max(1, parseIntegerParam(req.query.page, 1));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseIntegerParam(req.query.limit, DEFAULT_LIMIT)));
    const minPrice = req.query.minPrice ? parseIntegerParam(req.query.minPrice, NaN) : null;
    const maxPrice = req.query.maxPrice ? parseIntegerParam(req.query.maxPrice, NaN) : null;

    if (Number.isNaN(minPrice) || Number.isNaN(maxPrice)) {
      throw new AppError("VALIDATION_ERROR", "minPrice/maxPrice must be integers", 400, {
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice
      });
    }

    const filters = { active: true };
    if (query) {
      filters.$text = { $search: query };
    }
    if (category) {
      filters.category = category;
    }

    if (minPrice !== null || maxPrice !== null) {
      filters.priceCents = {};
      if (minPrice !== null) {
        filters.priceCents.$gte = minPrice;
      }
      if (maxPrice !== null) {
        filters.priceCents.$lte = maxPrice;
      }
    }

    const skip = (page - 1) * limit;
    const sortSpec = buildSort(sort);

    const [items, total] = await Promise.all([
      Product.find(filters).sort(sortSpec).skip(skip).limit(limit),
      Product.countDocuments(filters)
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.status(200).json({
      items: items.map(productToResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  });

  router.get("/categories", async (_req, res) => {
    const categories = await Product.distinct("category", { active: true });
    categories.sort((a, b) => a.localeCompare(b));
    res.status(200).json({ items: categories });
  });

  router.get("/:id", async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new AppError("VALIDATION_ERROR", "Invalid product id", 400, { id: req.params.id });
    }

    const product = await Product.findOne({ _id: req.params.id, active: true });
    if (!product) {
      throw new AppError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    res.status(200).json(productToResponse(product));
  });

  return router;
}
