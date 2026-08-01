// Why this file exists: every controller that touches the DB needs a
// connection. Centralizing the pool here means one config, reused
// everywhere via `require("../config/db")` — no controller opens its
// own connection or duplicates credentials.
//
// Depends on: .env (via dotenv, loaded in server.js before this file
// is required).
// Depended on by: every model/controller that runs a query.
require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
