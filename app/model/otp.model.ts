import { Schema, model } from "mongoose";

const otpSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      requied: true,
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: { type: Date, default: Date.now, expires: "15m" },
  },
  { timestamps: true }
);

export const OtpModel = model("Otp", otpSchema);
