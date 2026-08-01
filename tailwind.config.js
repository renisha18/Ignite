// Ignite design tokens.
//
// ⚠ HEADS UP — this file is currently NOT LOADED.
//
// This project runs Tailwind v4 (see frontend/package.json:
// tailwindcss@^4, @tailwindcss/postcss). v4 dropped automatic
// tailwind.config.js discovery — it reads its theme from an @theme
// block in CSS instead. Nothing references this file, so every
// utility below (bg-primary, text-ink, font-display, ...) is an
// undefined class that renders as nothing.
//
// To switch it on, pick ONE:
//
//   (a) Add one line to frontend/src/index.css, directly under
//       `@import "tailwindcss";` —
//           @config "../../tailwind.config.js";
//
//   (b) Skip this file entirely and declare the same tokens natively
//       in that same @theme block (the idiomatic v4 way, and what the
//       existing maroon/gold tokens already do):
//           @theme {
//             --color-background: #FBF7F0;
//             --color-primary:    #8B2635;
//             ...
//           }
//
// Either way the components already written against these names light
// up with zero edits.
//
// NOTE: the `gold` value below (#C6A15B) differs from the #C39E4E
// currently live in index.css @theme, and `primary` (#8B2635) differs
// from `maroon` (#A6192E). Until this file is wired up, the auth pages
// keep the older Rotaract values — expect two slightly different reds
// in the app once the volunteer shell is styled.
export default {
  content: ["./frontend/index.html", "./frontend/src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "#FBF7F0", // cream page surface
        primary: "#8B2635", // oxblood — primary actions, active nav, key accents
        gold: "#C6A15B", // secondary accent — dividers, seal/badge treatments
        ink: "#241F1D", // body text
        muted: "#A89A8C", // secondary text, borders
        success: "#6B8F71", // sage — status chips only, never a bright green
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "Times New Roman", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "Cascadia Code", "monospace"],
      },
    },
  },
  plugins: [],
};
