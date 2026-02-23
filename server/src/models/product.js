import mongoose from "mongoose";

const productImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priceCents: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "USD", uppercase: true, trim: true },
    images: { type: [productImageSchema], default: [] },
    category: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    stockStatus: {
      type: String,
      enum: ["in_stock", "out_of_stock"],
      default: "in_stock"
    }
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text" });
productSchema.index({ active: 1, category: 1, priceCents: 1 });

export const Product = mongoose.model("Product", productSchema);
