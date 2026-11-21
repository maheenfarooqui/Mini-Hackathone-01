import test from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import productModel from "../src/models/product.model.js";
import stockModel from "../src/models/stock.model.js";
import userModel from "../src/models/user.model.js";
import {
  notifyLowStockAdmins,
  resetLowStockNotificationIfRecovered,
} from "../src/utils/lowStockMailer.js";

const smtpKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"];

function preserveEnv(t) {
  const previous = Object.fromEntries(smtpKeys.map((key) => [key, process.env[key]]));
  t.after(() => {
    for (const key of smtpKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
}

test("low-stock notifications skip silently when SMTP is not configured", async (t) => {
  preserveEnv(t);
  for (const key of smtpKeys) delete process.env[key];
  await assert.doesNotReject(() => notifyLowStockAdmins("product-id"));
});

test("low-stock email is sent once per 24 hours and recovery clears notification timestamps", async (t) => {
  preserveEnv(t);
  Object.assign(process.env, {
    SMTP_HOST: "smtp.example.test",
    SMTP_PORT: "587",
    SMTP_USER: "user",
    SMTP_PASS: "pass",
    MAIL_FROM: "inventory@example.test",
  });

  const originals = {
    findById: productModel.findById,
    aggregate: stockModel.aggregate,
    findOne: stockModel.findOne,
    findOneAndUpdate: stockModel.findOneAndUpdate,
    updateMany: stockModel.updateMany,
    find: userModel.find,
    createTransport: nodemailer.createTransport,
  };
  t.after(() => {
    productModel.findById = originals.findById;
    stockModel.aggregate = originals.aggregate;
    stockModel.findOne = originals.findOne;
    stockModel.findOneAndUpdate = originals.findOneAndUpdate;
    stockModel.updateMany = originals.updateMany;
    userModel.find = originals.find;
    nodemailer.createTransport = originals.createTransport;
  });

  let total = 5;
  let claimCount = 0;
  let sentMessage;
  let claimFilter;
  let resetFilter;
  const product = { _id: "product-id", name: "Laptop", sku: "LAP-1", lowStockLimit: 5 };
  productModel.findById = () => ({ select: async () => product });
  stockModel.aggregate = async () => [{ total }];
  stockModel.findOne = () => ({
    sort() { return this; },
    select: async () => ({ _id: "stock-id" }),
  });
  stockModel.findOneAndUpdate = async (filter) => {
    claimFilter = filter;
    claimCount += 1;
    return claimCount === 1 ? { _id: "stock-id" } : null;
  };
  stockModel.updateMany = async (filter, update) => { resetFilter = { filter, update }; };
  userModel.find = () => ({ select: async () => [{ email: "admin@example.test" }] });
  nodemailer.createTransport = () => ({
    sendMail: async (message) => { sentMessage = message; },
  });

  await notifyLowStockAdmins("product-id");
  await notifyLowStockAdmins("product-id");
  assert.equal(claimCount, 2);
  assert.equal(claimFilter.$or.some((condition) => condition.lowStockNotifiedAt?.$lte instanceof Date), true);
  assert.deepEqual(sentMessage.to, ["admin@example.test"]);
  assert.match(sentMessage.text, /has 5 units in stock/);

  total = 6;
  await resetLowStockNotificationIfRecovered("product-id");
  assert.deepEqual(resetFilter.filter, {
    product: "product-id",
    lowStockNotifiedAt: { $ne: null },
  });
  assert.deepEqual(resetFilter.update, { $set: { lowStockNotifiedAt: null } });
});
