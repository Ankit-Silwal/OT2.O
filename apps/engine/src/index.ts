import "dotenv/config"

import "./redis.js"
import { setBalance } from "./state.js";
import { runConsumer } from "./consumer.js";
function main(){
  setBalance("1",10000);
  runConsumer()
}