import { Schema, model } from "mongoose";
import { SkillDocument } from "../types/serviceAndSkill.types";

const skillSchema = new Schema<SkillDocument>({
    name: { type: String, required: true },
    description: { type: String, required: true },
    is_active: { type: Boolean, default: true },
    recommended_categories: { type: [Schema.Types.ObjectId], ref: "serviceCategories", required: true },
});

export const SkillModel = model<SkillDocument>("skills", skillSchema);