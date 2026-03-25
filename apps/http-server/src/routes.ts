import { Router } from "express";
import { tradeSchema } from "./validator.js";
import type { Request,Response } from "express";
import { randomUUID } from "node:crypto";
import { redis } from "./redis.js";


const router=Router();

router.post("/trade",async(req:Request,res:Response)=>{
  try{
    const data=tradeSchema.parse(req.body);
    const orderId=randomUUID();
    await redis.xadd(
      "engine-response",
      "*",
      "type","ORDER_PENDING",
      "orderId",orderId,
      "userId",data.userId
    )
    await redis.xadd(
      "trade","*",
      "type","CREATE_ORDER",
      "orderId",orderId,
      "userId",data.userId,
      "symbol",data.symbol,
      "side",data.side,
      "price",data.price.toString(),
      "quantity",data.quantity.toString()
    )
    return res.status(200).json({
      success:true,
      orderId
    })
  }catch(err){
    return res.status(400).json({
      success:false,
      error:err
    })
  }
})

export default router;