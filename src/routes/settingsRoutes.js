import express from "express";


import {
    getSettings,
    updateSettings,
} from "../controllers/settingsController.js";


import upload from "../middleware/settingsUploadMiddleware.js";


const router =
    express.Router();


const uploadFields =
    upload.fields([

        {
            name: "logo",
            maxCount: 1,
        },

        {
            name: "favicon",
            maxCount: 1,
        },

    ]);


router.get(
    "/",
    getSettings
);


router.put(
    "/",
    uploadFields,
    updateSettings
);


export default router;