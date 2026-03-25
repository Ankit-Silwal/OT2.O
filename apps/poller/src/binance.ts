import { redis } from "./redis.js";
import WebSocket from "ws";
import type { BackPackExchangeMessage, PriceUpdateEvent } from "./types.js";


export function connectToBinance(){
  const BINANCE_WS = process.env.BINANCE_WS;
  if (!BINANCE_WS) {
    throw new Error("BINANCE_WS is not defined");
  }
  const ws = new WebSocket(BINANCE_WS);
  ws.on("open",()=>{
    console.log("The websocket was connected successfully")
  });

  ws.on("message",async (data:WebSocket.RawData)=>{
    try{
      const parsed = JSON.parse(data.toString());
      if(!parsed) return;
      const res: BackPackExchangeMessage = parsed.data || parsed;

      const price=parseFloat(res.p);
      if(isNaN(price)) return;

      const event:PriceUpdateEvent={
        type:"PRICE_UPDATE",
        symbol:res.s,
        price:price,
        timestamp:parseInt(res.E)
      }
      await redis.xadd(
        "trade","*",
        "type",event.type,
        "symbol",event.symbol,
        "price",event.price.toString(),
        "timestamp",event.timestamp.toString()
      )
      console.log("The price are updated in the redis bitch")
    }catch(error){
      console.log(error);
    }
  })
  ws.on("close",()=>{
    setTimeout(connectToBinance,3000)
  })
  ws.on("error",(err)=>{
    console.log(`Error occured as `,err);
  })
}