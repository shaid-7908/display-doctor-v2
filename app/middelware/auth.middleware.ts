import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/unified.response";
import {
  verifyAccessToken,
  verifyRefreshToken,
  generateAccessToken,
} from "../utils/generate.token";
import { JwtPayload } from "../types/auth.types";

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
