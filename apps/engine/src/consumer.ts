import { redis } from "./redis.js";
import { getPrice,setBalance,getBalance,setPosition, setPrice } from "./state.js";
import type { CreateOrderEvent, PriceEvent } from "./events.js";

const sleep = (ms:number) => new Promise((resolve) => setTimeout(resolve, ms))

function toStreamData(fields:string[]) {
  const data:Record<string,string> = {}
  for(let i = 0; i < fields.length; i += 2){
    const key = fields[i]
    const value = fields[i + 1]
    if(key && value){
      data[key] = value
    }
  }
  return data
}

async function handlePriceUpdate(data:Record<string,string>) {
  const symbol = data.symbol
  const price = data.price ? Number.parseFloat(data.price) : undefined
  const timestamp = data.timestamp ? Number.parseInt(data.timestamp) : undefined

  if(!symbol || price === undefined || Number.isNaN(price) || timestamp === undefined || Number.isNaN(timestamp)){
    return
  }

  const event: PriceEvent = {
    type: "PRICE_UPDATE",
    symbol,
    price,
    timestamp
  }

  setPrice(event.symbol, event.price)
}

async function handleBuyOrder(event: CreateOrderEvent, currentPrice: number) {
  const balance = getBalance(event.userId)
  const cost = currentPrice * event.quantity

  if(!balance || balance < cost){
    await redis.xadd(
      "engine-response", "*",
      "type", "ORDER_REJECTED",
      "orderId", event.orderId,
      "userId", event.userId,
      "reason", "INSUFFICIENT_BALANCE"
    )
    return
  }

  setBalance(event.userId, balance - cost)
  setPosition(event.userId, event.symbol, event.quantity)

  await redis.xadd(
    "engine-response", "*",
    "type", "ORDER_FILLED",
    "orderId", event.orderId,
    "userId", event.userId,
    "symbol", event.symbol,
    "side", event.side,
    "price", currentPrice.toString(),
    "quantity", event.quantity.toString()
  )
}

async function handleSellOrder(event: CreateOrderEvent) {
  const currentPrice = getPrice(event.symbol)
  if(!currentPrice){
    await redis.xadd(
      "engine-response", "*",
      "type", "ORDER_REJECTED",
      "orderId", event.orderId,
      "userId", event.userId,
      "reason", "NO_PRICE"
    )
    return
  }

  await redis.xadd(
    "engine-response", "*",
    "type", "ORDER_FILLED",
    "orderId", event.orderId,
    "userId", event.userId,
    "symbol", event.symbol,
    "side", event.side,
    "price", currentPrice.toString(),
    "quantity", event.quantity.toString()
  )
}

async function handleCreateOrder(data:Record<string,string>) {
  const orderId = data.orderId
  const userId = data.userId
  const symbol = data.symbol
  const quantity = data.quantity ? Number.parseFloat(data.quantity) : undefined
  const side = data.side as "BUY" | "SELL" | undefined

  if(!orderId || !userId || !symbol || quantity === undefined || Number.isNaN(quantity) || !side || (side !== "BUY" && side !== "SELL")){
    return
  }

  const event: CreateOrderEvent = {
    type: "CREATE_ORDER",
    orderId,
    userId,
    symbol,
    quantity,
    side
  }

  const currentPrice = getPrice(event.symbol)
  if(!currentPrice){
    await redis.xadd(
      "engine-response", "*",
      "type", "ORDER_REJECTED",
      "orderId", event.orderId,
      "userId", event.userId,
      "reason", "NO_PRICE"
    )
    return
  }

  if(event.side === "BUY"){
    await handleBuyOrder(event, currentPrice)
  }else{
    await handleSellOrder(event)
  }
}

async function processStreamMessage(fields:string[]) {
  const data = toStreamData(fields)
  const type = data.type

  if(type === "PRICE_UPDATE"){
    await handlePriceUpdate(data)
  }else if(type === "CREATE_ORDER"){
    await handleCreateOrder(data)
  }
}

export async function runConsumer(){
  console.log("The consumer server has started")
  while(true){
    try{
      const response = await redis.xread(
        "BLOCK", 0,
        "STREAMS", "trade", "$"
      )

      if(!response?.[0]){
        continue
      }

      const [, messages] = response[0]
      for(const [, fields] of messages){
        await processStreamMessage(fields)
      }
    }catch(err){
      console.error("Consumer loop failed", err)
      await sleep(3000)
    }
  }
}

await runConsumer()
