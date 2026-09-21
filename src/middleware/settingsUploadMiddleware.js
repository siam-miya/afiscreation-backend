import { v2 as cloudinary } from "cloudinary";

import { CloudinaryStorage } from "multer-storage-cloudinary";

import multer from "multer";

import dotenv from "dotenv";

dotenv.config();


// Cloudinary Configuration

cloudinary.config({

    cloud_name:
        process.env.CLOUDINARY_CLOUD_NAME,

    api_key:
        process.env.CLOUDINARY_API_KEY,

    api_secret:
        process.env.CLOUDINARY_API_SECRET,

});


// Settings Storage

const storage =
    new CloudinaryStorage({

        cloudinary: cloudinary,

        params: {

            folder:
                "afiscreation/settings",

            allowed_formats: [
                "jpg",
                "jpeg",
                "png",
                "webp",
                "ico",
            ],

            transformation: [
                {
                    quality: "auto",
                    fetch_format: "auto",
                },
            ],

        },

    });


// Multer

const upload =
    multer({

        storage: storage,

        limits: {

            fileSize:
                5 * 1024 * 1024,

        },

        fileFilter:
            (req, file, cb) => {

                if (
                    file.mimetype.startsWith(
                        "image/"
                    )
                ) {

                    cb(
                        null,
                        true
                    );

                } else {

                    cb(
                        new Error(
                            "Only image files are allowed"
                        )
                    );

                }

            },

    });


export default upload;