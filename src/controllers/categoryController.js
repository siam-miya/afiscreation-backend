import Category from "../models/categoryModel.js";
import slugify from "slugify";

// ক্যাটাগরি বা সাব-ক্যাটাগরি তৈরি
export const createCategoryController = async (req, res) => {
  try {
    const { name, parent } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const isParent = !parent || parent === "";

    if (isParent && !req.file) {
      return res.status(400).json({ success: false, message: "Main category icon is required" });
    }

    // ডুপ্লিকেট ক্যাটাগরি চেক
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ success: false, message: "Category already exists" });
    }

    const slug = slugify(name, { lower: true, strict: true });
    
    // 🟢 Cloudinary এর সরাসরি HTTPS URL সেভ করা হচ্ছে
    const icon = req.file ? req.file.path : "";

    const newCategory = new Category({
      name,
      slug,
      icon,
      parent: !isParent ? parent : null,
    });

    await newCategory.save();

    res.status(201).json({
      success: true,
      message: !isParent ? "Subcategory created successfully!" : "Main category created successfully!",
      data: newCategory,
    });
  } catch (error) {
    console.error("Error in createCategoryController:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
};

// শুধু মেইন ক্যাটাগরিগুলো ফেচ করা
export const getMainCategoriesController = async (req, res) => {
  try {
    const mainCategories = await Category.find({ parent: null }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: mainCategories,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching main categories", error: error.message });
  }
};

// ট্রি আকারে সব ক্যাটাগরি ও সাব-ক্যাটাগরি ফেচ করা
export const getAllCategoriesController = async (req, res) => {
  try {
    const mainCategories = await Category.find({ parent: null }).sort({ createdAt: -1 });

    const categoriesWithSubs = await Promise.all(
      mainCategories.map(async (cat) => {
        const subcategories = await Category.find({ parent: cat._id });
        return {
          ...cat.toObject(),
          subcategories,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "All categories fetched successfully",
      data: categoriesWithSubs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching categories", error: error.message });
  }
};

// ক্যাটাগরি ডিলিট কন্ট্রোলার
export const deleteCategoryController = async (req, res) => {
  try {
    const { id } = req.params;
    await Category.deleteMany({ parent: id });
    await Category.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error deleting category", error: error.message });
  }
};