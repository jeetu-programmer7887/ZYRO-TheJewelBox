import productModel from "../models/productModel.js";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

//Gives all products list
const listProducts = async (req, res) => {
  try {
    const allProducts = await productModel.find({}).select({
      _id: 1,
      title: 1,
      slug: 1,
      price: 1,
      comparePrice: 1,
      thumbnail: 1,
      category: 1,
      variants: 1,
      images: { $slice: 2 },
    });

    return res.json({ success: true, allProducts });
  } catch (error) {
    console.log("Product Listing Error : ", error);
    return res.json({ success: false, message: error.message });
  }
};

// To get all details of a single product by ID
const getProductDetails = async (req, res) => {
  try {
    const { id } = req.params;

    let product = null;

    const isValidObjectId = id.match(/^[0-9a-fA-F]{24}$/);
    if (isValidObjectId) {
      product = await productModel.findById(id);
    }

    if (!product) {
      product = await productModel.findOne({ slug: id });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      product,
    });
  } catch (error) {
    console.log("Get Product Details Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//AI studio
const analyzeImage = async (req, res) => {
  try {
    const { imageData, mediaType } = req.body;

    if (!imageData || !mediaType) {
      return res.status(400).json({
        success: false,
        message: "imageData and mediaType are required",
      });
    }

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
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
              text: `You are a professional jewelry and fashion stylist.
                    Return raw JSON only. Do not include 'Based on the image' or any other introductory text. Start your response with '{' and end with '}'.
                    
                    CRITICAL VALIDATION STEPS:
                    1. Check if a human is clearly visible. If it's an object, paper, or landscape, set "isPersonDetected" to false.
                    2. Check image clarity and lighting. If the image is too dark, extremely blurry, or overexposed, set "isQualityAcceptable" to false.
                    3.This is the most important step. If the neckline is cropped out of the frame or if it is not visible clearly, you MUST set "necklineType" to "Unknown" and set the confidence to 0.

                    Analyze this photo and return ONLY a valid JSON object:
                    {
                    "isPersonDetected": boolean,
                    "isQualityAcceptable": boolean,
                    "qualityIssue": "None" | "Poor Lighting" | "Blurry" | "No Person Detected" | "Too Far Away" | "Neckline Not Detected",
                    "skinTone": "Fair / Light Cool" | "Fair / Light Warm" | "Medium Cool" | "Medium Warm" | "Olive / Neutral" | "Tan / Deep Warm" | "Deep Cool" | "Deep Warm" | "Unknown",
                    "necklineType": "V-Neck" | "Sweetheart" | "Square" | "Boat Neck" | "Asymmetrical" | "Strapless" | "U-Shape" | "Round" | "Halter" | "Off-Shoulder" | "Unknown",
                    "outfitColorName": string,
                    "outfitColorHex": string,
                    "confidence": number 0-100,
                    "stylistNote": string
                    }`,
            },
          ],
        },
      ],
      max_tokens: 600,
      temperature: 0.1,
    });

    const raw = response.choices[0].message.content
      .replace(/```json|```/g, "")
      .trim();
    const parsed = JSON.parse(raw);
   

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
    console.log("Groq Analysis Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Analysis failed. Our stylist is temporarily unavailable.",
    });
  }
};


//To get stock details
const getStock = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Calculate total stock across all variants
    const totalStock = product.variants.reduce(
      (acc, variant) => acc + variant.stock,
      0,
    );

    res.json({
      count: totalStock,
      isLowStock: totalStock > 0 && totalStock < 10,
      outOfStock: totalStock === 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export { listProducts, getStock, analyzeImage, getProductDetails };
