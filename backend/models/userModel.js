import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, default: null },

  mobile: { type: Number },
  pincode: { type: Number },
  birthdate: { type: Date },
  gender: { type: String },

  verified: { type: Boolean, default: false },
  verificationCode: { type: String },
  verificationAttempts: { type: Number, default: 0 },
  otpExpiry: { type: Date },

  verificationExpireAt: { type: Date, expires: 0 },
  isGoogleAuth: { type: Boolean, default: false },
  googleId: { type: String, default: null },

  cartData: { type: Object, default: {} },
  wishList: [String],

  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'order' }],

  coinsPresent:{type:Number , default : 0},   
  coinsEarned:{type:Number , default : 0 },   
  coinsDeducted:{type:Number , default : 0 },  
  coinsHistory : [{
    type: {type:String, enum:["earned","deducted","expired"],required:true},
    coins:{type:Number , required:true},
    reason:{type:String,required:true},
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'order',default:null },
    expiresAt:{type:Date},
    date:{type:Date,default:Date.now}
  }]


});

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;