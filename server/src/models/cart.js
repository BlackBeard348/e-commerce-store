import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    qty: { type: Number, required: true, min: 1 },
    addedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    ownerType: { type: String, enum: ["guest", "user"], required: true },
    ownerId: { type: String, required: true },
    items: { type: [cartItemSchema], default: [] }
  },
  { timestamps: true }
);

cartSchema.index({ ownerType: 1, ownerId: 1 }, { unique: true });

export const Cart = mongoose.model("Cart", cartSchema);
