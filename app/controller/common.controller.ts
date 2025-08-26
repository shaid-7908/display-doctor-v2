import { Request, Response } from "express";
import { IssueModel } from "../model/issue.model";
import { asyncHandler } from "../utils/async.hadler";
import { sendSuccess,sendError } from "../utils/unified.response";
import STATUS_CODES from "../utils/status.codes";
import { ServiceCategoryModel } from "../model/service.model";
import { z } from "zod";

class CommonController {

    renderCreateIssue = asyncHandler(async(req:Request,res:Response)=>{
        const serviceCategories = await ServiceCategoryModel.find({is_active:true});
        res.render("createissue",{default_user:req.user,serviceCategories});
    })
    
    createIssue = asyncHandler(async (req: Request, res: Response) => {

        // Validate request body using the schema from issue model
        const issueData = req.body;

        // Handle file uploads for photos
        let photoUrls: string[] = [];
        if (req.files && typeof req.files === 'object') {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            if (files.photos && files.photos.length > 0) {
                photoUrls = files.photos.map(file => file.filename);
            }
        }

        // Parse nested form data (contact.name, contact.address.line1, etc.)
        const parsedData = {
            contact: {
                name: issueData['contact.name'],
                phone: issueData['contact.phone'],
                email: issueData['contact.email'] || undefined,
                address: {
                    line1: issueData['contact.address.line1'],
                    landmark: issueData['contact.address.landmark'] || undefined,
                    city: issueData['contact.address.city'],
                    state: issueData['contact.address.state'],
                    pinCode: issueData['contact.address.pinCode']
                }
            },
            serviceCategoryId: issueData.serviceCategoryId || undefined,
            serviceSubCategoryId: (() => {
                // Handle array format from form data
                if (issueData['serviceSubCategoryId[0]']) {
                    const subCategories = [];
                    let index = 0;
                    while (issueData[`serviceSubCategoryId[${index}]`]) {
                        subCategories.push(issueData[`serviceSubCategoryId[${index}]`]);
                        index++;
                    }
                    return subCategories;
                }
                return undefined;
            })(),
            device: {
                type: issueData['device.type'] || 'tv',
                brand: issueData['device.brand'] || undefined,
                model: issueData['device.model'] || undefined,
                serialNumber: issueData['device.serialNumber'] || undefined,
                warrantyStatus: issueData['device.warrantyStatus'] || undefined
            },
            problemDescription: issueData.problemDescription,
            photos: photoUrls.length > 0 ? photoUrls : undefined,
            source: issueData.source || 'call_center',
            campaignId: issueData.campaignId || undefined,
            priority: issueData.priority || 'normal',
            schedule: {
                preferredDate: issueData['schedule.preferredDate'] ? new Date(issueData['schedule.preferredDate']) : undefined,
                window: issueData['schedule.window'] || 'any'
            },
            createdBy: {
                userId: req.user?.id,
                role: req.user?.role || 'admin'
            }
        };

        // Validate the parsed data using the schema from issue model
        const validationResult = z.object({
            contact: z.object({
                name: z.string().min(2, "Contact name must be at least 2 characters"),
                phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
                email: z.string().email("Invalid email format").optional(),
                address: z.object({
                    line1: z.string().min(3, "Address line 1 must be at least 3 characters"),
                    landmark: z.string().optional(),
                    city: z.string().min(2, "City must be at least 2 characters"),
                    state: z.string().min(2, "State must be at least 2 characters"),
                    pinCode: z.string().regex(/^\d{6}$/, "PIN code must be exactly 6 digits")
                })
            }),
            serviceCategoryId: z.string().optional(),
            serviceSubCategoryId: z.array(z.string()).optional(),
            device: z.object({
                type: z.string(),
                brand: z.string().optional(),
                model: z.string().optional(),
                serialNumber: z.string().optional(),
                warrantyStatus: z.enum(["in_warranty", "out_of_warranty"]).optional()
            }),
            problemDescription: z.string().min(5, "Problem description must be at least 5 characters"),
            photos: z.array(z.string()).optional(),
            source: z.enum(["customer_portal", "call_center", "social_ad", "website", "whatsapp", "referral"]),
            campaignId: z.string().optional(),
            priority: z.enum(["low", "normal", "high", "urgent"]),
            schedule: z.object({
                preferredDate: z.date().optional(),
                window: z.enum(["morning", "afternoon", "evening", "any"])
            }),
            createdBy: z.object({
                userId: z.string().optional(),
                role: z.string()
            })
        }).safeParse(parsedData);

        if (!validationResult.success) {
            console.log('Validation failed:', validationResult.error.errors);
            return sendError(res, "Invalid request data", validationResult.error.errors, STATUS_CODES.BAD_REQUEST);
        }

        try {
            // Create new issue
            const newIssue = new IssueModel(validationResult.data);
            await newIssue.save();

            console.log('Issue created successfully:', newIssue._id);

            return sendSuccess(res, "Issue created successfully", {
                issueId: newIssue._id,
                humanReadableId: newIssue.human_readable_id,
                status: newIssue.status,
                message: `Issue ${newIssue.human_readable_id} has been created successfully`
            }, STATUS_CODES.CREATED);
        } catch (error) {
            console.error('Error saving issue:', error);
            return sendError(res, "Failed to create issue", null, STATUS_CODES.INTERNAL_SERVER_ERROR);
        }
    })

    renderIssueList = asyncHandler(async(req:Request,res:Response)=>{
        const issues = await IssueModel.find({isDeleted:false});
        res.render("issuelist",{default_user:req.user,issues});
    })
}

const commonController = new CommonController();

export default commonController;