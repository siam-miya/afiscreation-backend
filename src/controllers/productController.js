import Product from "../models/productModel.js";

import Category from "../models/categoryModel.js";

import mongoose from "mongoose";

const normalizeColorImages = (
  color,
  thumbnailPath,
  extraImagesPaths,
  existingColorImages = []
) => {
  const imageIndexes = Array.isArray(color?.imageIndexes)
    ? color.imageIndexes
        .map((index) => Number(index))
        .filter(
          (index) =>
            Number.isInteger(index) &&
            (
              index === -1 ||
              (
                index >= 0 &&
                index < extraImagesPaths.length
              )
            )
        )
    : [];

  const mappedImages = imageIndexes
    .map((index) => {
      // -1 means main thumbnail image
      if (index === -1) {
        return thumbnailPath || null;
      }

      return extraImagesPaths[index] || null;
    })
    .filter(Boolean);

  const oldImages = Array.isArray(existingColorImages)
    ? existingColorImages.filter(Boolean)
    : [];

  return [
    ...oldImages,
    ...mappedImages
  ].filter(
    (image, index, array) =>
      array.indexOf(image) === index
  );
};


// =====================================================
// 🟢 Get All Products with Filter, Pagination & Sorting
// =====================================================

export const getProducts = async (req, res) => {
  try {
    const {
      category,
      color,
      minPrice,
      maxPrice,
      search,
      sort,
      limit = 16,
      page = 1
    } = req.query;

    let query = {};


    // =================================================
    // 1️⃣ Category Filter
    // =================================================

    if (
      category &&
      category !== "all"
    ) {
      const isObjectId =
        mongoose.Types.ObjectId.isValid(category);

      const targetCategory =
        await Category.findOne({
          $or: [
            ...(isObjectId
              ? [
                  {
                    _id: category
                  }
                ]
              : []),

            {
              slug: {
                $regex: `^${category}$`,
                $options: "i"
              }
            },

            {
              name: {
                $regex: `^${category}$`,
                $options: "i"
              }
            }
          ]
        });


      if (targetCategory) {
        const subCategories =
          await Category.find({
            parent: targetCategory._id
          });


        const matchedCategories = [
          targetCategory._id,
          targetCategory._id.toString(),
          targetCategory.slug,
          targetCategory.name,

          ...subCategories.map(
            (sub) => sub._id
          ),

          ...subCategories.map(
            (sub) => sub._id.toString()
          ),

          ...subCategories.map(
            (sub) => sub.slug
          ),

          ...subCategories.map(
            (sub) => sub.name
          )
        ];


        query.category = {
          $in: matchedCategories
        };
      }
      else {
        query.category =
          isObjectId
            ? category
            : {
                $regex: `^${category}$`,
                $options: "i"
              };
      }
    }


    // =================================================
    // 2️⃣ COLOR FILTER
    // =================================================

    if (
      color &&
      color !== "all"
    ) {
      const decodedColor =
        decodeURIComponent(color).trim();

      const escapedColor =
        decodedColor.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );


      query.colors = {
        $elemMatch: {
          $or: [
            {
              name: {
                $regex: `^${escapedColor}$`,
                $options: "i"
              }
            },

            {
              code: {
                $regex: `^${escapedColor}$`,
                $options: "i"
              }
            }
          ]
        }
      };
    }


    // =================================================
    // 3️⃣ Price Filter
    // =================================================

    if (
      minPrice ||
      maxPrice
    ) {
      query.price = {};

      if (minPrice) {
        query.price.$gte =
          Number(minPrice);
      }

      if (maxPrice) {
        query.price.$lte =
          Number(maxPrice);
      }
    }


    // =================================================
    // 4️⃣ Search Filter
    // =================================================

    if (search) {
      query.title = {
        $regex: search,
        $options: "i"
      };
    }


    // =================================================
    // 5️⃣ Sorting Logic
    // =================================================

    let sortQuery = {
      createdAt: -1
    };


    if (sort === "low-high") {
      sortQuery = {
        price: 1
      };
    }
    else if (sort === "high-low") {
      sortQuery = {
        price: -1
      };
    }
    else if (sort === "popularity") {
      sortQuery = {
        soldCount: -1
      };
    }
    else if (sort === "latest") {
      sortQuery = {
        createdAt: -1
      };
    }


    // =================================================
    // 6️⃣ Pagination
    // =================================================

    const pageNumber =
      Math.max(
        Number(page) || 1,
        1
      );


    const limitNumber =
      Math.max(
        Number(limit) || 16,
        1
      );


    const skip =
      (pageNumber - 1) *
      limitNumber;


    // =================================================
    // 7️⃣ Get Products
    // =================================================

    const products =
      await Product.find(query)
        .populate("category")
        .sort(sortQuery)
        .limit(limitNumber)
        .skip(skip);


    // =================================================
    // 8️⃣ Total Products
    // =================================================

    const totalProducts =
      await Product.countDocuments(query);


    // =================================================
    // 9️⃣ Response
    // =================================================

    res.status(200).json({
      success: true,

      count:
        products.length,

      total:
        totalProducts,

      totalPages:
        Math.ceil(
          totalProducts /
          limitNumber
        ),

      currentPage:
        pageNumber,

      data:
        products
    });
  }
  catch (error) {
    console.error(
      "Error in getProducts:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message
    });
  }
};


