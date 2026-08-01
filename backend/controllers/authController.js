// Why this file exists: the only place that orchestrates auth
// operations end-to-end — validating input, calling models, hashing/
// comparing passwords, signing tokens. Models stay dumb (pure SQL);
// this is where the actual auth logic lives.
//
// Depends on: config/db.js (for the transaction connection),
// models/userModel.js, models/volunteerModel.js,
// models/organizationModel.js, models/organizerModel.js,
// utils/token.js, utils/AppError.js
// Depended on by: routes/authRoutes.js
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const userModel = require("../models/userModel");
const volunteerModel = require("../models/volunteerModel");
const organizationModel = require("../models/organizationModel");
const organizerModel = require("../models/organizerModel");
const { signToken } = require("../utils/token");
const AppError = require("../utils/AppError");

const SALT_ROUNDS = 10;

// Why a plain regex instead of a validation library (Joi/Zod/etc.):
// the spec says ask before adding new dependencies, and auth only
// needs three checks (email shape, password length, required fields
// present) — not worth a library for that. If validation grows past
// this (event forms, nested objects), that's the point to introduce
// one, and worth asking about then.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function assertValidCredentials({ email, password, fullName }) {
  if (!email || !password || !fullName) {
    throw new AppError(400, "email, password, and fullName are required");
  }
  if (!EMAIL_RE.test(email)) {
    throw new AppError(400, "Invalid email format");
  }
  if (password.length < 8) {
    throw new AppError(400, "Password must be at least 8 characters");
  }
}

// -------------------------------------------------------------
// POST /auth/register/volunteer
// -------------------------------------------------------------
async function registerVolunteer(req, res) {
  const { email, password, fullName } = req.body;
  assertValidCredentials({ email, password, fullName });

  const existing = await userModel.findByEmail(email);
  if (existing) throw new AppError(409, "Email already registered");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Single-table insert, no transaction needed — if this fails
  // partway there's nothing to roll back.
  const userId = await userModel.createUser({
    email,
    passwordHash,
    fullName,
    role: "volunteer",
  });
  await volunteerModel.createProfile(userId);

  const token = signToken({ userId, role: "volunteer" });
  res.status(201).json({
    token,
    user: { userId, email, fullName, role: "volunteer" },
  });
}

// -------------------------------------------------------------
// POST /auth/register/organizer
// -------------------------------------------------------------
async function registerOrganizer(req, res) {
  const { email, password, fullName, orgName, orgDescription, orgLocation } = req.body;
  assertValidCredentials({ email, password, fullName });

  if (!orgName) {
    throw new AppError(400, "orgName is required for organizer registration");
  }

  const existing = await userModel.findByEmail(email);
  if (existing) throw new AppError(409, "Email already registered");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Why a transaction here specifically: this is 3 inserts across 3
  // tables (users -> organizations -> organizer_profiles) that only
  // make sense together. If the organization insert failed after the
  // user insert succeeded, you'd have a user stuck with role=
  // 'organizer' and no organization — broken, unrecoverable without
  // manual cleanup. The transaction guarantees all three commit
  // together or none do.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const userId = await userModel.createUser(
      { email, passwordHash, fullName, role: "organizer" },
      conn
    );

    const orgId = await organizationModel.create(
      { name: orgName, description: orgDescription, location: orgLocation, createdBy: userId },
      conn
    );

    await organizerModel.createProfile(userId, orgId, conn);

    await conn.commit();

    const token = signToken({ userId, role: "organizer", orgId });
    res.status(201).json({
      token,
      user: { userId, email, fullName, role: "organizer" },
      organization: { orgId, name: orgName, status: "pending" },
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// -------------------------------------------------------------
// POST /auth/login
// -------------------------------------------------------------
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError(400, "email and password are required");
  }

  const user = await userModel.findByEmail(email);
  // Same error for "no such user" and "wrong password" — don't leak
  // which one it was, that's an account-enumeration vector.
  if (!user) throw new AppError(401, "Invalid email or password");

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new AppError(401, "Invalid email or password");

  const payload = { userId: user.user_id, role: user.role };
  let organization = undefined;

  if (user.role === "organizer") {
    const org = await organizerModel.findByOrganizerId(user.user_id);
    if (org) {
      payload.orgId = org.org_id;
      organization = { orgId: org.org_id, name: org.org_name, status: org.org_status };
    }
  }

  const token = signToken(payload);
  res.json({
    token,
    user: {
      userId: user.user_id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
    },
    ...(organization && { organization }),
  });
}

// -------------------------------------------------------------
// GET /auth/me  (protected — req.user set by authenticate middleware)
// -------------------------------------------------------------
async function me(req, res) {
  const user = await userModel.findById(req.user.userId);
  if (!user) throw new AppError(404, "User not found");

  let organization = undefined;
  if (user.role === "organizer") {
    const org = await organizerModel.findByOrganizerId(user.user_id);
    if (org) {
      organization = { orgId: org.org_id, name: org.org_name, status: org.org_status };
    }
  }

  res.json({
    user: {
      userId: user.user_id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      createdAt: user.created_at,
    },
    ...(organization && { organization }),
  });
}

module.exports = { registerVolunteer, registerOrganizer, login, me };
