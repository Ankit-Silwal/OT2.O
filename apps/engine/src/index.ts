import "dotenv/config"

import "./redis.js"
import { runConsumer } from "./consumer.js";

await runConsumer()