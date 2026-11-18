
import jwt from "jsonwebtoken";
import userModel from "../models/user.model.js";
import { getJwtSecret } from "../utils/auth.js";

export async function verifyToken(req, res, next) {
  const authorization = req.headers.authorization;
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;
  const token = req.cookies?.token || bearerToken;

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized. Please log in.",
    });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await userModel.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User account is no longer available.",
      });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      assignedWarehouses: user.assignedWarehouses,
    };

    return next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    console.error("Authentication middleware error:", err);
    return res.status(500).json({
      message: "Unable to authenticate this request.",
    });
  }
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      message: "Forbidden. Admin access required.",
    });
  }

  next();
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action.",
      });
    }

    return next();
  };
}
