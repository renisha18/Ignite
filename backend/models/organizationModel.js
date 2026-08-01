// Why this exists separately from organizerModel.js: organizations
// will be queried on its own later (event creation needs org_id,
// admin approval updates org status) — keeping it independent of the
// organizer_profiles join table means those later features don't
// have to import organizer-specific logic to touch an org.
const pool = require("../config/db");

async function create({ name, description, location, createdBy }, conn = pool) {
  // status defaults to 'pending' — set by the schema, not here. An
  // organizer's org (and therefore their events) isn't publishable
  // until an admin approves it. Registration does NOT bypass this.
  const [result] = await conn.query(
    "INSERT INTO organizations (name, description, location, created_by) VALUES (?, ?, ?, ?)",
    [name, description || null, location || null, createdBy]
  );
  return result.insertId;
}

module.exports = { create };
