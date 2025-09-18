import { Request, Response } from "express";
import { asyncHandler } from "../utils/async.hadler";
import { sendError, sendSuccess } from "../utils/unified.response";
import STATUS_CODES from "../utils/status.codes";
import mongoose from "mongoose";
import { comparePassword, hashPassword } from "../utils/hash.password";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generate.token";
import {
  CreateUserInput,
  UserModel,
  userSchemaValidation,
} from "../model/user.model";
import {
  forgotPassowordEmail,
  sendVerificationEmail,
} from "../utils/email.service";
import { OtpModel } from "../model/otp.model";

class AuthController {
  renderRegisterPage = asyncHandler(async (req: Request, res: Response) => {
    res.render("register");
  });
  register = asyncHandler(async (req: Request, res: Response) => {
    const parsed = userSchemaValidation.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.errors.map((err) => err.message);
      req.flash("error_msg", errorMessages);
      return res.redirect("/register");
    }
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      password,
      refreshToken,
      googleId,
      role,
    } = parsed.data as CreateUserInput;

    const existingAdmin = await UserModel.findOne({
      $or: [{ email }, { phone }],
    });
    if (existingAdmin) {
      req.flash(
        "error_msg",
        "Admin with this email or username already exists"
      );
      return res.redirect("/register");
    }

    const hashedPassword = await hashPassword(password);

    const newUser = new UserModel({
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      password: hashedPassword,
      refreshToken,
      googleId,
      role,
    });
    const user = await newUser.save();
    await sendVerificationEmail(req, user);
    req.flash("success_msg", "Admin created successfully!");
    res.redirect("/verifyOtp");
  });

  renderVerifyOtp = asyncHandler(async (req: Request, res: Response) => {
    return res.render("otpVerify");
  });

  verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      req.flash("error_msg", "Required fields are required");
      return res.redirect("/verifyOtp");
    }
    const user = await UserModel.findOne({ email });
    if (!user) {
      req.flash("error_msg", "Email doesnot exists");
      return res.redirect("/verifyOtp");
    }
    if (user.isVerified) {
      req.flash("error_msg", "Email is already verified");
      return res.redirect("/verifyOtp");
    }
    const emailVerification = await OtpModel.findOne({
      userId: user._id,
      otp,
    });
    if (!emailVerification) {
      await sendVerificationEmail(req, user);
      req.flash("error_msg", "Invalid OTP, new OTP sent to your email");
      return res.redirect("/verifyOtp");
    }
    const currentTime = new Date();
    const expiringTime = new Date(
      emailVerification.createdAt.getTime() + 15 * 60 * 1000
    );
    if (currentTime > expiringTime) {
      await sendVerificationEmail(req, user);
      return res.status(400).json({
        status: false,
        message: "Otp expired, new otp sent to your email",
      });
    }
    user.isVerified = true;
    await user.save();

    await OtpModel.deleteMany({ userId: user._id });
    res.redirect("/login");
  });

  renderLoginPage = asyncHandler(async (req: Request, res: Response) => {
    res.render("login");
  });
  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) {
      req.flash("error_msg", "Invalid Email or password");
      return res.redirect("/register");
    }
    if (user.status === "inactive") {
      req.flash(
        "error_msg",
        "Your account has been deactivated. Please contact support."
      );
      return res.redirect("/login");
    }
    const isPassword = await comparePassword(password, user.password);
    if (!isPassword) {
      req.flash("error_msg", "Invalid Email or password");
      return res.redirect("/login");
    }
    const accessToken = generateAccessToken({
      email: user.email,
      id: user._id as string,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      email: user.email,
      id: user._id as string,
      role: user.role,
    });
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 5 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    req.flash(
      "success_msg",
      `Welcome back, ${user.firstName} ${user.lastName}!`
    );
    res.redirect("/");
    // return sendSuccess(
    //   res,
    //   `Welcome back, ${user.firstName} ${user.lastName}!`,
    //   { accessToken: accessToken, refreshToken: refreshToken },
    //   STATUS_CODES.OK
    // );
  });

  renderForgotPassword = asyncHandler(async (req: Request, res: Response) => {
    res.render("forgot-password");
  });
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
      req.flash("error_msg", "Email is required");
      return res.redirect("/forgot-password");
    }
    const user = await UserModel.findOne({ email });
    if (!user) {
      req.flash("error_msg", "User email not exist");
      return res.redirect("/forgot-password");
    }
    await forgotPassowordEmail(req, user);

    return res.redirect("/reset-password");
  });

  renderResetPassword = asyncHandler(async (req: Request, res: Response) => {
    res.render("reset-password");
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email, otp, password, confirmPassword } = req.body;
    if (!email || !otp || !password || !confirmPassword) {
      req.flash("error_message", "All fields are required");
      return res.redirect("/reset-password");
    }

    if (password !== confirmPassword) {
      req.flash(
        "error_message",
        "New password and confirm password don't match"
      );
      return res.redirect("/reset-password");
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      req.flash("error_message", "Email doesn't exist");
      return res.redirect("/reset-password");
    }

    // Check OTP
    const otpVerification = await OtpModel.findOne({
      userId: user._id,
      otp,
    });

    if (!otpVerification) {
      await forgotPassowordEmail(req, user);
      req.flash(
        "error_message",
        "Invalid OTP. A new OTP has been sent to your email."
      );
      return res.redirect("/reset-password");
    }

    // Check OTP expiry (15 minutes)
    const currentTime = new Date();
    const expiringTime = new Date(
      otpVerification.createdAt.getTime() + 15 * 60 * 1000
    );

    if (currentTime > expiringTime) {
      await forgotPassowordEmail(req, user);
      req.flash(
        "error_message",
        "OTP expired. A new OTP has been sent to your email."
      );
      return res.redirect("/reset-password");
    }

    // Delete OTP records
    await OtpModel.deleteMany({ userId: user._id });

    // Update password
    const hashedPassword = await hashPassword(password);
    await UserModel.findByIdAndUpdate(user._id, {
      $set: { password: hashedPassword },
    });

    // Redirect to login page
    return res.redirect("login");
  });

  renderDashboard = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user;
    res.render("index",{default_user:currentUser});
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    req.flash("success_msg", "Logged out successfully");
    res.redirect("/login");
  });

  renderProfile = asyncHandler(async (req: Request, res: Response)=>{
      const userid = req.params.id;
      const userDetails = await UserModel.aggregate([
        {$match:{_id:new mongoose.Types.ObjectId(userid)}},
        {$lookup:{
          from:"address_proofs",
          localField:"_id",
          foreignField:"userId",
          as:"address_proof"
        }},
        {$unwind:{
          path:"$address_proof",
          preserveNullAndEmptyArrays:true
        }},
        {$project:{
          password:0
        }}
      ])
      if(!userDetails || userDetails.length === 0){
        res.render("profile-page",{default_user:req.user,userDetails:null});
      }
      res.render("profile-page",{default_user:req.user,userDetails:userDetails[0]});
  })
}

export default new AuthController();
