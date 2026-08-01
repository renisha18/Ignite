// Why a separate file from userModel: volunteer_profiles is a 1:1
// extension of users (only for role='volunteer'), not the users table
// itself. Keeping it separate means the organizer/admin registration
// paths never accidentally import volunteer-only logic.
const pool = require("../config/db");

async function createProfile(volunteerId, conn = pool) {
  // bio/location/hours/reputation all start empty — filled in later
  // via a profile-edit endpoint, not at signup.
  await conn.query("INSERT INTO volunteer_profiles (volunteer_id) VALUES (?)", [
    volunteerId,
  ]);
}

module.exports = { createProfile };
