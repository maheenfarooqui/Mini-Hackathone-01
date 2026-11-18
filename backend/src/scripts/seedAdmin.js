import "dotenv/config";
import bcrypt from "bcrypt";
import connectDb from "../db/db.js";
import userModel from "../models/user.model.js";

async function seedAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;

  if (
    !ADMIN_EMAIL ||
    !ADMIN_PASSWORD ||
    ADMIN_PASSWORD.length < 8 ||
    !ADMIN_NAME
  ) {
    throw new Error(
      "Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD (at least 8 characters) before seeding.",
    );
  }

  await connectDb();
  const email = ADMIN_EMAIL.trim().toLowerCase();
  if (await userModel.exists({ email })) {
    throw new Error("An account with ADMIN_EMAIL already exists; no changes were made.");
  }

  await userModel.create({
    name: ADMIN_NAME.trim(),
    email,
    password: await bcrypt.hash(ADMIN_PASSWORD, 12),
    role: "admin",
  });
  console.log("Initial admin account created.");
}

seedAdmin()
  .catch((error) => {
    console.error("Admin seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = await import("mongoose");
    await mongoose.default.disconnect();
  });
