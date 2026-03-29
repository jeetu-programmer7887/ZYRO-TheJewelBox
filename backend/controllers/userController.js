import userModel from "../models/userModel.js";
import httpStatus from "http-status";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sendVerificationEmail from "../middleware/sendVerificationEmail.js";

const createToken = (id) => {
  return jwt.sign({ id, role: 'user' }, process.env.JWT_SECRET);
};

//Route for Login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    //For Admin Login only
    if (email === process.env.ADMIN_EMAIL) {

      if (password === process.env.ADMIN_PASSWORD) {
        // Creating OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Sending OTP to the user via mail
        const sent = await sendVerificationEmail(email, otp);
        if (!sent) return res.status(500).json({ message: "Failed to send OTP" });

        const OTP = jwt.sign({ OTP: otp }, process.env.JWT_SECRET);

        res.cookie("OTP", OTP, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
          maxAge: 1000 * 90
        });

        return res
          .json({
            success: true,
            isAdmin: true,
            password: true,
            message: "Admin Logged In",
            email: email
          });
      } else {
        return res
          .json({
            success: false,
            isAdmin: true,
            password: false,
            message: "Invalid Credentials",
          });
      }
    }

    const user = await userModel.findOne({ email });

    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ success: false, message: "Email is not registered" });
    }

    // If already signed up using google
    if (user.isGoogleAuth) {
      return res.status(httpStatus.CONFLICT).json({
        success: false,
        message: "Login with google",
      });
    }

    // Email is not verified
    if (!user.verified) {
      const remainingTime = Math.ceil((user.otpExpiry - Date.now()) / 1000);
      return res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: `You requested an OTP. Try again in ${remainingTime} seconds.`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      // If Passwords matches 
      const token = createToken(user._id);

      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      return res.json({
        success: true,
        message: "User logged in successfully",
        username: user.firstName + " " + user.lastName,
        email: user.email,
      });
    } else {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ success: false, message: "Invalid Password" });
    }
  } catch (error) {
    console.log("User Login Error : ", error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

//Route for Registeration
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    //Check for admin email
    if (email == process.env.ADMIN_EMAIL) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ success: false, message: "This email cannot be registered." });
    }

    //checking if user exists
    const exists = await userModel.findOne({ email });

    if (exists) {
      if (exists.verified) {
        return res.status(httpStatus.CONFLICT).json({
          success: false,
          message: "User already exists."
        })
      } else if (exists.isGoogleAuth) {
        return res.status(httpStatus.CONFLICT).json({
          success: false,
          message: "Sign in with Google"
        })
      } else {
        const remainingTime = Math.ceil((exists.otpExpiry - Date.now()) / 1000)
        return res.status(httpStatus.TOO_EARLY).json({
          success: false,
          message: `You already requested an OTP. Try in ${remainingTime} seconds.`
        })
      }
    }

    //Validating Email and password
    if (!validator.isEmail(email)) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ success: false, message: "Please enter a valid email" });
    }

    if (password.length < 8) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Password must have at least 8 characters",
      });
    }

    // Creating OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    //Hashing the password
    const hashedPassword = await bcrypt.hash(password, 10);

    //Saving User into database
    const newUser = await userModel.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      verified: false,
      verificationCode: otp,
      otpExpiry: Date.now() + 90 * 1000,
      verificationExpireAt: new Date(Date.now() + 90 * 1000),
    });

    // Sending OTP to the user via mail
    const sent = await sendVerificationEmail(email, otp);
    if (!sent) return res.status(500).json({ message: "Failed to send OTP" });

    return res.json({
      success: true,
      message: "Verification code sent to your email",
      userId: newUser._id,
    });
  } catch (error) {
    console.log("Email Verification Error: ", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

//For google Login & SignUP
const withGoogle = async (req, res) => {
  try {
    const { firstName, lastName, email, isGoogleAuth, googleId } = req.body;

    //Check for admin email
    if (email == process.env.ADMIN_EMAIL) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ success: false, message: "This email cannot be registered." });
    }

    //checking user exists
    const exists = await userModel.findOne({ email });

    if (exists) {
      //  If user exits then Login 
      const token = createToken(exists._id);

      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      return res.status(httpStatus.CREATED).json({
        success: true,
        message: "User Logged in successfully",
        username: exists.firstName + " " + exists.lastName,
        email: exists.email,
      });
    }

    //Register the new user
    const newUser = new userModel({
      firstName,
      lastName,
      email,
      isGoogleAuth,
      googleId,
    });
    const user = await newUser.save();

    // If new user then register first  
    const token = createToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return res.status(httpStatus.CREATED).json({
      success: true,
      message: "User registered successfully",
      username: user.firstName + " " + user.lastName,
      email: user.email,
    });
  } catch (error) {
    console.log("Google Registeration Error", error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

//For Verifying the email
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Check for the email
    const user = await userModel.findOne({ email });

    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid request" });

    // DELETE IF OTP EXPIRED
    if (user.otpExpiry < Date.now()) {
      await userModel.deleteOne({ email });
      return res.status(400).json({
        success: false,
        message: "OTP expired. User is not verified.",
      });
    }

    // MAX 3 ATTEMPTS CHECK
    if (user.verificationAttempts >= 3) {
      await userModel.deleteOne({ email });
      return res.status(400).json({
        success: false,
        message: "Too many attempts. User could not registered",
      });
    }

    // WRONG OTP CHECK
    const isMatch = otp == user.verificationCode;

    if (!isMatch) {
      user.verificationAttempts += 1;
      await user.save();
      return res.status(400).json({
        success: false,
        message:
          "Incorrect otp, attempts left: " + (3 - user.verificationAttempts),
      });
    }

    // SUCCESS – VERIFY
    user.verified = true;
    user.verificationCode = null;
    user.verificationAttempts = null;
    user.otpExpiry = null;
    user.verificationExpireAt = null;

    await user.save();

    const token = createToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      username: `${user.firstName} ${user.lastName}`,
      email: user.email
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//For sending otp if forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });

    const user = await userModel.findOne({ email });

    if (!user)
      return res.status(404).json({
        success: false,
        message: "User not found with this email",
      });

    if (user.isGoogleAuth) {
      return res.status(httpStatus.FORBIDDEN).json({
        success: true,
        message: "Login with google",
      });
    }

    if (!user.verified)
      return res.status(400).json({
        success: false,
        message: "Email not verified. Please verify your account first.",
      });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    if (user.verified) {
      user.verificationCode = otp;
      user.otpExpiry = Date.now() + 90 * 1000;
      await user.save();
    }

    const sent = await sendVerificationEmail(email, otp);

    if (!sent) return res.status(500).json({ message: "Failed to send OTP" })

    return res.status(200).json({
      success: true,
      message: "OTP sent to your registered email",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

//For verifying OTP for forgot password
const verifyForgot = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!otp) return res.status(400).json({ message: "OTP is required" });

    const user = await userModel.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request" });
    }

    // Check if otp is expired
    if (user.otpExpiry < Date.now()) {
      user.verificationCode = null;
      user.otpExpiry = null;
      user.verificationExpireAt = null;
      return res.status(400).json({
        success: false,
        message: "OTP expired. User is not verified.",
      });
    }

    // WRONG OTP CHECK
    const isMatch = otp == user.verificationCode;

    if (!isMatch) {
      user.verificationAttempts += 1;
      await user.save();
      if ((3 - user.verificationAttempts) == 0) {
        user.verificationAttempts = 0;
        await user.save();
        return res.status(400).json({
          success: false,
          message:
            "OTP could not verified."
        });
      }
      return res.status(400).json({
        success: false,
        message:
          "Incorrect OTP, attempts left: " + (3 - user.verificationAttempts),
      });
    }

    // SUCCESS – VERIFY
    user.verificationCode = null;
    user.verificationAttempts = 0;
    user.otpExpiry = null;
    user.verificationExpireAt = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//For Reseting the password
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // INPUT CHECK
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password is required",
      });
    }

    //IF PASSWORD LENGTH <8
    if (newPassword.length < 8) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Password must have at least 8 characters",
      });
    }

    // FIND USER
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // BLOCK GOOGLE AUTH USERS
    if (user.isGoogleAuth) {
      return res.status(403).json({
        success: false,
        message:
          "This account uses Google Login. Password cannot be reset manually.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // UPDATE PASSWORD
    user.password = hashedPassword;

    user.verificationCode = null;
    user.otpExpiry = null;
    user.verificationAttempts = 0;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

//For getting profile data
const getMyProfile = async (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    mobile: user.mobile,
    pincode: user.pincode,
    birthdate: user.birthdate,
    gender: user.gender
  });
};

//For profile Update
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, mobile, pincode, birthdate, gender } = req.body;

    const updatedUser = await userModel.findByIdAndUpdate(
      req.user._id,
      {
        firstName,
        lastName,
        mobile,
        pincode,
        birthdate,
        gender
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User with this email not found.",
      });
    }

    return res.status(httpStatus.CREATED).json({
      success: true,
      message: "Profile updated successfully.",
    });

  } catch (error) {
    console.error("Profile Update Error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the profile.",
    });
  }
}

//For deleting the account
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Delete the user from the database
    const deletedUser = await userModel.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User account could not be found.",
      });
    }

    // Clear the authentication cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    return res.status(200).json({
      success: true,
      message: "Your account has been permanently deleted.",
    });

  } catch (error) {
    console.error("Delete Account Error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the account.",
    });
  }
};

//For logout 
const logoutUser = (req, res) => {
  try {
    // Clear the cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error during logout"
    });
  }
};

export {
  loginUser, registerUser, verifyEmail,
  withGoogle, getMyProfile, updateProfile, deleteAccount,
  forgotPassword, verifyForgot, resetPassword,
  logoutUser,
};