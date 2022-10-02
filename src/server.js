import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connection } from "./database.js";

dotenv.config();
const server = express();
server.use(express.json());
server.use(cors());

server.use("/status", (req, res) => {
  res.send("server on");
});

server.listen(process.env.PORT, () => {
  console.log("listening in port " + process.env.PORT);
});
