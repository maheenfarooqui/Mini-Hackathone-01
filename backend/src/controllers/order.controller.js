import mongoose from "mongoose";
import orderModel from "../models/order.model.js";
import userModel from "../models/user.model.js";
import productModel from "../models/product.model.js";

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { fullName, phone, address, city } = req.body;

    // Validate customer details
    if (![fullName, phone, address, city].every(
      (value) => typeof value === "string" && value.trim()
    )) {
      return res.status(400).json({
        message: "Full name, phone, address and city are required.",
      });
    }

    let createdOrder;

    await session.withTransaction(async () => {
      const user = await userModel
        .findById(req.user.id)
        .session(session);

      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      if (!user.cart.length) {
        throw new Error("CART_EMPTY");
      }

      const items = [];
      let subtotal = 0;

      for (const cartItem of user.cart) {
        const product = await productModel
          .findById(cartItem.product)
          .session(session);

        if (!product) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        if (cartItem.quantity > product.stock) {
          throw new Error(`INSUFFICIENT_STOCK:${product.name}`);
        }

        // Reserve/decrease stock only if enough remains.
        const updatedProduct = await productModel.findOneAndUpdate(
          {
            _id: product._id,
            stock: { $gte: cartItem.quantity },
          },
          { $inc: { stock: -cartItem.quantity } },
          { new: true, session }
        );

        if (!updatedProduct) {
          throw new Error(`INSUFFICIENT_STOCK:${product.name}`);
        }

        items.push({
          product: product._id,
          name: product.name,
          image: product.image,
          price: product.price,
          quantity: cartItem.quantity,
        });

        subtotal += product.price * cartItem.quantity;
      }

      // Set shipping fee here. For now, delivery is free.
      const shippingFee = 0;
      const totalAmount = subtotal + shippingFee;

      const orders = await orderModel.create(
        [
          {
            user: user._id,
            items,
            shippingAddress: {
              fullName: fullName.trim(),
              phone: phone.trim(),
              address: address.trim(),
              city: city.trim(),
            },
            subtotal,
            shippingFee,
            totalAmount,
            paymentMethod: "COD",
            paymentStatus: "PENDING",
            orderStatus: "PLACED",
          },
        ],
        { session }
      );

      createdOrder = orders[0];

      // Empty the cart only after order creation succeeds.
      user.cart = [];
      await user.save({ session });
    });

    return res.status(201).json({
      message: "Order placed successfully!",
      order: createdOrder,
    });
  } catch (error) {
    console.error("Create order error:", error);

    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ message: "User not found." });
    }

    if (error.message === "CART_EMPTY") {
      return res.status(400).json({ message: "Your cart is empty." });
    }

    if (error.message === "PRODUCT_NOT_FOUND") {
      return res.status(404).json({
        message: "A product in your cart no longer exists.",
      });
    }

    if (error.message.startsWith("INSUFFICIENT_STOCK:")) {
      const productName = error.message.split(":")[1];

      return res.status(400).json({
        message: `Not enough stock available for ${productName}. Please update your cart.`,
      });
    }

    return res.status(500).json({
      message: "Unable to place your order. Please try again.",
    });
  } finally {
    await session.endSession();
  }
};

// Get the logged-in user's own order history
export const getMyOrders = async (req, res) => {
  try {
    const orders = await orderModel
      .find({ user: req.user.id })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Orders fetched successfully.",
      orders,
    });
  } catch (error) {
    console.error("Fetch my orders error:", error);

    return res.status(500).json({
      message: "Unable to fetch your orders.",
    });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await orderModel
      .find()
      .populate("user", "username email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "All orders fetched successfully.",
      orders,
    });
  } catch (error) {
    console.error("Fetch all orders error:", error);
    return res.status(500).json({
      message: "Unable to fetch orders.",
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "PLACED",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status.",
      });
    }

    const order = await orderModel.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    order.orderStatus = status;
    await order.save();

    return res.status(200).json({
      message: "Order status updated successfully.",
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    return res.status(500).json({
      message: "Unable to update order status.",
    });
  }
};
