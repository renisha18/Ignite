// Why this file exists separately from volunteerModel.js: that one
// handles profile *creation* during registration (a single INSERT run
// inside the auth transaction). This handles reading and editing an
// existing profile, including the volunteer_skills join — a different
// concern with much more SQL, and keeping it apart means the profile
// feature never has to touch a file the auth flow depends on.
//
// NOT a shared model — the organizer track has no reason to read or
// write a volunteer's own profile.
//
// Depends on: config/db.js, models/skillModel.js
// Depended on by: controllers/volunteerController.js
const pool = require("../config/db");
const skillModel = require("./skillModel");

// GET /volunteers/me/profile
//
// Two queries rather than one join: joining volunteer_skills would
// return one profile row per skill, so a volunteer with five skills
// would come back five times and the caller would have to de-dupe.
//
// returns: { volunteerId, fullName, email, bio, location, totalHours,
//            reputationScore, skills: [{ skillId, name }] }
//          or null if there's no volunteer_profiles row.
async function findProfile(volunteerId) {
  const [[profile]] = await pool.query(
    `SELECT u.user_id            AS volunteerId,
            u.full_name          AS fullName,
            u.email,
            vp.bio,
            vp.location,
            vp.total_hours       AS totalHours,
            vp.reputation_score  AS reputationScore
       FROM users u
       JOIN volunteer_profiles vp ON vp.volunteer_id = u.user_id
      WHERE u.user_id = ?`,
    [volunteerId]
  );

  if (!profile) return null;

  const [skills] = await pool.query(
    `SELECT s.skill_id AS skillId, s.name
       FROM volunteer_skills vs
       JOIN skills s ON s.skill_id = vs.skill_id
      WHERE vs.volunteer_id = ?
      ORDER BY s.name`,
    [volunteerId]
  );

  // DECIMAL columns come back as strings from mysql2. Cast so the API
  // returns numbers and the frontend doesn't have to guess.
  return {
    ...profile,
    totalHours: Number(profile.totalHours),
    reputationScore: Number(profile.reputationScore),
    skills,
  };
}

// Partial field update. Only keys actually present in `fields` are
// written, so a PUT sending just { location } leaves bio alone.
// Returns affectedRows; 0 means nothing was written.
//
// Whitelisted the same way eventModel.update does it — never build a
// SET clause from caller-supplied keys.
const UPDATABLE_COLUMNS = {
  bio: "bio",
  location: "location",
};

async function updateProfileFields(volunteerId, fields, conn = pool) {
  const setClauses = [];
  const values = [];

  for (const [field, column] of Object.entries(UPDATABLE_COLUMNS)) {
    if (fields[field] !== undefined) {
      setClauses.push(`${column} = ?`);
      values.push(fields[field]);
    }
  }

  if (setClauses.length === 0) return 0;

  values.push(volunteerId);
  const [result] = await conn.query(
    `UPDATE volunteer_profiles SET ${setClauses.join(", ")} WHERE volunteer_id = ?`,
    values
  );
  return result.affectedRows;
}

// Replaces the volunteer's skill set wholesale: delete every existing
// row, insert the new set. Caller must pass a transaction connection —
// a delete that committed without its matching insert would silently
// wipe someone's skills.
//
// An empty array is a legitimate input meaning "clear my skills", which
// is why this deletes unconditionally and only skips the INSERT.
async function replaceSkills(volunteerId, skillIds, conn) {
  await conn.query("DELETE FROM volunteer_skills WHERE volunteer_id = ?", [
    volunteerId,
  ]);

  if (skillIds.length === 0) return;

  // Bulk insert — one round trip instead of one per skill.
  await conn.query("INSERT INTO volunteer_skills (volunteer_id, skill_id) VALUES ?", [
    skillIds.map((skillId) => [volunteerId, skillId]),
  ]);
}

// PUT /volunteers/me/profile
//
// Wraps the field update and the skill replacement in one transaction,
// same pattern as the organizer registration flow in authController.js.
// Without it, a failure between the DELETE and the INSERT would leave
// the volunteer with no skills at all.
//
// `skillIds === undefined` means "don't touch skills" — distinct from
// `[]`, which means "remove them all".
async function saveProfile(volunteerId, { bio, location, skillIds }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await updateProfileFields(volunteerId, { bio, location }, conn);

    if (skillIds !== undefined) {
      await replaceSkills(volunteerId, skillIds, conn);
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  // Re-read rather than echoing the request back: the response then
  // reflects what's actually stored, including skill names the caller
  // only sent ids for.
  return findProfile(volunteerId);
}

module.exports = {
  findProfile,
  updateProfileFields,
  replaceSkills,
  saveProfile,
  // Re-exported so the controller can validate ids without importing
  // skillModel separately.
  findExistingSkillIds: skillModel.findExistingIds,
};
