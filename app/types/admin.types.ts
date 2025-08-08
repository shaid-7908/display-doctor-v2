import { Document } from "mongoose";

export interface IAdmin extends Document {
  ad_user_name: string;
  ad_user_email: string;
  ad_user_phone: number;
  ad_user_password: string;
  ad_user_profile?: string;
  ad_role: "super_admin" | "admin";
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
