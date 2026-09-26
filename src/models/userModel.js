import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 150,
    },

    password: {
      type: String,
      select: false,
    },

    googleId: {
      type: String,
      default: null,
      index: true,
    },

    picture: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
      maxlength: 500,
    },

    role: {
      type: String,
      enum: ["customer", "moderator", "admin"],
      default: "customer",
      index: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    otpHash: {
      type: String,
      select: false,
    },

    otpExpire: {
      type: Date,
      select: false,
    },

    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    resetPasswordToken: {
      type: String,
      select: false,
    },

    resetPasswordExpire: {
      type: Date,
      select: false,
    },

    resetPasswordAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    refreshTokenHash: {
      type: String,
      select: false,
    },

    refreshTokenExpire: {
      type: Date,
      select: false,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Password hashing
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) {
    return;
  }

  const salt = await bcrypt.genSalt(12);

  this.password = await bcrypt.hash(
    this.password,
    salt
  );
});

// Password comparison
userSchema.methods.matchPassword = async function (
  enteredPassword
) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(
    enteredPassword,
    this.password
  );
};

export default mongoose.model("User", userSchema);