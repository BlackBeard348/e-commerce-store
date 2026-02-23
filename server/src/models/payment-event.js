import mongoose from "mongoose";

const paymentEventSchema = new mongoose.Schema(
  {
    providerEventId: { type: String, required: true, unique: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    eventType: { type: String, required: true },
    payload: { type: Object, default: {} }
  },
  { timestamps: true }
);

paymentEventSchema.index({ providerEventId: 1 }, { unique: true });

export const PaymentEvent = mongoose.model("PaymentEvent", paymentEventSchema);
