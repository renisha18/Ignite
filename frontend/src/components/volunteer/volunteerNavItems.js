// Why this is a shared config rather than markup inside the sidebar:
// the nav and the route table have to agree, and the fastest way for
// them to disagree is to maintain two lists. VolunteerSidebar renders
// this; pages/volunteer/volunteerRoutes.jsx routes to the same paths.
// Add a screen in one place.
//
// Items mirror PROJECT_SPEC.md's Volunteer Features. Icons are raw SVG
// path data rather than components so this stays a plain .js module
// (no JSX) and we avoid pulling in an icon dependency.
export const VOLUNTEER_BASE_PATH = "/volunteer";

const volunteerNavItems = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/volunteer/dashboard",
    icon: ["M3 10.5 12 3l9 7.5", "M5.25 9.75V21h13.5V9.75"],
  },
  {
    key: "events",
    label: "Browse Events",
    path: "/volunteer/events",
    icon: [
      "M8 2v3M16 2v3",
      "M3.5 8.5h17",
      "M4 6h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z",
    ],
  },
  {
    key: "applications",
    label: "My Applications",
    path: "/volunteer/applications",
    icon: [
      "M15 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7l-4-4Z",
      "M14 3v4h5",
      "M9 13h6M9 17h4",
    ],
  },
  {
    key: "team",
    label: "My Team",
    path: "/volunteer/team",
    icon: [
      "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20",
      "M10 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
      "M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4",
      "M15.5 4.7a3.5 3.5 0 0 1 0 6.6",
    ],
  },
  {
    key: "attendance",
    label: "Attendance",
    path: "/volunteer/attendance",
    // QR glyph — attendance is QR-scan based (see docs/api-contract.md).
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
    path: "/volunteer/certificates",
    icon: [
      "M12 14.5a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
      "M8.5 13.5 7 21l5-2.5L17 21l-1.5-7.5",
    ],
  },
  {
    key: "profile",
    label: "Profile",
    path: "/volunteer/profile",
    icon: [
      "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
      "M5 20.5a7 7 0 0 1 14 0",
    ],
  },
  {
    key: "history",
    label: "History",
    path: "/volunteer/history",
    icon: [
      "M3.5 12a8.5 8.5 0 1 0 2.6-6.1",
      "M3 4v4h4",
      "M12 7.5V12l3 2",
    ],
  },
];

export default volunteerNavItems;
