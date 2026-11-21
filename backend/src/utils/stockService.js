import stockModel from "../models/stock.model.js";
import stockTransactionModel from "../models/stockTransaction.model.js";
import warehouseModel from "../models/warehouse.model.js";

export function assertStockCapacity({ capacity, currentQuantity, quantity }) {
  if (
    Number(capacity) > 0 &&
    Number(currentQuantity) + Number(quantity) > Number(capacity)
  ) {
    throw new Error("CAPACITY_EXCEEDED");
  }
}

export async function applyStockChange({
  productId,
  warehouseId,
  quantity,
  type,
  note,
  userId,
  session,
  orderId = null,
}) {
  let stock;
  if (type === "stock-in") {
    const warehouse = await warehouseModel
      .findById(warehouseId)
      .session(session);
    if (warehouse?.capacity > 0) {
      const [summary = { total: 0 }] = await stockModel
        .aggregate([
          { $match: { warehouse: warehouse._id } },
          { $group: { _id: null, total: { $sum: "$quantity" } } },
        ])
        .session(session);
      assertStockCapacity({
        capacity: warehouse.capacity,
        currentQuantity: summary.total,
        quantity,
      });
    }

    stock = await stockModel.findOneAndUpdate(
      { product: productId, warehouse: warehouseId },
      { $inc: { quantity: Number(quantity) } },
      { new: true, upsert: true, setDefaultsOnInsert: true, session },
    );
  } else if (type === "stock-out") {
    stock = await stockModel.findOneAndUpdate(
      {
        product: productId,
        warehouse: warehouseId,
        quantity: { $gte: Number(quantity) },
      },
      { $inc: { quantity: -Number(quantity) } },
      { new: true, session },
    );
    if (!stock) {
      throw new Error(`INSUFFICIENT_STOCK:${productId}`);
    }
  } else {
    throw new Error("INVALID_STOCK_CHANGE_TYPE");
  }

  await stockTransactionModel.create(
    [
      {
        product: productId,
        warehouse: warehouseId,
        transactionType: type,
        quantity: Number(quantity),
        note: typeof note === "string" ? note.trim() : "",
        performedBy: userId,
        order: orderId,
      },
    ],
    { session },
  );
  return stock;
}
