import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connection } from "./database.js";
import joi from "joi";

dotenv.config();
const server = express();
server.use(express.json());
server.use(cors());

server.use("/status", (req, res) => {
  res.send("server on");
});

const categoriesSchema = joi.object({
  name: joi.string().required().trim(),
});

server.get("/categories", async (req, res) => {
  try {
    const categoriesList = await connection.query("SELECT * FROM categories;");
    res.send(categoriesList.rows);
  } catch (error) {
    console.log(error.message);
  }
});

server.post("/categories", async (req, res) => {
  const { name } = req.body;
  const validation = categoriesSchema.validate(req.body, {
    abortEarly: false,
  });
  if (validation.error) {
    const err = validation.error.details.map((err) => err.message);
    res.status(400).send(err);
    return;
  }

  try {
    const existingName = await connection.query(
      "SELECT * FROM categories WHERE name = $1;",
      [name]
    );
    if (existingName.rows.length > 0) {
      res.status(409).send("Categoria já existente.");
      return;
    }
    await connection.query("INSERT INTO categories (name) VALUES ($1);", [
      name,
    ]);
    res.status(201).send("Categoria inserida!");
  } catch (error) {
    console.log(error.message);
  }
});

server.listen(process.env.PORT, () => {
  console.log("listening in port " + process.env.PORT);
});
