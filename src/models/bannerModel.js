import mongoose from "mongoose";


const bannerSchema = new mongoose.Schema(

  {

    smallHeading: {

      type: String,

      required: true,

      default:
        "Exclusive Collection",

      trim: true,

    },


    mainHeading: {

      type: String,

      required: true,

      default:
        "Elegant Abaya",

      trim: true,

    },


    discountText: {

      type: String,

      default: "",

      trim: true,

    },


    image: {

      type: String,

      required: true,

    },


    link: {

      type: String,

      default: "/products",

      trim: true,

    },


    isActive: {

      type: Boolean,

      default: true,

    },

  },

  {
    timestamps: true,
  }

);


export default mongoose.model(
  "Banner",
  bannerSchema
);