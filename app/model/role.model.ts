import { Schema, model } from "mongoose";
import { roleTypes } from "../types/role.types";

const roleSchema = new Schema<roleTypes>({
  name: {
    type: String,
    required: true,
    enum: ["Admin", "Caller", "Manager", "Technician", "Customer"],
  },
});

export const RoleModel = model<roleTypes>("Role", roleSchema);
