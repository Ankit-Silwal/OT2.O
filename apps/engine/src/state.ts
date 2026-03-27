import {prisma} from "@repo/shared"

const prices=new Map<string,number>
const balances=new Map<string,number>
const positions=new Map<string,Map<string,number>>

function getAssetFieldForSymbol(symbol: string): "Bitcoin" | "Ethereum" | "Binance" | undefined {
  if (symbol === "BTCUSDT") {
    return "Bitcoin"
  }
  if (symbol === "ETHUSDT") {
    return "Ethereum"
  }
  if (symbol === "BNBUSDT") {
    return "Binance"
  }
  return undefined
}

export function getPrice(symbol:string):number|undefined{
  return prices.get(symbol)
}
export function setPrice(symbol:string,amount:number){
  prices.set(symbol,amount)
}
export async function setBalance(userId:string,amount:number):Promise<void>{
  await prisma.user.update({
    where:{
      id:userId
    },
    data:{
      balance:amount
    }
  })
  balances.set(userId,amount)
}

export async function getBalance(userId:string):Promise<number|undefined>{
  const cachedBalance = balances.get(userId)
  if(cachedBalance !== undefined){
    return cachedBalance
  }

  const user = await prisma.user.findUnique({
    where:{
      id:userId
    },
    select:{
      balance:true
    }
  })

  if(!user){
    return undefined
  }

  balances.set(userId,user.balance)
  return user.balance
}

export async function increaseAssetHolding(userId: string, symbol: string, quantity: number): Promise<void> {
  const assetField = getAssetFieldForSymbol(symbol)
  if (!assetField) {
    return
  }

  await prisma.user.update({
    where: {
      id: userId
    },
    data: {
      [assetField]: {
        increment: quantity
      }
    }
  })
}

export async function getAssetHolding(userId: string, symbol: string): Promise<number | undefined> {
  const assetField = getAssetFieldForSymbol(symbol)
  if (!assetField) {
    return undefined
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      [assetField]: true
    }
  })

  if (!user) {
    return undefined
  }

  const value = user[assetField]
  return typeof value === "number" ? value : undefined
}

export function getPosition(userId:string,symbol:string):number{
  const userPosition=positions.get(userId);
  if(!userPosition) return 0;
  return userPosition.get(symbol) || 0;
}

export function setPosition(
  userId:string,
  symbol:string,
  amount:number
){
  let userPositions=positions.get(userId);
  if(!userPositions){
    userPositions=new Map();
    positions.set(userId,userPositions);
  }
  const current=userPositions.get(symbol)||0;
  userPositions.set(symbol,current+amount); 
}