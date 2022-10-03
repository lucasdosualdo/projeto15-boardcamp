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

const gamesShcema = joi.object({
  name: joi.string().required().trim(),
  image: joi.string().uri().required(),
  stockTotal: joi.number().greater(0).required(),
  categoryId: joi.number().required(),
  pricePerDay: joi.number().greater(0).required(),
});

//CATEGORIES >>>>>>>>>>>>>>>>>>>>>>>>>>

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
    if (existingName.rowCount > 0) {
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

//GAMES >>>>>>>>>>>>>>>>>>>>>>>>>>

server.get("/games", async (req, res) => {
  const { name } = req.query;
  const gamesArray = [];
  let searchedGames = "";

  try {
    if (name) {
      gamesArray.push(`${name}%`);
      searchedGames += `WHERE name ILIKE $${gamesArray.length}`;
    }
    const gamesList = await connection.query(
      `SELECT * FROM games ${searchedGames};`,
      gamesArray
    );
    res.send(gamesList.rows);
  } catch (error) {
    console.log(error.message);
  }
});

server.post("/games", async (req, res) => {
  const { name, image, stockTotal, categoryId, pricePerDay } = req.body;
  const validation = gamesShcema.validate(req.body, {
    abortEarly: false,
  });
  if (validation.error) {
    const err = validation.error.details.map((err) => err.message);
    res.status(400).send(err);
    return;
  }

  try {
    const existingName = await connection.query(
      "SELECT * FROM games WHERE name = $1;",
      [name]
    );
    const existingCategory = await connection.query(
      "SELECT * FROM categories WHERE id = $1;",
      [categoryId]
    );
    if (existingName.rowCount > 0) {
      res.status(409).send("Jogo já existente.");
      return;
    }
    if (existingCategory.rowCount === 0) {
      res.status(400).send("Categoria não existente.");
      return;
    }
    const jogoadd = await connection.query(
      `INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5);`,
      [name, image, stockTotal, categoryId, pricePerDay]
    );
    res.status(201).send(jogoadd);
  } catch (error) {
    console.log(error.message);
  }
});

server.listen(process.env.PORT, () => {
  console.log("listening in port " + process.env.PORT);
});
