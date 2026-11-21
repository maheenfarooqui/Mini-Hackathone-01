import mongoose from "mongoose";
import ActivityLog from "../models/activityLog.model.js";

const allowedActions = new Set([
  "login",
  "create",
  "update",
  "delete",
  "stock-in",
  "stock-out",
  "order.process",
  "order.complete",
  "order.cancel",
  "supply-request.review",
]);

export async function listActivity(req, res) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = {};

    if (req.query.user) {
      if (!mongoose.isValidObjectId(req.query.user)) {
        return res.status(400).json({ message: "Invalid user ID." });
      }
      filter.user = req.query.user;
    }
    if (req.query.entity) filter.entity = String(req.query.entity);
    if (req.query.action) {
      if (!allowedActions.has(req.query.action)) {
        return res.status(400).json({ message: "Invalid activity action." });
      }
      filter.action = req.query.action;
    }
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) {
        const from = new Date(req.query.from);
        if (Number.isNaN(from.getTime())) {
          return res.status(400).json({ message: "Invalid start date." });
        }
        filter.createdAt.$gte = from;
      }
      if (req.query.to) {
        const to = new Date(req.query.to);
        if (Number.isNaN(to.getTime())) {
          return res.status(400).json({ message: "Invalid end date." });
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.to)) {
          to.setHours(23, 59, 59, 999);
        }
        filter.createdAt.$lte = to;
      }
    }

    const [activities, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate("user", "name email role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ActivityLog.countDocuments(filter),
    ]);

    return res.status(200).json({ page, limit, total, activities });
  } catch (error) {
    console.error("List activity error:", error);
    return res.status(500).json({ message: "Unable to fetch activity." });
  }
}
