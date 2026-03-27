import {z} from "zod"

const allowedSymbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT"] as const

export const tradeSchema=z.object({
  symbol:z.string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => allowedSymbols.includes(value as (typeof allowedSymbols)[number]), {
      message: "Invalid symbol. Allowed symbols: BTCUSDT, ETHUSDT, BNBUSDT"
    }),
  side:z.enum(["BUY","SELL"]),
  quantity:z.number().positive()
})