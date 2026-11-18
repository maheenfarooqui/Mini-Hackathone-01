
import mongoose from "mongoose";
import userModel from "../models/user.model.js";
import productModel from "../models/product.model.js";

// Add product to the logged-in user's cart
async function addToCart(req, res) {
  try {
    const { productId } = req.body;
    const quantity = req.body.quantity === undefined
      ? 1
      : Number(req.body.quantity);

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        message: "Quantity must be a positive integer",
      });
    }

    const [product, user] = await Promise.all([
      productModel.findById(productId),
      userModel.findById(req.user.id),
    ]);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const cartItem = user.cart.find(
      (item) => item.product.toString() === productId
    );

    const newQuantity = (cartItem?.quantity || 0) + quantity;

    if (newQuantity > product.stock) {
      return res.status(400).json({
        message: "Requested quantity exceeds available stock",
        availableStock: product.stock,
      });
    }

    if (cartItem) {
      cartItem.quantity = newQuantity;
    } else {
      user.cart.push({
        product: productId,
        quantity,
      });
    }

    await user.save();

    const updatedUser = await userModel
      .findById(user._id)
      .select("cart")
      .populate("cart.product", "name slug price image weight description stock");

    return res.status(200).json({
      message: "Product added to cart successfully",
      cart: updatedUser.cart,
    });
  } catch (error) {
    console.error("Add to cart error:", error);

    return res.status(500).json({
      message: "Failed to add product to cart",
    });
  }
}

// Fetch the logged-in user's cart
async function fetchCart(req, res) {
  try {
    const user = await userModel
      .findById(req.user.id)
      .select("cart")
      .populate("cart.product", "name slug price image weight description stock");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Cart fetched successfully",
      cart: user.cart,
    });
  } catch (error) {
    console.error("Fetch cart error:", error);

    return res.status(500).json({
      message: "Failed to fetch cart",
    });
  }
}

// Update the quantity of a product in the user's cart
async function updateQuantity(req, res) {
  try {
    const { id } = req.params;
    const quantity = Number(req.body.quantity);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        message: "Quantity must be a positive integer",
      });
    }

    const user = await userModel.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Route ID is the product ID, not a separate cart document ID.
    const cartItem = user.cart.find(
      (item) => item.product.toString() === id
    );

    if (!cartItem) {
      return res.status(404).json({
        message: "Product not found in cart",
      });
    }

    const product = await productModel.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (quantity > product.stock) {
      return res.status(400).json({
        message: "Requested quantity exceeds available stock",
        availableStock: product.stock,
      });
    }

    cartItem.quantity = quantity;
    await user.save();

    const updatedUser = await userModel
      .findById(user._id)
      .select("cart")
      .populate("cart.product", "name slug price image weight description stock");

    return res.status(200).json({
      message: "Cart quantity updated successfully",
      cart: updatedUser.cart,
    });
  } catch (error) {
    console.error("Update cart quantity error:", error);

    return res.status(500).json({
      message: "Failed to update cart quantity",
    });
  }
}

// Remove a product from the user's cart
async function removeItem(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const user = await userModel.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const itemIndex = user.cart.findIndex(
      (item) => item.product.toString() === id
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        message: "Product not found in cart",
      });
    }

    user.cart.splice(itemIndex, 1);
    await user.save();

    const updatedUser = await userModel
      .findById(user._id)
      .select("cart")
      .populate("cart.product", "name slug price image weight description stock");

    return res.status(200).json({
      message: "Product removed from cart successfully",
      cart: updatedUser.cart,
    });
  } catch (error) {
    console.error("Remove cart item error:", error);

    return res.status(500).json({
      message: "Failed to remove product from cart",
    });
  }
}

export {
  addToCart,
  fetchCart,
  updateQuantity,
  removeItem,
};
