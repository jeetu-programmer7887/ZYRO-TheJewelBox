import productModel from "../models/productModel.js";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

//Gives all products list
const listProducts = async (req, res) => {
    try {
        const allProducts = await productModel.find({})
            .select({
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
}

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
                message: "Product not found"
            });
        }

        return res.json({
            success: true,
            product
        });

    } catch (error) {
        console.log("Get Product Details Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

//AI studio
const analyzeImage = async (req, res) => {
    try {
        const { imageData, mediaType } = req.body;

        if (!imageData || !mediaType) {
            return res.status(400).json({
                success: false,
                message: "imageData and mediaType are required"
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
                                url: `data:${mediaType};base64,${imageData}`
                            }
                        },
                        {
                            type: "text",
                            text: `You are a professional jewelry and fashion stylist.
                    Analyze this photo carefully and return ONLY a valid JSON object — no explanation, no markdown, no backticks:
                            {
                            "skinTone": one of: "Fair / Light Cool" | "Fair / Light Warm" | "Medium Cool" | "Medium Warm" | "Olive / Neutral" | "Tan / Deep Warm" | "Deep Cool" | "Deep Warm",
                            "necklineType": one of: "V-Neck" | "Sweetheart" | "Square" | "Boat Neck" | "Asymmetrical" | "Strapless" | "U-Shape" | "Round" | "Halter" | "Off-Shoulder" | "Unknown",
                            "outfitColorName": plain English color name e.g. "Navy Blue", "Ivory", "Burgundy",
                            "outfitColorHex": best matching hex code,
                            "outfitColorTemp": "warm" | "cool" | "neutral",
                            "confidence": number 0-100,
                            "stylistNote": one sentence of personalized advice
                            }`
                        }
                    ]
                }
            ],
            max_tokens: 600,
            temperature: 0.3 
        });

        const raw = response.choices[0].message.content
            .replace(/```json|```/g, "")
            .trim();

        const parsed = JSON.parse(raw);
        return res.json({ success: true, ...parsed });

    } catch (error) {
        console.log("Groq Analysis Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Analysis failed. Please try again."
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
        const totalStock = product.variants.reduce((acc, variant) => acc + variant.stock, 0);

        res.json({
            count: totalStock,
            isLowStock: totalStock > 0 && totalStock < 10,
            outOfStock: totalStock === 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export { listProducts, getStock, analyzeImage, getProductDetails };
