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
commonRouter.get("/get-issue-details/:id", authChecker, roleChecker(["caller", "admin", "technician"]), commonController.getIssueDetails);
commonRouter.post("/assign-issue-to-technician/:id", authChecker, roleChecker(["caller", "admin"]), commonController.assignIssueToTechnician);

//Issue Schedule Routes
commonRouter.get("/get-current-schedule/:id", authChecker, roleChecker(["caller", "admin"]), commonController.getCurrentSchedule);
commonRouter.post('/change-schedule', authChecker, roleChecker(["caller", "admin"]), commonController.changeSchedule)

commonRouter.get('/get-issue-history/:id', authChecker, roleChecker(['caller', 'admin']), commonController.getIssueHistory)

//Issue report route

// Bill generation routes
commonRouter.get("/generate-invoice/:issueId", authChecker, roleChecker(["technician", "admin"]), commonController.renderInvoicePage);
commonRouter.post("/generate-invoice/:issueId", authChecker, roleChecker(["technician", "admin"]), commonController.generateInvoice);
commonRouter.get("/download-invoice-pdf/:issueId", authChecker, roleChecker(["technician", "admin"]), commonController.downloadInvoicePdf);
commonRouter.get("/invoice-generation", authChecker, roleChecker(["technician", "admin"]), commonController.renderInvoiceGenerationPage);
commonRouter.get("/invoice-generation/:id", authChecker, roleChecker(["technician", "admin"]), commonController.renderInvoiceGenerationPageWithIssue);
commonRouter.post("/search-issue-for-invoice", authChecker, roleChecker(["technician", "admin"]), commonController.searchIssueForInvoice);

export default commonRouter;