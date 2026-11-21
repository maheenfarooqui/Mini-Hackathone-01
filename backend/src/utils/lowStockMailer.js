import nodemailer from "nodemailer";
import productModel from "../models/product.model.js";
import stockModel from "../models/stock.model.js";
import userModel from "../models/user.model.js";

function getSmtpConfig() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
  const port = Number(SMTP_PORT);
  if (!SMTP_HOST || !Number.isInteger(port) || port <= 0 || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) {
    return null;
  }
  return { host: SMTP_HOST, port, user: SMTP_USER, pass: SMTP_PASS, from: MAIL_FROM };
}

async function getProductStock(productId) {
  const product = await productModel.findById(productId).select("name sku lowStockLimit");
  if (!product) return { product: null, total: 0 };
  const [summary = { total: 0 }] = await stockModel.aggregate([
    { $match: { product: product._id } },
    { $group: { _id: null, total: { $sum: "$quantity" } } },
  ]);
  return { product, total: summary.total };
}

export async function resetLowStockNotificationIfRecovered(productId) {
  try {
    const { product, total } = await getProductStock(productId);
    if (product && total > product.lowStockLimit) {
      await stockModel.updateMany(
        { product: productId, lowStockNotifiedAt: { $ne: null } },
        { $set: { lowStockNotifiedAt: null } },
      );
    }
  } catch (error) {
    console.error("Low-stock notification reset failed:", error.message);
  }
}

export async function notifyLowStockAdmins(productId) {
  const config = getSmtpConfig();
  if (!config) return;

  let claimId;
  let claimedAt;
  try {
    const { product, total } = await getProductStock(productId);
    if (!product) return;
    if (total > product.lowStockLimit) {
      await resetLowStockNotificationIfRecovered(productId);
      return;
    }

    const sentinel = await stockModel.findOne({ product: productId }).sort({ _id: 1 }).select("_id");
    if (!sentinel) return;
    claimedAt = new Date();
    const cutoff = new Date(claimedAt.getTime() - 24 * 60 * 60 * 1000);
    const claimed = await stockModel.findOneAndUpdate(
      {
        _id: sentinel._id,
        $or: [
          { lowStockNotifiedAt: null },
          { lowStockNotifiedAt: { $lte: cutoff } },
        ],
      },
      { $set: { lowStockNotifiedAt: claimedAt } },
      { new: true },
    );
    if (!claimed) return;
    claimId = claimed._id;

    const admins = await userModel.find({ role: "admin" }).select("email");
    const recipients = admins.map((admin) => admin.email).filter(Boolean);
    if (recipients.length === 0) {
      await stockModel.updateOne(
        { _id: claimId, lowStockNotifiedAt: claimedAt },
        { $set: { lowStockNotifiedAt: null } },
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });
    await transporter.sendMail({
      from: config.from,
      to: recipients,
      subject: `Low stock alert: ${product.name}`,
      text: `${product.name} (${product.sku}) has ${total} units in stock. The low-stock limit is ${product.lowStockLimit}.`,
    });
  } catch (error) {
    console.error("Low-stock email failed:", error.message);
    if (claimId && claimedAt) {
      try {
        await stockModel.updateOne(
          { _id: claimId, lowStockNotifiedAt: claimedAt },
          { $set: { lowStockNotifiedAt: null } },
        );
      } catch (resetError) {
        console.error("Low-stock notification claim reset failed:", resetError.message);
      }
    }
  }
}
