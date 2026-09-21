import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: function() { return !this.googleId; } },
  googleId: { type: String, default: null },
  picture: { type: String, default: "" },
  address: { type: String, default: "" }, // নতুন অ্যাড্রেস ফিল্ড যুক্ত করা হলো
  role: { type: String, enum: ["customer", "moderator", "admin"], default: "customer" },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpire: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date },
}, { timestamps: true });

userSchema.pre("save", async function() {
  if (!this.isModified("password") || !this.password) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;