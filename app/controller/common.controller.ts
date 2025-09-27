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
import { IssueReportModel } from "../model/issuereport.model";
import { InvoiceModel } from "../model/invoice.model";

class CommonController {
  renderCreateIssue = asyncHandler(async (req: Request, res: Response) => {
    const serviceCategories = await ServiceCategoryModel.find({
      is_active: true,
    });
    res.render("createissue", { default_user: req.user, serviceCategories });
  });

  createIssue = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body using the schema from issue model
    const issueData = req.body;
    console.log(issueData);

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
      generic_problem_type: issueData.generic_problem_type.trim() === "" ? [] : issueData.generic_problem_type.split(","),
      problemDescription: issueData.problemDescription,
      photos: req.body.photosUrls,
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
    // Validate the parsed data using the schema from issue model
    const validationResult = z
      .object({
        contact: z.object({
          name: z.string().min(2, "Contact name must be at least 2 characters"),
          phone: z
            .string()
            .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
          email: z.string().email("Invalid email format").optional(),
          address: z.object({
            line1: z
              .string()
              .min(3, "Address line 1 must be at least 3 characters"),
            landmark: z.string().optional(),
            city: z.string().min(2, "City must be at least 2 characters"),
            state: z.string().min(2, "State must be at least 2 characters"),
            pinCode: z
              .string()
              .regex(/^\d{6}$/, "PIN code must be exactly 6 digits"),
          }),
        }),
        generic_problem_type: z.array(z.string()).optional(),
        serviceCategoryId: z.string().min(1, "Service Category not selected"),
        serviceSubCategoryId: z.array(z.string()).optional(),
        device: z.object({
          type: z.string(),
          brand: z.string().optional(),
          model: z.string().optional(),
          serialNumber: z.string().optional(),
          warrantyStatus: z.enum(["in_warranty", "out_of_warranty"]).optional(),
        }),
        problemDescription: z
          .string()
          .min(5, "Problem description must be at least 5 characters"),
        photos: z.array(z.string()).optional(),
        source: z.enum([
          "customer_portal",
          "call_center",
          "social_ad",
          "website",
          "whatsapp",
          "referral",
        ]),
        campaignId: z.string().optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]),
        schedule: z.object({
          preferredDate: z.date().optional(),
          window: z.enum(["morning", "afternoon", "evening", "any"]),
        }),
        createdBy: z.object({
          userId: z.string().optional(),
          role: z.string(),
        }),
      })
      .safeParse(parsedData);

    if (!validationResult.success) {
      console.log("Validation failed:", validationResult.error.errors);
      return sendError(
        res,
        "Zod Error",
        validationResult.error.errors,
        STATUS_CODES.BAD_REQUEST
      );
    }
    const data = validationResult.data;
    console.log(data);
    try {
      // Create new issue
      let createdFrom = "";
      if (req?.user.role === "admin" || req?.user?.role === "caller") {
        createdFrom = "Admin Portal";
      } else {
        createdFrom = "Website";
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

      console.log("Issue created successfully:", newIssue._id);

      return sendSuccess(
        res,
        "Issue created successfully",
        {
          issueId: newIssue._id,
          humanReadableId: newIssue.human_readable_id,
          status: newIssue.status,
          message: `Issue ${newIssue.human_readable_id} has been created successfully`,
        },
        STATUS_CODES.CREATED
      );
    } catch (error) {
      console.error("Error saving issue:", error);
      return sendError(
        res,
        "Failed to create issue",
        null,
        STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  });

  renderIssueList = asyncHandler(async (req: Request, res: Response) => {
    const issues = await IssueModel.find({ isDeleted: false })
      .populate("assignment.technicianId", "firstName lastName phone email")
      .populate("serviceCategoryId", "name")
      .sort({ createdAt: -1 });
    const totalIssues = await IssueModel.countDocuments({ isDeleted: false });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0); // 00:00:00.000

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999); // 23:59:59.999

    const scheduledToday = await IssueModel.countDocuments({
      isDeleted: false,
      status: "scheduled",
      schedule: { $gte: startOfToday, $lte: endOfToday }
    });
    res.render("issuelist", { default_user: req.user, issues, totalIssues: totalIssues, scheduledToday: scheduledToday });
  });
  getTechniciansToAssign = asyncHandler(async (req: Request, res: Response) => {
    const serviceCategoryId = req.params.id;

    // Convert string to ObjectId for aggregation
    const serviceCategoryObjectId = new mongoose.Types.ObjectId(
      serviceCategoryId
    );

    const technicians = await TechnicianToServiceModel.aggregate([
      {
        $match: {
          parent_serviceId: serviceCategoryObjectId,
          status: true, // Only active technician-service relations
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "technicianId",
          foreignField: "_id",
          as: "technician",
        },
      },
      {
        $unwind: "$technician", // Flatten the technician array
      },
      {
        $match: {
          "technician.role": "technician",
          "technician.status": "active",
        },
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
            email: 1,
          },
        },
      },
    ]);

    return sendSuccess(
      res,
      "Technicians to assign",
      technicians,
      STATUS_CODES.OK
    );
  });

  getIssueDetails = asyncHandler(async (req: Request, res: Response) => {
    const issueId = req.params.id;
    const issue = await IssueModel.findOne({ human_readable_id: issueId });
    return sendSuccess(res, "Issue details", issue, STATUS_CODES.OK);
  });

  renderFullIssueDetails = asyncHandler(async (req: Request, res: Response) => {
    const issue_human_redable_id = req.params.id;
    const issue = await IssueModel.aggregate([
      { $match: { human_readable_id: issue_human_redable_id } },
      { $lookup: { from: "issue_reports", localField: "_id", foreignField: "issue_id", as: "reports" } },
      {
        $unwind: {
          path: "$reports",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'invoices',
          localField: "_id",
          foreignField: "issue_id",
          as: "invoice"
        }
      },
      {
        $unwind: {
          path: "$invoice",
          preserveNullAndEmptyArrays: true
        }
      }
    ])
    res.render("issue-details-page", {
      default_user: req.user,
      issue: issue[0]
    });
  })


  renderIssue = asyncHandler(async (req: Request, res: Response) => {
    const issueId = req.params.id;
    let pipeline: any[] = []
    if (req.user.role === "technician") {
      pipeline = [
        {
          $match: {
            "human_readable_id": issueId,
            "assignment.technicianId": new mongoose.Types.ObjectId(req.user.id)
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "assignment.technicianId",
            foreignField: "_id",
            as: "technician"
          }
        },
        {
          $lookup: {
            from: "issue_reports",
            localField: "_id",
            foreignField: "issue_id",
            as: "reports"
          }
        },
        {
          $project: {
            "technician.password": 0,
          }
        }
      ]
    } else {
      pipeline = [
        { $match: { "human_readable_id": issueId } },
        {
          $lookup: {
            from: "users",
            localField: "assignment.technicianId",
            foreignField: "_id",
            as: "technician"
          }
        },
        {
          $lookup: {
            from: "issue_reports",
            localField: "_id",
            foreignField: "issue_id",
            as: "reports"
          }
        },
        {
          $project: {
            "technician.password": 0,
          }
        }
      ]
    }

    const issue = await IssueModel.aggregate(pipeline);
    res.render("issue", {
      default_user: req.user,
      issue: issue[0]
    });
  })

  assignIssueToTechnician = asyncHandler(
    async (req: Request, res: Response) => {
      const issueId = req.params.id;
      const { technicianId, notes, priority } = req.body;

      // Validate input
      if (!technicianId) {
        return sendError(
          res,
          "Technician ID is required",
          null,
          STATUS_CODES.BAD_REQUEST
        );
      }

      try {
        // Find the issue
        const issue = await IssueModel.findOne({ human_readable_id: issueId });
        if (!issue) {
          return sendError(
            res,
            "Issue not found",
            null,
            STATUS_CODES.NOT_FOUND
          );
        }
        if (!issue?.schedule?.preferredDate) {
          return sendError(
            res,
            "Issue is not scheduled",
            null,
            STATUS_CODES.BAD_REQUEST
          );
        }

        // Verify technician exists and has correct role
        const technician = await UserModel.findById(technicianId);
        if (!technician) {
          return sendError(
            res,
            "Technician not found",
            null,
            STATUS_CODES.NOT_FOUND
          );
        }

        if (technician.role !== "technician") {
          return sendError(
            res,
            "Selected user is not a technician",
            null,
            STATUS_CODES.BAD_REQUEST
          );
        }

        // Check if technician is qualified for this service category
        if (issue.serviceCategoryId) {
          const technicianService = await TechnicianToServiceModel.findOne({
            technicianId: technicianId,
            parent_serviceId: issue.serviceCategoryId,
            status: true,
          });

          if (!technicianService) {
            return sendError(
              res,
              "Technician is not qualified for this service type",
              null,
              STATUS_CODES.BAD_REQUEST
            );
          }
        }

        // Update issue assignment
        issue.assignment = {
          technicianId: technicianId,
          assignedBy: req.user?.id,
          assignedAt: new Date(),
          notes: notes || "",
        };

        // Update priority if provided
        if (
          priority &&
          ["low", "normal", "high", "urgent"].includes(priority)
        ) {
          issue.priority = priority as any;
        }

        // Update status to assigned
        const oldStatus = issue.status;
        issue.status = "assigned";

        // Add to history
        issue.history.push({
          at: new Date(),
          by: req.user?.id,
          action: "assigned",
          from: oldStatus,
          to: "assigned",
          note: `Assigned to ${technician.firstName} ${technician.lastName}${notes ? ` - ${notes}` : ""
            }`,
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
          priority: issue.priority,
        };

        return sendSuccess(
          res,
          "Issue assigned to technician successfully",
          responseData,
          STATUS_CODES.OK
        );
      } catch (error) {
        console.error("Error assigning issue to technician:", error);
        return sendError(
          res,
          "Failed to assign issue to technician",
          null,
          STATUS_CODES.INTERNAL_SERVER_ERROR
        );
      }
    }
  );

  getCurrentSchedule = asyncHandler(async (req, res) => {
    const issueId = req.params.id;
    const issue = await IssueModel.findOne({ _id: issueId });
    if (!issue) {
      return sendError(res, "Issue not found", null, STATUS_CODES.NOT_FOUND);
    }
    return sendSuccess(
      res,
      "Current schedule",
      issue.schedule,
      STATUS_CODES.OK
    );
  });

  changeSchedule = asyncHandler(async (req, res) => {
    const {
      ["issue-id"]: issueId0,
      ["schedule.window"]: window,
      ["schedule.preferredDate"]: preferredDate,
    } = req.body;
    const issueId = req.body.issue_id;

    const issue = await IssueModel.findOne({ _id: issueId });
    if (!issue) {
      return sendError(res, "Issue not found", null, STATUS_CODES.NOT_FOUND);
    }
    const schedule = {
      window: window,
      preferredDate: preferredDate,
    };
    const history = {
      at: new Date(),
      by: req.user.id,
      action: "status_changed",
      from: "scheduled",
      to: "scheduled",
    };
    const updatedIssue = await IssueModel.findByIdAndUpdate(
      issueId,
      {
        $set: { schedule: schedule, status: "scheduled" },
        $push: { history: history },
      },
      { new: true }
    );
    return sendSuccess(
      res,
      "Issue scheduled successfully",
      updatedIssue,
      STATUS_CODES.ACCEPTED
    );
  });

  getIssueHistory = asyncHandler(async (req, res) => {
    const issueId = req.params.id;

    // Ensure valid ObjectId
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(issueId);
    } catch (err) {
      return sendError(res, "Invalid issue ID", null, STATUS_CODES.BAD_REQUEST);
    }

    const issue = await IssueModel.aggregate([
      { $match: { _id: objectId } },
      { $unwind: "$history" }, // flatten history array
      {
        $lookup: {
          from: "users", // collection name in Mongo (check your UserModel.collection.name)
          localField: "history.by",
          foreignField: "_id",
          as: "history.byUser",
        },
      },
      { $unwind: "$history.byUser" }, // because lookup returns array
      {
        $group: {
          _id: "$_id",
          history: {
            $push: {
              at: "$history.at",
              action: "$history.action",
              from: "$history.from",
              to: "$history.to",
              by: {
                _id: "$history.byUser._id",
                name: "$history.byUser.firstName", // adjust fields you want
                email: "$history.byUser.email",
              },
            },
          },
        },
      },
      { $project: { _id: 0, history: 1 } },
    ]);

    if (!issue || issue.length === 0) {
      return sendError(res, "Issue not found", null, STATUS_CODES.NOT_FOUND);
    }

    return sendSuccess(
      res,
      "Issue history found",
      issue[0].history,
      STATUS_CODES.OK
    );
  });

  // Render invoice page with hardcoded data
  renderInvoicePage = asyncHandler(async (req: Request, res: Response) => {
    const invoice_id = req.params.id;
    const invoiceData = await InvoiceModel.aggregate([
      {$match:{'human_readable_invoice_id':invoice_id}},
      {
        $lookup: {
          from: "issues",
          localField: "human_readable_issue_id",
          foreignField: "human_readable_id",
          as: "issue"
        }
      },
      { $unwind: "$issue" },
      {
        $lookup: {
          from: 'users',
          localField: 'issue.assignment.technicianId',
          foreignField: '_id',
          as: 'technician'
        }
      },
      { $unwind: "$technician" },
      {
        $project: {
          "technician.password": 0,
          "technician.isVerified": 0,
          "technician.status": 0,
          "technician.createdAt": 0,
          "technician.updatedAt": 0,
          "technician.role": 0,
          "technician.dateOfBirth": 0,
        }
      }
    ])
    console.log(invoiceData)
    res.render("invoice", {
      invoice: invoiceData[0],
      default_user: req.user
    });
  });

  generateInvoice = asyncHandler(async (req, res) => {
    console.log(req.body)

    const { issueId, customerName, human_readable_issue_id, customerPhone, customerEmail, customerAddress, deviceType, deviceBrand, deviceModel, deviceSerial, serviceDescription, partsUsed, warrantyMonths, laborCharge, partsCost, visitCharge, discount, issue_report_id } = req.body

    const existingInvoice = await InvoiceModel.findOne({ human_readable_issue_id: human_readable_issue_id, issueId: issueId })

    if (existingInvoice) {
      return sendError(res, "Invoice already exists", null, STATUS_CODES.BAD_REQUEST);
    }

    const existingReport = await IssueReportModel.findOne({ issue_human_redable_id: human_readable_issue_id, issue_id: issueId })

    if (!existingReport) {
      return sendError(res, "Report not found", null, STATUS_CODES.BAD_REQUEST);
    }

    let numLabourCharge = parseFloat(laborCharge) || 0
    let numPartsCost = parseFloat(partsCost) || 0
    let numVisitCharge = parseFloat(visitCharge) || 0
    let numDiscount = parseFloat(discount) || 0
    let subtotal = numLabourCharge + numPartsCost + numVisitCharge - numDiscount
    if (subtotal < existingReport.finalQuotation.valueOf()) {
      return sendError(res, "Subtotal is less than final quotation", null, STATUS_CODES.BAD_REQUEST);
    }
    let gst = subtotal * 0.18
    let finalAmount = subtotal + gst 
    const newInvoice = await InvoiceModel.create({
      issueId,
      issue_report_id,
      human_readable_issue_id,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      deviceType,
      deviceBrand: deviceBrand || "NA",
      deviceModel: deviceModel || "NA",
      deviceSerial: deviceSerial || "NA",
      serviceDescription: serviceDescription || "NA",
      partsUsed: partsUsed,
      finalQuotation: existingReport.finalQuotation.valueOf(),
      labourCharge: numLabourCharge,
      partsCost: numPartsCost,
      visitCharge: numVisitCharge,
      discount: numDiscount,
      finalAmount: finalAmount,
      warrantyMonths,
      warrantyStart: new Date(),
      warrantyEnd: new Date(Date.now() + warrantyMonths * 30 * 24 * 60 * 60 * 1000),
      invoiceDate: new Date(),
      status: "pending"
    })
    if (!newInvoice) {
      return sendError(res, "Failed to generate invoice", null, STATUS_CODES.INTERNAL_SERVER_ERROR);
    } else {
      const updateIssueReport = await IssueReportModel.updateOne({ issue_human_redable_id: newInvoice.issueId }, { $set: { status: "bill-generated" } })
      const issue = await IssueModel.findOne({ human_readable_id: newInvoice.issueId })
      if (issue) {
        const previousStatus = issue.status
        issue.status = "awaiting_payment"
        issue.history.push({
          at: new Date(),
          by: req.user?.id,
          action: "status_changed",
          from: previousStatus,
          to: "awaiting_payment",
          note: "Status changed to awaiting payment after invoice generation"
        })
        await issue.save()
      }
      return sendSuccess(res, "Invoice generated successfully", newInvoice, STATUS_CODES.OK);
    }

  })

  // Generate and download PDF using Puppeteer
  downloadInvoicePdf = asyncHandler(async (req: Request, res: Response) => {
    const issueId = req.params.issueId;

    try {
      // Fetch invoice data from database
      const invoice = await InvoiceModel.aggregate([
        { $match: { "human_readable_issue_id": issueId } },
        {
          $lookup: {
            from: "issues",
            localField: "human_readable_issue_id",
            foreignField: "human_readable_id",
            as: "issue"
          }
        },
        { $unwind: "$issue" },
        {
          $lookup: {
            from: 'users',
            localField: 'issue.assignment.technicianId',
            foreignField: '_id',
            as: 'technician'
          }
        },
        { $unwind: "$technician" },
        {
          $project: {
            "technician.password": 0,
            "technician.isVerified": 0,
            "technician.status": 0,
            "technician.createdAt": 0,
            "technician.updatedAt": 0,
            "technician.role": 0,
            "technician.dateOfBirth": 0,
          }
        }
      ]);

      if (!invoice || invoice.length === 0) {
        return sendError(res, "Invoice not found", null, STATUS_CODES.NOT_FOUND);
      }

      const invoiceData = invoice[0];

      // Calculate totals for the template
      const subtotal = invoiceData.labourCharge + invoiceData.partsCost + invoiceData.visitCharge - invoiceData.discount;
      const gst = Math.round(subtotal * 0.18);
      const total = invoiceData.finalAmount;

      // Format the data for the invoice template
      const formattedInvoiceData = {
        // Company Info
        companyName: "Display Doctor",
        companyAddress: "123, Main Street, Anytown, USA",
        companyPhone: "+1-800-EMERGENCY",
        companyEmail: "support@emergencyresponse.com",
        companyGST: "1234567890",

        // Customer Info
        customerName: invoiceData.customerName,
        customerPhone: invoiceData.customerPhone,
        customerAddress: invoiceData.customerAddress,

        // Invoice Details (matching the template expectations)
        invoiceNo: invoiceData.human_readable_invoice_id,
        issueId: invoiceData.human_readable_issue_id,
        date: new Date(invoiceData.invoiceDate).toLocaleDateString('en-IN'),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),

        // Service Details (matching template expectations)
        serviceDescription: invoiceData.serviceDescription,
        deviceInfo: `${invoiceData.deviceBrand} ${invoiceData.deviceModel} (${invoiceData.deviceType})`,
        partsUsed: invoiceData.partsUsed,
        serviceAmount: subtotal, // This is what the template expects for the service amount

        // Individual charges for detailed breakdown
        labourCharge: invoiceData.labourCharge,
        partsCost: invoiceData.partsCost,
        visitCharge: invoiceData.visitCharge,
        discount: invoiceData.discount,

        // Warranty Info
        warrantyMonths: invoiceData.warrantyMonths,
        warrantyStart: invoiceData.warrantyStart,
        warrantyEnd: invoiceData.warrantyEnd,

        // Totals (matching template expectations)
        subtotal: subtotal,
        gst: gst,
        total: total,

        // Technician Info (matching template expectations)
        technicianName: `${invoiceData.technician.firstName} ${invoiceData.technician.lastName}`,
        technicianTitle: "Certified Technician",

        // Payment Info
        bankName: "State Bank of India",
        accountNo: "1234567890"
      };

      const puppeteer = require('puppeteer');
      let browser;

      try {
        // Launch browser
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Render the invoice HTML
        const html = await new Promise((resolve, reject) => {
          res.render("invoice-downloader-page", {
            invoice: formattedInvoiceData,
            default_user: req.user
          }, (err, html) => {
            if (err) {
              console.error('Error rendering invoice template:', err);
              reject(err);
            } else {
              resolve(html);
            }
          });
        });

        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px'
          }
        });

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoiceData.human_readable_invoice_id}.pdf`);
        res.setHeader('Content-Length', pdf.length);

        // Send PDF
        res.send(pdf);

      } finally {
        // Ensure browser is always closed
        if (browser) {
          await browser.close();
        }
      }

    } catch (error) {
      console.error('PDF generation error:', error);
      return sendError(res, "Failed to generate PDF", error, STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  });
  renderInvoiceGenerationPage = asyncHandler(async (req: Request, res: Response) => {
    res.render("invoice-generation", {
      default_user: req.user,
      issue: null,
      issueReport: null,
      error: null
    });
  });

  renderInvoiceGenerationPageWithIssue = asyncHandler(async (req: Request, res: Response) => {


    const issueId = req.params.id;
    try {
      const issueReport = await IssueReportModel.findOne({ issue_human_redable_id: issueId })
      if (!issueReport) {
        return res.render("invoice-generation", {
          default_user: req.user,
          issue: null,
          issueReport: null,
          error: `Issue Report is not Generated for this issue ${issueId} !`
        });
      }

      const issue = await IssueReportModel.aggregate(
        [
          { $match: { issue_human_redable_id: issueId, is_approved: true, finalQuotation: { $ne: 0 } } },
          { $lookup: { from: "issues", localField: "issue_id", foreignField: "_id", as: "issue" } },
          { $unwind: "$issue" },
        ]
      )
      if (!issue || issue.length === 0) {
        return res.render("invoice-generation", {
          default_user: req.user,
          issue: null,
          issueReport: null,
          error: `Report for issue ID ${issueId} not found ornot approved or final quotation is not set`
        });
      }
      console.log(issue[0]);
      res.render("invoice-generation", {
        default_user: req.user,
        issue: issue[0].issue,
        issueReport: issue[0],
        error: null
      });
    } catch (error) {
      console.error('Error fetching issue:', error);
      res.render("invoice-generation", {
        default_user: req.user,
        issue: null,
        issueReport: null,
        error: 'Failed to fetch issue details'
      });
    }

    // try {
    //   // Find issue by human_readable_id
    //   const issue = await IssueModel.findOne({
    //     human_readable_id: issueId,
    //     isDeleted: false
    //   })
    //     .populate('serviceCategoryId', 'name')
    //     .populate('assignment.technicianId', 'firstName lastName phone email');

    //   if (!issue) {
    //     return res.render("invoice-generation", {
    //       default_user: req.user,
    //       issue: null,
    //       error: `Issue with ID ${issueId} not found`
    //     });
    //   }

    //   res.render("invoice-generation", {
    //     default_user: req.user,
    //     issue: issue,
    //     error: null
    //   });
    // } catch (error) {
    //   console.error('Error fetching issue:', error);
    //   res.render("invoice-generation", {
    //     default_user: req.user,
    //     issue: null,
    //     error: 'Failed to fetch issue details'
    //   });
    // }

  });

  searchIssueForInvoice = asyncHandler(async (req: Request, res: Response) => {
    const { issueId } = req.body;

    if (!issueId) {
      return sendError(res, "Issue ID is required", null, STATUS_CODES.BAD_REQUEST);
    }

    try {
      // Find issue by human_readable_id
      const issue = await IssueModel.findOne({
        human_readable_id: issueId,
        isDeleted: false
      })
        .populate('serviceCategoryId', 'name')
        .populate('assignment.technicianId', 'firstName lastName phone email');

      if (!issue) {
        return sendError(res, `Issue with ID ${issueId} not found`, null, STATUS_CODES.NOT_FOUND);
      }

      return sendSuccess(res, "Issue found", issue, STATUS_CODES.OK);
    } catch (error) {
      console.error('Error searching issue:', error);
      return sendError(res, "Failed to search issue", null, STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  });

  renderInvoiceList = asyncHandler(async (req, res) => {
    res.render("invoice-list", {
      default_user: req.user,
      invoices: null,
      error: null
    });
  })

  getInvoiceList = asyncHandler(async (req, res) => {
    let pipeline: any[] = [];
    if (req.user.role === "admin") {
      pipeline = [
        {
          $lookup: {
            from: "issue_reports",
            localField: "human_readable_id",
            foreignField: "issue_human_redable_id",
            as: "issue_report"
          }
        },
        { $unwind: "$issue_report" },
        {
          $lookup: {
            from: "invoices",
            localField: "human_readable_id",
            foreignField: "human_readable_issue_id",
            as: "invoice"
          }
        },
        { $unwind: "$invoice" }
      ]
    } else {
      pipeline = [
        { $match: { "assignment.technicianId": new mongoose.Types.ObjectId(req.user.id) } },
        {
          $lookup: {
            from: "issue_reports",
            localField: "human_readable_id",
            foreignField: "issue_human_redable_id",
            as: "issue_report"
          }
        },
        { $unwind: "$issue_report" },
        {
          $lookup: {
            from: "invoices",
            localField: "human_readable_id",
            foreignField: "human_readable_issue_id",
            as: "invoice"
          }
        },
        { $unwind: "$invoice" }
      ]
    }
    const invoices = await IssueModel.aggregate(pipeline)

    return sendSuccess(res, "Invoice list", invoices, STATUS_CODES.OK);
  })

  getInvoiceDetails = asyncHandler(async (req, res) => {
    const invoiceId = req.params.id;
    const invoice = await InvoiceModel.aggregate(
      [
        { $match: { "human_readable_invoice_id": invoiceId } },
        {
          $lookup: {
            from: "issues",
            localField: "human_readable_issue_id",
            foreignField: "human_readable_id",
            as: "issue"
          }
        },
        { $unwind: "$issue" },
        {
          $lookup: {
            from: 'users',
            localField: 'issue.assignment.technicianId',
            foreignField: '_id',
            as: 'technician'
          }
        },
        { $unwind: "$technician" },
        {
          $project: {
            "technician.password": 0,
            "technician.isVerified": 0,
            "technician.status": 0,
            "technician.createdAt": 0,
            "technician.updatedAt": 0,
            "technician.role": 0,
            "technician.dateOfBirth": 0,
          }
        }
      ]
    );
    if (!invoice || invoice.length === 0) {
      return sendError(res, "Invoice not found", null, STATUS_CODES.NOT_FOUND);
    }
    return sendSuccess(res, "Invoice details", invoice[0], STATUS_CODES.OK);
  })

  // Update invoice status (mocked for now)
  updateInvoiceStatus = asyncHandler(async (req: Request, res: Response) => {
    const invoiceId = req.params.id;
    const { newStatus, note } = req.body;
    if (!newStatus) {
      return sendError(res, "New status is required", null, STATUS_CODES.BAD_REQUEST);
    }

    const invoice = await InvoiceModel.findOne({ _id: invoiceId });
    if (!invoice) {
      return sendError(res, "Invoice not found", null, STATUS_CODES.NOT_FOUND);
    }
    invoice.status = newStatus;
    invoice.save()

    await IssueReportModel.findByIdAndUpdate(invoice.issue_report_id, { $set: { status: 'closed' } })
    const issue = await IssueModel.findOne({ _id: invoice.issueId });
    if (!issue) {
      return sendError(res, "Issue not found", null, STATUS_CODES.NOT_FOUND);
    }
    const oldStatus = issue.status;
    issue.status = 'resolved';
    issue.history.push({
      at: new Date(),
      by: req.user?._id,
      action: 'status_changed',
      from: oldStatus,
      to: 'resolved',
      note: note
    });
    issue.save();
    return sendSuccess(res, "Invoice status updated successfully", invoice, STATUS_CODES.OK);
  });

  // Delete invoice (mocked for now - admin only)
  deleteInvoice = asyncHandler(async (req: Request, res: Response) => {
    const invoiceId = req.params.id;
    const { reason } = req.body;

    try {
      // Validation
      if (!reason || reason.trim().length < 10) {
        return sendError(res, "Deletion reason is required (minimum 10 characters)", null, STATUS_CODES.BAD_REQUEST);
      }

      // Check if user is admin (additional security check)
      if (req.user?.role !== "admin") {
        return sendError(res, "Unauthorized. Only admins can delete invoices", null, STATUS_CODES.FORBIDDEN);
      }

      // Mock - Find the invoice (in real implementation, use InvoiceModel)
      console.log(`Mock: Deleting invoice ${invoiceId}`);
      console.log(`Mock: Reason: ${reason}`);
      console.log(`Mock: Deleted by admin: ${req.user?.id}`);

      // Simulate database deletion delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock response data
      const mockResponse = {
        invoiceId: invoiceId,
        deletedBy: req.user?.id,
        deletedAt: new Date(),
        reason: reason.trim(),
        status: "deleted"
      };

      return sendSuccess(res, "Invoice deleted successfully", mockResponse, STATUS_CODES.OK);

    } catch (error) {
      console.error('Error deleting invoice:', error);
      return sendError(res, "Failed to delete invoice", null, STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  });

  getAllUnassignedIssues = asyncHandler(async (req: Request, res: Response) => {
    const issues = await IssueModel.find({
      $or: [
        { assignment: { $exists: false } },
        { assignment: null }
      ]
    });
    return sendSuccess(res, "Unassigned issues", issues, STATUS_CODES.OK);
  });

  getAllIssues = asyncHandler(async (req: Request, res: Response) => {
    const issues = await IssueModel.find({});
    return sendSuccess(res, "All issues", issues, STATUS_CODES.OK);
  })

  getAllResolvedIssues = asyncHandler(async (req: Request, res: Response) => {
    const issues = await IssueModel.find({ status: "resolved" });
    return sendSuccess(res, "All resolved issues", issues, STATUS_CODES.OK);
  })
  getTotalEarnings = asyncHandler(async (req: Request, res: Response) => {
    const invoices = await InvoiceModel.find({ status: "paid" });
    let totalEarnings = 0
    invoices.forEach(invoice => {
      totalEarnings += invoice.finalAmount as number;
    });
    return sendSuccess(res, "Total earnings", totalEarnings, STATUS_CODES.OK);
  })
  getRecentInvoices = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    let pipeline: any[] = [];
    if (currentUser.role === "technician") {
      pipeline = [
        {
          $lookup: {
            from: "issue_reports",
            localField: "issue_report_id",
            foreignField: "_id",
            as: "issue_report"
          }
        },
        { $unwind: "$issue_report" },
        { $match: { "issue_report.technicianId": new mongoose.Types.ObjectId(currentUser.id) } },
        { $limit: 5 }
      ]

    } else {
      pipeline = [
        {
          $lookup: {
            from: "issue_reports",
            localField: "issue_report_id",
            foreignField: "_id",
            as: "issue_report"
          }
        },
        { $unwind: "$issue_report" },
        { $limit: 5 }
      ]
    }
    const invoices = await InvoiceModel.aggregate(pipeline)
    return sendSuccess(res, "Recent invoices", invoices, STATUS_CODES.OK);
  })
  getRecentPendingReports = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    let pipeline: any[] = [];
    if (currentUser.role === "technician") {
      pipeline = [
        {
          $match: {
            "technicianId": new mongoose.Types.ObjectId(currentUser.id),
            "is_approved": false
          }
        }
      ]
    } else {
      pipeline = [
        { $match: { "is_approved": false } }
      ]
    }
    const reports = await IssueReportModel.aggregate(pipeline)
    return sendSuccess(res, "Recent pending reports", reports, STATUS_CODES.OK);
  })

  getIssueReportDetailsForModal = asyncHandler(async (req: Request, res: Response) => {
    const reportId = req.params.id;

    // Get the issue report with populated issue details
    const issueReport = await IssueReportModel.findById(reportId)
      .populate({
        path: 'issue_id',
        model: 'issues'
      })
      .populate({
        path: 'technicianId',
        model: 'users',
        select: 'name email phone'
      })
      .populate({
        path: 'serviceCategoryId',
        model: 'serviceCategories',
        select: 'name'
      });

    if (!issueReport) {
      return sendError(res, "Issue report not found", STATUS_CODES.NOT_FOUND);
    }

    return sendSuccess(res, "Issue report details retrieved successfully", issueReport, STATUS_CODES.OK);
  })

  renderViewInvoicePage = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const invoice = await InvoiceModel.findOne({ human_readable_issue_id: id });
    res.render("view-invoice-page", {
      default_user: req.user,
      invoice: invoice
    });
  })

  overAllSearch = asyncHandler(async (req: Request, res: Response) => {
    const currentUserRole = req.user.role;
    const query = req.query.q;

    if (!query || typeof query !== 'string') {
      return sendError(res, "Search query is required", null, STATUS_CODES.BAD_REQUEST);
    }

    // Create regex pattern for case-insensitive search
    const searchRegex = new RegExp(query, 'i');

    let issuePipeline: any[] = [
      {
        $match: {
          isDeleted: false,
          $or: [
            { "contact.name": { $regex: searchRegex } },
            { "problemDescription": { $regex: searchRegex } },
            { "human_readable_id": { $regex: searchRegex } }
          ]
        }
      },
    ];

    // Filter by technician role if user is technician
    if (currentUserRole === "technician") {
      issuePipeline[0].$match["assignment.technicianId"] = new mongoose.Types.ObjectId(req.user.id);
    }

    let invoicePipeline: any[] = [
      {
        $match: {
          $or: [
            { "customerName": { $regex: searchRegex } },
            { "customerPhone": { $regex: searchRegex } },
            { "human_readable_invoice_id": { $regex: searchRegex } },
            { "human_readable_issue_id": { $regex: searchRegex } }
          ]
        }
      },
      {
        $lookup: {
          from: 'issues',
          localField: 'issueId',
          foreignField: '_id',
          as: 'issue_details'
        }
      },
      {
        $unwind: {
          path: "$issue_details",
          preserveNullAndEmptyArrays: true
        }
      }
    ]

    if (currentUserRole === "technician") {
      invoicePipeline.push({
        $match: {
          "issue_details.assignment.technicianId": new mongoose.Types.ObjectId(req.user.id)
        }
      })
    }
    const issues = await IssueModel.aggregate(issuePipeline)
    const invoices = await InvoiceModel.aggregate(invoicePipeline)
    return sendSuccess(res, "Search results", { issues, invoices }, STATUS_CODES.OK);

  })

  getWarrentyInfo = asyncHandler(async (req: Request, res: Response)=>{
    const id  = req.params.id
    const fullData = await InvoiceModel.aggregate([
      {$match:{$or:[{'human_readable_invoice_id':id},{'human_readable_issue_id':id}]}},
      {
        $lookup: {
          from: "issues",
          localField: "issueId",
          foreignField: "_id",
          as: "issue"
        }
      },
      { $unwind: "$issue" },
      {$lookup:{
        from:'users',
        localField: 'issue.assignment.technicianId',
        foreignField: '_id',
        as: 'technician'
      }
      },
      { $unwind: "$technician" },
      {
        $project: {
          "technician.password": 0,
          "technician.isVerified": 0,
          "technician.status": 0,
          "technician.createdAt": 0,
          "technician.updatedAt": 0,
          "technician.role": 0,
          "technician.dateOfBirth": 0,
        }
      }
    ])
    return sendSuccess(res, "Warrenty info", fullData[0], STATUS_CODES.OK);
  })
  renderWarrentyCheckerPage = asyncHandler(async (req: Request, res: Response)=>{

    res.render("warrenty-checker");
  })

}

const commonController = new CommonController();

export default commonController;