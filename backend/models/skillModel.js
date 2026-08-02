// Why this file exists: `skills` is reference data read by both
// tracks — the volunteer's profile picker and (later) the organizer's
// role form, which takes skillIds when creating an event role.
// Centralising it means neither track writes its own skills query.
//
// SHARED-ISH: created by the volunteer track, but intended for the
// organizer track to call too. Append new functions freely; don't
// change an existing signature without a heads-up.
//
// Not to be confused with eventModel.listFilterSkills(), which backs
// GET /events/skills. That one deliberately returns ONLY skills
// attached to a role on a currently-published event (so the browse
// filter can't offer a dead end). This file returns every skill,
// because a volunteer must be able to claim a skill nobody happens to
// be recruiting for today.
//
// Depends on: config/db.js
// Depended on by: controllers/volunteerController.js
const pool = require("../config/db");

// GET /skills — the full reference list.
// The schema (locked) has only skill_id and name; there is no
// `category` column, so nothing else is available to return.
async function listAll() {
  const [rows] = await pool.query(
    "SELECT skill_id AS skillId, name FROM skills ORDER BY name"
  );
  return rows;
}

// Returns the subset of `skillIds` that actually exist.
//
// Why validate rather than let the INSERT fail: volunteer_skills has a
// FK to skills, so an unknown id throws ER_NO_REFERENCED_ROW_2, which
// errorHandler.js turns into an opaque 500. Checking first lets the
// controller return a 400 naming the offending ids.
async function findExistingIds(skillIds, conn = pool) {
  if (skillIds.length === 0) return [];

  // mysql2 expands an array into an IN list for `query` (not `execute`).
  const [rows] = await conn.query(
    "SELECT skill_id AS skillId FROM skills WHERE skill_id IN (?)",
    [skillIds]
  );
  return rows.map((row) => row.skillId);
}

// Case-insensitive lookup by name, for "add a skill that isn't listed".
//
// Worth knowing: skills.name is utf8mb4_0900_ai_ci, so plain `=` is
// ALREADY case- and accent-insensitive — 'photography' matches the row
// stored as 'Photography'. LOWER() on both sides would be redundant and
// would also stop MySQL using the UNIQUE index. So this is a plain
// equality match, and the comment is here so nobody "fixes" it into a
// LOWER() comparison later.
//
// Which also means UNIQUE(name) already blocks a duplicate-by-case at
// the DB level. This function's job isn't to prevent that duplicate —
// it's to return the existing row cleanly instead of erroring.
async function findByNameInsensitive(name, conn = pool) {
  const [[row]] = await conn.query(
    "SELECT skill_id AS skillId, name FROM skills WHERE name = ?",
    [name]
  );
  return row || null;
}

// Insert a new skill, or return the existing one if someone beat us to
// it. Never creates a second row for the same name.
//
// The lookup above is done first by the controller, but two volunteers
// typing the same new skill at the same moment would both pass that
// check — so the UNIQUE constraint is the real guard and ER_DUP_ENTRY
// is a normal outcome here, not an error. Re-selecting on the clash
// returns the winner's row, which is what both callers wanted anyway.
async function createSkill(name) {
  try {
    const [result] = await pool.query("INSERT INTO skills (name) VALUES (?)", [name]);
    return { skillId: result.insertId, name, created: true };
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      const existing = await findByNameInsensitive(name);
      if (existing) return { ...existing, created: false };
    }
    throw err;
  }
}

module.exports = { listAll, findExistingIds, findByNameInsensitive, createSkill };
