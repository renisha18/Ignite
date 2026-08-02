// The events.event_type ENUM, mirrored for the organizer's event form.
//
// A plain constant rather than an endpoint: the list is fixed in the
// schema, so fetching it would be a request that can never return
// anything different. It lives in services/ alongside the other
// non-axios modules (validation.js, errorMessage.js, roleRoutes.js).
//
// MUST stay in step with three places, all of which reject anything
// else:
//   backend/schema.sql                 (the ENUM)
//   backend/migrations/001_...sql      (the ENUM, for existing DBs)
//   backend/models/eventModel.js       (EVENT_TYPES, what the API validates)
//
// Deliberately not free text — sponsor recommendations group on exact
// type equality, so "Beach cleanup" and "beach-cleanup" would silently
// split one category in two and halve every score in it.
export const EVENT_TYPES = [
  "Beach Cleanup",
  "Blood Donation",
  "Tree Plantation",
  "Medical Camp",
  "Food Drive",
  "Education",
  "Animal Welfare",
  "Marathon",
  "Hackathon",
  "Others",
];
