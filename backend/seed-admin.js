// Why admin has a seed script instead of an endpoint: letting anyone
// POST /auth/register/admin would mean anyone could grant themselves
// admin. For a hackathon MVP the simplest safe option is "admins are
// created by whoever has DB access" — run this once per admin you
// need, then delete/never expose it publicly.
//
// Usage: node seed-admin.js "Admin Name" admin@ignite.dev somePassword123
require("dotenv").config();
const bcrypt = require("bcrypt");
const pool = require("./config/db");
const userModel = require("./models/userModel");

async function main() {
  const [fullName, email, password] = process.argv.slice(2);
  if (!fullName || !email || !password) {
    console.error("Usage: node seed-admin.js \"Full Name\" email password");
    process.exit(1);
  }

  const existing = await userModel.findByEmail(email);
  if (existing) {
    console.error("A user with that email already exists.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = await userModel.createUser({ email, passwordHash, fullName, role: "admin" });

  console.log(`Admin created: user_id=${userId}, email=${email}`);
  await pool.end();
}

main().catch((err) => {
  console.error("Failed to seed admin:", err);
  process.exit(1);
});
