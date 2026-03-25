import { redis } from "./redis.js";
import { getPrice,setBalance,getBalance,getPosition,setPosition, setPrice } from "./state.js";
import type { PriceEvent } from "./events.js";

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
        
      }
    }catch(err){
      console.log(`Error`,err)
      setTimeout(runConsumer,3000);
    }
  }
}
