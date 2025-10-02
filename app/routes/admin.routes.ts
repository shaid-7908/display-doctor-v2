import express from "express";
import adminController from "../controller/admin.controller";
import { authChecker, roleChecker } from "../middelware/auth.middleware";
//import { upload } from "../middelware/multer.middleware";
import { technicianProfileUpload, uploadTechnicianFilesToS3, singelUpload } from "../middelware/multer.middleware";

const adminRouter = express.Router();

//caller routes
adminRouter.get("/create-caller", authChecker, roleChecker(["admin"]), adminController.renderCreateCaller);
adminRouter.post("/create-caller", authChecker, roleChecker(["admin"]), adminController.createCaller);
adminRouter.get("/caller-list", authChecker, roleChecker(["admin"]), adminController.renderCallerListPage);
adminRouter.get("/get-callers", authChecker, roleChecker(["admin"]), adminController.getCallers);

//technician routes
adminRouter.get("/create-technician", authChecker, roleChecker(["admin"]), adminController.renderCreateTechnician);
adminRouter.post("/create-technician", authChecker, roleChecker(["admin"]), technicianProfileUpload, uploadTechnicianFilesToS3, adminController.createTechnician);
adminRouter.get("/create-specialization", authChecker, roleChecker(["admin"]), singelUpload, adminController.renderCreateSpecialization);
adminRouter.get("/technician-list", authChecker, roleChecker(["admin","caller"]), adminController.renderTechnicianList);
adminRouter.patch("/deactivate-technician/:id", authChecker, roleChecker(["admin"]), adminController.deactivateTechnician);
adminRouter.patch("/reactivate-technician/:id", authChecker, roleChecker(["admin"]), adminController.reactivateTechnician);
adminRouter.get("/edit-technician/:id", authChecker, roleChecker(["admin"]), adminController.renderEditTechnicianPage);
adminRouter.put("/edit-technician/:id", authChecker, roleChecker(["admin"]), adminController.updateTechnician);
adminRouter.get("/get-technician-service-info/:id", authChecker, roleChecker(["admin"]), adminController.getTechnicianServiceInfo);
//skill routes
adminRouter.get("/create-skill", authChecker, roleChecker(["admin"]), adminController.renderCreateSkill);
adminRouter.post("/create-skill", authChecker, roleChecker(["admin"]), adminController.createSkill);
adminRouter.get("/get-skills", authChecker, roleChecker(["admin"]), adminController.getSkills);
adminRouter.get("/get-skills-list-page", authChecker, roleChecker(["admin"]), adminController.renderGetSkillsListPage);
adminRouter.get("/get-skills-by-service", authChecker, roleChecker(["admin"]), adminController.getSkillsByServiceCategory);


//service category routes
adminRouter.get("/get-service-categories", authChecker, roleChecker(["admin"]), adminController.getServiceCategories);
adminRouter.get("/create-service-category", authChecker, roleChecker(["admin"]), adminController.renderCreateServiceCategory);
adminRouter.post("/create-service-category", authChecker, roleChecker(["admin"]), adminController.createServiceCategory);
adminRouter.delete("/delete-service-category/:id", authChecker, roleChecker(["admin"]), adminController.deleteServiceCategory);


//service sub category routes
adminRouter.get("/create-service-subcategory", authChecker, roleChecker(["admin"]), adminController.renderCreateServiceSubCategory);
adminRouter.post("/create-service-subcategory", authChecker, roleChecker(["admin"]), adminController.createServiceSubCategory);
adminRouter.get("/get-sub-categories-by-service/:service_id", authChecker, roleChecker(["admin","caller"]), adminController.getSubCategoriesByServiceCategory);


//Issue Report Routes
adminRouter.get('/issue-reports', authChecker, roleChecker(["admin"]), adminController.renderIssueReportPage)
adminRouter.get('/get-issue-reports', authChecker, roleChecker(["admin"]), adminController.getIssueReports)
adminRouter.get('/get-issue-report-details/:id', authChecker, roleChecker(["admin"]), adminController.getIssueReportById)
adminRouter.patch('/submit-quotation', authChecker, roleChecker(['admin']), adminController.submitQuotation)

export default adminRouter; 