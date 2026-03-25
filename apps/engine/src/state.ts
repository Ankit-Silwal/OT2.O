const prices=new Map<string,number>
const balances=new Map<string,number>
const positions=new Map<string,Map<string,number>>

export function getPrice(symbol:string):number|undefined{
  return prices.get(symbol)
}
export function setPrice(symbol:string,amount:number){
  prices.set(symbol,amount)
}
export function setBalance(userId:string,amount:number):void{
  balances.set(userId,amount);
}

export function getBalance(userId:string):number|undefined{
  return balances.get(userId);
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