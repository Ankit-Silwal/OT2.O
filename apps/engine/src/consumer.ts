import { redis } from "./redis.js";
import { getPrice,setBalance,getBalance,getPosition,setPosition, setPrice } from "./state.js";
import type { CreateOrderEvent, PriceEvent } from "./events.js";

export async function runConsumer(){
  console.log("The consumer server has started to work yearh nigga")
  while(true){
    try{
      const response=await redis.xread(
        "BLOCK",0,
        "STREAMS","trade","$"
      )
      if(!response) continue;
      const temp=response;
      if (!temp || !temp[0]) continue;
      
      const streamData = temp[0];
      const messages = streamData[1];
      
      for(const message of messages){
        const [id,fields]=message;
        const data:Record<string,string>={}
        for(let i=0;i<fields.length;i+=2){
          const key = fields[i];
          const value = fields[i+1];
          if(key && value) {
            data[key] = value;
          }
        }
        
        if(data.type==="PRICE_UPDATE" && data.symbol && data.price && data.timestamp){
          const event:PriceEvent={
            type:"PRICE_UPDATE",
            symbol:data.symbol,
            price:Number.parseFloat(data.price),
            timestamp:Number.parseInt(data.timestamp)
          }
          setPrice(event.symbol,event.price)
        }
        if(data.type==="CREATE_ORDER" && data.orderId && data.userId && data.symbol && data.amount && data.side){
          try{
            const event:CreateOrderEvent={
              type:"CREATE_ORDER",
              orderId:data.orderId,
              userId:data.userId,
              symbol:data.symbol,
              quantity:Number.parseFloat(data.amount),
              side:data.side as "BUY" | "SELL"
            }
            const currentPrice=getPrice(event.symbol)
            if(!currentPrice){
              await redis.xadd(
                "engine-response","*",
                "type","ORDER_REJECTED",
                "orderId",event.orderId,
                "userId",event.userId,
                "reason","NO_PRICE"
              )
              continue;
            }
            const balance=getBalance(event.userId);
            const cost=currentPrice*event.quantity
            if(event.side==="BUY"){
              if(!balance || balance < cost){
                await redis.xadd(
                  "engine-response","*",
                  "type","ORDER_REJECTED",
                  "orderId", event.orderId, 
                  "userId", event.userId,
                  "reason", "INSUFFICIENT_BALANCE"
                )
                continue;
              }
              setBalance(event.userId,balance-cost);
              setPosition(event.userId,event.symbol,event.quantity)
              await redis.xadd(
                "engine-response","*",
                "type","ORDER_FILLED",
                "userId", event.userId,
                "side", event.side,
                "price", currentPrice.toString(),
                "quantity", event.quantity.toString()
              )
            }else if(event.side==="SELL"){
              await redis.xadd(
                "engine-response","*",
                "type","ORDER_FILLED",
                "orderId",event.orderId,
                "userId",event.userId,
                "symbol",event.symbol,  
                "quantity",event.quantity
              )
            }
          } catch(e) {
            console.log(e);
          }
        }
      }
    }catch(err){
      console.log(`Error`,err)
      setTimeout(runConsumer,3000);
    }
  }
}
