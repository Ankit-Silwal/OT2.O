import type { Request,Response } from "express";
import { randomUUID } from "node:crypto";
import {prisma} from "@repo/shared"
import { success } from "zod";
export async function createUser(req:Request,res:Response){
  const {email,password}=req.body;
  if(email || password){
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
}

export async function registerUser(req:Request,res:Response){
  const {email,password}=req.body;
  if(!email || !password){
    return res.status(400).json({
      success:false,
      message:"Plese provide the required password"
    })
  }
  const checkPass=await prisma.user.findUnique({
    where:{
      email:email
    },select:{
      password:true
    }
  })
  if(password!==checkPass){
    return res.status(400).json({
      success:false,
      message:"The password didnt match sir"
    })
  }
  
}

