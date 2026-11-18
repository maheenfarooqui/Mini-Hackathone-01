import productModel from "../models/product.model.js";
import userModel from "../models/user.model.js";
import { deleteImageKitAsset, getUploadAuthentication } from "../../services/storage.service.js";

export function getImageKitAuthentication(req, res) {
  try {
    return res.status(200).json(getUploadAuthentication());
  } catch (error) {
    console.error("ImageKit authentication error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Unable to generate upload authentication.",
    });
  }
}

export async function deleteImageKitFile(req, res) {
  try {
    const { fileId } = req.params;
    if (typeof fileId !== "string" || !fileId.trim()) {
      return res.status(400).json({ message: "A valid ImageKit file ID is required." });
    }
    const [product, user] = await Promise.all([
      productModel.exists({ imageFileId: fileId }),
      userModel.exists({ imageFileId: fileId }),
    ]);
    if (product || user) {
      return res.status(409).json({
        message: "This image is still used by a product or user profile.",
      });
    }

    await deleteImageKitAsset(fileId);
    return res.status(200).json({ message: "Image deleted successfully." });
  } catch (error) {
    console.error("Delete ImageKit file error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Unable to delete image.",
    });
  }
}
