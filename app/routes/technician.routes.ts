import technicianController from "../controller/technician.controller";
import express from 'express'
import { authChecker, roleChecker } from "../middelware/auth.middleware";

const technicianRouter = express.Router()

technicianRouter.get('/technician/assigend-issue',authChecker,roleChecker(['technician']),technicianController.renderAssignedIssuePage)

technicianRouter.get('/technician/get-assigned-issue',authChecker,roleChecker(['technician']),technicianController.getAssignedIssues)

export default technicianRouter