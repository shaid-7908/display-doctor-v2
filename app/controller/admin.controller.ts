import { asyncHandler } from "../utils/async.hadler";
import { Request, Response } from "express";
import { sendError, sendSuccess } from "../utils/unified.response";
import STATUS_CODES from "../utils/status.codes";
import { UserModel } from "../model/user.model";
import { hashPassword } from "../utils/hash.password";
import { sendCallerRegistrationEmail, sendTechnicianRegistrationEmail } from "../utils/email.service";
import { ServiceCategoryModel, ServiceSubCategoryModel } from "../model/service.model";
import { z } from "zod";
import { SkillModel } from "../model/skill.model";
import path from "path";
import AddressProofModel from "../model/address_proof.model";
import TechnicianToServiceModel from "../model/technicianToService.model";
import { IssueReportModel } from "../model/issuereport.model";
import mongoose from "mongoose";
import { IssueModel } from "../model/issue.model";



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
        const { firstName, lastName, email, phone, dateOfBirth, aadhaarNumber, city, state, pinCode, specialization, experienceLevel, service_category, sub_categories, licenseNumber, role, fatherName, addressLine1, aadhaarPhotoUrl, profilePhotoUrl } = req.body;

        

        

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
            profileImage: profilePhotoUrl
        });

        const savedTechnician = await newTechnician.save();
        const addressProof = new AddressProofModel({
            userId: savedTechnician._id,
            aadhaarNumber,
            city,
            state,
            pin_code: pinCode,
            adhar_front_image: aadhaarPhotoUrl,
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
        const technicians = await UserModel.aggregate([
            {
                $match: {
                    role: "technician"
                }
            },
            {
                $lookup: {
                    from: "address_proofs",
                    localField: "_id",
                    foreignField: "userId",
                    as: "addressProof"
                }
            },
            {
                $lookup: {
                    from: "technician_to_service_relations",
                    localField: "_id",
                    foreignField: "technicianId",
                    as: "technicianToServiceRelation"
                }
            },
            { $unwind: "$addressProof" },
            { $unwind: "$technicianToServiceRelation" },

            {
                $lookup: {
                    from: "servicecategories",
                    localField: "technicianToServiceRelation.parent_serviceId",
                    foreignField: "_id",
                    as: "serviceCategory"
                }
            },
            {
                $unwind: "$serviceCategory"
            },
            {
                $project: {
                    _id: 1,
                    firstName: 1,
                    lastName: 1,
                    email: 1,
                    phone: 1,
                    profileImage: 1,
                    status: 1,
                    isVerified: 1,
                    "addressProof.aadhaar_number": 1,
                    "addressProof.city": 1,
                    "addressProof.state": 1,
                    "addressProof.pin_code": 1,
                    "addressProof.adhar_front_image": 1,
                    "addressProof.son_or_daughter_of": 1,
                    "addressProof.address_line_1": 1,
                    "technicianToServiceRelation.parent_serviceId": 1,
                    "technicianToServiceRelation.sub_serviceId": 1,
                    "technicianToServiceRelation.human_redable_id": 1,
                    "serviceCategory.name": 1,
                    "serviceCategory.description": 1,
                    "serviceCategory.is_active": 1,
                    "serviceCategory.createdAt": 1,
                }
            }
        ])
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

    renderIssueReportPage = asyncHandler(async (req: Request, res: Response) => {
        res.render('issue-report-page', { default_user: req.user })
    })

    getIssueReports = asyncHandler(async (req, res) => {
        const issueReports = await IssueReportModel.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'technicianId',
                    foreignField: '_id',
                    as: 'submitted_by'
                }
            },
            { $unwind: '$submitted_by' },
            {
                $project: {
                    "submitted_by.password": 0,
                    "submitted_by.createdAt": 0,
                    "submitted_by.__v": 0,
                    "submitted_by.updatedAt": 0,
                    "submitted_by.dateOfBirth": 0
                }
            }
        ])
        return sendSuccess(res, 'Issue reports fetched Successfully', issueReports, STATUS_CODES.OK)
    })

    getIssueReportById = asyncHandler(async (req, res) => {
        const reportId = req.params.id
        const fullReport = await IssueReportModel.aggregate([
            {
                $match: { "_id": new mongoose.Types.ObjectId(reportId) }
            },
            {
                $lookup: {
                    from: 'issues',
                    localField: 'issue_id',
                    foreignField: '_id',
                    as: 'issue_details'
                }
            },
            { $unwind: "$issue_details" }
        ])
        return sendSuccess(res, "Full Issue details", fullReport, STATUS_CODES.OK)
    })

    submitQuotation = asyncHandler(async (req, res) => {
        const reportId = req.body.reportId
        const initialQuotation = Number(req.body.initialQuotation)
        const finalQuotation = Number(req.body.finalQuotation)
        let quotationType = ""
        if (finalQuotation === 0) quotationType = "initial"
        else if (finalQuotation > 0) quotationType = "final"
        else if (initialQuotation === 0 && finalQuotation === 0) quotationType = "none"
        else if (finalQuotation > 0 && initialQuotation > 0) quotationType = "final"
        const report = await IssueReportModel.findOne({ _id: reportId })
        if (!report) {
            return sendError(res, "Report not found", null, STATUS_CODES.NOT_FOUND)
        }
        const updatedReport = await IssueReportModel.findByIdAndUpdate(reportId, { $set: { initialQuotation: initialQuotation, finalQuotation: finalQuotation, quotation_type: quotationType, is_approved: true } }, { new: true })
        if (!updatedReport) {
            return sendError(res, "Failed to update quotation", null, STATUS_CODES.INTERNAL_SERVER_ERROR)
        }
        const issue_id = updatedReport.issue_id
        await IssueModel.findByIdAndUpdate(issue_id, { $set: { status: 'in_progress' } })
        console.log('yup')
        return sendSuccess(res, "Quotation submitted successfully", updatedReport, STATUS_CODES.ACCEPTED)
    })

    renderCallerListPage = asyncHandler(async (req: Request, res: Response) => {
        res.render("caller-list", { default_user: req.user });
    })

    getCallers = asyncHandler(async (req: Request, res: Response) => {
        const callers = await UserModel.find({ role: 'caller' }).select('_id firstName lastName email phone profileImage dateOfBirth role status isVerified');
        return sendSuccess(res, "Callers fetched successfully", callers, STATUS_CODES.OK);
    })

    deactivateTechnician = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const technician = await UserModel.findById(id);
        if (!technician) {
            return sendError(res, "Technician not found", null, STATUS_CODES.NOT_FOUND);
        }
        technician.status = "inactive";
        await technician.save();
        return sendSuccess(res, "Technician status changed successfully", null, STATUS_CODES.OK);
    })
    reactivateTechnician = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const technician = await UserModel.findById(id);
        if (!technician) {
            return sendError(res, "Technician not found", null, STATUS_CODES.NOT_FOUND);
        }
        technician.status = "active";
        await technician.save();
        return sendSuccess(res, "Technician status changed successfully", null, STATUS_CODES.OK);
    })

    renderEditTechnicianPage = asyncHandler(async (req: Request, res: Response)=>{

        const technician_id = req.params.id

        const technician_details = await TechnicianToServiceModel.aggregate([
            {$match:{human_redable_id:technician_id}},
            {$lookup:{
                from:'users',
                localField:'technicianId',
                foreignField:'_id',
                as:'technicianDetails'
            }},
            {$unwind:'$technicianDetails'},
            {$lookup:{
                from:'address_proofs',
                localField:'technicianId',
                foreignField:'userId',
                as:'address_proof'
            }},
            {$unwind:'$address_proof'},
            {$project:{
                'technicianDetails.password':0
            }}
        ])
        res.render("edit-technician-page", { default_user: req.user ,technician:technician_details[0] })

    })

    updateTechnician = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { 
            firstName, 
            lastName, 
            email, 
            phone, 
            dateOfBirth, 
            aadhaarNumber, 
            city, 
            state, 
            pinCode, 
            fatherName, 
            addressLine1, 
            status 
        } = req.body;

        try {
            // Find the technician by human_readable_id
            const technicianToService = await TechnicianToServiceModel.findOne({ human_redable_id: id });
            if (!technicianToService) {
                return sendError(res, "Technician not found", null, STATUS_CODES.NOT_FOUND);
            }

            // Update user details
            const updatedUser = await UserModel.findByIdAndUpdate(
                technicianToService.technicianId,
                {
                    firstName,
                    lastName,
                    email,
                    phone,
                    dateOfBirth: dateOfBirth || null,
                    status
                },
                { new: true }
            );

            if (!updatedUser) {
                return sendError(res, "User not found", null, STATUS_CODES.NOT_FOUND);
            }

            // Update address proof details
            await AddressProofModel.findOneAndUpdate(
                { userId: technicianToService.technicianId },
                {
                    adhar_number: aadhaarNumber,
                    city,
                    state,
                    pin_code: pinCode,
                    son_or_daughter_of: fatherName,
                    address_line_1: addressLine1
                },
                { new: true }
            );

            return sendSuccess(res, "Technician updated successfully", null, STATUS_CODES.OK);

        } catch (error) {
            console.error("Error updating technician:", error);
            return sendError(res, "Failed to update technician", null, STATUS_CODES.INTERNAL_SERVER_ERROR);
        }
    })

    getTechnicianServiceInfo = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        try {
            const technicianServiceInfo = await TechnicianToServiceModel.aggregate([
                { $match: { human_redable_id: id } },
                {
                    $lookup: {
                        from: 'servicecategories',
                        localField: 'parent_serviceId',
                        foreignField: '_id',
                        as: 'serviceCategory'
                    }
                },
                { $unwind: '$serviceCategory' },
                {
                    $lookup: {
                        from: 'servicesubcategories',
                        localField: 'sub_serviceId',
                        foreignField: '_id',
                        as: 'subCategories'
                    }
                }
            ]);

            if (!technicianServiceInfo || technicianServiceInfo.length === 0) {
                return sendError(res, "Technician service information not found", null, STATUS_CODES.NOT_FOUND);
            }

            const data = {
                serviceCategory: technicianServiceInfo[0].serviceCategory,
                subCategories: technicianServiceInfo[0].subCategories
            };

            return sendSuccess(res, "Service information retrieved successfully", data, STATUS_CODES.OK);

        } catch (error) {
            console.error("Error fetching technician service info:", error);
            return sendError(res, "Failed to fetch service information", null, STATUS_CODES.INTERNAL_SERVER_ERROR);
        }
    })

}

const adminController = new AdminController();

export default adminController;