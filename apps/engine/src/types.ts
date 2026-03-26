export interface CreateOrderEvent{
  type:"CREATE_ORDER",
  orderId:string,
  userId:string,
  symbol:string,
  quantity:number,
  side:"BUY"|"SELL"
}

