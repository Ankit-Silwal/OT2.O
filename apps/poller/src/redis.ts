import { Redis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
if(!REDIS_URL){
  throw new Error("REDIS_URL is not defined");
}
export const redis = new Redis(REDIS_URL);

redis.on("connect", () => {
  console.log("Connected to the redis server");
})

redis.on("error",(error)=>{
  console.log(`Error occur connecting to the redis`,error);
})