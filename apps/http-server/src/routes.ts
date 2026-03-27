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

type EngineOrderResult = {
  status: "FILLED" | "REJECTED" | "PENDING"
  reason?: string
}

function validateTradeRequest(body: unknown): TradePayload {
  return tradeSchema.parse(body)
}

async function notifyPending(orderId: string, userId: string) {
  return redis.xadd(
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

function toStreamData(fields: string[]) {
  const data: Record<string, string> = {}
  for (let i = 0; i + 1 < fields.length; i += 2) {
    const key = fields[i]
    const value = fields[i + 1]
    if (!key || value === undefined) {
      continue
    }
    data[key] = value
  }
  return data
}

async function waitForOrderResult(orderId: string, startId: string, timeoutMs = 7000): Promise<EngineOrderResult> {
  let cursor = startId
  const endAt = Date.now() + timeoutMs

  while (Date.now() < endAt) {
    const remaining = endAt - Date.now()
    const response = await redis.xread(
      "BLOCK", Math.max(1, remaining),
      "STREAMS", "engine-response", cursor
    )

    if (!response?.[0]) {
      continue
    }

    const [, messages] = response[0]
    for (const [messageId, fields] of messages) {
      cursor = messageId
      const data = toStreamData(fields)

      if (data.orderId !== orderId) {
        continue
      }

      if (data.type === "ORDER_FILLED") {
        return { status: "FILLED" }
      }

      if (data.type === "ORDER_REJECTED") {
        return {
          status: "REJECTED",
          reason: data.reason ?? "ORDER_REJECTED"
        }
      }
    }
  }

  return { status: "PENDING" }
}

async function createOrder(data: TradePayload, userId: string) {
  const orderId = randomUUID()
  const pendingMessageId = await notifyPending(orderId, userId)
  await publishTradeOrder(orderId, {
    ...data,
    userId
  })

  return {
    orderId,
    pendingMessageId: pendingMessageId ?? "$"
  }
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
    const { orderId, pendingMessageId } = await createOrder(data, req.userId)
    const result = await waitForOrderResult(orderId, pendingMessageId)

    if (result.status === "FILLED") {
      return res.status(200).json({
        success: true,
        orderId
      })
    }

    if (result.status === "REJECTED") {
      return res.status(400).json({
        success: false,
        orderId,
        reason: result.reason
      })
    }

    return res.status(202).json({
      success: false,
      orderId,
      message: "Order is still pending"
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