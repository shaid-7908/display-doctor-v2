import mongoose from "mongoose";
import { asyncHandler } from "../utils/async.hadler";
import { IssueModel } from "../model/issue.model";
import { sendSuccess } from "../utils/unified.response";
import STATUS_CODES from "../utils/status.codes";

class TechnicianController {

    renderAssignedIssuePage = asyncHandler(async (req,res)=>{
    res.render("assigned-issue-techni",{default_user:req.user});
    })

    getAssignedIssues = asyncHandler(async (req,res)=>{
      const currentUserId = req.user.id



      const { after, before } = req.query; // expected format: ISO string or YYYY-MM-DD

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

      const pipeline : any[] = [
        { $match: match },
        
        { $sort: { "schedule.preferredDate": 1 } }, // optional
      ];

      const issues = await IssueModel.aggregate(pipeline);

      return sendSuccess(res,"Issue found" ,issues,STATUS_CODES.OK)

    })
}

const technicianController = new TechnicianController()

export default technicianController