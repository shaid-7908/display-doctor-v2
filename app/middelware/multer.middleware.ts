import multer from "multer";
import path from "path";
import fs from "fs";
import envConfig from "../config/env.config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const aws_secret = envConfig.AWS_SECRET_ACCESS_KEY;
const aws_access_key_id = envConfig.AWS_ACCESS_KEY_ID;
const aws_region = envConfig.AWS_REGION;
const aws_bucket_name = envConfig.AWS_S3_BUCKET_NAME;
// keep everything in memory so you can do:
//   await bucket.file(...).save(file.buffer, …)
// export const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: 5 * 1024 * 1024, // e.g. 5MB max per file
//   },
// });


//For using files to store locally

// Set upload directory
const uploadDir = path.join(__dirname, "../../uploads");

// // Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({ storage });
