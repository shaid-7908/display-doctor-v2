import mongoose, { Schema, model } from "mongoose";
import { UserDocument } from "../types/user.types";
import { z } from "zod";

export const userSchemaValidation = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
  profileImage: z.string().url("Invalid URL").optional(),
  dateOfBirth: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  refreshToken: z.string().optional(),
  googleId: z.string().optional(),
  role: z
    .enum(["admin", "caller", "manager", "technician", "customer"])
    .optional(),
  isVerified: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof userSchemaValidation>;

const userSchema = new Schema<UserDocument>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    profileImage: { type: String },
    dateOfBirth: { type: Date },
    password: { type: String, required: true },
    refreshToken: { type: String },
    googleId: { type: String },
    role: {
      type: String,
      enum: ["admin", "caller", "manager", "technician", "customer"],
      default: "customer",
    },
    isVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const UserModel = model<UserDocument>("User", userSchema);
