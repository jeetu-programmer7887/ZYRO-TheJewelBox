import productModel from "../models/productModel.js";
import mongoose from "mongoose";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Public catalogue responses can be cached briefly by browsers and by the
// CDN in front of the API; stale copies are served while a fresh one loads.
const PUBLIC_CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

//Gives all products list
const listProducts = async (req, res) => {
  try {
    const allProducts = await productModel.find({ isActive: { $ne: false } }).select({
      _id: 1,
      title: 1,
      slug: 1,
      price: 1,
      comparePrice: 1,
      thumbnail: 1,
      category: 1,
      variants: 1,
      averageRating: 1,
      createdAt: 1,
      images: { $slice: 2 },
    }).lean();

    res.set('Cache-Control', PUBLIC_CACHE);
    return res.json({ success: true, allProducts });
  } catch (error) {
    console.error("Product Listing Error:", error);
    return res.status(500).json({ success: false, message: "Couldn't load products" });
  }
};

// To get all details of a single product by ID or slug
const getProductDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string" || id.length > 200) {
      return res.status(400).json({ success: false, message: "Invalid product" });
    }

    const filter = mongoose.isValidObjectId(id) && /^[0-9a-fA-F]{24}$/.test(id)
      ? { $or: [{ _id: id }, { slug: id }] }
      : { slug: id };
    const product = await productModel.findOne({ ...filter, isActive: { $ne: false } }).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.set('Cache-Control', PUBLIC_CACHE);
    return res.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Get Product Details Error:", error);
    return res.status(500).json({
      success: false,
      message: "Couldn't load this product",
    });
  }
};

