import {Redis} from "ioredis";

export const redis=new Redis("redis://localhost:6969");

redis.on("connect",()=>{
  console.log("HTTP connected to the redis");
})

