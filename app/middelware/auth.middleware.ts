import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/unified.response";
import {
  verifyAccessToken,
  verifyRefreshToken,
  generateAccessToken,
} from "../utils/generate.token";
import { JwtPayload } from "../types/auth.types";
import STATUS_CODES from "../utils/status.codes";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Middleware to check if user is authenticated and attach user data
export const authChecker = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const accessToken = req.cookies.accessToken;
    if (!accessToken) throw new Error();
    const decodeduser = (await verifyAccessToken(accessToken)) as JwtPayload;
    const userdata: JwtPayload = {
      id: decodeduser.id,
      role: decodeduser.role,
      email: decodeduser.email,
    };
    req.user = userdata;
    next();
  } catch (error) {
    try {
      const refreshToken = req.cookies.refreshToken;
      const decodeduser = (await verifyRefreshToken(
        refreshToken
      )) as JwtPayload;
      const userdata: JwtPayload = {
        id: decodeduser.id,
        role: decodeduser.role,
        email: decodeduser.email,
      };
      req.user = userdata;
      const newAccessToken = await generateAccessToken(userdata);
      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
      });
      next();
    } catch (error) {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      res.redirect("/login");
    }
  }
};

export const roleChecker = (allowedRoles:string[])=>{
 return (req:Request,res:Response,next:NextFunction)=>{
       if(!req.user){
          return sendError(res,'Login required',null,STATUS_CODES.UNAUTHORIZED)
       }
       const userRole = req.user.role
       if(!userRole){
        return sendError(res,'No roles found',null,STATUS_CODES.FORBIDDEN)
       }
       if(!allowedRoles.includes(userRole)){
        return sendError(res, "Insufficient permissions",null,STATUS_CODES.FORBIDDEN);
       }
       next()
 }
}
