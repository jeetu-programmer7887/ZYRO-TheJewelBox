import jwt from "jsonwebtoken";
import productModel from "../models/productModel.js";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import fs from "fs";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import sendOrderEmail from '../middleware/sendOrderEmail.js';

const getRandomCoins = () => Math.floor(Math.random() * 6) + 5;

const addCoins = async (userId, coins, orderId) => {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  await userModel.findByIdAndUpdate(userId, {
    $inc: {
      coinsPresent: coins,
      coinsEarned: coins,
    },
    $push: {
      coinsHistory: {
        type: "earned",
        coins,
        reason: `Earned for delivered order`,
        orderId,
        expiresAt,
      },
    },
  });
};

const deductCoins = async (userId, coins, reason, orderId) => {
  await userModel.findByIdAndUpdate(userId, {
    $inc: {
      coinsPresent: -coins,
      coinsDeducted: coins, // track lifetime deducted
    },
    $push: {
      coinsHistory: {
        type: "deducted",
        coins,
        reason,
        orderId,
      },
    },
  });
};

const verifyAdmin = (req, res) => {
  const OTP = req.cookies.OTP;
  const userOTP = req.body.otp;
  const email = req.body.email;

  if (!OTP) {
    return res.status(401).json({ success: false, message: "OTP NOT FOUND" });
  }

  const decoded_otp = jwt.verify(OTP, process.env.JWT_SECRET);

  if (decoded_otp.OTP !== userOTP) {
    return res.status(403).json({ success: false, message: "Invalid OTP" });
  }

  if (decoded_otp !== userOTP) {
    const token = jwt.sign(
      { id: process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD },
      process.env.JWT_SECRET,
    );

    // Clear the cookies
    res.clearCookie("OTP", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      isAdmin: true,
      isVerified: true,
      message: "Admin Logged In",
      email: email,
    });
  } else {
    return res.json({
      success: false,
      isVerified: false,
      message: "Invalid Credential",
    });
  }
};

const getAdminDetails = (req, res) => {
  res.json({
    success: true,
    firstName: "ADMIN",
    lastName: "PANEL",
    email: process.env.ADMIN_EMAIL,
  });
};

const logoutAdmin = (req, res) => {
  try {
    // Clear the cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    return res.status(200).json({
      success: true,
      message: "Admin Logged out.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error during logout",
    });
  }
};

