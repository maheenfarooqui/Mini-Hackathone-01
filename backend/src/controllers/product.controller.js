import productModel from "../models/product.model.js";
import uploadFile from "../../services/storage.service.js";

async function fetchProduct(req, res) {
  try {
    const products = await productModel.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
}

async function addProduct(req, res) {
  console.log(req.file);

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Image is required",
      });
    }
    console.log("1. CREATE PRODUCT API CALLED");
    console.log("2. Request body:", req.body);
    console.log("3. Image received:", !!req.file);

    const { name, slug, price, weight, description, stock } = req.body;

    if (
      !name ||
      !slug ||
      price === undefined ||
      price === "" ||
      !weight ||
      !description ||
      stock === undefined ||
      stock === ""
    ) {
      return res.status(400).json({
        message: "All product fields are required",
      });
    }
    console.log("4. Checking existing slug:", slug);

    const parsedPrice = Number(price);
    const parsedStock = Number(stock);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        message: "Price must be a valid non-negative number",
      });
    }

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      return res.status(400).json({
        message: "Stock must be a non-negative integer",
      });
    }

    const existingProduct = await productModel.findOne({ slug });
    console.log("5. Existing product:", existingProduct);
    if (existingProduct) {
      return res.status(409).json({
        message: "A product with this slug already exists",
      });
    }

    const uploadImage = await uploadFile(
      req.file.buffer,
      req.file.originalname,
    );

    console.log("6. Uploading image...");
    console.log("7. uploadFile returned:", uploadImage);
    console.log("8. Image URL:", uploadImage.url);
    console.log("9. Creating product in MongoDB...");
    const product = await productModel.create({
      name,
      slug,
      price: parsedPrice,
      weight,
      description,
      stock: parsedStock,
      image: uploadImage.url,
    });
    console.log("10. MongoDB CREATE SUCCESS:", product._id);
    console.log("7. Image uploaded:", uploadImage.url);
    console.log("8. Creating product in MongoDB...");
    console.log("9. PRODUCT CREATED:", product);
    res.status(201).json({
      message: "Product added successfully",
      product,
    });
  } catch (error) {
    console.error("CREATE FAILED:", error.message);
    console.error("ERROR CODE:", error.code);
    console.error("KEY PATTERN:", error.keyPattern);
    console.error("KEY VALUE:", error.keyValue);
    console.error("STACK:", error.stack);
    res.status(500).json({
      message: "Failed to create product",
      error: error.message,
    });
  }
}

async function fetchSingleProduct(req, res) {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await productModel.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      message: "Product fetched successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch product",
    });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const { name, slug, price, weight, description, stock } = req.body;

    const product = await productModel.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (price !== undefined) {
      const parsedPrice = Number(price);

      if (price === "" || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({
          message: "Price must be a valid non-negative number",
        });
      }

      product.price = parsedPrice;
    }

    if (stock !== undefined) {
      const parsedStock = Number(stock);

      if (stock === "" || !Number.isInteger(parsedStock) || parsedStock < 0) {
        return res.status(400).json({
          message: "Stock must be a non-negative integer",
        });
      }

      product.stock = parsedStock;
    }

    if (slug !== undefined && slug !== product.slug) {
      const existingProduct = await productModel.findOne({ slug });

      if (existingProduct) {
        return res.status(409).json({
          message: "A product with this slug already exists",
        });
      }

      product.slug = slug;
    }

    if (name !== undefined) product.name = name;
    if (weight !== undefined) product.weight = weight;
    if (description !== undefined) product.description = description;

    if (req.file) {
      const uploadImage = await uploadFile(
        req.file.buffer,
        req.file.originalname,
      );

      product.image = uploadImage.url;
    }

    await product.save();

    return res.status(200).json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update product",
      error: error.message,
    });
  }
}

async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await productModel.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      message: "Product deleted successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete product",
    });
  }
}

export {
  addProduct,
  fetchProduct,
  fetchSingleProduct,
  updateProduct,
  deleteProduct,
};
