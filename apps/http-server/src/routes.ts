import { Router } from "express";
import { tradeSchema } from "./validator.js";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { redis } from "./redis.js";
import { authMiddleware } from "./authMiddleware.js";
import { createUser, getUserBalance, getUserCoins, logoutUser, registerUser } from "./user.js";

const router = Router()

router.post("/register", createUser)
router.post("/login", registerUser)
router.post("/logout", logoutUser)
router.get("/balance", authMiddleware, getUserBalance)
router.get("/coins", authMiddleware, getUserCoins)

type TradePayload = {
  symbol: string
  side: "BUY" | "SELL"
  quantity: number
}

type TradeStreamPayload = TradePayload & {
  userId: string
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

async function publishTradeOrder(orderId: string, data: TradeStreamPayload) {
  await redis.xadd(
    "trade", "*",
    "type", "CREATE_ORDER",
    "orderId", orderId,
    "userId", data.userId,
    "symbol", data.symbol,
    "side", data.side,
    "quantity", data.quantity.toString()
  )
}

async function createOrder(data: TradePayload, userId: string) {
  const orderId = randomUUID()
  await notifyPending(orderId, userId)
  await publishTradeOrder(orderId, {
    ...data,
    userId
  })
  return orderId
}

router.post("/trade", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized"
      })
    }

    const data = validateTradeRequest(req.body)
    const orderId = await createOrder(data, req.userId)

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
})

export default router