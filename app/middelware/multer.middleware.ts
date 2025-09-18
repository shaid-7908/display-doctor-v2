import multer from "multer";
import path from "path";
import fs from "fs";
import envConfig from "../config/env.config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Request, Response, NextFunction } from "express";
import { v4 as uuid } from 'uuid';

// Configure AWS S3 client
const s3 = new S3Client({
  region: envConfig.AWS_REGION!,
  credentials: {
    accessKeyId: envConfig.AWS_ACCESS_KEY_ID!,
    secretAccessKey: envConfig.AWS_SECRET_ACCESS_KEY!,
  },
});

// Multer configuration - use memory storage for S3 uploads
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only video and image files are allowed!"));
    }
  },
});

// Async middleware to upload files to S3
export const uploadTechnicianFilesToS3 = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const files = req.files as {
      aadhaarPhoto?: Express.Multer.File[];
      profilePhoto?: Express.Multer.File[];
    };

    const aadhaarPhoto = files?.aadhaarPhoto?.[0];
    const profilePhoto = files?.profilePhoto?.[0];

    if (!aadhaarPhoto || !profilePhoto) {
      res.status(400).json({ message: "Both aadhaar photo and profile photo are required" });
      return;
    }

    // Upload aadhaar photo
    const aadhaarExt = aadhaarPhoto.mimetype.split("/")[1];
    const aadhaarKey = `technician-documents/aadhaar/${uuid()}.${aadhaarExt}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: envConfig.AWS_S3_BUCKET_NAME!,
        Key: aadhaarKey,
        Body: aadhaarPhoto.buffer,
        ContentType: aadhaarPhoto.mimetype,
      })
    );

    // Upload profile photo
    const profileExt = profilePhoto.mimetype.split("/")[1];
    const profileKey = `technician-documents/profile/${uuid()}.${profileExt}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: envConfig.AWS_S3_BUCKET_NAME!,
        Key: profileKey,
        Body: profilePhoto.buffer,
        ContentType: profilePhoto.mimetype,
      })
    );

    // Add S3 URLs to request body
    req.body.aadhaarPhotoUrl = `https://${envConfig.AWS_S3_BUCKET_NAME}.s3.${envConfig.AWS_REGION}.amazonaws.com/${aadhaarKey}`;
    req.body.profilePhotoUrl = `https://${envConfig.AWS_S3_BUCKET_NAME}.s3.${envConfig.AWS_REGION}.amazonaws.com/${profileKey}`;

    next();
  } catch (error) {
    console.error("S3 Upload Error:", error);
    res.status(500).json({ message: "S3 upload failed", error });
  }
};

export const uploadMulitplePhotoToS3 = async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const photos = files?.photos;

    if (!photos || photos.length === 0) {
      res.status(400).json({ message: "No photos uploaded" });
      return;
    }

    // Upload each photo to S3
    const uploadedUrls = await Promise.all(
      photos.map(async (photo) => {
        const ext = photo.mimetype.split("/")[1];
        const key = `uploads/photos/${uuid()}.${ext}`;

        await s3.send(
          new PutObjectCommand({
            Bucket: envConfig.AWS_S3_BUCKET_NAME!,
            Key: key,
            Body: photo.buffer,
            ContentType: photo.mimetype,
          })
        );

        return `https://${envConfig.AWS_S3_BUCKET_NAME}.s3.${envConfig.AWS_REGION}.amazonaws.com/${key}`;
      })
    );

    // Add URLs to request body
    req.body.photosUrls = uploadedUrls;

    next();
  } catch (error) {
    console.error("S3 Upload Error:", error);
    res.status(500).json({ message: "S3 upload failed", error });
  }
}

// Export the multer upload middleware and S3 uploader
export const technicianProfileUpload = upload.fields([
  { name: "aadhaarPhoto", maxCount: 1 },
  { name: "profilePhoto", maxCount: 1 },
]);

export const singelUpload = upload.single('image');


