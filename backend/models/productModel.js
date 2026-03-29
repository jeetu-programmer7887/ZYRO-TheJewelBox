import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true, index: true },

    brand: String,
    category: { type: String, required: true },

    description: String,
    tags: [String],

    material: String,
    plating: String,
    isAntiTarnish: { type: Boolean, default: true },

    price: { type: Number, required: true },
    comparePrice: { type: Number },

    variants: [
      {
        color: String,
        sku: { type: String, required: true },
        stock: { type: Number, default: 0 }
      }
    ],

    images: [String],
    thumbnail: String,

    averageRating: { type: Number, default: 0 },

    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const productModel = mongoose.models.product || mongoose.model("product", ProductSchema);

export default productModel;