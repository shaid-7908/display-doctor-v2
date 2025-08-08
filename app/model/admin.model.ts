import { Schema, model } from "mongoose";
import { IAdmin } from "../types/admin.types";

const adminSchema = new Schema<IAdmin>(
  {
    ad_user_name: {
      type: String,
      required: true,
    },
    ad_user_email: {
      type: String,
      required: true,
      unique: true,
    },
    ad_user_phone: {
      type: Number,
      required: true,
    },
    ad_user_password: {
      type: String,
      required: true,
    },
    ad_user_profile: {
      type: String,
    },
    ad_role: {
      type: String,
      enum: ["super_admin", "admin"],
      default: "admin",
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const AdminModel = model<IAdmin>("Admin", adminSchema);
