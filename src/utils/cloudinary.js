import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

// Cloudinary  Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//upload on Cloudinay  wrapper

export const uploadOnCloudinary = async (localPath) => {
  try {
    if (localPath) {
      //if valid local - path
      const uploadStatus = await cloudinary.uploader.upload(localPath, {
        resource_type: "auto",
      });
      return uploadStatus;
    } else {
      console.log("Invalid localpath - filePath ");
      return null;
    }
  } catch (err) {
    console.log("Error while Uploading to Cloudinary !");
    return null;
  }
};
