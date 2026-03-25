import "dotenv/config";
import "./redis.js"
import { connectToBinance } from "./binance.js"
async function main(){
  connectToBinance()
}
main()