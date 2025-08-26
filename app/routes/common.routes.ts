import express from "express";
import commonController from "../controller/common.controller";
import { authChecker } from "../middelware/auth.middleware";
import { roleChecker } from "../middelware/auth.middleware";
import { upload } from "../middelware/multer.middleware";


const commonRouter = express.Router();


commonRouter.get("/create-issue",authChecker,roleChecker(["caller","admin"]),commonController.renderCreateIssue);
commonRouter.post("/create-issue",authChecker,roleChecker(["caller","admin"]),upload.fields([{ name: 'photos', maxCount: 10 }]),commonController.createIssue);
commonRouter.get("/issue-list",authChecker,roleChecker(["caller","admin"]),commonController.renderIssueList);


export default commonRouter;