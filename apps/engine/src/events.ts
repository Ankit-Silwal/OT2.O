export type Events="PRICE_UPDATE"|"CREATE_ORDER"

export interface PriceEvent{
  type:Events,
  symbol:string,
  price:number,
  timestamp:number,
}

export interface CreateOrderEvent{
  type:"CREATE_ORDER",
  orderId:string,
  userId:string,
  symbol:string,
  amount:number,
  side:"BUY"|"SELL"
}

