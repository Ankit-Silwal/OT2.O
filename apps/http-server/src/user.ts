import type { Request,Response } from "express";
import { randomUUID } from "node:crypto";
import {prisma} from "@repo/shared"
import jwt from "jsonwebtoken"
export async function createUser(req:Request,res:Response){
  try {
    const {email,password}=req.body;
    if(!email || !password){
      return res.status(400).json({
        success:false,
        message:"Please provide email and password"
      })
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: email
      },
      select: {
        id: true
      }
    })

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      })
    }

    const userId=randomUUID();

    await prisma.user.create({
      data:{
        id:userId,
        email:email,
        password:password,
        balance:3000,
        Bitcoin:0,
        Ethereum:0,
        Binance:0
      } as any
    })

    const token = jwt.sign(
      {
        userId: userId,
      },
      process.env.JWT_SECRET || "whateveritworkshaha",
      {
        expiresIn: "1h"
      }
    );
    res.cookie("token",token,{
      httpOnly:true,
      secure:process.env.NODE_ENV === 'production',
      sameSite:true,
      maxAge:60*60*1000*24 //1 day
    })

    return res.status(201).json({
      success:true,
      message:"User registered successfully",
      userId,
      token:token
    })
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint failed")) {
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      })
    }

    return res.status(500).json({
      success:false,
      message: err instanceof Error ? err.message : "Failed to register user"
    })
  }
}

export async function registerUser(req:Request,res:Response){
  const {email,password}=req.body;
  if(!email || !password){
    return res.status(400).json({
      success:false,
      message:"Please provide email and password"
    })
  }
  const user=await prisma.user.findUnique({
    where:{
      email:email
    },select:{
      id:true,
      email:true,
      password:true
    }
  })
  if(!user || password!==user.password){
    return res.status(400).json({
      success:false,
      message:"Invalid email or password"
    })
  }

  const token = jwt.sign(
    {
      userId: user.id,
    },
    process.env.JWT_SECRET || "whateveritworkshaha",
    {
      expiresIn: "1h"
    }
  );
  res.cookie("token",token,{
    httpOnly:true,
    secure:process.env.NODE_ENV === 'production',
    sameSite:true,
    maxAge:60*60*1000*24 //1 day
  })
  return res.status(200).json({
    success:true,
    message:"Succesfully register",
    token:token
  })
}

export async function logoutUser(req:Request,res:Response){
  res.clearCookie("token",{
    httpOnly:true,
    secure:true,
    sameSite:true
  })

  return res.status(200).json({
    success:true,
    message:"Logged out successfully"
  })
}

export async function getUserBalance(req: Request, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      })
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.userId
      },
      select: {
        balance: true
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      })
    }

    return res.status(200).json({
      success: true,
      balance: user.balance
    })
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch balance"
    })
  }
}

export async function getUserCoins(req: Request, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      })
    }

    const rows = await prisma.$queryRaw<Array<{
      Bitcoin: number
      Ethereum: number
      Binance: number
    }>>`
      SELECT "Bitcoin", "Ethereum", "Binance"
      FROM "User"
      WHERE id = ${req.userId}
      LIMIT 1
    `

    const user = rows[0]

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      })
    }

    return res.status(200).json({
      success: true,
      coins: {
        BTC: user.Bitcoin,
        ETH: user.Ethereum,
        BNB: user.Binance
      }
    })
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch coin balances"
    })
  }
}
