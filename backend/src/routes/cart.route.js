import express from "express";
import {addToCart ,fetchCart ,updateQuantity ,removeItem} from "../controllers/cart.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";


const router = express.Router();



router.post("/create", verifyToken, addToCart,);
router.put("/edit/:id",verifyToken, updateQuantity);
router.delete("/delete/:id",verifyToken, removeItem);
router.get("/",verifyToken, fetchCart);





export default router;