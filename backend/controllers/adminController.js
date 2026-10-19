import mongoose from "mongoose";
import productModel from "../models/productModel.js";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import fs from "fs";
import axios from "axios";
import validator from "validator";
import { v2 as cloudinary } from "cloudinary";
import { transitionOrder, OrderTransitionError, refundOrder } from "../services/orderLifecycle.js";
import { clearAuthCookie, asEmail, asString } from "../utils/security.js";

const getAdminDetails = (req, res) => {
  res.json({
    success: true,
    firstName: "ADMIN",
    lastName: "PANEL",
    email: process.env.ADMIN_EMAIL,
  });
};

const logoutAdmin = (req, res) => {
  clearAuthCookie(res);
  return res.status(200).json({ success: true, message: "Admin Logged out." });
};

const removeProduct = async (req, res) => {
  try {
    const prodId = req.params.id;

    if (!mongoose.isValidObjectId(prodId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product ID" });
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
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    // 1. Fetch Paginated Orders (Showing all, including cancelled, for the list)
    const allOrders = await orderModel
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "firstName lastName email")
      .lean();

    // 2. Calculate Global Stats (Filtering out Cancelled orders)
    const globalStats = await orderModel.aggregate([
      {
        // STAGE 1: Only look at active/completed orders for revenue and order counts
        $match: { status: { $nin: ["Cancelled", "Pending Payment", "Returned"] } },
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
    res.status(500).json({ success: false, message: "Couldn't load orders" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    if (!mongoose.isValidObjectId(orderId) || typeof status !== "string") {
      return res.status(400).json({ success: false, message: "Invalid request" });
    }
    if (status === "Return Requested" || status === "Pending Payment") {
      return res.status(400).json({ success: false, message: "This status is set automatically" });
    }

    const updatedOrder = await transitionOrder(orderId, status);

    let message = `Status updated to ${status} successfully`;
    if (status === "Delivered") message = "Order delivered and coins awarded";
    if (status === "Returned") message = "Order returned, stock restored, and coins adjusted";
    if (status === "Cancelled") {
      message = updatedOrder.refundStatus === "pending"
        ? "Order cancelled. The online payment is marked for refund."
        : "Order cancelled and stock restored";
    }

    return res.status(200).json({ success: true, message, order: updatedOrder });
  } catch (error) {
    if (error instanceof OrderTransitionError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error("Error in updating order status:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Retry a refund that failed at the gateway (or was never started)
const retryRefund = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order" });
    }
    const order = await orderModel.findById(orderId).lean();
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (order.paymentMethod !== "Razorpay" || !order.payment) {
      return res.status(400).json({ success: false, message: "Only paid online orders can be refunded here" });
    }
    if (!["Cancelled", "Returned"].includes(order.status)) {
      return res.status(400).json({ success: false, message: "Cancel or return the order before refunding it" });
    }
    if (order.refundStatus === "processed" || order.refundStatus === "pending") {
      return res.status(409).json({ success: false, message: `Refund is already ${order.refundStatus}` });
    }

    const updated = await refundOrder(orderId, "Refund retried by admin");
    const ok = updated?.refundStatus === "processed" || updated?.refundStatus === "pending";
    return res.status(ok ? 200 : 502).json({
      success: ok,
      message: ok ? "Refund initiated" : `Refund failed: ${updated?.refundError || "gateway error"}`,
      order: updated,
    });
  } catch (error) {
    console.error("Retry Refund Error:", error);
    return res.status(500).json({ success: false, message: "Couldn't retry the refund" });
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
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const body = req.body || {};
    const update = {};
    for (const field of ["title", "brand", "category", "description", "material", "plating", "thumbnail"]) {
      if (typeof body[field] === "string") update[field] = body[field].trim();
    }
    for (const field of ["isAntiTarnish", "featured", "isActive"]) {
      if (body[field] !== undefined) update[field] = body[field] === true || body[field] === "true";
    }
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({ success: false, message: "Price must be a positive number" });
      }
      update.price = price;
    }
    if (body.comparePrice !== undefined && body.comparePrice !== "" && body.comparePrice !== null) {
      const comparePrice = Number(body.comparePrice);
      if (!Number.isFinite(comparePrice) || comparePrice < 0) {
        return res.status(400).json({ success: false, message: "Compare price must be a number" });
      }
      update.comparePrice = comparePrice;
    }
    if (Array.isArray(body.tags)) update.tags = body.tags.filter((t) => typeof t === "string");
    if (Array.isArray(body.images)) update.images = body.images.filter((u) => typeof u === "string");
    if (Array.isArray(body.variants)) {
      const variants = body.variants
        .filter((v) => v && typeof v.sku === "string" && v.sku.trim())
        .map((v) => ({
          ...(v._id ? { _id: v._id } : {}),
          color: typeof v.color === "string" ? v.color : "",
          sku: v.sku.trim(),
          stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
        }));
      if (!variants.length) {
        return res.status(400).json({ success: false, message: "At least one variant with a SKU is required" });
      }
      update.variants = variants;
    }
    if (update.title === "") {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    // The slug is part of product URLs, so it is never regenerated on edit.
    const updatedProduct = await productModel.findByIdAndUpdate(
      id,
      { $set: update },
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
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: "Some product fields are invalid" });
    }
    res.status(500).json({ success: false, message: "Couldn't update the product" });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const { range } = req.query;
    let startDate = new Date();

    if (range === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else {
      const days = Math.min(365, Math.max(1, parseInt(range) || 30));
      startDate.setDate(startDate.getDate() - days);
    }

    // 1. KPIs (Filtered by range)
    const statsPromise = orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $nin: ["Cancelled", "Pending Payment", "Returned"] },
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
          status: { $nin: ["Cancelled", "Pending Payment", "Returned"] },
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
          status: { $nin: ["Cancelled", "Pending Payment", "Returned"] },
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
      .populate("userId", "firstName lastName email")
      .lean();

    // 8. NEW: Export Data (All orders in range - No Limit)
    const exportDataPromise = orderModel
      .find({ createdAt: { $gte: startDate } })
      .sort({ createdAt: -1 })
      .limit(5000)
      .populate("userId", "firstName lastName email")
      .lean();

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
      .select("userId amount status paymentMethod createdAt")
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean();

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
    console.error("Export Orders Error:", error);
    res.status(500).json({ success: false, message: "Couldn't export orders" });
  }
};

const contactUs = async (req, res) => {
  try {
    const rawName = asString(req.body.name, { max: 100 });
    const email = asEmail(req.body.email);
    const rawSubject = asString(req.body.subject, { max: 200 });
    const rawMessage = asString(req.body.message, { max: 5000 });

    // 1. Validation — now includes subject
    if (!rawName || !email || !rawSubject || !rawMessage) {
      return res.status(400).json({ success: false, message: "Please fill in all fields with a valid email." });
    }

    // Customer input goes into an HTML email, so escape it
    const name = validator.escape(rawName);
    const subject = validator.escape(rawSubject);
    const message = validator.escape(rawMessage);

    const api_key = process.env.BREVO_API_KEY;
    const Brevo_url = "https://api.brevo.com/v3/smtp/email";

    // 2. Admin notification email
    const emailData = {
      sender: { name: "ZYRO Contact Request", email: process.env.ADMIN_EMAIL },
      to: [{ email: "zyrojewellery9395@gmail.com" }],
      replyTo: { email: email, name: rawName },
      subject: `NEW INQUIRY: ${rawSubject.replace(/[\r\n]+/g, " ")}`,
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
      timeout: 10000,
    });

    res.status(200).json({ success: true, message: "Inquiry forwarded to admin." });

  } catch (error) {
    console.error("Contact Email Error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Could not forward inquiry." });
  }
};

export {
  retryRefund,
  logoutAdmin,
  getAdminDetails,
  removeProduct,
  getOrders,
  updateOrderStatus,
  addProduct,
  editProduct,
  getDashboardStats,
  exportOrdersData,
  contactUs
};
