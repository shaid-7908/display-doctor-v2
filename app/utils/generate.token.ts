import jwt from "jsonwebtoken";
import { JwtPayload } from "../types/auth.types";
import envConfig from "../config/env.config";

export const generateAccessToken = (user: JwtPayload) => {
  return jwt.sign(
    {
      email: user.email,
      id: user.id,
      role: user.role,
    },
    envConfig.JWT_SECRET,
    {
      expiresIn: "10s",
    }
  );
};

export const generateRefreshToken = (user: JwtPayload) => {
  return jwt.sign(
    { email: user.email, id: user.id, role: user.role },
    envConfig.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, envConfig.JWT_SECRET);
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, envConfig.JWT_SECRET);
};