//AI studio
const analyzeImage = async (req, res) => {
  try {
    const { imageData, mediaType } = req.body;

    if (typeof imageData !== "string" || !imageData || typeof mediaType !== "string" || !mediaType) {
      return res.status(400).json({
        success: false,
        message: "imageData and mediaType are required",
      });
    }
    if (!/^image\/(jpeg|png|webp)$/.test(mediaType)) {
      return res.status(400).json({ success: false, message: "Please upload a JPEG, PNG or WebP photo." });
    }
    if (imageData.length > 4 * 1024 * 1024 || !/^[A-Za-z0-9+/=\s]+$/.test(imageData.slice(0, 1000))) {
      return res.status(400).json({ success: false, message: "This photo is too large or invalid. Please try a smaller one." });
    }

    const stylistPrompt = `You are a professional jewelry and fashion stylist.
                    Return raw JSON only. Do not include 'Based on the image' or any other introductory text. Start your response with '{' and end with '}'.

                    CRITICAL VALIDATION STEPS:
                    1. Check if a human is clearly visible. If it's an object, paper, or landscape, set "isPersonDetected" to false.
                    2. Check image clarity and lighting. If the image is too dark, extremely blurry, or overexposed, set "isQualityAcceptable" to false.
                    3. This is the most important step. If the neckline is cropped out of the frame or if it is not visible clearly, you MUST set "necklineType" to "Unknown" and set the confidence to 0.

                    Analyze this photo and return ONLY a valid JSON object:
                    {
                    "isPersonDetected": boolean,
                    "isQualityAcceptable": boolean,
                    "qualityIssue": "None" | "Poor Lighting" | "Blurry" | "No Person Detected" | "Too Far Away" | "Neckline Not Detected",
                    "skinTone": "Fair / Light Cool" | "Fair / Light Warm" | "Medium Cool" | "Medium Warm" | "Olive / Neutral" | "Tan / Deep Warm" | "Deep Cool" | "Deep Warm" | "Unknown",
                    "necklineType": "V-Neck" | "Sweetheart" | "Square" | "Boat Neck" | "Asymmetrical" | "Strapless" | "U-Shape" | "Round" | "Halter" | "Off-Shoulder" | "Unknown",
                    "outfitColorName": string,
                    "outfitColorHex": string,
                    "outfitColorTemp": "warm" | "cool" | "neutral",
                    "confidence": number 0-100,
                    "stylistNote": string
                    }`;

    const buildMessages = () => [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mediaType};base64,${imageData}`,
            },
          },
          {
            type: "text",
            text: stylistPrompt,
          },
        ],
      },
    ];

    let response;
    try {
      response = await groq.chat.completions.create({
        model: "qwen/qwen3.6-27b",
        response_format: { type: "json_object" },
        reasoning_effort: "none",
        messages: buildMessages(),
        max_tokens: 1200,
        temperature: 0.1,
      });
    } catch (apiError) {
      if (apiError?.error?.code === "json_validate_failed" || apiError?.status === 400) {
        console.warn(
          "Strict JSON mode failed, retrying without response_format:",
          apiError.message
        );
        try {
          response = await groq.chat.completions.create({
            model: "qwen/qwen3.6-27b",
            reasoning_effort: "none",
            messages: buildMessages(),
            max_tokens: 1200,
            temperature: 0.1,
          });
        } catch (retryError) {
          console.error(
            "Groq API call failed on retry:",
            retryError.status,
            retryError.message
          );
          return res.status(500).json({
            success: false,
            message: "Analysis failed. Our stylist is temporarily unavailable.",
          });
        }
      } else {
        // Auth errors, model errors, rate limits, etc.
        console.error("Groq API call failed:", apiError.status, apiError.message);
        return res.status(500).json({
          success: false,
          message: "Analysis failed. Our stylist is temporarily unavailable.",
        });
      }
    }

    let raw = response.choices[0].message.content
      .replace(/```json|```/g, "")
      .trim();

    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      raw = raw.slice(firstBrace, lastBrace + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      console.error("Failed to parse model output as JSON. Raw output was:", raw);
      return res.status(500).json({
        success: false,
        message: "Analysis failed. Our stylist is temporarily unavailable.",
      });
    }

    // 1. Check if a person exists
    if (!parsed.isPersonDetected) {
      return res.status(422).json({
        success: false,
        message:
          "We couldn't find a person in this photo. Please upload a clear picture of yourself.",
      });
    }

    // 2. Check for lighting/clarity issues
    if (!parsed.isQualityAcceptable) {
      let errorMsg = "The image quality is too low for an accurate analysis.";
      if (parsed.qualityIssue === "Poor Lighting")
        errorMsg = "The photo is too dark. Please try again in a well-lit area.";
      if (parsed.qualityIssue === "Blurry")
        errorMsg = "The photo is too blurry. Please take a steadier shot.";
      return res.status(422).json({
        success: false,
        message: errorMsg,
      });
    }

    // 3. Final Confidence Check
    if (parsed.confidence < 40) {
      return res.status(422).json({
        success: false,
        message:
          "We're having trouble analyzing this photo. Please ensure your outfit and neckline are clearly visible.",
      });
    }

    // 4. Check if the neckline is visible clearly
    if (parsed.necklineType === "Unknown" || parsed.qualityIssue === "Neckline Not Detected") {
      return res.status(422).json({
        success: false,
        message:
          "We couldn't clearly see your neckline. Try uploading a clear image.",
      });
    }

    // If all checks pass
    return res.json({ success: true, ...parsed });
  } catch (error) {
    console.error("Groq Analysis Error:", error);
    return res.status(500).json({
      success: false,
      message: "Analysis failed. Our stylist is temporarily unavailable.",
    });
  }
};

//To get stock details
const getStock = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid product" });
    }
    const product = await productModel.findById(req.params.id).select("variants").lean();

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Calculate total stock across all variants
    const totalStock = (product.variants || []).reduce(
      (acc, variant) => acc + Math.max(0, variant.stock || 0),
      0,
    );

    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      count: totalStock,
      isLowStock: totalStock > 0 && totalStock < 10,
      outOfStock: totalStock === 0,
    });
  } catch (error) {
    console.error("Get Stock Error:", error);
    res.status(500).json({ success: false, message: "Couldn't check stock" });
  }
};

export { listProducts, getStock, analyzeImage, getProductDetails };
