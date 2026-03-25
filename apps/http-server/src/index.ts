import "dotenv/config"
import  Express  from "express";
import "./redis.js"
import router from "./routes.js";
const PORT=process.env.PORT;
const app=Express();
app.use(Express.json())
app.use("/api",router)
app.listen(PORT,()=>{
  console.log(`The http server has started at port no ${PORT}`)
})