import ActivityLog from "../models/activityLog.model.js";

export async function logActivity(req, action, entity, entityId, details = {}) {
  try {
    const userId =
      req.user?.id ||
      req.user?._id ||
      req.activityUserId;
    if (!userId || !entityId) return;

    await ActivityLog.create({
      user: userId,
      action,
      entity,
      entityId,
      details,
      ip: req.ip || req.socket?.remoteAddress || "",
    });
  } catch (error) {
    console.error("Activity log failed:", error.message);
  }
}