// =====================================================
// 🟢 Get All Unique Colors
// =====================================================

export const getUniqueColors = async (
  req,
  res
) => {
  try {
    const products =
      await Product.find(
        {
          colors: {
            $exists: true,
            $ne: []
          }
        },
        {
          colors: 1
        }
      ).lean();


    const colorMap =
      new Map();


    products.forEach(
      (product) => {
        if (
          !Array.isArray(
            product.colors
          )
        ) {
          return;
        }


        product.colors.forEach(
          (color) => {
            if (
              !color ||
              typeof color !== "object"
            ) {
              return;
            }


            const name =
              color.name?.trim();


            const code =
              color.code?.trim();


            if (!name) {
              return;
            }


            const normalizedName =
              name.toLowerCase();


            if (
              !colorMap.has(
                normalizedName
              )
            ) {
              colorMap.set(
                normalizedName,
                {
                  name: name,

                  code:
                    code ||
                    "#cccccc"
                }
              );
            }
          }
        );
      }
    );


    const uniqueColors =
      Array.from(
        colorMap.values()
      ).sort(
        (a, b) =>
          a.name.localeCompare(
            b.name
          )
      );


    res.status(200).json({
      success: true,

      count:
        uniqueColors.length,

      data:
        uniqueColors
    });
  }
  catch (error) {
    console.error(
      "Error in getUniqueColors:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message
    });
  }
};


// =====================================================
// 🟢 Get Single Product By ID
// =====================================================

export const getProductById = async (
  req,
  res
) => {
  try {
    const product =
      await Product.findById(
        req.params.id
      ).populate("category");


    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found"
      });
    }


    res.status(200).json({
      success: true,
      data:
        product
    });
  }
  catch (error) {
    console.error(
      "Error in getProductById:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message
    });
  }
};


// =====================================================
// 🟢 Get Related Products
// =====================================================

export const getRelatedProducts = async (
  req,
  res
) => {
  try {
    const {
      category,
      currentId
    } = req.params;


    let query = {
      _id: {
        $ne: currentId
      }
    };


    if (
      mongoose.Types.ObjectId.isValid(
        category
      )
    ) {
      query.category =
        category;
    }
    else {
      const targetCategory =
        await Category.findOne({
          $or: [
            {
              slug: category
            },

            {
              name: category
            }
          ]
        });


      if (targetCategory) {
        query.category = {
          $in: [
            targetCategory._id,
            targetCategory._id.toString(),
            targetCategory.slug
          ]
        };
      }
      else {
        query.category =
          category;
      }
    }


    const products =
      await Product.find(query)
        .limit(10)
        .sort({
          createdAt: -1
        });


    res.status(200).json({
      success: true,

      count:
        products.length,

      data:
        products
    });
  }
  catch (error) {
    console.error(
      "Error in getRelatedProducts:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message
    });
  }
};


// =====================================================
// 🟢 Create Product
// =====================================================

