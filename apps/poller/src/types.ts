export interface BackPackExchangeMessage{
  e:string, //Event type
  E:string, //Event time in ms
  s:string, //Symbol
  p:string //price
}

export interface PriceUpdateEvent{
  type:"PRICE_UPDATE",
  symbol:string,
  price:number,
  timestamp:number,
}