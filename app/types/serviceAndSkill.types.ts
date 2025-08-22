import { Document,Types } from "mongoose";

export interface ServiceCategoryDocument extends Document{
    name:String;
    description:String;
    is_active:Boolean;
}

export interface ServiceSubCategoryDocument extends Document{
    service_category:Types.ObjectId;
    name:String;
    description:String;
    is_active:Boolean;
    required_skills:Types.ObjectId[];
}


export interface SkillDocument extends Document{
    name:String;
    description:String;
    is_active:Boolean;
    recommended_categories:Types.ObjectId[];
    skill_slug:String;
}
