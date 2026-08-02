// Why this file exists: the Sponsor Recommendation System's logic —
// catalogue CRUD, event↔sponsor links, and the scoring that turns past
// event history into an ordered list of suggestions.
//
// The recommendation engine is deliberately arithmetic, not AI: every
// point in a score traces back to a countable fact about previous
// events, and the `reasons` array is generated from the very same
// counters that produced the number. That's what makes a suggestion
// arguable rather than magic.
//
// Depends on: models/sponsorModel.js, controllers/eventController.js
// (loadOwnedEvent), config/db.js (transaction), utils/AppError.js
// Depended on by: routes/sponsorRoutes.js
const sponsorModel = require("../models/sponsorModel");
const { loadOwnedEvent } = require("./eventController");
const pool = require("../config/db");
const AppError = require("../utils/AppError");

// Column widths from the schema.
const MAX_NAME = 255;
const MAX_URL = 255;
const MAX_INDUSTRY = 150;
const MAX_CONTACT = 150;
const MAX_EMAIL = 255;
const MAX_PHONE = 50;
const MAX_TYPE = 100;
const MAX_REMARKS = 2000;

// Same shape as authController's — a validation library isn't worth it
// for one optional field.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------
// Scoring weights.
//
// Hoisted into one table so the formula is legible in a single glance
// and tunable without hunting through the aggregation loop. Each signal
// is capped so no single one can dominate: a sponsor who backed twenty
// events of this type is clearly relevant, but not so relevant that
// location and role fit stop mattering.
//
// Caps total 100, which is what makes the score readable as a percentage.
// ---------------------------------------------------------------------
const WEIGHTS = {
  sameType: { per: 15, cap: 40 },
  sameLocation: { per: 12, cap: 25 },
  sharedRoleTitle: { per: 7, cap: 20 },
  sharedRoleSkill: { per: 5, cap: 15 },
};

function parseId(raw, fieldName) {
  const id = Number.parseInt(raw, 10);
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError(400, `Invalid ${fieldName}`);
  }
  return id;
}

