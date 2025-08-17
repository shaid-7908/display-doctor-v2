import { asyncHandler } from "../utils/async.hadler";
import { Request,Response } from "express";
import { sendError, sendSuccess } from "../utils/unified.response";
import STATUS_CODES from "../utils/status.codes";
import { UserModel } from "../model/user.model";

class AdminController{
    renderCreateCaller = asyncHandler(async (req:Request,res:Response)=>{

        res.render("createcaller",{default_user:req.user});
    })
    createCaller =asyncHandler(async(req:Request,res:Response)=>{
        const {firstName,lastName,email,phone,dateOfBirth,role} = req.body;
        const existingCaller = await UserModel.findOne({email});
        if(existingCaller){
            req.flash("error_msg","Caller with this email already exists");
            return res.redirect("/create-caller");
        }
        
        const newCaller = new UserModel({firstName,lastName,email,phone,dateOfBirth,role});
        await newCaller.save();
    })

    
}

const adminController = new AdminController();

export default adminController;