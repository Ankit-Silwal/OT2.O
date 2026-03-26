import "dotenv/config"

import { PrismaClient } from "@prisma/client/extension"
import {Redis} from "ioredis"
import { stat } from "node:fs";
const prisma=new PrismaClient();
if(!process.env.REDIS_URL){
  throw new Error("Pass the redis Url too")
}
const redis=new Redis(process.env.REDIS_URL)

async function startWorker(){
  try{
    while(true){
      const res=await redis.xread(
        "BLOCK",0,
        "STREAMS","engine-response","$"
      )
      if(!res) continue;
      const stream = res[0];
      if(!stream) continue;
      const [,messages]=stream;
      for(const [,fields] of messages){
        const data:Record<string,string>={}
        for(let i=0;i+1<fields.length;i+=2){
          const key=fields[i];
          const value=fields[i+1];
          if(key===undefined || value===undefined) continue;
          data[key]=value;
        }
        if(!data.type){
          console.log("Skipping this shit cause it lacks data type")
          continue;
        }
        if(data.type==="ORDER_PENDING"){
          await prisma.trade.upsert({
            where:{
              userId:data.userId
            },
            update:{},
            create:{
              orderId:data.orderId,
              userId:data.userId,
              symbol:"",
              side:"",
              price:0,
              quantity:0,
              status:"PENDING"
            }
          })
        }
        if(data.type==="ORDER_FILLED"){
          if(!data.userId ||!data.symbol ||data.side || data.price || data.quantity){
            console.log("Continue due to missing fuckign feilds")
            continue;         
          }
          await prisma.trade.update({
            where:{
              orderId:data.orderId
            },
            data:{
              side:data.side,
              price:data.price,
              symbol:data.symbol,
              quantity:data.quantity,
              status:"FILLED"
            }
          })
        }
        if(data.type==="ORDER_REJECTED"){
          if(!data.userId || !data.symbol ||data.side ||data.price ||data.quantity){
            console.log("Continue due to missing some fileds");
          }
          await prisma.trade.update({
            where:{
              orderId:data.orderId
            },data:{
              side:data.side,
              price:data.price,
              symbol:data.symbol,
              quantity:data.quantity,
              status:"REJECTED"
            }
          })
        }
      }
    }
  }catch(err){
    throw new Error(`Error:${err}`)
  }
}

startWorker()