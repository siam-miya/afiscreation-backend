import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,

  params: {
    folder: "afiscreation/product-images",

    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
      "webp"
    ],

    transformation: [
      {
        width: 1200,
        height: 1200,
        crop: "limit",
        quality: "auto",
        fetch_format: "auto"
      }
    ]
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(
      new Error(
        "Only JPG, JPEG, PNG and WEBP images are allowed."
      ),
      false
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,

  fileFilter
});


export default upload;