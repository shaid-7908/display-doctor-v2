import { asyncHandler } from "../utils/async.hadler";
import { Request, Response } from "express";
import { sendError, sendSuccess } from "../utils/unified.response";
import STATUS_CODES from "../utils/status.codes";
import { UserModel } from "../model/user.model";
import { hashPassword } from "../utils/hash.password";
import { sendCallerRegistrationEmail } from "../utils/email.service";
import { ServiceCategoryModel } from "../model/service.model";
import { z } from "zod";
import { SkillModel } from "../model/skill.model";


const serviceCategorySchemaValidation = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().min(2, "Description must be at least 2 characters"),
})

const skillSchemaValidation = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().min(2, "Description must be at least 2 characters"),
    recommended_categories: z.array(z.string()).optional(),
})

class AdminController {
    renderCreateCaller = asyncHandler(async (req: Request, res: Response) => {

        res.render("createcaller", { default_user: req.user });
    })
    createCaller = asyncHandler(async (req: Request, res: Response) => {
        const { firstName, lastName, email, phone, dateOfBirth, role } = req.body;
        const existingCaller = await UserModel.findOne({ email });
        if (existingCaller) {
            return sendError(res,"Caller with this email already exists",null,STATUS_CODES.BAD_REQUEST);
        }
        const password = Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 1000);
        const hashedPassword = await hashPassword(password);
        const newCaller = new UserModel({ firstName, lastName, email, phone, dateOfBirth, role,password:hashedPassword });
        await newCaller.save();
        const emailSent= await sendCallerRegistrationEmail(email,firstName,email,password);
        if(emailSent){
            return sendSuccess(res,"Caller created successfully",null,STATUS_CODES.CREATED);
        }else{
            return sendError(res,"Failed to send email",null,STATUS_CODES.BAD_REQUEST);
        }
    })

    renderCreateTechnician = asyncHandler(async (req: Request, res: Response) => {
        res.render("createtechnician", { default_user: req.user });
    })



    renderCreateSpecialization = asyncHandler(async (req: Request, res: Response) => {
        res.render("createspecialization", { default_user: req.user });
    })


    //skill controller
    renderCreateSkill = asyncHandler(async (req: Request, res: Response) => {
        if(req.user.role !== "admin"){
            return sendError(res,"You are not authorized to create skill",null,STATUS_CODES.FORBIDDEN);
        }
        const serviceCategories = await ServiceCategoryModel.find({is_active:true});
        const skills = await SkillModel.find({is_active:true});
        res.render("createskill", { default_user: req.user, serviceCategories, skills });
    })
    createSkill = asyncHandler(async (req: Request, res: Response) => {
        const parsed = skillSchemaValidation.safeParse(req.body);
        if (!parsed.success) {
            return sendError(res,"Invalid request body",null,STATUS_CODES.BAD_REQUEST);
        }
        const { name, description, recommended_categories } = parsed.data;
        const newSkill = new SkillModel({ name, description, recommended_categories });
        await newSkill.save();
        return sendSuccess(res,"Skill created successfully",null,STATUS_CODES.CREATED);
    })
    getSkills = asyncHandler(async (req: Request, res: Response) => {
        const {limit,offset} = req.query;
        const skills = await SkillModel.find({is_active:true}).skip(Number(offset)).limit(Number(limit));
        return sendSuccess(res,"Skills fetched successfully",skills,STATUS_CODES.OK);
    })
    renderGetSkillsListPage = asyncHandler(async (req: Request, res: Response) => {
        const skills = await SkillModel.aggregate([
            
            { $unwind: "$recommended_categories" },
            {$lookup:{
                from:"servicecategories",
                localField:"recommended_categories",
                foreignField:"_id",
                as:"categories"
            }},
            
            {$project:{
                _id:1,
                name:1,
                description:1,
                categories:1,
                is_active:1
            }}
        ]).sort({createdAt:-1});
        res.render("skilllistpage", { default_user: req.user, skills });
    })

    //service category controller
    renderCreateServiceCategory = asyncHandler(async (req: Request, res: Response) => {
        const serviceCategories = await ServiceCategoryModel.find({});
        res.render("createservicecategory", { default_user: req.user, serviceCategories });
    })

    createServiceCategory = asyncHandler(async (req: Request, res: Response) => {
        const parsed = serviceCategorySchemaValidation.safeParse(req.body);
        if (!parsed.success) {
            return sendError(res,"Invalid request body",null,STATUS_CODES.BAD_REQUEST);
        }
        const { name, description } = parsed.data;
        const newServiceCategory = new ServiceCategoryModel({ name, description });
        await newServiceCategory.save();
        return sendSuccess(res,"Service category created successfully",null,STATUS_CODES.CREATED);
    })
    getServiceCategories = asyncHandler(async (req: Request, res: Response) => {
        if(req.user.role !== "admin"){
            return sendError(res,"You are not authorized to get service categories",null,STATUS_CODES.FORBIDDEN);
        }
        const serviceCategories = await ServiceCategoryModel.find({is_active:true});
        return sendSuccess(res,"Service categories fetched successfully",serviceCategories,STATUS_CODES.OK);
    })
    deleteServiceCategory = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        if(req.user.role !== "admin"){
            return sendError(res,"You are not authorized to delete service category",null,STATUS_CODES.FORBIDDEN);
        }
        await ServiceCategoryModel.findByIdAndDelete(id);
        return sendSuccess(res,"Service category deleted successfully",null,STATUS_CODES.OK);
    })

    renderCreateServiceSubCategory = asyncHandler(async (req: Request, res: Response) => {
        if(req.user.role !== "admin"){
            return sendError(res,"You are not authorized to create service sub category",null,STATUS_CODES.FORBIDDEN);
        }
        const serviceCategories = await ServiceCategoryModel.find({});
        res.render("createservicesubcategory", { default_user: req.user, serviceCategories });
    })


}

const adminController = new AdminController();

export default adminController;