import Settings from "../models/settingsModel.js";

import { v2 as cloudinary } from "cloudinary";

const getCloudinaryPublicId =
    (imageUrl) => {

        if (!imageUrl) {
            return null;
        }

        try {

            const urlParts =
                imageUrl.split("/");

            const uploadIndex =
                urlParts.indexOf(
                    "upload"
                );

            if (
                uploadIndex === -1
            ) {

                return null;

            }

            let publicId =
                urlParts
                    .slice(
                        uploadIndex + 1
                    )
                    .join("/");


            // Version remove

            publicId =
                publicId.replace(
                    /^v\d+\//,
                    ""
                );


            // Extension remove

            publicId =
                publicId.replace(
                    /\.[^/.]+$/,
                    ""
                );


            return publicId;

        } catch (error) {

            console.error(
                "Cloudinary Public ID Error:",
                error
            );

            return null;

        }

    };


// GET Settings

export const getSettings =
    async (
        req,
        res
    ) => {

        try {

            let settings =
                await Settings.findOne();


            // First time hole settings create

            if (!settings) {

                settings =
                    await Settings.create({});

            }


            res.status(200).json({

                success: true,

                data:
                    settings,

            });

        } catch (error) {

            console.error(
                "Error fetching settings:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Server Error",

            });

        }

    };


// UPDATE Settings

export const updateSettings =
    async (
        req,
        res
    ) => {

        try {

            const updateData =
                {
                    ...req.body,
                };


            // Boolean fields

            const booleanFields = [

                "enableFloatingHub",

                "enableWhatsapp",

                "enableMessenger",

                "enablePhoneCall",

                "enableEmail",

                "topbarEnabled",

            ];


            booleanFields.forEach(
                (field) => {

                    if (
                        updateData[field] !==
                        undefined
                    ) {

                        updateData[field] =
                            updateData[field] ===
                            true ||
                            updateData[field] ===
                            "true";

                    }

                }
            );


            // Find existing settings

            let settings =
                await Settings.findOne();


            // =========================
            // LOGO
            // =========================

            if (
                req.files &&
                req.files.logo &&
                req.files.logo[0]
            ) {

                const newLogo =
                    req.files.logo[0];


                // Old logo delete

                if (
                    settings &&
                    settings.logo
                ) {

                    try {

                        const oldLogoPublicId =
                            getCloudinaryPublicId(
                                settings.logo
                            );


                        if (
                            oldLogoPublicId
                        ) {

                            await cloudinary
                                .uploader
                                .destroy(
                                    oldLogoPublicId
                                );

                        }

                    } catch (error) {

                        console.error(
                            "Old Logo Delete Error:",
                            error
                        );

                    }

                }


                // New logo URL

                updateData.logo =
                    newLogo.path;

            }


            // =========================
            // FAVICON
            // =========================

            if (
                req.files &&
                req.files.favicon &&
                req.files.favicon[0]
            ) {

                const newFavicon =
                    req.files.favicon[0];


                // Old favicon delete

                if (
                    settings &&
                    settings.favicon
                ) {

                    try {

                        const oldFaviconPublicId =
                            getCloudinaryPublicId(
                                settings.favicon
                            );


                        if (
                            oldFaviconPublicId
                        ) {

                            await cloudinary
                                .uploader
                                .destroy(
                                    oldFaviconPublicId
                                );

                        }

                    } catch (error) {

                        console.error(
                            "Old Favicon Delete Error:",
                            error
                        );

                    }

                }


                // New favicon URL

                updateData.favicon =
                    newFavicon.path;

            }


            // =========================
            // CREATE / UPDATE
            // =========================

            if (!settings) {

                settings =
                    await Settings.create(
                        updateData
                    );

            } else {

                settings =
                    await Settings.findOneAndUpdate(

                        {},

                        updateData,

                        {
                            new: true,
                            runValidators: true,
                        }

                    );

            }


            res.status(200).json({

                success: true,

                message:
                    "Settings updated successfully!",

                data:
                    settings,

            });

        } catch (error) {

            console.error(
                "Error updating settings:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Server Error",

                error:
                    error.message,

            });

        }

    };