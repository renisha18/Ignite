// Why this is a shared config rather than markup inside the sidebar:
// the nav and the route table have to agree, and the fastest way for
// them to disagree is to maintain two lists. OrganizerSidebar renders
// this; pages/organizer/organizerRoutes.jsx routes to the same paths.
// Add a screen in one place.
//
// Same structure as components/volunteer/volunteerNavItems.js — this is
// the established convention for a track's nav, not a new one.
//
// Items mirror PROJECT_SPEC.md's Organizer Features, grouped by feature
// rather than by CRUD verb: Create/Update/Delete Event are all "My
// Events", Review Applications + Accept/Reject are all "Applications".
// Icons are raw SVG path data rather than components so this stays a
// plain .js module (no JSX) and we avoid an icon dependency.
export const ORGANIZER_BASE_PATH = "/organizer";

const organizerNavItems = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/organizer/dashboard",
    icon: ["M3 10.5 12 3l9 7.5", "M5.25 9.75V21h13.5V9.75"],
  },
  {
    key: "events",
    label: "My Events",
    path: "/organizer/events",
    // Calendar — deliberately the same glyph the volunteer nav uses for
    // events, so the same concept reads the same way in both apps.
    icon: [
      "M8 2v3M16 2v3",
      "M3.5 8.5h17",
      "M4 6h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z",
    ],
  },
  {
    key: "applications",
    label: "Applications",
    path: "/organizer/applications",
    icon: [
      "M15 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7l-4-4Z",
      "M14 3v4h5",
      "M9 13h6M9 17h4",
    ],
  },
  {
    key: "team-builder",
    label: "Team Builder",
    path: "/organizer/team-builder",
    // People + a plus: this is the assignment surface, not just a roster.
    icon: [
      "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20",
      "M10 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
      "M18.5 8.5v5M16 11h5",
    ],
  },
  {
    key: "attendance",
    label: "Attendance",
    path: "/organizer/attendance",
    // QR glyph — attendance is QR-scan based (docs/api-contract.md,
    // "How the QR works"). Matches the volunteer nav's attendance icon.
    icon: [
      "M4 4h6v6H4V4Z",
      "M14 4h6v6h-6V4Z",
      "M4 14h6v6H4v-6Z",
      "M14 14h2.5v2.5H14V14Z",
      "M19.5 16.5H22V19h-2.5v-2.5Z",
      "M16.5 19.5H19V22h-2.5v-2.5Z",
    ],
  },
  {
    key: "certificates",
    label: "Certificates",
    path: "/organizer/certificates",
    icon: [
      "M12 14.5a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
      "M8.5 13.5 7 21l5-2.5L17 21l-1.5-7.5",
    ],
  },
];

export default organizerNavItems;
