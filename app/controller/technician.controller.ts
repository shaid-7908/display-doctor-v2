import mongoose from "mongoose";
import { asyncHandler } from "../utils/async.hadler";
import { IssueModel } from "../model/issue.model";
import { sendError, sendSuccess } from "../utils/unified.response";
import { IssueReportModel } from "../model/issuereport.model";
import STATUS_CODES from "../utils/status.codes";

class TechnicianController {

    renderAssignedIssuePage = asyncHandler(async (req,res)=>{
    res.render("assigned-issue-techni",{default_user:req.user});
    })

    getAssignedIssues = asyncHandler(async (req,res)=>{
      const currentUserId = req.user.id



      let { fromDate, toDate } = req.query;

      // Normalize empty string to undefined
      fromDate = fromDate && String(fromDate).trim() !== "" ? fromDate : undefined;
      toDate = toDate && String(toDate).trim() !== "" ? toDate : undefined;

      const after = fromDate;
      const before = toDate;
      const match: any = {
        "assignment.technicianId": new mongoose.Types.ObjectId(currentUserId),
      };

      if (after || before) {
        match["schedule.preferredDate"] = {};
        if (after) {
          match["schedule.preferredDate"]["$gte"] = new Date(after as string);
        }
        if (before) {
          match["schedule.preferredDate"]["$lte"] = new Date(before as string);
        }
      }

      const pipeline: any[] = [
        { $match: match },
        {
          $lookup: {
            from: "issue_reports",
            localField: "_id",
            foreignField: "issue_id",
            as: "reports",
          },
        },
        {
          $addFields: {
            hasIssueReport: { $gt: [{ $size: "$reports" }, 0] }, // true if reports exist
          },
        },
        { $sort: { "schedule.preferredDate": 1 } }, // optional
      ];

      const issues = await IssueModel.aggregate(pipeline);

      return sendSuccess(res,"Issue found" ,issues,STATUS_CODES.OK)

    })

    generateIssueReport = asyncHandler(async (req,res)=>{
     const {
       issue_id,
       serviceCategoryId,
       deviceType,
       deviceModelNumber,
       deviceName,
       techNote,
       requiredParts,
       budgetEstimation,
       issue_human_redable_id,
     } = req.body;
     const exixtingReport = await IssueReportModel.findOne({issue_id:issue_id})
     if(exixtingReport){
      return sendError(res,'Issue report already created',null,STATUS_CODES.CONFLICT)
     }
     const newReport = await IssueReportModel.create({
       issue_id,
       serviceCategoryId,
       deviceType,
       deviceName,
       deviceModelNumber,
       techNote,
       requiredParts,
       budgetEstimation,
       technicianId: req.user?.id,
       issue_human_redable_id,
       quotation_type:'none'
     });

     return sendSuccess(res,'Issue report created successfully',newReport,STATUS_CODES.CREATED)

    })

}

const technicianController = new TechnicianController()

export default technicianController