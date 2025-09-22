import technicianController from "../controller/technician.controller";
import express from "express";
import { authChecker, roleChecker } from "../middelware/auth.middleware";

const technicianRouter = express.Router();

technicianRouter.get(
  "/technician/assigend-issue",
  authChecker,
  roleChecker(["technician"]),
  technicianController.renderAssignedIssuePage
);

technicianRouter.get(
  "/technician/get-assigned-issue",
  authChecker,
  roleChecker(["technician"]),
  technicianController.getAssignedIssues
);

technicianRouter.get(
  "/technician/get-recently-assigned-issue",
  authChecker,
  roleChecker(["technician"]),
  technicianController.getRecentlyAssignedIssues
);

 //Issue Report routes
technicianRouter.post(
  "/technician/generate-issue-report",
  authChecker,
  roleChecker(["technician"]),
  technicianController.generateIssueReport
);

technicianRouter.get(
  "/technician/issue-reports-list",
  authChecker,
  roleChecker(["technician"]),
  technicianController.renderIssueReportPage
);

technicianRouter.get("/technician/get-issue-reports-list",authChecker,roleChecker(["technician"]),technicianController.getIssueReportList);

export default technicianRouter;
