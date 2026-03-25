import {Redis} from "ioredis"

const REDIS_URL=process.env.REDIS_URL
if(!REDIS_URL){
  throw new Error("Please provide the redis url")
}
export const redis=new Redis(REDIS_URL)

redis.on("connect",()=>{
  console.log("engine is connecteed to the redis");
})

redis.on("error",(err)=>{
  console.log( `Error connecting to the redis sir`,err);
})