export const createProduct = async (
  req,
  res
) => {
  try {
    let parsedColors = [];
    let parsedSizes = [];


    // =================================================
    // Parse Colors
    // =================================================

    if (req.body.colors) {
      try {
        parsedColors =
          typeof req.body.colors === "string"
            ? JSON.parse(
                req.body.colors
              )
            : req.body.colors;
      }
      catch (error) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid colors format"
        });
      }
    }


    // =================================================
    // Parse Sizes
    // =================================================

    if (req.body.sizes) {
      try {
        parsedSizes =
          typeof req.body.sizes === "string"
            ? JSON.parse(
                req.body.sizes
              )
            : req.body.sizes;
      }
      catch (error) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid sizes format"
        });
      }
    }


    // =================================================
    // Uploaded Images
    // =================================================

    const thumbnailPath =
      req.files?.thumbnail
        ? req.files.thumbnail[0].path
        : undefined;


    const sizeChartPath =
      req.files?.sizeChartImage
        ? req.files.sizeChartImage[0].path
        : undefined;


    const extraImagesPaths =
      req.files?.images
        ? req.files.images.map(
            (file) => file.path
          )
        : [];


    // =================================================
    // Thumbnail Color
    // =================================================

    let parsedThumbnailColor = null;


    if (req.body.thumbnailColor) {
      try {
        parsedThumbnailColor =
          typeof req.body.thumbnailColor === "string"
            ? JSON.parse(
                req.body.thumbnailColor
              )
            : req.body.thumbnailColor;
      }
      catch (error) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid thumbnailColor format"
        });
      }
    }


    if (
      parsedThumbnailColor &&
      typeof parsedThumbnailColor === "object"
    ) {
      parsedThumbnailColor = {
        name:
          String(
            parsedThumbnailColor.name || ""
          )
            .trim()
            .toLowerCase(),

        code:
          String(
            parsedThumbnailColor.code ||
            ""
          )
            .trim()
            .toUpperCase()
      };


      if (
        !parsedThumbnailColor.name
      ) {
        parsedThumbnailColor = null;
      }
    }


    // =================================================
    // Normalize Colors
    // =================================================

    parsedColors =
      Array.isArray(parsedColors)
        ? parsedColors
            .filter(
              (color) =>
                color &&
                color.name
            )
            .map(
              (color) => {
                const colorImages =
                  normalizeColorImages(
                    color,
                    thumbnailPath,
                    extraImagesPaths
                  );


                return {
                  name:
                    String(
                      color.name
                    )
                      .trim()
                      .toLowerCase(),

                  code:
                    String(
                      color.code ||
                      "#cccccc"
                    )
                      .trim()
                      .toUpperCase(),

                  images:
                    colorImages
                };
              }
            )
        : [];


    // =================================================
    // Slug
    // =================================================

    const title =
      req.body.title || "";


    const slug =
      title
        .toLowerCase()
        .trim()
        .replace(
          /[^a-z0-9]+/g,
          "-"
        )
        .replace(
          /(^-|-$)+/g,
          ""
        );


    // =================================================
    // Product Data
    // =================================================

    const productData = {
      ...req.body,


      slug,


      shortDescription:
        req.body.shortDescription ||
        "",


      price:
        Number(
          req.body.price || 0
        ),


      costPrice:
        Number(
          req.body.costPrice || 0
        ),


      discountPrice:
        Number(
          req.body.discountPrice || 0
        ),


      stock:
        Number(
          req.body.stock || 0
        ),


      sku:
        req.body.sku || "",


      brand:
        req.body.brand || "",


      metaTitle:
        req.body.metaTitle ||
        "",


      metaDescription:
        req.body.metaDescription ||
        "",


      // =================================================
      // Section Flags
      // =================================================

      isFlashSale:
        req.body.isFlashSale ===
          "true" ||
        req.body.isFlashSale ===
          true,


      isBestSelling:
        req.body.isBestSelling ===
          "true" ||
        req.body.isBestSelling ===
          true,


      isHotProductBanner:
        req.body.isHotProductBanner ===
          "true" ||
        req.body.isHotProductBanner ===
          true,


      isHotProductSection2:
        req.body.isHotProductSection2 ===
          "true" ||
        req.body.isHotProductSection2 ===
          true,


      isExploreProduct:
        req.body.isExploreProduct ===
          "true" ||
        req.body.isExploreProduct ===
          true,


      // =================================================
      // Custom Measurement
      // =================================================

      hasCustomSize:
        req.body.hasCustomSize ===
          "true" ||
        req.body.hasCustomSize ===
          true,


      customizationUnit:
        req.body.customizationUnit ===
          "cm"
          ? "cm"
          : "inch",


      // =================================================
      // Colors & Sizes
      // =================================================

      colors:
        parsedColors,


      sizes:
        parsedSizes,


      thumbnailColor:
        parsedThumbnailColor,


      ...(thumbnailPath && {
        thumbnail:
          thumbnailPath
      }),


      ...(sizeChartPath && {
        sizeChartImage:
          sizeChartPath
      }),


      ...(extraImagesPaths.length > 0 && {
        images:
          extraImagesPaths
      })
    };


    // =================================================
    // Create Product
    // =================================================

    const newProduct =
      new Product(
        productData
      );


    const savedProduct =
      await newProduct.save();


    res.status(201).json({
      success: true,

      data:
        savedProduct
    });
  }
  catch (error) {
    console.error(
      "Error creating product:",
      error
    );

    res.status(400).json({
      success: false,
      message:
        error.message
    });
  }
};


