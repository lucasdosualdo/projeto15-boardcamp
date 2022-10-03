import express, { query } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connection } from "./database.js";
import joi from "joi";
import dayjs from "dayjs";

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

const customersSchema = joi.object({
  name: joi.string().required().trim(),
  phone: joi
    .string()
    .min(10)
    .max(11)
    .pattern(/^[0-9]+$/)
    .required(),
  cpf: joi
    .string()
    .length(11)
    .pattern(/^[0-9]+$/)
    .required(),
  birthday: joi.date().required(),
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
      `SELECT games.*, categories.name AS "categoryName" 
      FROM games
      JOIN categories ON games."categoryId"=categories.id
      ${searchedGames};`,
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
    await connection.query(
      `INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5);`,
      [name, image, stockTotal, categoryId, pricePerDay]
    );
    res.sendStatus(201);
  } catch (error) {
    console.log(error.message);
  }
});

//CLIENTES >>>>>>>>>>>>>>>>>>>>>>>>>>

server.get("/customers", async (req, res) => {
  const { cpf } = req.query;
  const customersArray = [];
  let searchedCustomers = "";

  try {
    if (cpf) {
      customersArray.push(`${cpf}%`);
      searchedCustomers += `WHERE cpf ILIKE $${customersArray.length}`;
    }
    const gamesList = await connection.query(
      `SELECT * FROM customers ${searchedCustomers};`,
      customersArray
    );
    res.send(gamesList.rows);
  } catch (error) {
    console.log(error.message);
  }
});

server.get("/customers/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const customer = await connection.query(
      "SELECT * FROM customers WHERE id = $1",
      [id]
    );
    if (customer.rowCount === 0) {
      res.status(404).send("Usuário não existente.");
      return;
    }
    res.send(customer.rows[0]);
  } catch (error) {
    console.log(error.message);
  }
});

server.post("/customers", async (req, res) => {
  const { name, phone, cpf, birthday } = req.body;
  const validation = customersSchema.validate(req.body, {
    abortEarly: false,
  });
  if (validation.error) {
    const err = validation.error.details.map((err) => err.message);
    res.status(400).send(err);
    return;
  }

  try {
    const existingCpf = await connection.query(
      "SELECT * FROM customers WHERE cpf = $1;",
      [cpf]
    );
    if (existingCpf.rowCount > 0) {
      res.status(409).send("CPF já existente.");
      return;
    }
    await connection.query(
      `INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4);`,
      [name, phone, cpf, birthday]
    );
    res.sendStatus(201);
  } catch (error) {
    console.log(error.message);
  }
});

server.put("/customers/:id", async (req, res) => {
  const { name, phone, cpf, birthday } = req.body;
  const id = req.params.id;
  const validation = customersSchema.validate(req.body, {
    abortEarly: false,
  });
  if (validation.error) {
    const err = validation.error.details.map((err) => err.message);
    res.status(400).send(err);
    return;
  }

  try {
    const searchedCustomer = await connection.query(
      "SELECT * FROM customers WHERE id = $1;",
      [id]
    );
    if (searchedCustomer.rowCount === 0) {
      res.status(404).send("Usuário não existente.");
      return;
    }
    const existingCpf = await connection.query(
      "SELECT * FROM customers WHERE cpf = $1 AND id <> $2;",
      [cpf, id]
    );
    if (existingCpf.rowCount > 0) {
      res.status(409).send("CPF já existente.");
      return;
    }
    const customerteste = await connection.query(
      `UPDATE customers SET 
      name = $1,
      phone = $2,
      cpf = $3,
      birthday = $4 WHERE id = $5;`,
      [name, phone, cpf, birthday, id]
    );
    res.send(customerteste.rows);
  } catch (error) {
    console.log(error.message);
  }
});

//ALUGUEL >>>>>>>>>>>>>>>>>>>>>>>>>>

server.get("/rentals", async (req, res) => {
  const { customerId, gameId } = req.query;

  try {
    const gamesList = await connection.query(
      `
    SELECT rentals.*,
    json_build_object("id", customers.id, "name", customers.name) as customer,
    json_build_object("id", games.id, "name", games.name, "categoryId", games."categoryId", "categoryName", categories.name) as game
    FROM rentals
    JOIN customers ON rentals."customerId"=customers.id
    JOIN games ON rentals."gameId"=games.id
    JOIN categories ON games."categoryId"=categories.id;
    `
    );
    res.send(gamesList.rows);
  } catch (error) {
    console.log(error.message);
  }
});

server.post("/rentals", async (req, res) => {
  const { customerId, gameId, daysRented } = req.body;
  try {
    const validateCustomer = await connection.query(
      "SELECT * FROM customers WHERE id = $1",
      [customerId]
    );
    const validateGame = await connection.query(
      "SELECT * FROM games WHERE id = $1",
      [gameId]
    );
    if (validateCustomer.rowCount === 0 || validateGame.rowCount === 0) {
      res.status(404).send("Usuário ou jogo não existente.");
      return;
    }

    if (typeof daysRented !== "number" || daysRented <= 0) {
      res.status(404).send("Insira o número de dias corretamente.");
      return;
    }

    const game = validateGame.rows[0];

    const availableGame = await connection.query(
      `
    SELECT * FROM rentals WHERE "gameId"=$1 AND "returnDate"=null;`,
      [gameId]
    );

    if (availableGame.rowCount > 0) {
      if (game.stockTotal === availableGame.rowCount) {
        res.status(400).send("Todos os estoques deste jogo estão alugados.");
        return;
      }
    }

    const originalPrice = daysRented * game.pricePerDay;

    const testEnvio = await connection.query(
      `
    INSERT INTO rental ('customerId', 'gameId', 'rentDate', 'daysRented', 'returnDate', 'originalPrice', 'delayFee')
    VALUES ($1, $2, NOW(), $3, null, $4, null);
    `,
      [customerId, gameId, daysRented, originalPrice]
    );

    res.send(testEnvio.rows);
  } catch (error) {
    console.log(error.message);
  }
});

server.listen(process.env.PORT, () => {
  console.log("listening in port " + process.env.PORT);
});
