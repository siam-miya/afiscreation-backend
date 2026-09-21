import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    icon: { type: String, default: "" }, // আইকনের পাথ বা URL
    parent: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Category", 
        default: null 
    }, // যদি null হয় তবে এটি Main Category, আর ID থাকলে এটি Subcategory
}, { timestamps: true });

export default mongoose.model("Category", categorySchema);