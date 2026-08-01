const pool = require("../config/db");

async function createProfile(organizerId, orgId, conn = pool) {
  await conn.query(
    "INSERT INTO organizer_profiles (organizer_id, org_id) VALUES (?, ?)",
    [organizerId, orgId]
  );
}

// Used by authenticate/login to embed org_id + org status in the
// JWT and in /me — organizer-only routes will need both without an
// extra query on every request.
async function findByOrganizerId(organizerId) {
  const [rows] = await pool.query(
    `SELECT op.org_id, o.name AS org_name, o.status AS org_status
     FROM organizer_profiles op
     JOIN organizations o ON o.org_id = op.org_id
     WHERE op.organizer_id = ?`,
    [organizerId]
  );
  return rows[0] || null;
}

module.exports = { createProfile, findByOrganizerId };
