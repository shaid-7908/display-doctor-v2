import express from "express";
import adminController from "../controller/admin.controller";
import { authChecker, roleChecker } from "../middelware/auth.middleware";

const adminRouter = express.Router();

adminRouter.get("/create-caller",authChecker,roleChecker(["admin"]),adminController.renderCreateCaller);
adminRouter.post("/create-caller",authChecker,roleChecker(["admin"]),adminController.createCaller);

export default adminRouter; 