function readText(value, fieldName, max, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new AppError(400, `${fieldName} is required`);
    return null;
  }
  if (typeof value !== "string") {
    throw new AppError(400, `${fieldName} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw new AppError(400, `${fieldName} is required`);
    return null;
  }
  if (trimmed.length > max) {
    throw new AppError(400, `${fieldName} must be ${max} characters or fewer`);
  }
  return trimmed;
}

// Optional. Blank clears it. A negative sponsorship is meaningless, and
// so is a non-numeric one.
function readAmount(value) {
  if (value === undefined || value === null || value === "") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new AppError(400, "sponsorshipAmount must be a positive number");
  }
  return amount;
}

function readSponsorFields(body, { partial = false } = {}) {
  const sponsorName = readText(body?.sponsorName, "sponsorName", MAX_NAME, {
    required: !partial,
  });
  const email = readText(body?.email, "email", MAX_EMAIL);
  if (email && !EMAIL_RE.test(email)) {
    throw new AppError(400, "Invalid email format");
  }

  return {
    sponsorName,
    website: readText(body?.website, "website", MAX_URL),
    industry: readText(body?.industry, "industry", MAX_INDUSTRY),
    contactPerson: readText(body?.contactPerson, "contactPerson", MAX_CONTACT),
    email,
    phone: readText(body?.phone, "phone", MAX_PHONE),
  };
}

// The event-specific half of the form: what this sponsor gave to THIS
// event. Never touches the catalogue record.
function readContributionFields(body, { partial = false } = {}) {
  return {
    sponsorshipType: readText(
      body?.sponsorshipType,
      "sponsorshipType",
      MAX_TYPE,
      { required: !partial }
    ),
    sponsorshipAmount: readAmount(body?.sponsorshipAmount),
    remarks: readText(body?.remarks, "remarks", MAX_REMARKS),
  };
}

// -------------------------------------------------------------
// GET /sponsors?search=
// -------------------------------------------------------------
async function listSponsors(req, res) {
  const rawSearch = req.query.search;
  const search =
    typeof rawSearch === "string" && rawSearch.trim() !== ""
      ? rawSearch.trim()
      : undefined;

  const sponsors = await sponsorModel.listSponsors({ search });
  res.json({ sponsors });
}

// -------------------------------------------------------------
// POST /sponsors
// -------------------------------------------------------------
async function createSponsor(req, res) {
  const fields = readSponsorFields(req.body);
  const sponsorId = await sponsorModel.createSponsor(fields);
  const sponsor = await sponsorModel.findSponsorById(sponsorId);
  res.status(201).json({ sponsor });
}

// -------------------------------------------------------------
// GET /events/:eventId/sponsors
// -------------------------------------------------------------
async function listEventSponsors(req, res) {
  const eventId = parseId(req.params.eventId, "event id");
  await loadOwnedEvent(eventId, req.user);

  const sponsors = await sponsorModel.findEventSponsors(eventId);
  res.json({ sponsors });
}

// -------------------------------------------------------------
// POST /events/:eventId/sponsors
//
// Two shapes in one endpoint, because from the organizer's side it's one
// action ("add a sponsor to this event"):
//   { sponsorId, ...contribution }         -> link an existing catalogue entry
//   { sponsor: {...}, ...contribution }    -> create the entry, then link it
//
// The second runs in a transaction so a sponsor can never be created and
// then orphaned by a failed link — which would leave a duplicate in the
// catalogue for the organizer to trip over on their next attempt.
// -------------------------------------------------------------
async function addEventSponsor(req, res) {
  const eventId = parseId(req.params.eventId, "event id");
  await loadOwnedEvent(eventId, req.user);

  const contribution = readContributionFields(req.body);
  const hasExisting = req.body?.sponsorId !== undefined && req.body?.sponsorId !== null;

  let sponsorId;

  if (hasExisting) {
    sponsorId = parseId(req.body.sponsorId, "sponsorId");
    const sponsor = await sponsorModel.findSponsorById(sponsorId);
    if (!sponsor) throw new AppError(404, "Sponsor not found");

    try {
      await sponsorModel.linkSponsorToEvent({ eventId, sponsorId, ...contribution });
    } catch (err) {
      rethrowDuplicateLink(err);
    }
  } else {
    const sponsorFields = readSponsorFields(req.body?.sponsor ?? {});

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      sponsorId = await sponsorModel.createSponsor(sponsorFields, conn);
      await sponsorModel.linkSponsorToEvent(
        { eventId, sponsorId, ...contribution },
        conn
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      rethrowDuplicateLink(err);
    } finally {
      conn.release();
    }
  }

  // Re-read the event's list so the client gets the joined shape it
  // renders with, rather than a bare insert id.
  const sponsors = await sponsorModel.findEventSponsors(eventId);
  const created = sponsors.find((row) => row.sponsorId === sponsorId) ?? null;

  res.status(201).json({ sponsor: created, sponsors });
}

// UNIQUE (event_id, sponsor_id) — adding the same sponsor twice is a
// legitimate mistake, not a server fault.
function rethrowDuplicateLink(err) {
  if (err.code === "ER_DUP_ENTRY") {
    throw new AppError(409, "That sponsor is already linked to this event");
  }
  throw err;
}

// -------------------------------------------------------------
// PUT /event-sponsors/:eventSponsorId
//
// Edits the CONTRIBUTION only. Global sponsor details are not editable
// here by design — one event's organizer shouldn't be renaming a
// catalogue entry that other events depend on.
// -------------------------------------------------------------
async function updateEventSponsor(req, res) {
  const eventSponsorId = parseId(req.params.eventSponsorId, "event sponsor id");

  const link = await sponsorModel.findEventSponsorById(eventSponsorId);
  if (!link) throw new AppError(404, "Sponsorship not found");

  await loadOwnedEvent(link.eventId, req.user);

  const fields = readContributionFields(req.body, { partial: true });
  // Strip keys the caller didn't send, so a partial edit doesn't blank
  // the fields it never mentioned.
  const provided = {};
  for (const key of ["sponsorshipType", "sponsorshipAmount", "remarks"]) {
    if (req.body?.[key] !== undefined) provided[key] = fields[key];
  }
  if (Object.keys(provided).length === 0) {
    throw new AppError(400, "No updatable fields provided");
  }
  if (provided.sponsorshipType === null) {
    throw new AppError(400, "sponsorshipType is required");
  }

  await sponsorModel.updateEventSponsor(eventSponsorId, provided);

  const sponsors = await sponsorModel.findEventSponsors(link.eventId);
  const updated =
    sponsors.find((row) => row.eventSponsorId === eventSponsorId) ?? null;

  res.json({ sponsor: updated, sponsors });
}

// -------------------------------------------------------------
// DELETE /event-sponsors/:eventSponsorId
// -------------------------------------------------------------
async function removeEventSponsor(req, res) {
  const eventSponsorId = parseId(req.params.eventSponsorId, "event sponsor id");

  const link = await sponsorModel.findEventSponsorById(eventSponsorId);
  if (!link) throw new AppError(404, "Sponsorship not found");

  await loadOwnedEvent(link.eventId, req.user);

  // Unlinks only. The catalogue entry and every other event's history
  // survive — see the FK note in the migration.
  await sponsorModel.unlinkEventSponsor(eventSponsorId);

  res.status(204).end();
}

// -------------------------------------------------------------
// GET /events/:eventId/sponsor-recommendations
//
// Returns BOTH informational history and scored suggestions in one
// response. They're bundled because both are derived from the identical
// scan of past same-type events — splitting them into two endpoints
// would run that scan twice for one screen.
// -------------------------------------------------------------
async function getRecommendations(req, res) {
  const eventId = parseId(req.params.eventId, "event id");
  await loadOwnedEvent(eventId, req.user);

  const target = await sponsorModel.findEventTypeAndLocation(eventId);

  // No type means nothing to compare against. An empty result with the
  // reason attached beats a 400 — the tab renders a "set an event type"
  // hint rather than an error.
  if (!target?.eventType) {
    return res.json({
      eventType: null,
      previousSponsors: [],
      recommendations: [],
    });
  }

  const [sponsorships, alreadyLinked] = await Promise.all([
    sponsorModel.findSponsorshipsByEventType(target.eventType, eventId),
    sponsorModel.findEventSponsors(eventId),
  ]);

  if (sponsorships.length === 0) {
    return res.json({
      eventType: target.eventType,
      previousSponsors: [],
      recommendations: [],
    });
  }

  // --- Previous Sponsors: purely informational, grouped by event ------
  // Built before any filtering, so history stays complete even for
  // sponsors that get excluded from recommendations below.
  const eventsById = new Map();
  for (const row of sponsorships) {
    if (!eventsById.has(row.eventId)) {
      eventsById.set(row.eventId, {
        eventId: row.eventId,
        title: row.eventTitle,
        date: row.eventStart,
        location: row.eventLocation,
        sponsors: [],
      });
    }
    eventsById
      .get(row.eventId)
      .sponsors.push({ sponsorId: row.sponsorId, sponsorName: row.sponsorName });
  }
  // The query already ordered by event_start DESC, so insertion order
  // is newest-first.
  const previousSponsors = [...eventsById.values()];

  // --- Role context, for both sides of the comparison -----------------
  const candidateEventIds = [...eventsById.keys()];
  const [targetTitles, targetSkills, candidateTitles, candidateSkills] =
    await Promise.all([
      sponsorModel.findRoleTitlesForEvents([eventId]),
      sponsorModel.findRoleSkillsForEvents([eventId]),
      sponsorModel.findRoleTitlesForEvents(candidateEventIds),
      sponsorModel.findRoleSkillsForEvents(candidateEventIds),
    ]);

  // Titles are free text, so compare case-insensitively — "Photography"
  // and "photography" are the same job.
  const targetTitleSet = new Set(
    targetTitles.map((row) => row.title.trim().toLowerCase())
  );
  const targetSkillIds = new Set(targetSkills.map((row) => row.skillId));

  const titlesByEvent = new Map();
  for (const row of candidateTitles) {
    if (!titlesByEvent.has(row.eventId)) titlesByEvent.set(row.eventId, []);
    titlesByEvent.get(row.eventId).push(row.title);
  }
  const skillsByEvent = new Map();
  for (const row of candidateSkills) {
    if (!skillsByEvent.has(row.eventId)) skillsByEvent.set(row.eventId, []);
    skillsByEvent.get(row.eventId).push(row);
  }

  const targetLocation = (target.location ?? "").trim().toLowerCase();
  const linkedSponsorIds = new Set(alreadyLinked.map((row) => row.sponsorId));

  // --- Aggregate per sponsor ------------------------------------------
  const bySponsor = new Map();

  for (const row of sponsorships) {
    // No value in recommending someone the organizer already added.
    if (linkedSponsorIds.has(row.sponsorId)) continue;

    if (!bySponsor.has(row.sponsorId)) {
      bySponsor.set(row.sponsorId, {
        sponsorId: row.sponsorId,
        name: row.sponsorName,
        website: row.website,
        industry: row.industry,
        contactPerson: row.contactPerson,
        email: row.email,
        phone: row.phone,
        typeEventIds: new Set(),
        locationEventIds: new Set(),
        sharedTitles: new Set(),
        sharedSkillNames: new Set(),
        history: [],
      });
    }

    const entry = bySponsor.get(row.sponsorId);

    // Sets, not counters: one sponsor can appear on a row per event, and
    // double-counting the same event would inflate the score.
    entry.typeEventIds.add(row.eventId);

    if (targetLocation && (row.eventLocation ?? "").trim().toLowerCase() === targetLocation) {
      entry.locationEventIds.add(row.eventId);
    }

    for (const title of titlesByEvent.get(row.eventId) ?? []) {
      const normalised = title.trim().toLowerCase();
      if (targetTitleSet.has(normalised)) entry.sharedTitles.add(title.trim());
    }

    for (const skill of skillsByEvent.get(row.eventId) ?? []) {
      if (targetSkillIds.has(skill.skillId)) entry.sharedSkillNames.add(skill.name);
    }

    if (!entry.history.some((item) => item.eventId === row.eventId)) {
      entry.history.push({
        eventId: row.eventId,
        title: row.eventTitle,
        date: row.eventStart,
      });
    }
  }

  // --- Score and explain ----------------------------------------------
  const recommendations = [...bySponsor.values()].map((entry) => {
    const typeCount = entry.typeEventIds.size;
    const locationCount = entry.locationEventIds.size;
    const titleCount = entry.sharedTitles.size;
    const skillCount = entry.sharedSkillNames.size;

    const capped = (count, weight) => Math.min(weight.cap, count * weight.per);

    const score = Math.min(
      100,
      capped(typeCount, WEIGHTS.sameType) +
        capped(locationCount, WEIGHTS.sameLocation) +
        capped(titleCount, WEIGHTS.sharedRoleTitle) +
        capped(skillCount, WEIGHTS.sharedRoleSkill)
    );

    // Written from the same counters that produced the score, so the
    // number and its justification can never disagree.
    const reasons = [];
    reasons.push(
      `Sponsored ${typeCount} ${target.eventType} event${typeCount === 1 ? "" : "s"}`
    );
    if (locationCount > 0) {
      reasons.push(
        `Sponsored ${locationCount} event${locationCount === 1 ? "" : "s"} in ${target.location}`
      );
    }
    if (titleCount > 0) {
      reasons.push(`Sponsored ${[...entry.sharedTitles].slice(0, 3).join(", ")} volunteers`);
    }
    if (skillCount > 0) {
      reasons.push(`Matches skills: ${[...entry.sharedSkillNames].slice(0, 3).join(", ")}`);
    }

    return {
      sponsorId: entry.sponsorId,
      name: entry.name,
      score,
      reasons,
      contactPerson: entry.contactPerson,
      email: entry.email,
      phone: entry.phone,
      website: entry.website,
      industry: entry.industry,
      history: entry.history,
    };
  });

  // Score first; ties broken by how much same-type history there is,
  // then alphabetically so the order is stable between requests.
  recommendations.sort(
    (a, b) =>
      b.score - a.score ||
      b.history.length - a.history.length ||
      a.name.localeCompare(b.name)
  );

  res.json({
    eventType: target.eventType,
    previousSponsors,
    recommendations,
  });
}

module.exports = {
  listSponsors,
  createSponsor,
  listEventSponsors,
  addEventSponsor,
  updateEventSponsor,
  removeEventSponsor,
  getRecommendations,
};
