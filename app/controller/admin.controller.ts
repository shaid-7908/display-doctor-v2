import { asyncHandler } from "../utils/async.hadler";
import { Request, Response } from "express";
import { sendError, sendSuccess } from "../utils/unified.response";
import STATUS_CODES from "../utils/status.codes";
import { UserModel } from "../model/user.model";
import { hashPassword } from "../utils/hash.password";
import { sendCallerRegistrationEmail ,sendTechnicianRegistrationEmail } from "../utils/email.service";
import { ServiceCategoryModel, ServiceSubCategoryModel } from "../model/service.model";
import { z } from "zod";
import { SkillModel } from "../model/skill.model";
import path from "path";
import AddressProofModel from "../model/address_proof.model";
import TechnicianToServiceModel from "../model/technicianToService.model";



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
            return sendError(res, "Caller with this email already exists", null, STATUS_CODES.BAD_REQUEST);
        }
        const password = Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 1000);
        const hashedPassword = await hashPassword(password);
        const newCaller = new UserModel({ firstName, lastName, email, phone, dateOfBirth, role, password: hashedPassword });
        await newCaller.save();
        const emailSent = await sendCallerRegistrationEmail(email, firstName, email, password);
        if (emailSent) {
            return sendSuccess(res, "Caller created successfully", null, STATUS_CODES.CREATED);
        } else {
            return sendError(res, "Failed to send email", null, STATUS_CODES.BAD_REQUEST);
        }
    })


    //technician controller ===================================================================================

    renderCreateTechnician = asyncHandler(async (req: Request, res: Response) => {
        const serviceCategories = await ServiceCategoryModel.find({ is_active: true });
        res.render("createtechnician", { default_user: req.user, serviceCategories });
    })

    createTechnician = asyncHandler(async (req: Request, res: Response) => {
        const { firstName, lastName, email, phone, dateOfBirth, aadhaarNumber, city, state, pinCode, specialization, experienceLevel,service_category,sub_categories, licenseNumber, role,fatherName ,addressLine1} = req.body;

        // Handle file uploads with proper typing
        let aadhaarPhoto: Express.Multer.File | undefined;
        let profilePhoto: Express.Multer.File | undefined;

        if (req.files && typeof req.files === 'object') {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            if (files.aadhaarPhoto && files.aadhaarPhoto.length > 0) {
                aadhaarPhoto = files.aadhaarPhoto[0];
            }
            if (files.profilePhoto && files.profilePhoto.length > 0) {
                profilePhoto = files.profilePhoto[0];
            }
        }

        if (!aadhaarPhoto || !profilePhoto) {
            return sendError(res, "Aadhaar photo and profile photo are required", null, STATUS_CODES.BAD_REQUEST);
        }

        const aadhaarPhotoPath = path.join(__dirname, "../../uploads", aadhaarPhoto.filename);
        const profilePhotoPath = path.join(__dirname, "../../uploads", profilePhoto.filename);

        const existingTechnician = await UserModel.findOne({ email });
        if (existingTechnician) {
            return sendError(res, "Technician with this email already exists", null, STATUS_CODES.BAD_REQUEST);
        }

        const password = Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 1000);
        const hashedPassword = await hashPassword(password);

        // Create new technician with all the new fields
        const newTechnician = new UserModel({
            firstName,
            lastName,
            email,
            phone,
            dateOfBirth,
            role,
            password: hashedPassword,
            profileImage: profilePhoto.filename
        });

        const savedTechnician = await newTechnician.save();
        const addressProof = new AddressProofModel({
            userId: savedTechnician._id,
            aadhaarNumber,
            city,
            state,
            pin_code: pinCode,
            adhar_front_image: aadhaarPhoto.filename,
            son_or_daughter_of: fatherName,
            address_line_1: addressLine1
        }); 
        await addressProof.save();
        const newTechnicianCode = await TechnicianToServiceModel.generateTechnicianUniqueCode();
        const arrayOfSubCategories = sub_categories.split(",");
        const newTechnicianToService = new TechnicianToServiceModel({
            technicianId: savedTechnician._id,
            parent_serviceId: service_category,
            sub_serviceId: arrayOfSubCategories,
            human_redable_id: newTechnicianCode
        });
        await newTechnicianToService.save();
        const emailSent = await sendTechnicianRegistrationEmail(savedTechnician.email, savedTechnician.firstName, savedTechnician.email, password);
        if (emailSent) {
            return sendSuccess(res, "Technician created successfully", null, STATUS_CODES.CREATED);
        } else {
            return sendError(res, "Failed to send email", null, STATUS_CODES.BAD_REQUEST)
        }
       
    })

    renderTechnicianList = asyncHandler(async (req: Request, res: Response) => {
        const technicians = await UserModel.find({ role: "technician" });
        res.render("technicianlistpage", { default_user: req.user, technicians });
    })

    renderCreateSpecialization = asyncHandler(async (req: Request, res: Response) => {
        res.render("createspecialization", { default_user: req.user });
    })


    //skill controller
    renderCreateSkill = asyncHandler(async (req: Request, res: Response) => {
        if (req.user.role !== "admin") {
            return sendError(res, "You are not authorized to create skill", null, STATUS_CODES.FORBIDDEN);
        }
        const serviceCategories = await ServiceCategoryModel.find({ is_active: true });
        const skills = await SkillModel.find({ is_active: true });
        res.render("createskill", { default_user: req.user, serviceCategories, skills });
    })
    createSkill = asyncHandler(async (req: Request, res: Response) => {
        const parsed = skillSchemaValidation.safeParse(req.body);
        if (!parsed.success) {
            return sendError(res, "Invalid request body", null, STATUS_CODES.BAD_REQUEST);
        }
        const { name, description, recommended_categories } = parsed.data;
        const newSkill = new SkillModel({ name, description, recommended_categories });
        await newSkill.save();
        return sendSuccess(res, "Skill created successfully", null, STATUS_CODES.CREATED);
    })
    getSkills = asyncHandler(async (req: Request, res: Response) => {
        const { limit, offset } = req.query;
        const skills = await SkillModel.find({ is_active: true }).skip(Number(offset)).limit(Number(limit));
        return sendSuccess(res, "Skills fetched successfully", skills, STATUS_CODES.OK);
    })
    renderGetSkillsListPage = asyncHandler(async (req: Request, res: Response) => {
        const skills = await SkillModel.aggregate([

            { $unwind: "$recommended_categories" },
            {
                $lookup: {
                    from: "servicecategories",
                    localField: "recommended_categories",
                    foreignField: "_id",
                    as: "categories"
                }
            },

            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    categories: 1,
                    is_active: 1
                }
            }
        ]).sort({ createdAt: -1 });
        res.render("skilllistpage", { default_user: req.user, skills });
    })

    //service category controller ===================================================================================
    renderCreateServiceCategory = asyncHandler(async (req: Request, res: Response) => {
        const serviceCategories = await ServiceCategoryModel.find({});
        res.render("createservicecategory", { default_user: req.user, serviceCategories });
    })

    createServiceCategory = asyncHandler(async (req: Request, res: Response) => {
        const parsed = serviceCategorySchemaValidation.safeParse(req.body);
        if (!parsed.success) {
            return sendError(res, "Invalid request body", null, STATUS_CODES.BAD_REQUEST);
        }
        const { name, description } = parsed.data;
        const newServiceCategory = new ServiceCategoryModel({ name, description });
        await newServiceCategory.save();
        return sendSuccess(res, "Service category created successfully", null, STATUS_CODES.CREATED);
    })
    getServiceCategories = asyncHandler(async (req: Request, res: Response) => {
        if (req.user.role !== "admin") {
            return sendError(res, "You are not authorized to get service categories", null, STATUS_CODES.FORBIDDEN);
        }
        const serviceCategories = await ServiceCategoryModel.find({ is_active: true });
        return sendSuccess(res, "Service categories fetched successfully", serviceCategories, STATUS_CODES.OK);
    })
    deleteServiceCategory = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        if (req.user.role !== "admin") {
            return sendError(res, "You are not authorized to delete service category", null, STATUS_CODES.FORBIDDEN);
        }
        await ServiceCategoryModel.findByIdAndDelete(id);
        return sendSuccess(res, "Service category deleted successfully", null, STATUS_CODES.OK);
    })

    renderCreateServiceSubCategory = asyncHandler(async (req: Request, res: Response) => {
        if (req.user.role !== "admin") {
            return sendError(res, "You are not authorized to create service sub category", null, STATUS_CODES.FORBIDDEN);
        }

        const serviceCategories = await ServiceCategoryModel.find({});
        res.render("createservicesubcategory", { default_user: req.user, serviceCategories });
    })

    // Get recommended skills by service category
    getSkillsByServiceCategory = asyncHandler(async (req: Request, res: Response) => {
        if (req.user.role !== "admin") {
            return sendError(res, "You are not authorized to get skills", null, STATUS_CODES.FORBIDDEN);
        }

        const { service_id } = req.query;

        if (!service_id) {
            return sendError(res, "Service category ID is required", null, STATUS_CODES.BAD_REQUEST);
        }

        // Find skills that are recommended for this service category
        const skills = await SkillModel.find({
            is_active: true,
            recommended_categories: service_id
        }).select('_id name description');

        return sendSuccess(res, "Skills fetched successfully", skills, STATUS_CODES.OK);
    })

    getSubCategoriesByServiceCategory = asyncHandler(async (req: Request, res: Response) => {
        const { service_id } = req.params;
        const subCategories = await ServiceSubCategoryModel.find({ service_category: service_id, is_active: true });
        return sendSuccess(res, "Sub categories fetched successfully", subCategories, STATUS_CODES.OK);
    })



    createServiceSubCategory = asyncHandler(async (req: Request, res: Response) => {
        console.log(req.body);
        const { name, description, required_skills, is_active, service_category } = req.body;
        const newServiceSubCategory = new ServiceSubCategoryModel({ name, description, required_skills, is_active, service_category });
        await newServiceSubCategory.save();
        return sendSuccess(res, "Service sub category created successfully", null, STATUS_CODES.CREATED);
    })

}

const adminController = new AdminController();

export default adminController;