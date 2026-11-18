import userModel from "../models/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { authCookieOptions, getJwtSecret } from "../utils/auth.js";

const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  assignedWarehouses: user.assignedWarehouses,
  image: user.image,
  imageFileId: user.imageFileId,
});

async function registerUser(req, res) {
  try {
    const { name, email, password, phone = "" } = req.body || {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "Name, a valid email, and a password of at least 8 characters are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await userModel.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const user = await userModel.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: typeof phone === "string" ? phone.trim() : "",
      password: await bcrypt.hash(password, 12),
      role: "salesRepresentative",
    });
    const token = jwt.sign({ id: user._id }, getJwtSecret(), {
      expiresIn: "7d",
    });

    res.cookie("token", token, authCookieOptions());
    return res.status(201).json({
      message: "Account created successfully.",
      user: userResponse(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    console.error("Register user error:", error);
    return res.status(500).json({ message: "Unable to create the account." });
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await userModel
      .findOne({ email: email.trim().toLowerCase() })
      .select("+username");
    const isPasswordValid =
      user?.password && (await bcrypt.compare(password, user.password));

    if (!user || !isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!user.name || user.role === "user") {
      user.name = user.name || user.username || user.email.split("@")[0];
      if (user.role === "user") user.role = "salesRepresentative";
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, getJwtSecret(), {
      expiresIn: "7d",
    });

    res.cookie("token", token, authCookieOptions());
    return res.status(200).json({
      message: "Logged in successfully.",
      user: userResponse(user),
    });
  } catch (error) {
    console.error("Login user error:", error);
    return res.status(500).json({ message: "Unable to log in." });
  }
}

async function logoutUser(req, res) {
  const { maxAge, ...cookieOptions } = authCookieOptions();
  res.clearCookie("token", cookieOptions);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
}

async function currentUser(req, res) {
  try {
    const user = await userModel.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Current user fetched successfully.",
      user: userResponse(user),
    });
  } catch (error) {
    console.error("Fetch current user error:", error);
    return res.status(500).json({ message: "Unable to fetch current user." });
  }
}

async function googleAuthCallback(req, res) {
  try {
    const user = req.user;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    if (!user) {
      return res.redirect(`${frontendUrl}/login`);
    }

    const token = jwt.sign({ id: user._id }, getJwtSecret(), {
      expiresIn: "7d",
    });
    res.cookie("token", token, authCookieOptions());

    return res.redirect(frontendUrl);
  } catch (error) {
    console.error("Google auth callback error:", error);

    return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/login`);
  }
}

export {
  registerUser,
  loginUser,
  logoutUser,
  currentUser,
  googleAuthCallback,
};
