import express from "express";
import commonController from "../controller/common.controller";
import { authChecker } from "../middelware/auth.middleware";
import { roleChecker } from "../middelware/auth.middleware";
import { upload } from "../middelware/multer.middleware";


const commonRouter = express.Router();


commonRouter.get("/create-issue", authChecker, roleChecker(["caller", "admin"]), commonController.renderCreateIssue);
commonRouter.post("/create-issue", authChecker, roleChecker(["caller", "admin"]), upload.fields([{ name: 'photos', maxCount: 10 }]), commonController.createIssue);
commonRouter.get("/issue-list", authChecker, roleChecker(["caller", "admin"]), commonController.renderIssueList);
commonRouter.get("/get-technicians-to-assign/:id", authChecker, roleChecker(["caller", "admin"]), commonController.getTechniciansToAssign);
commonRouter.get("/get-issue-details/:id", authChecker, roleChecker(["caller", "admin"]), commonController.getIssueDetails);
commonRouter.post("/assign-issue-to-technician/:id", authChecker, roleChecker(["caller", "admin"]), commonController.assignIssueToTechnician);

export default commonRouter;