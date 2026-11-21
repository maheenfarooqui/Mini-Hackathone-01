import orderModel from "../models/order.model.js";
import productModel from "../models/product.model.js";
import stockTransactionModel from "../models/stockTransaction.model.js";
import {
  parseReportDateRange,
  reportWarehouseFilter,
} from "../utils/reportFilters.js";

export async function monthlySales(req, res) {
  try {
    const year = Number.parseInt(req.query.year, 10) || new Date().getFullYear();
    if (year < 2000 || year > 9999) {
      return res.status(400).json({ message: "Year must be between 2000 and 9999." });
    }

    const rows = await orderModel.aggregate([
      {
        $match: {
          ...reportWarehouseFilter(req.user),
          status: "Completed",
          createdAt: {
            $gte: new Date(Date.UTC(year, 0, 1)),
            $lt: new Date(Date.UTC(year + 1, 0, 1)),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          sales: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const byMonth = new Map(rows.map((row) => [row._id, row]));
    const months = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const row = byMonth.get(month);
      return { month, sales: row?.sales || 0, orders: row?.orders || 0 };
    });
    return res.status(200).json({ year, months });
  } catch (error) {
    console.error("Monthly sales report error:", error);
    return res.status(500).json({ message: "Unable to fetch monthly sales." });
  }
}

export async function stockMovementReport(req, res) {
  try {
    const range = parseReportDateRange(req.query);
    if (range.error) return res.status(400).json({ message: range.error });

    const movements = await stockTransactionModel.aggregate([
      {
        $match: {
          ...reportWarehouseFilter(req.user),
          createdAt: { $gte: range.from, $lte: range.to },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          stockIn: {
            $sum: {
              $cond: [{ $eq: ["$transactionType", "stock-in"] }, "$quantity", 0],
            },
          },
          stockOut: {
            $sum: {
              $cond: [{ $eq: ["$transactionType", "stock-out"] }, "$quantity", 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.status(200).json({
      from: range.from,
      to: range.to,
      movements: movements.map((movement) => ({
        date: movement._id,
        stockIn: movement.stockIn,
        stockOut: movement.stockOut,
      })),
    });
  } catch (error) {
    console.error("Stock movement report error:", error);
    return res.status(500).json({ message: "Unable to fetch stock movement report." });
  }
}

export async function topProducts(req, res) {
  try {
    const limit = Number.parseInt(req.query.limit, 10) || 5;
    if (limit < 1 || limit > 50) {
      return res.status(400).json({ message: "Limit must be between 1 and 50." });
    }
    const products = await orderModel.aggregate([
      {
        $match: {
          ...reportWarehouseFilter(req.user),
          status: { $in: ["Processing", "Completed"] },
        },
      },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product",
          quantity: { $sum: "$products.quantity" },
        },
      },
      { $sort: { quantity: -1, _id: 1 } },
      { $limit: limit },
      {
        $lookup: {
          from: productModel.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: 1,
          name: "$product.name",
          sku: "$product.sku",
          quantity: 1,
        },
      },
    ]);
    return res.status(200).json({ products });
  } catch (error) {
    console.error("Top products report error:", error);
    return res.status(500).json({ message: "Unable to fetch top products." });
  }
}
