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
    const userId=randomUUID();

    await prisma.user.create({
      data:{
        id:userId,
        email:email,
        password:password,
        balance:3000
      }
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

