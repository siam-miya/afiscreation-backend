import Banner from "../models/bannerModel.js";

import { v2 as cloudinary } from "cloudinary";


// GET: Sob active banner fetch korar jonno

export const getBanners = async (
  req,
  res,
  next
) => {

  try {

    const banners =
      await Banner.find({
        isActive: true,
      }).sort({
        createdAt: -1,
      });


    res.status(200).json({

      success: true,

      data: banners,

    });

  } catch (error) {

    next(error);

  }

};


// GET: Admin-er jonno shob banner

export const getAllBannersAdmin =
  async (
    req,
    res,
    next
  ) => {

    try {

      const banners =
        await Banner.find({})
          .sort({
            createdAt: -1,
          });


      res.status(200).json({

        success: true,

        data: banners,

      });

    } catch (error) {

      next(error);

    }

  };


// POST: Notun banner create

export const createBanner =
  async (
    req,
    res,
    next
  ) => {

    try {

      const {
        smallHeading,
        mainHeading,
        discountText,
        link,
      } = req.body;


      // Image check

      if (!req.file) {

        return res.status(400).json({

          success: false,

          message:
            "Banner image is required",

        });

      }


      // Cloudinary image URL

      const image =
        req.file.path;


      const newBanner =
        await Banner.create({

          smallHeading:
            smallHeading ||
            "Exclusive Collection",

          mainHeading:
            mainHeading ||
            "Elegant Abaya",

          discountText:
            discountText || "",

          image:

            image,

          link:
            link ||
            "/products",

          isActive:
            true,

        });


      res.status(201).json({

        success: true,

        message:
          "Banner created successfully",

        data: newBanner,

      });

    } catch (error) {

      console.error(
        "Create Banner Error:",
        error
      );

      next(error);

    }

  };


// PUT: Banner update

export const updateBanner =
  async (
    req,
    res,
    next
  ) => {

    try {

      const { id } =
        req.params;


      const {
        smallHeading,
        mainHeading,
        discountText,
        link,
        isActive,
      } = req.body;


      const banner =
        await Banner.findById(
          id
        );


      if (!banner) {

        return res.status(404).json({

          success: false,

          message:
            "Banner not found",

        });

      }


      // New image upload hole

      if (req.file) {

        // Puraton Cloudinary image delete

        try {

          if (banner.image) {

            const imageUrl =
              banner.image;


            const urlParts =
              imageUrl.split("/");


            const uploadIndex =
              urlParts.indexOf(
                "upload"
              );


            if (
              uploadIndex !== -1
            ) {

              let publicId =
                urlParts
                  .slice(
                    uploadIndex + 1
                  )
                  .join("/");


              // version remove

              publicId =
                publicId.replace(
                  /^v\d+\//,
                  ""
                );


              // extension remove

              publicId =
                publicId.replace(
                  /\.[^/.]+$/,
                  ""
                );


              await cloudinary.uploader.destroy(
                publicId
              );

            }

          }

        } catch (error) {

          console.error(
            "Old Cloudinary image delete error:",
            error
          );

        }


        // New image URL

        banner.image =
          req.file.path;

      }


      if (
        smallHeading !==
        undefined
      ) {

        banner.smallHeading =
          smallHeading;

      }


      if (
        mainHeading !==
        undefined
      ) {

        banner.mainHeading =
          mainHeading;

      }


      if (
        discountText !==
        undefined
      ) {

        banner.discountText =
          discountText;

      }


      if (
        link !==
        undefined
      ) {

        banner.link =
          link ||
          "/products";

      }


      if (
        isActive !==
        undefined
      ) {

        banner.isActive =
          isActive === true ||
          isActive === "true";

      }


      const updatedBanner =
        await banner.save();


      res.status(200).json({

        success: true,

        message:
          "Banner updated successfully",

        data:
          updatedBanner,

      });

    } catch (error) {

      console.error(
        "Update Banner Error:",
        error
      );

      next(error);

    }

  };


// DELETE: Banner delete

export const deleteBanner =
  async (
    req,
    res,
    next
  ) => {

    try {

      const { id } =
        req.params;


      const banner =
        await Banner.findById(
          id
        );


      if (!banner) {

        return res.status(404).json({

          success: false,

          message:
            "Banner not found",

        });

      }


      // Cloudinary image delete

      try {

        if (banner.image) {

          const imageUrl =
            banner.image;


          const urlParts =
            imageUrl.split("/");


          const uploadIndex =
            urlParts.indexOf(
              "upload"
            );


          if (
            uploadIndex !== -1
          ) {

            let publicId =
              urlParts
                .slice(
                  uploadIndex + 1
                )
                .join("/");


            publicId =
              publicId.replace(
                /^v\d+\//,
                ""
              );


            publicId =
              publicId.replace(
                /\.[^/.]+$/,
                ""
              );


            await cloudinary.uploader.destroy(
              publicId
            );

          }

        }

      } catch (error) {

        console.error(
          "Cloudinary image delete error:",
          error
        );

      }


      await Banner.findByIdAndDelete(
        id
      );


      res.status(200).json({

        success: true,

        message:
          "Banner deleted successfully",

      });

    } catch (error) {

      console.error(
        "Delete Banner Error:",
        error
      );

      next(error);

    }

  };