// =====================================================
// 🟢 Update Product
// =====================================================

export const updateProduct = async (
  req,
  res
) => {
  try {
    const productId =
      req.params.id;


    const existingProduct =
      await Product.findById(
        productId
      );


    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found"
      });
    }


    let parsedColors =
      existingProduct.colors;


    let parsedSizes =
      existingProduct.sizes;


    // =================================================
    // Uploaded Thumbnail
    // =================================================

    const thumbnailPath =
      req.files?.thumbnail
        ? req.files.thumbnail[0].path
        : existingProduct.thumbnail;


    // =================================================
    // Uploaded Size Chart
    // =================================================

    const sizeChartPath =
      req.files?.sizeChartImage
        ? req.files.sizeChartImage[0].path
        : existingProduct.sizeChartImage;


    // =================================================
    // Existing Additional Images
    // =================================================

    let extraImagesPaths =
      Array.isArray(
        existingProduct.images
      )
        ? existingProduct.images
        : [];


    // =================================================
    // Add New Additional Images
    // =================================================

    if (
      req.files?.images &&
      req.files.images.length > 0
    ) {
      const newExtra =
        req.files.images.map(
          (file) =>
            file.path
        );


      extraImagesPaths = [
        ...extraImagesPaths,
        ...newExtra
      ];
    }


    // =================================================
    // Parse Thumbnail Color
    // =================================================

    let parsedThumbnailColor =
      existingProduct.thumbnailColor ||
      null;


    if (
      req.body.thumbnailColor !==
      undefined
    ) {
      try {
        parsedThumbnailColor =
          typeof req.body.thumbnailColor === "string"
            ? JSON.parse(
                req.body.thumbnailColor
              )
            : req.body.thumbnailColor;
      }
      catch (error) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid thumbnailColor format"
        });
      }


      if (
        parsedThumbnailColor &&
        typeof parsedThumbnailColor === "object"
      ) {
        parsedThumbnailColor = {
          name:
            String(
              parsedThumbnailColor.name || ""
            )
              .trim()
              .toLowerCase(),

          code:
            String(
              parsedThumbnailColor.code ||
              ""
            )
              .trim()
              .toUpperCase()
        };


        if (
          !parsedThumbnailColor.name
        ) {
          parsedThumbnailColor = null;
        }
      }
      else {
        parsedThumbnailColor = null;
      }
    }


    // =================================================
    // Parse Colors
    // =================================================

    if (
      req.body.colors !==
      undefined
    ) {
      try {
        parsedColors =
          typeof req.body.colors === "string"
            ? JSON.parse(
                req.body.colors
              )
            : req.body.colors;
      }
      catch (error) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid colors format"
        });
      }


      parsedColors =
        Array.isArray(parsedColors)
          ? parsedColors
              .filter(
                (color) =>
                  color &&
                  color.name
              )
              .map(
                (color) => {
                  const existingColorImages =
                    Array.isArray(
                      color.images
                    )
                      ? color.images.filter(
                          Boolean
                        )
                      : [];


                  const colorImages =
                    normalizeColorImages(
                      color,
                      thumbnailPath,
                      extraImagesPaths,
                      existingColorImages
                    );


                  return {
                    name:
                      String(
                        color.name
                      )
                        .trim()
                        .toLowerCase(),

                    code:
                      String(
                        color.code ||
                        "#cccccc"
                      )
                        .trim()
                        .toUpperCase(),

                    images:
                      colorImages
                  };
                }
              )
          : [];
    }


    // =================================================
    // Parse Sizes
    // =================================================

    if (
      req.body.sizes !==
      undefined
    ) {
      try {
        parsedSizes =
          typeof req.body.sizes === "string"
            ? JSON.parse(
                req.body.sizes
              )
            : req.body.sizes;
      }
      catch (error) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid sizes format"
        });
      }
    }


    // =================================================
    // Slug
    // =================================================

    let slug =
      existingProduct.slug;


    if (
      req.body.title &&
      req.body.title !==
        existingProduct.title
    ) {
      slug =
        req.body.title
          .toLowerCase()
          .trim()
          .replace(
            /[^a-z0-9]+/g,
            "-"
          )
          .replace(
            /(^-|-$)+/g,
            ""
          );
    }


    // =================================================
    // Update Data
    // =================================================

    const updateData = {
      ...req.body,


      slug,


      shortDescription:
        req.body.shortDescription !==
        undefined
          ? req.body.shortDescription
          : existingProduct.shortDescription,


      price:
        req.body.price !==
        undefined
          ? Number(
              req.body.price
            )
          : existingProduct.price,


      costPrice:
        req.body.costPrice !==
        undefined
          ? Number(
              req.body.costPrice
            )
          : existingProduct.costPrice,


      discountPrice:
        req.body.discountPrice !==
        undefined
          ? Number(
              req.body.discountPrice
            )
          : existingProduct.discountPrice,


      stock:
        req.body.stock !==
        undefined
          ? Number(
              req.body.stock
            )
          : existingProduct.stock,


      sku:
        req.body.sku !==
        undefined
          ? req.body.sku
          : existingProduct.sku,


      brand:
        req.body.brand !==
        undefined
          ? req.body.brand
          : existingProduct.brand,


      metaTitle:
        req.body.metaTitle !==
        undefined
          ? req.body.metaTitle
          : existingProduct.metaTitle,


      metaDescription:
        req.body.metaDescription !==
        undefined
          ? req.body.metaDescription
          : existingProduct.metaDescription,


      // =================================================
      // Colors & Sizes
      // =================================================

      colors:
        parsedColors,


      sizes:
        parsedSizes,


      thumbnailColor:
        parsedThumbnailColor,


      // =================================================
      // Custom Measurement
      // =================================================

      hasCustomSize:
        req.body.hasCustomSize !==
        undefined
          ? (
              req.body.hasCustomSize ===
                "true" ||
              req.body.hasCustomSize ===
                true
            )
          : existingProduct.hasCustomSize,


      customizationUnit:
        req.body.customizationUnit !==
        undefined
          ? (
              req.body.customizationUnit ===
                "cm"
                ? "cm"
                : "inch"
            )
          : (
              existingProduct.customizationUnit ||
              "inch"
            ),


      // =================================================
      // Section Flags
      // =================================================

      isFlashSale:
        req.body.isFlashSale !==
        undefined
          ? (
              req.body.isFlashSale ===
                "true" ||
              req.body.isFlashSale ===
                true
            )
          : existingProduct.isFlashSale,


      isBestSelling:
        req.body.isBestSelling !==
        undefined
          ? (
              req.body.isBestSelling ===
                "true" ||
              req.body.isBestSelling ===
                true
            )
          : existingProduct.isBestSelling,


      isHotProductBanner:
        req.body.isHotProductBanner !==
        undefined
          ? (
              req.body.isHotProductBanner ===
                "true" ||
              req.body.isHotProductBanner ===
                true
            )
          : existingProduct.isHotProductBanner,


      isHotProductSection2:
        req.body.isHotProductSection2 !==
        undefined
          ? (
              req.body.isHotProductSection2 ===
                "true" ||
              req.body.isHotProductSection2 ===
                true
            )
          : existingProduct.isHotProductSection2,


      isExploreProduct:
        req.body.isExploreProduct !==
        undefined
          ? (
              req.body.isExploreProduct ===
                "true" ||
              req.body.isExploreProduct ===
                true
            )
          : existingProduct.isExploreProduct,


      // =================================================
      // Images
      // =================================================

      thumbnail:
        thumbnailPath,


      sizeChartImage:
        sizeChartPath,


      images:
        extraImagesPaths
    };


    // =================================================
    // Update Product
    // =================================================

    const updatedProduct =
      await Product.findByIdAndUpdate(
        productId,
        updateData,
        {
          new: true,
          runValidators: true
        }
      );


    res.status(200).json({
      success: true,

      message:
        "Product updated successfully",

      data:
        updatedProduct
    });
  }
  catch (error) {
    console.error(
      "Error updating product:",
      error
    );

    res.status(400).json({
      success: false,
      message:
        error.message
    });
  }
};


// =====================================================
// 🟢 Delete Product
// =====================================================

export const deleteProduct = async (
  req,
  res
) => {
  try {
    const product =
      await Product.findByIdAndDelete(
        req.params.id
      );


    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found"
      });
    }


    res.status(200).json({
      success: true,

      message:
        "Product deleted successfully"
    });
  }
  catch (error) {
    res.status(500).json({
      success: false,
      message:
        error.message
    });
  }
};