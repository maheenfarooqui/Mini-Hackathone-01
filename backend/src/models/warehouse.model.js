import mongoose from "mongoose";

const warehouseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    capacity: {
      type: Number,
      min: 0,
      default: 0,
      validate: Number.isInteger,
    },
  },
  { timestamps: true },
);

const Warehouse = mongoose.model("Warehouse", warehouseSchema);

export default Warehouse;
