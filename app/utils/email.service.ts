import { Request } from "express";
import { Types } from "mongoose";
import { OtpModel } from "../model/otp.model";
import { transporter } from "../config/email.config";
import envConfig from "../config/env.config";
import { UserDocument } from "../types/user.types";


interface EmailConfig {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}



// Send email function
export const sendEmail = async (config: EmailConfig): Promise<boolean> => {
  try {

    const mailOptions = {
      from: envConfig.EMAIL_USER,
      to: Array.isArray(config.to) ? config.to.join(", ") : config.to,
      subject: config.subject,
      html: config.html,
      text: config.text,
      attachments: config.attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

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

export const sendWelcomeEmail = async (
  callerEmail: string,
  callerName: string,
): Promise<boolean> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0a3d62 0%, #0d5b94 100%); color: white; padding: 30px; text-align: center;">
        <div style="margin-bottom: 20px;">
          <img src="https://res.cloudinary.com/dycvkezau/image/upload/v1751786166/WhatsApp_Image_2025-07-03_at_10.39.29_245bf40b-removebg-preview_iwumxs.png" 
               alt="Company Logo" 
               style="max-width: 150px; height: auto; margin: 0 auto; display: block;">
        </div>
        <h1 style="margin: 0; font-size: 28px;">Welcome to Our Service!</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for registering with us</p>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa;">
        <h2 style="color: #0a3d62; margin-bottom: 20px;">Hello ${callerName},</h2>
        
        <p style="line-height: 1.6; color: #333; margin-bottom: 20px;">
          Welcome to our emergency response system! Your account has been successfully created and you're now registered in our database.
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #0a3d62; margin-top: 0;">What's Next?</h3>
          <ul style="color: #333; line-height: 1.8;">
            <li>Your information is securely stored in our system</li>
            <li>Emergency services can access your details when needed</li>
            <li>You can update your information anytime</li>
            <li>Your privacy and security are our top priorities</li>
          </ul>
        </div>
        
        <div style="background: #e8f4fd; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #0a3d62; margin-top: 0;">Emergency Contact</h3>
          <p style="color: #333; margin-bottom: 10px;">
            In case of emergency, please contact:
          </p>
          <p style="color: #dc3545; font-weight: bold; margin: 0;">
            Emergency Services: 911
          </p>
        </div>
        
        <p style="line-height: 1.6; color: #333; margin-top: 30px;">
          If you have any questions or need to update your information, please don't hesitate to contact our support team.
        </p>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #666; font-size: 14px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    </div>
  `;

  return await sendEmail({
    to: callerEmail,
    subject: "Welcome to Our Emergency Response System",
    html: html,
  });
};

export const sendCallerRegistrationEmail = async (
  callerEmail: string,
  callerName: string,
  username: string,
  password: string
): Promise<boolean> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg,rgb(237, 239, 241) 0%,rgb(219, 235, 246) 100%); color: #0a3d62; padding: 30px; text-align: center;">
        <div style="margin-bottom: 20px;">
          <img src="https://res.cloudinary.com/dycvkezau/image/upload/v1751786166/WhatsApp_Image_2025-07-03_at_10.39.29_245bf40b-removebg-preview_iwumxs.png" 
               alt="Company Logo" 
               style="max-width: 150px; height: auto; margin: 0 auto; display: block;">
        </div>
        <h1 style="margin: 0; font-size: 28px;">Account Created Successfully!</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Your caller account is ready</p>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa;">
        <h2 style="color: #0a3d62; margin-bottom: 20px;">Hello ${callerName},</h2>
        
        <p style="line-height: 1.6; color: #333; margin-bottom: 20px;">
          Your account has been successfully created in our Display Doctor system. Below are your login credentials:
        </p>
        
        <div style="background: #e8f4fd; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #0a3d62;">
          <h3 style="color: #0a3d62; margin-top: 0;">Your Login Credentials</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Username:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-family: monospace; color: #0a3d62;">${username}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Password:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-family: monospace; color: #0a3d62;">${password}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #856404; margin-top: 0;">Important Security Notice</h3>
          <ul style="color: #856404; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>Please change your password after your first login</li>
            <li>Keep your credentials secure and don't share them</li>
            <li>Your account is now active in our Display Doctor system</li>
            <li>You can update your profile information anytime</li>
          </ul>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #0a3d62; margin-top: 0;">What You Can Do</h3>
          <ul style="color: #333; line-height: 1.8;">
            <li>Access your Display Doctor profile</li>
            <li>Update your contact information</li>
            <li>View your Display Doctor history</li>
            <li>Manage your emergency contacts</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="/login" style="background: #0a3d62; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Login to Your Account
          </a>
        </div>
        
        <div style="background: #e8f4fd; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #0a3d62; margin-top: 0;">Need Help?</h3>
          <p style="color: #333; margin-bottom: 10px;">
            If you have any questions or need assistance, please contact our support team:
          </p>
          <p style="color: #0a3d62; font-weight: bold; margin: 0;">
            Support Email: support@emergencyresponse.com<br>
            Support Phone: +1-800-EMERGENCY
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #666; font-size: 14px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    </div>
  `;

  return await sendEmail({
    to: callerEmail,
    subject: "Display Doctor On-Boarding Credentials",
    html: html,
  });
};

export const sendTechnicianRegistrationEmail = async (
  technicianEmail: string,
  technicianName: string,
  username: string,
  password: string
): Promise<boolean> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg,rgb(237, 239, 241) 0%,rgb(219, 235, 246) 100%); color: #0a3d62; padding: 30px; text-align: center;">
        <div style="margin-bottom: 20px;">
          <img src="https://res.cloudinary.com/dycvkezau/image/upload/v1751786166/WhatsApp_Image_2025-07-03_at_10.39.29_245bf40b-removebg-preview_iwumxs.png" 
               alt="Company Logo" 
               style="max-width: 150px; height: auto; margin: 0 auto; display: block;">
        </div>
        <h1 style="margin: 0; font-size: 28px;">Technician Account Created Successfully!</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Your technician account is ready</p>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa;">
        <h2 style="color: #0a3d62; margin-bottom: 20px;">Hello ${technicianName},</h2>
        
        <p style="line-height: 1.6; color: #333; margin-bottom: 20px;">
          Your technician account has been successfully created in our Display Doctor system. Below are your login credentials:
        </p>
        
        <div style="background: #e8f4fd; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #0a3d62;">
          <h3 style="color: #0a3d62; margin-top: 0;">Your Login Credentials</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Username:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-family: monospace; color: #0a3d62;">${username}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Password:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-family: monospace; color: #0a3d62;">${password}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #856404; margin-top: 0;">Important Security Notice</h3>
          <ul style="color: #856404; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>Please change your password after your first login</li>
            <li>Keep your credentials secure and don't share them</li>
            <li>Your technician account is now active in our Display Doctor system</li>
            <li>You can update your profile information anytime</li>
          </ul>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #0a3d62; margin-top: 0;">What You Can Do</h3>
          <ul style="color: #333; line-height: 1.8;">
            <li>Access your technician dashboard</li>
            <li>View and manage service requests</li>
            <li>Update your skills and specializations</li>
            <li>Track your service history</li>
            <li>Manage your availability schedule</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="/login" style="background: #0a3d62; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Login to Your Account
          </a>
        </div>
        
        <div style="background: #e8f4fd; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #0a3d62; margin-top: 0;">Need Help?</h3>
          <p style="color: #333; margin-bottom: 10px;">
            If you have any questions or need assistance, please contact our support team:
          </p>
          <p style="color: #0a3d62; font-weight: bold; margin: 0;">
            Support Email: support@emergencyresponse.com<br>
            Support Phone: +1-800-EMERGENCY
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #666; font-size: 14px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    </div>
  `;

  return await sendEmail({
    to: technicianEmail,
    subject: "Display Doctor Technician On-Boarding Credentials",
    html: html,
  });
};


