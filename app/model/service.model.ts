import { Schema, model } from "mongoose";
import { ServiceCategoryDocument, ServiceSubCategoryDocument } from "../types/serviceAndSkill.types";

const serviceCategorySchema = new Schema<ServiceCategoryDocument>({
    name: { type: String, required: true },
    description: { type: String, required: true },
    is_active: { type: Boolean, default: true },
});


export const ServiceCategoryModel = model<ServiceCategoryDocument>("serviceCategories", serviceCategorySchema);

const serviceSubCategorySchema = new Schema<ServiceSubCategoryDocument>({
    service_category: { type: Schema.Types.ObjectId, ref: "serviceCategories", required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    is_active: { type: Boolean, default: true },
    required_skills: { type: [Schema.Types.ObjectId], ref: "skills", required: true },
});

export const ServiceSubCategoryModel = model<ServiceSubCategoryDocument>("serviceSubCategories", serviceSubCategorySchema);