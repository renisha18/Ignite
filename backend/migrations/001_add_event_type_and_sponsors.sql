-- Migration 001 — Event Type + Sponsor Recommendation System
--
-- Run ONCE against an existing `ignite` database:
--     mysql -u root -p ignite < backend/migrations/001_add_event_type_and_sponsors.sql
--
-- Why this file exists separately from schema.sql: schema.sql is the
-- definition for a FRESH install and re-running it would not touch a
-- database that already holds events, roles, applications and
-- assignments. This is the only thing that alters a live database.
-- Both files were changed together; they must stay in step.
--
-- This migration is additive. It adds one nullable column and two new
-- tables. It does not modify, drop or backfill any existing row.

-- ---------------------------------------------------------------------
-- 1. events.event_type
--
-- Nullable on purpose: events created before this migration have no
-- type, and a NOT NULL column would make the ALTER fail on a non-empty
-- table. Untyped events keep working everywhere; they simply take no
-- part in sponsor recommendations, which are keyed on event type.
--
-- ENUM rather than free text so the values stay comparable — the
-- recommendation query groups on exact equality, and "Beach cleanup" vs
-- "beach-cleanup" would silently split one category into two.
-- ---------------------------------------------------------------------
ALTER TABLE events
  ADD COLUMN event_type ENUM(
    'Beach Cleanup',
    'Blood Donation',
    'Tree Plantation',
    'Medical Camp',
    'Food Drive',
    'Education',
    'Animal Welfare',
    'Marathon',
    'Hackathon',
    'Others'
  ) NULL AFTER location;

-- ---------------------------------------------------------------------
-- 2. sponsors — the shared catalogue
--
-- One row per real-world organisation, reused across every event that
-- they back. Sponsor details live here and nowhere else; events never
-- copy them.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sponsors (
    sponsor_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sponsor_name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    industry VARCHAR(150),
    contact_person VARCHAR(150),
    email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 3. event_sponsors — the join, plus what they gave to THIS event
--
-- sponsorship_type/amount/remarks are properties of the relationship,
-- not of the sponsor: Decathlon might give equipment to one event and
-- cash to another.
--
-- UNIQUE (event_id, sponsor_id) stops the same sponsor being attached
-- twice to one event.
--
-- event_id CASCADEs — deleting an event should take its sponsorship
-- records with it. sponsor_id deliberately does NOT: it's a restricting
-- FK, so a sponsor that appears in any event's history cannot be
-- deleted out from under it. Unlinking a sponsor from an event removes
-- the row here and leaves the catalogue entry untouched.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_sponsors (
    event_sponsor_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT NOT NULL,
    sponsor_id BIGINT NOT NULL,
    sponsorship_type VARCHAR(100) NOT NULL,
    sponsorship_amount DECIMAL(12,2) NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (event_id, sponsor_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(sponsor_id)
);
