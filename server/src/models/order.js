import mongoose from "mongoose";

const lineItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    unitPriceCents: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const totalsSchema = new mongoose.Schema(
  {
    subtotalCents: { type: Number, required: true, min: 0 },
    shippingCents: { type: Number, required: true, min: 0 },
    taxCents: { type: Number, required: true, min: 0 },
    totalCents: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const shippingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    postcode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, default: "mockpay" },
    providerRef: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed"],
      default: "pending"
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["created", "paid", "fulfilled", "cancelled"],
      default: "created"
    },
    lineItems: { type: [lineItemSchema], required: true },
    totals: { type: totalsSchema, required: true },
    shippingAddress: { type: shippingSchema, required: true },
    payment: { type: paymentSchema, required: true },
    idempotencyKey: { type: String, required: true }
  },
  { timestamps: true }
);

orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });

export const Order = mongoose.model("Order", orderSchema);
