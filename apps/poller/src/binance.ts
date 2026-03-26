import { redis } from "./redis.js";
import WebSocket from "ws";
import type { BackPackExchangeMessage, PriceUpdateEvent } from "./types.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function parsePriceMessage(rawData: WebSocket.RawData) {
  try {
    let text: string
    if (Buffer.isBuffer(rawData)) {
      text = rawData.toString("utf-8")
    } else if (rawData instanceof ArrayBuffer) {
      text = Buffer.from(rawData).toString("utf-8")
    } else {
      text = String(rawData)
    }
    const parsed = JSON.parse(text)
    if (!parsed) return undefined
    return (parsed.data || parsed) as BackPackExchangeMessage
  } catch (error) {
    console.error("Failed to parse message", error)
    return undefined
  }
}

function validatePriceData(data: BackPackExchangeMessage): PriceUpdateEvent | undefined {
  const price = Number.parseFloat(data.p)
  const timestamp = Number.parseInt(data.E)

  if (!data.s || Number.isNaN(price) || Number.isNaN(timestamp)) {
    return undefined
  }

  return {
    type: "PRICE_UPDATE",
    symbol: data.s,
    price,
    timestamp
  }
}

async function publishPriceUpdate(event: PriceUpdateEvent) {
  await redis.xadd(
    "trade", "*",
    "type", event.type,
    "symbol", event.symbol,
    "price", event.price.toString(),
    "timestamp", event.timestamp.toString()
  )
}

async function handleMessage(data: WebSocket.RawData) {
  const message = parsePriceMessage(data)
  if (!message) return

  const event = validatePriceData(message)
  if (!event) return

  await publishPriceUpdate(event)
  console.log("Price updated for", event.symbol, "at", event.price)
}

export function connectToBinance() {
  const BINANCE_WS = process.env.BINANCE_WS
  if (!BINANCE_WS) {
    throw new Error("BINANCE_WS is not defined")
  }

  const ws = new WebSocket(BINANCE_WS)

  ws.on("open", () => {
    console.log("WebSocket connected to Binance")
  })

  ws.on("message", async (data: WebSocket.RawData) => {
    try {
      await handleMessage(data)
    } catch (error) {
      console.error("Message handler error", error)
    }
  })

  ws.on("close", async () => {
    console.log("WebSocket disconnected, reconnecting in 3s")
    await sleep(3000)
    connectToBinance()
  })

  ws.on("error", (err) => {
    console.error("WebSocket error", err)
  })
}