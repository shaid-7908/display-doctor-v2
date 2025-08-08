import nodemailer from "nodemailer";
import envConfig from "./env.config";
import SMTPTransport from "nodemailer/lib/smtp-transport";

export const transporter = nodemailer.createTransport({
  host: envConfig.EMAIL_HOST!,
  port: Number(envConfig.EMAIL_PORT),
  secure: false,
  auth: {
    user: envConfig.EMAIL_USER!,
    pass: envConfig.EMAIL_PASS!,
  },
} as SMTPTransport.Options);