const removeProduct = async (req, res) => {
  try {
    const prodId = req.params.id;

    if (!prodId) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID is required" });
    }

    const removedItem = await productModel.findByIdAndDelete(prodId);

    if (!removedItem) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Product removed successfully" });
  } catch (error) {
    console.error("Error removing product: ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 1. Fetch Paginated Orders (Showing all, including cancelled, for the list)
    const allOrders = await orderModel
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "firstName lastName email");

    // 2. Calculate Global Stats (Filtering out Cancelled orders)
    const globalStats = await orderModel.aggregate([
      {
        // STAGE 1: Only look at active/completed orders for revenue and order counts
        $match: { status: { $ne: "Cancelled" } },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: {
            // Sum amount only where payment is confirmed
            $sum: { $cond: [{ $eq: ["$payment", true] }, "$amount", 0] },
          },
          pendingCount: {
            $sum: {
              $cond: [{ $ne: ["$status", "Delivered"] }, 1, 0],
            },
          },
          deliveredCount: {
            $sum: { $cond: [{ $eq: ["$status", "Delivered"] }, 1, 0] },
          },
        },
      },
    ]);

    // Provide defaults if no active orders exist
    const stats = globalStats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      pendingCount: 0,
      deliveredCount: 0,
    };

    res.json({
      success: true,
      allOrders,
      stats,
    });
  } catch (error) {
    console.error("Fetch Orders Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    // ── 1. FETCH & VALIDATE ORDER 
    const existingOrder = await orderModel.findById(orderId);
    if (!existingOrder) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (existingOrder.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled and cannot be modified",
      });
    }

    if (existingOrder.status === "Returned") {
      return res.status(400).json({
        success: false,
        message: "Returned orders cannot be modified",
      });
    }

    // ── 2. RETURN GUARD — must have been requested first ─
    if (status === "Returned" && existingOrder.status !== "Return Requested") {
      return res.status(400).json({
        success: false,
        message: "Cannot approve return — customer has not requested a return yet",
      });
    }

    // ── 3. BUILD UPDATE FIELDS
    const updateFields = { status };

    if (status === "Delivered") {
      updateFields.deliveryDate = new Date();
      updateFields.payment = true;
    }

    if (status === "Cancelled") {
      updateFields.payment = false;
    }

    // ── 4. SIDE EFFECTS BEFORE SAVING

    // Cancelled — restore stock
    if (status === "Cancelled") {
      for (const item of existingOrder.items) {
        const product = await productModel.findById(item.productId);
        if (!product) continue;
        if (item.variantSku === "Standard") {
          product.variants[0].stock += item.quantity;
        } else {
          const variant = product.variants.find((v) => v.sku === item.variantSku);
          if (variant) variant.stock += item.quantity;
        }
        await product.save();
      }
    }

    // Returned — deduct coins earned from this order + restore stock
    if (status === "Returned") {
      // Deduct coins if they were awarded
      if (existingOrder.coinsAwarded && existingOrder.coinsEarned > 0) {
        const user = await userModel
          .findById(existingOrder.userId)
          .select("coinsPresent");
        const coinsToDeduct = Math.min(existingOrder.coinsEarned, user.coinsPresent);
        if (coinsToDeduct > 0) {
          await deductCoins(
            existingOrder.userId,
            coinsToDeduct,
            `Coins deducted for returned order`,
            orderId,
          );
        }
      }

      // Restore stock on return
      for (const item of existingOrder.items) {
        const product = await productModel.findById(item.productId);
        if (!product) continue;
        if (item.variantSku === "Standard") {
          product.variants[0].stock += item.quantity;
        } else {
          const variant = product.variants.find((v) => v.sku === item.variantSku);
          if (variant) variant.stock += item.quantity;
        }
        await product.save();
      }
    }

    // ── 5. PERSIST STATUS UPDATE 
    const updatedOrder = await orderModel.findByIdAndUpdate(
      orderId,
      updateFields,
      { new: true, runValidators: true },
    );

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // ── 6. AWARD COINS ON DELIVERY (once only) 
    if (status === "Delivered" && !existingOrder.coinsAwarded) {
      const coinsToAdd = getRandomCoins();
      await addCoins(updatedOrder.userId, coinsToAdd, orderId);
      await orderModel.findByIdAndUpdate(orderId, {
        coinsAwarded: true,
        coinsEarned: coinsToAdd,
      });
    }

    // ── 7. SEND EMAIL NOTIFICATION 
    const notifyStatuses = ["Cancelled", "Returned", "Delivered", "Out for delivery"];
    if (notifyStatuses.includes(status)) {
      try {
        await sendOrderEmail(updatedOrder.address.email, updatedOrder);
      } catch (emailError) {
        console.error("Email failed to send, but order was updated:", emailError);
      }
    }

    // ── 8. RESPOND
    return res.status(200).json({
      success: true,
      message:
        status === "Delivered"
          ? "Order delivered, payment confirmed, and coins awarded"
          : status === "Returned"
            ? "Order returned, stock restored, and coins deducted"
            : status === "Cancelled"
              ? "Order cancelled and stock restored"
              : `Status updated to ${status} successfully`,
      order: updatedOrder,
    });

  } catch (error) {
    console.error("Error in updating order status:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const addProduct = async (req, res) => {
  let uploadedPublicIds = []; // Tracking Cloudinary IDs for rollback
  const localFilePaths = []; // Tracking local files for cleanup

  try {
    const {
      title,
      description,
      category,
      price,
      comparePrice,
      brand,
      slug,
      material,
      plating,
      isAntiTarnish,
      tags,
      variants,
      featured,
      isActive,
    } = req.body;

    // 1. FAIL FAST: Validate required fields before processing images
    if (!title || !price || !category) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing: Title, Price, or Category",
      });
    }

    // 2. Safe JSON Parsing
    let parsedTags, parsedVariants;
    try {
      parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags || [];
      parsedVariants =
        typeof variants === "string" ? JSON.parse(variants) : variants || [];
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: "Invalid format for tags or variants",
      });
    }

    // Default Tags
    if (!Array.isArray(parsedTags) || parsedTags.length === 0) {
      parsedTags = ["trending", "new-arrival"];
    }

    const generateCustomId = (title) => {
      const prefix = title.trim().substring(0, 2).toUpperCase();

      const uniquePart = Date.now().toString().slice(-6);

      return `${prefix}-${uniquePart}`;
    };

    // Default Variants
    if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
      parsedVariants = [
        {
          color: "Gold colour",
          sku: generateCustomId(title),
          stock: 0,
        },
      ];
    }

    // 3. Extract Image Files & Track Paths
    const imageKeys = ["image1", "image2", "image3", "image4"];
    const imageFiles = imageKeys
      .map((key) => req.files?.[key]?.[0])
      .filter((item) => item !== undefined && item !== null);

    imageFiles.forEach((file) => localFilePaths.push(file.path));

    // 4. Upload to Cloudinary with Tracking
    const imagesUrl = await Promise.all(
      imageFiles.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: "image",
          folder: `products/${category}s`,
        });
        uploadedPublicIds.push(result.public_id);
        return result.secure_url;
      }),
    );

    // 5. Construct Data Object
    const productData = {
      title: title.trim(),
      slug: slug ? slug.trim().toUpperCase() : generateCustomId(title),
      brand: brand || "PRAO",
      category,
      description,
      material,
      plating,
      price: Number(price),
      comparePrice: Number(comparePrice) || 0,
      tags: parsedTags,
      variants: parsedVariants.filter((v) => v.sku),
      isAntiTarnish: isAntiTarnish === "true" || isAntiTarnish === true,
      featured: featured === "true" || featured === true,
      isActive: isActive === "true" || isActive === true,
      images: imagesUrl,
      thumbnail: imagesUrl[0] || "",
    };

    // 6. Save to Database
    const product = new productModel(productData);
    await product.save();

    // 7. Success Cleanup: Remove local temp files
    localFilePaths.forEach(
      (path) => fs.existsSync(path) && fs.unlinkSync(path),
    );

    return res.status(201).json({
      success: true,
      message: "Product Added Successfully",
      productId: product._id,
    });
  } catch (error) {
    // --- ERROR & ROLLBACK PHASE ---
    console.error("Critical Failure. Initializing cleanup...");

    // A. Delete from Cloudinary if upload happened but DB failed
    if (uploadedPublicIds.length > 0) {
      await Promise.all(
        uploadedPublicIds.map((id) => cloudinary.uploader.destroy(id)),
      );
    }

    // B. Delete local temp files (always cleanup)
    localFilePaths.forEach(
      (path) => fs.existsSync(path) && fs.unlinkSync(path),
    );

    // C. Specific Error Responses
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.code === 11000) {
      console.log("Duplicate field:", error.keyValue);
      return res.status(400).json({
        success: false,
        message: "Product with this SKU/Slug already exists",
      });
    }

    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const editProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      brand,
      category,
      description,
      tags,
      material,
      plating,
      price,
      comparePrice,
      isAntiTarnish,
      featured,
      isActive,
      variants,
      images,
      thumbnail,
    } = req.body;

    const updatedProduct = await productModel.findByIdAndUpdate(
      id,
      {
        title,
        brand,
        category,
        description,
        tags,
        material,
        plating,
        isAntiTarnish,
        featured,
        isActive,
        price: Number(price),
        comparePrice: Number(comparePrice),
        variants,
        images,
        thumbnail,
        slug: title.toLowerCase().split(" ").join("-") + "-" + Date.now(),
      },
      { new: true, runValidators: true },
    );

    if (!updatedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    console.error("Backend Edit Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const { range } = req.query;
    let startDate = new Date();

    if (range === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setDate(startDate.getDate() - (parseInt(range) || 30));
    }

    // 1. KPIs (Filtered by range)
    const statsPromise = orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: "Cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const customerCountPromise = userModel.countDocuments();

    // 2. Low Stock
    const lowStockPromise = productModel.aggregate([
      { $unwind: "$variants" },
      { $group: { _id: "$_id", totalStock: { $sum: "$variants.stock" } } },
      { $match: { totalStock: { $lt: 10 } } },
      { $count: "count" },
    ]);

    // 3. Category Distribution
    const categoryDataPromise = productModel.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    // 4. Order Status Distribution (Filtered)
    const orderStatusPromise = orderModel.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // 5. Sales Trend
    const salesTrendPromise = orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: "Cancelled" },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$amount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 6. Leaderboard
    const topProductsPromise = orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: "Cancelled" },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          title: { $first: "$items.title" },
          image: { $first: "$items.image" },
          totalSold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);

    // 7. Recent Orders (For UI - Limit 5)
    const recentOrdersPromise = orderModel
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userId", "firstName lastName email");

    // 8. NEW: Export Data (All orders in range - No Limit)
    const exportDataPromise = orderModel
      .find({ createdAt: { $gte: startDate } })
      .sort({ createdAt: -1 })
      .populate("userId", "firstName lastName email");

    const [
      stats,
      customerCount,
      lowStock,
      categoryData,
      orderStatus,
      salesTrend,
      topProducts,
      recentOrders,
      exportData,
    ] = await Promise.all([
      statsPromise,
      customerCountPromise,
      lowStockPromise,
      categoryDataPromise,
      orderStatusPromise,
      salesTrendPromise,
      topProductsPromise,
      recentOrdersPromise,
      exportDataPromise,
    ]);

    res.json({
      success: true,
      kpis: {
        totalRevenue: stats[0]?.totalRevenue || 0,
        totalOrders: stats[0]?.totalOrders || 0,
        totalCustomers: customerCount,
        lowStockCount: lowStock[0]?.count || 0,
      },
      charts: {
        categoryDistribution: categoryData,
        orderStatusDistribution: orderStatus,
        salesTrend: salesTrend,
      },
      topProducts,
      recentOrders,
      exportData, // This ensures your CSV has all orders for the range
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const exportOrdersData = async (req, res) => {
  try {
    const orders = await orderModel
      .find({})
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });

    const flatData = orders.map((order) => ({
      orderId: order._id,
      date: order.createdAt,
      customer: `${order.userId?.firstName} ${order.userId?.lastName}`,
      email: order.userId?.email,
      totalAmount: order.amount,
      status: order.status,
      paymentMethod: order.paymentMethod,
    }));

    res.json({ success: true, data: flatData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const contactUs = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // 1. Validation — now includes subject
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const api_key = process.env.BREVO_API_KEY;
    const Brevo_url = "https://api.brevo.com/v3/smtp/email";

    // 2. Admin notification email
    const emailData = {
      sender: { name: "ZYRO Contact Request", email: process.env.ADMIN_EMAIL },
      to: [{ email: "zyrojewellery9395@gmail.com" }],
      replyTo: { email: email, name: name },
      subject: `NEW INQUIRY: ${subject}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; border: 1px solid #2e4a3e; padding: 25px; border-radius: 20px; color: #2e4a3e;">
          <h2 style="color: #c6a664; border-bottom: 1px solid #eee; padding-bottom: 10px;">New Message from ZYRO Website</h2>
          <p><strong>Customer Name:</strong> ${name}</p>
          <p><strong>Customer Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 10px; border-left: 4px solid #c6a664; margin-top: 15px;">
            <p style="margin: 0;"><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
        </div>
      `,
    };

    await axios.post(Brevo_url, emailData, {
      headers: {
        "Content-Type": "application/json",
        "api-key": api_key,
      },
    });

    res.status(200).json({ success: true, message: "Inquiry forwarded to admin." });

  } catch (error) {
    console.error("Contact Email Error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Could not forward inquiry." });
  }
};

export {
  logoutAdmin,
  getAdminDetails,
  verifyAdmin,
  removeProduct,
  getOrders,
  updateOrderStatus,
  addProduct,
  editProduct,
  getDashboardStats,
  exportOrdersData,
  contactUs
};
