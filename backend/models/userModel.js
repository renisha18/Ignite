// Why this file exists: every auth operation touches `users` at some
// point (register, login, /me). Keeping the raw SQL here means
// controllers never write SQL directly — they call these functions,
// which is what "reusable SQL queries" from the coding standards
// means in practice.
//
// Depends on: config/db.js
// Depended on by: controllers/authController.js
const pool = require("../config/db");

async function findByEmail(email) {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0] || null;
}

async function findById(userId) {
  const [rows] = await pool.query(
    "SELECT user_id, email, full_name, role, created_at FROM users WHERE user_id = ?",
    [userId]
  );
  return rows[0] || null;
}

// `conn` is an optional transaction connection (see organizationModel.js /
// authController.js registerOrganizer) — when omitted, runs on the
// shared pool for the simple volunteer-registration path.
async function createUser({ email, passwordHash, fullName, role }, conn = pool) {
  const [result] = await conn.query(
    "INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
    [email, passwordHash, fullName, role]
  );
  return result.insertId;
}

module.exports = { findByEmail, findById, createUser };
