import { asyncHandler } from "../utils/async.hadler";


class TechnicianController {

    renderAssignedIssuePage = asyncHandler(async (req,res)=>{
    res.render("assigned-issue-techni",{default_user:req.user});
    })
}

const technicianController = new TechnicianController()

export default technicianController