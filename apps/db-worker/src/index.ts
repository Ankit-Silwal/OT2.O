import "dotenv/config"
import {prisma} from "@repo/shared"
import {Redis} from "ioredis"

type OrderType = "ORDER_PENDING" | "ORDER_FILLED" | "ORDER_REJECTED"

if(!process.env.REDIS_URL){
  throw new Error("Pass the redis Url too")
}
const redis=new Redis(process.env.REDIS_URL)

const sleep = (ms:number) => new Promise((resolve) => setTimeout(resolve, ms))

function toEventData(fields:string[]) {
  const data:Record<string,string> = {}
  for(let i=0;i+1<fields.length;i+=2){
    const key=fields[i]
    const value=fields[i+1]
    if(key===undefined || value===undefined) continue
    data[key]=value
  }
  return data
}

function toNumber(value?:string): number | undefined {
  if(value === undefined) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

async function handlePending(data:Record<string,string>){
  const orderId = data.orderId
  const userId = toNumber(data.userId)
  if(!orderId || userId === undefined) return

  await prisma.trade.upsert({
    where:{
      orderId
    },
    update:{},
    create:{
      orderId,
      userId,
      symbol:data.symbol ?? "",
      side:data.side ?? "",
      price:0,
      quantity:0,
      status:"PENDING"
    }
  })
}

async function handleFinalized(data:Record<string,string>, status:"FILLED"|"REJECTED"){
  const orderId = data.orderId
  const side = data.side
  const symbol = data.symbol
  const price = toNumber(data.price)
  const quantity = toNumber(data.quantity)

  if(!orderId || !side || !symbol || price === undefined || quantity === undefined) return

  await prisma.trade.update({
    where:{
      orderId
    },
    data:{
      side,
      price,
      symbol,
      quantity,
      status
    }
  })
}

async function processMessage(fields:string[]){
  const data = toEventData(fields)
  const type = data.type as OrderType | undefined
  if(!type) return

  if(type === "ORDER_PENDING"){
    await handlePending(data)
    return
  }

  if(type === "ORDER_FILLED"){
    await handleFinalized(data, "FILLED")
    return
  }

  if(type === "ORDER_REJECTED"){
    await handleFinalized(data, "REJECTED")
  }
}

async function startWorker(){
  while(true){
    try{
      const res=await redis.xread(
        "BLOCK",0,
        "STREAMS","engine-response","$"
      )
      if(!res) continue
      const stream = res[0]
      if(!stream) continue
      const [,messages]=stream

      for(const [,fields] of messages){
        await processMessage(fields)
      }
    }catch(err){
      console.error("db-worker loop failed", err)
      await sleep(3000)
    }
  }
}

await startWorker()