const pool = require("../config/db");

async function create({ name, description, location, createdBy }, conn = pool) {
  const [result] = await conn.query(
    "INSERT INTO organizations (name, description, location, created_by) VALUES (?, ?, ?, ?)",
    [name, description || null, location || null, createdBy]
  );

  return result.insertId;
}

async function findById(orgId) {
  const [rows] = await pool.query(
    "SELECT * FROM organizations WHERE org_id = ?",
    [orgId]
  );

  return rows[0] || null;
}

module.exports = {
  create,
  findById,
};