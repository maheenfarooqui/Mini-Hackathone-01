import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    lowStockLimit: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    imageFileId: {
      type: String,
      required: true,
      trim: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

productSchema.index(
  { sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: "string" } } },
);

const Product = mongoose.model("Product", productSchema);

export default Product;