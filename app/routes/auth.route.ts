import express from "express";
import authController from "../controller/auth.controller";
import { authChecker } from "../middelware/auth.middleware";

const authRouter = express.Router();

authRouter.get("/register", authController.renderRegisterPage);
authRouter.post("/register", authController.register);

authRouter.get("/verifyOtp", authController.renderVerifyOtp);
authRouter.post("/verifyOtp", authController.verifyOtp);

authRouter.get("/login", authController.renderLoginPage);
authRouter.post("/login", authController.login);

authRouter.get("/forgot-password", authController.renderForgotPassword);
authRouter.post("/forgot-password", authController.forgotPassword);

authRouter.get("/reset-password", authController.renderResetPassword);
authRouter.post("/reset-password", authController.resetPassword);

authRouter.get("/dashboard", authChecker, authController.renderDashboard);

authRouter.get("/logout", authChecker, authController.logout);

export default authRouter;
