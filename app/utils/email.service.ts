import { Request } from "express";
import { Types } from "mongoose";
import { OtpModel } from "../model/otp.model";
import { transporter } from "../config/email.config";
import envConfig from "../config/env.config";
import { UserDocument } from "../types/user.types";

export const sendVerificationEmail = async (
  req: Request,
  user: UserDocument
): Promise<number> => {
  const otp = Math.floor(1000 + Math.random() * 9000);

  await new OtpModel({ userId: user._id, otp }).save();

  await transporter.sendMail({
    from: envConfig.EMAIL_FORM as string,
    to: user.email,
    subject: "OTP - Verify your account",
    html: `<p>Dear ${user.firstName} ${user.lastName},</p>
      <p>Thank you for signing up with our website. To complete your registration, please verify your email address by entering the following one-time password (OTP):</p>
      <h2>OTP: ${otp}</h2>
      <p>This OTP is valid for 15 minutes. If you didn't request this OTP, please ignore this email.</p>`,
  });

  return otp;
};

export const forgotPassowordEmail = async (
  req: Request,
  user: UserDocument
): Promise<number> => {
  const otp = Math.floor(1000 + Math.random() * 9000);

  await new OtpModel({ userId: user._id, otp }).save();

  await transporter.sendMail({
    from: envConfig.EMAIL_FORM as string,
    to: user.email,
    subject: "Reset your password",
    html: `<p>Dear ${user.firstName} ${user.lastName},</p>
      <p> To reset your password by entering the following one-time password (OTP):</p>
      <h2>OTP: ${otp}</h2>
      <p>This OTP is valid for 15 minutes. If you didn't request this OTP, please ignore this email.</p>`,
  });

  return otp;
};
