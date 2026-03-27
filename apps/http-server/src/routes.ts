import { Router } from "express";
import { tradeSchema } from "./validator.js";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { redis } from "./redis.js";
import { authMiddleware } from "./authMiddleware.js";
import { createUser, logoutUser, registerUser } from "./user.js";

const router = Router()

router.post("/register", createUser)
router.post("/login", registerUser)
router.post("/logout", logoutUser)

type TradePayload = {
  userId: string
  symbol: string
  side: "BUY" | "SELL"
  price: number
  quantity: number
}

function validateTradeRequest(body: unknown): TradePayload {
  return tradeSchema.parse(body)
}

async function notifyPending(orderId: string, userId: string) {
  await redis.xadd(
    "engine-response", "*",
    "type", "ORDER_PENDING",
    "orderId", orderId,
    "userId", userId
  )
}

async function publishTradeOrder(orderId: string, data: TradePayload) {
  await redis.xadd(
    "trade", "*",
    "type", "CREATE_ORDER",
    "orderId", orderId,
    "userId", data.userId,
    "symbol", data.symbol,
    "side", data.side,
    "price", data.price.toString(),
    "quantity", data.quantity.toString()
  )
}

async function createOrder(data: TradePayload) {
  const orderId = randomUUID()
  await notifyPending(orderId, data.userId)
  await publishTradeOrder(orderId, data)
  return orderId
}

router.post("/trade", async (req: Request, res: Response) => {
  try {
    const data = validateTradeRequest(req.body)
    const orderId = await createOrder(data)

    return res.status(200).json({
      success: true,
      orderId
    })
  } catch(err) {
    console.error("Trade order creation failed", err)
    return res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : "Unknown error"
    })
  }
},authMiddleware)

export default router