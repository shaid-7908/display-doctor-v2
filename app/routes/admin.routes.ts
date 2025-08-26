import express from "express";
import adminController from "../controller/admin.controller";
import { authChecker, roleChecker } from "../middelware/auth.middleware";
import { upload } from "../middelware/multer.middleware";

const adminRouter = express.Router();

//caller routes
adminRouter.get("/create-caller", authChecker, roleChecker(["admin"]), adminController.renderCreateCaller);
adminRouter.post("/create-caller", authChecker, roleChecker(["admin"]), adminController.createCaller);

//technician routes
adminRouter.get("/create-technician", authChecker, roleChecker(["admin"]), adminController.renderCreateTechnician);
adminRouter.post("/create-technician", authChecker, roleChecker(["admin"]), upload.fields([{ name: 'aadhaarPhoto', maxCount: 1 }, { name: 'profilePhoto', maxCount: 1 }]), adminController.createTechnician);
adminRouter.get("/create-specialization", authChecker, roleChecker(["admin"]), upload.single('image'), adminController.renderCreateSpecialization);
adminRouter.get("/technician-list", authChecker, roleChecker(["admin"]), adminController.renderTechnicianList);


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
adminRouter.get("/get-sub-categories-by-service/:service_id", authChecker, roleChecker(["admin"]), adminController.getSubCategoriesByServiceCategory);

export default adminRouter; 