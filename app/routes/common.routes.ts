import express from "express";
import commonController from "../controller/common.controller";
import { authChecker } from "../middelware/auth.middleware";
import { roleChecker } from "../middelware/auth.middleware";
import { upload, uploadMulitplePhotoToS3 } from "../middelware/multer.middleware";


const commonRouter = express.Router();

commonRouter.get("/search", authChecker, roleChecker(["caller", "admin", "technician"]), commonController.overAllSearch);

commonRouter.get("/create-issue", authChecker, roleChecker(["caller", "admin"]), commonController.renderCreateIssue);
commonRouter.post("/create-issue", authChecker, roleChecker(["caller", "admin"]), upload.fields([{ name: 'photos', maxCount: 10 }]), uploadMulitplePhotoToS3, commonController.createIssue);
commonRouter.get("/issue-list", authChecker, roleChecker(["caller", "admin"]), commonController.renderIssueList);
commonRouter.get("/get-technicians-to-assign/:id", authChecker, roleChecker(["caller", "admin"]), commonController.getTechniciansToAssign);
commonRouter.get("/get-issue-details/:id", authChecker, roleChecker(["caller", "admin", "technician"]), commonController.getIssueDetails);
commonRouter.get("/full-issue-details/:id", authChecker, roleChecker(["caller", "admin", "technician"]), commonController.renderFullIssueDetails);
commonRouter.post("/assign-issue-to-technician/:id", authChecker, roleChecker(["caller", "admin"]), commonController.assignIssueToTechnician);
commonRouter.get("/get-all-issues", authChecker, roleChecker(["caller", "admin"]), commonController.getAllIssues);
commonRouter.get("/get-all-resolved-issues", authChecker, roleChecker(["caller", "admin"]), commonController.getAllResolvedIssues);
//Issue Schedule Routes
commonRouter.get("/get-current-schedule/:id", authChecker, roleChecker(["caller", "admin"]), commonController.getCurrentSchedule);
commonRouter.post('/change-schedule', authChecker, roleChecker(["caller", "admin"]), commonController.changeSchedule)

commonRouter.get('/get-issue-history/:id', authChecker, roleChecker(['caller', 'admin']), commonController.getIssueHistory)

//Issue report route

// Bill generation routes

commonRouter.post("/generate-invoice/:issueId", authChecker, roleChecker(["technician", "admin"]), commonController.generateInvoice);
commonRouter.get("/download-invoice-pdf/:issueId", authChecker, roleChecker(["technician", "admin"]), commonController.downloadInvoicePdf);
commonRouter.get("/invoice-generation", authChecker, roleChecker(["technician", "admin"]), commonController.renderInvoiceGenerationPage);
commonRouter.get("/invoice-generation/:id", authChecker, roleChecker(["technician", "admin"]), commonController.renderInvoiceGenerationPageWithIssue);
commonRouter.post("/search-issue-for-invoice", authChecker, roleChecker(["technician", "admin"]), commonController.searchIssueForInvoice);
commonRouter.get("/invoice/:id",authChecker,roleChecker(["admin","caller","technician"]),commonController.renderInvoicePage);

commonRouter.get("/invoice-list", authChecker, roleChecker(["technician", "admin"]), commonController.renderInvoiceList);
commonRouter.get("/get-all-invoices", authChecker, roleChecker(["technician", "admin"]), commonController.getInvoiceList);
commonRouter.get("/get-invoice-details/:id", authChecker, roleChecker(["technician", "admin"]), commonController.getInvoiceDetails);

// Invoice management routes
commonRouter.put("/update-invoice-status/:id", authChecker, roleChecker(["technician", "admin"]), commonController.updateInvoiceStatus);
commonRouter.delete("/delete-invoice/:id", authChecker, roleChecker(["admin"]), commonController.deleteInvoice);
commonRouter.get("/get-total-earnings", authChecker, roleChecker(["admin", "caller"]), commonController.getTotalEarnings);
commonRouter.get("/get-recent-invoices", authChecker, roleChecker(["technician", "admin", "caller"]), commonController.getRecentInvoices);
commonRouter.get('/view-invoice/:id', authChecker, roleChecker(["technician", "admin", "caller"]), commonController.renderViewInvoicePage);
//Admin and caller dashboard routes
commonRouter.get("/get-all-unassigned-issues", authChecker, roleChecker(["admin", "caller"]), commonController.getAllUnassignedIssues);
commonRouter.get("/get-recent-pending-reports", authChecker, roleChecker(["technician", "admin", "caller"]), commonController.getRecentPendingReports);
commonRouter.get("/get-issue-report-details-modal/:id", authChecker, roleChecker(["technician", "admin", "caller"]), commonController.getIssueReportDetailsForModal);
commonRouter.get("/issue/:id", authChecker, roleChecker(["caller", "admin", "technician"]), commonController.renderIssue);


//Public Routes
commonRouter.get("/get-warrenty-info/:id", commonController.getWarrentyInfo);
commonRouter.get("/warrenty-checker", commonController.renderWarrentyCheckerPage);
export default commonRouter;