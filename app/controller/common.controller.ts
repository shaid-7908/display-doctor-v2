import { Request, Response } from "express";
import mongoose from "mongoose";
import { IssueModel } from "../model/issue.model";
import { UserModel } from "../model/user.model";
import TechnicianToServiceModel from "../model/technicianToService.model";
import { asyncHandler } from "../utils/async.hadler";
import { sendSuccess, sendError } from "../utils/unified.response";
import STATUS_CODES from "../utils/status.codes";
import { ServiceCategoryModel } from "../model/service.model";
import { z } from "zod";

class CommonController {

    renderCreateIssue = asyncHandler(async (req: Request, res: Response) => {
        const serviceCategories = await ServiceCategoryModel.find({ is_active: true });
        res.render("createissue", { default_user: req.user, serviceCategories });
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
                name: issueData["contact.name"],
                phone: issueData["contact.phone"],
                email: issueData["contact.email"] || undefined,
                address: {
                    line1: issueData["contact.address.line1"],
                    landmark: issueData["contact.address.landmark"] || undefined,
                    city: issueData["contact.address.city"],
                    state: issueData["contact.address.state"],
                    pinCode: issueData["contact.address.pinCode"],
                },
            },
            serviceCategoryId: issueData.serviceCategoryId || undefined,
            serviceSubCategoryId: issueData.serviceSubCategoryId,
            device: {
                type: issueData["device.type"] || "tv",
                brand: issueData["device.brand"] || undefined,
                model: issueData["device.model"] || undefined,
                serialNumber: issueData["device.serialNumber"] || undefined,
                warrantyStatus: issueData["device.warrantyStatus"] || undefined,
            },
            problemDescription: issueData.problemDescription,
            photos: photoUrls.length > 0 ? photoUrls : undefined,
            source: issueData.source || "call_center",
            campaignId: issueData.campaignId || undefined,
            priority: issueData.priority || "normal",
            schedule: {
                preferredDate: issueData["schedule.preferredDate"]
                    ? new Date(issueData["schedule.preferredDate"])
                    : undefined,
                window: issueData["schedule.window"] || "any",
            },
            createdBy: {
                userId: req.user?.id,
                role: req.user?.role || "admin",
            },
        };
        console.log(parsedData, '=======================================================')
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
            serviceCategoryId: z.string().min(1, "Service Category not selected"),
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
            return sendError(res, "Zod Error", validationResult.error.errors, STATUS_CODES.BAD_REQUEST);
        }
        const data = validationResult.data
        console.log(data)
        try {
            // Create new issue
            let createdFrom = ''
            if (req?.user.role === 'admin' || req?.user?.role === 'caller') {
                createdFrom = 'Admin Portal'
            } else {
                createdFrom = 'Website'
            }

            const newIssue = new IssueModel(data);
            newIssue.history.push({
                at: new Date(),
                by: req?.user?.id,
                action: "created",
                from: createdFrom,
                note: req.body.additionalnotes,
            });
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

    renderIssueList = asyncHandler(async (req: Request, res: Response) => {
        const issues = await IssueModel.find({ isDeleted: false })
            .populate('assignment.technicianId', 'firstName lastName phone email')
            .populate('serviceCategoryId', 'name')
            .sort({ createdAt: -1 });
        res.render("issuelist", { default_user: req.user, issues });
    })
    getTechniciansToAssign = asyncHandler(async (req: Request, res: Response) => {
        const serviceCategoryId = req.params.id;

        // Convert string to ObjectId for aggregation
        const serviceCategoryObjectId = new mongoose.Types.ObjectId(serviceCategoryId);

        const technicians = await TechnicianToServiceModel.aggregate([
            {
                $match: {
                    parent_serviceId: serviceCategoryObjectId,
                    status: true // Only active technician-service relations
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "technicianId",
                    foreignField: "_id",
                    as: "technician"
                }
            },
            {
                $unwind: "$technician" // Flatten the technician array
            },
            {
                $match: {
                    "technician.role": "technician",
                    "technician.status": "active"
                }
            },
            {
                $project: {
                    _id: 1,
                    technicianId: 1,
                    parent_serviceId: 1,
                    sub_serviceId: 1,
                    technician: {
                        _id: 1,
                        firstName: 1,
                        lastName: 1,
                        phone: 1,
                        email: 1
                    }
                }
            }
        ]);

        return sendSuccess(res, "Technicians to assign", technicians, STATUS_CODES.OK);
    })

    getIssueDetails = asyncHandler(async (req: Request, res: Response) => {
        const issueId = req.params.id;
        const issue = await IssueModel.findOne({ human_readable_id: issueId });
        return sendSuccess(res, "Issue details", issue, STATUS_CODES.OK);
    })

    assignIssueToTechnician = asyncHandler(async (req: Request, res: Response) => {
        const issueId = req.params.id;
        const { technicianId, notes, priority } = req.body;

        // Validate input
        if (!technicianId) {
            return sendError(res, "Technician ID is required", null, STATUS_CODES.BAD_REQUEST);
        }

        try {
            // Find the issue
            const issue = await IssueModel.findOne({ human_readable_id: issueId });
            if (!issue) {
                return sendError(res, "Issue not found", null, STATUS_CODES.NOT_FOUND);
            }

            // Verify technician exists and has correct role
            const technician = await UserModel.findById(technicianId);
            if (!technician) {
                return sendError(res, "Technician not found", null, STATUS_CODES.NOT_FOUND);
            }

            if (technician.role !== 'technician') {
                return sendError(res, "Selected user is not a technician", null, STATUS_CODES.BAD_REQUEST);
            }

            // Check if technician is qualified for this service category
            if (issue.serviceCategoryId) {
                const technicianService = await TechnicianToServiceModel.findOne({
                    technicianId: technicianId,
                    parent_serviceId: issue.serviceCategoryId,
                    status: true
                });

                if (!technicianService) {
                    return sendError(res, "Technician is not qualified for this service type", null, STATUS_CODES.BAD_REQUEST);
                }
            }

            // Update issue assignment
            issue.assignment = {
                technicianId: technicianId,
                assignedBy: req.user?.id,
                assignedAt: new Date(),
                notes: notes || ''
            };

            // Update priority if provided
            if (priority && ['low', 'normal', 'high', 'urgent'].includes(priority)) {
                issue.priority = priority as any;
            }

            // Update status to assigned
            const oldStatus = issue.status;
            issue.status = 'assigned';

            // Add to history
            issue.history.push({
                at: new Date(),
                by: req.user?.id,
                action: 'assigned',
                from: oldStatus,
                to: 'assigned',
                note: `Assigned to ${technician.firstName} ${technician.lastName}${notes ? ` - ${notes}` : ''}`
            });

            // Save the issue
            await issue.save();

            const responseData = {
                issueId: issue.human_readable_id,
                technicianId: technician._id,
                technicianName: `${technician.firstName} ${technician.lastName}`,
                technicianPhone: technician.phone,
                assignedAt: issue.assignment.assignedAt,
                status: issue.status,
                priority: issue.priority
            };

            return sendSuccess(res, "Issue assigned to technician successfully", responseData, STATUS_CODES.OK);

        } catch (error) {
            console.error('Error assigning issue to technician:', error);
            return sendError(res, "Failed to assign issue to technician", null, STATUS_CODES.INTERNAL_SERVER_ERROR);
        }
    })

}

const commonController = new CommonController();

export default commonController;