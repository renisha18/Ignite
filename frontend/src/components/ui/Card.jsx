// Why this exists: nearly every screen is a list or grid of surfaces —
// event cards, application rows, role drop zones. One surface component
// keeps the border, shadow and radius consistent instead of each page
// inventing its own.
//
// Generic on purpose (components/ui/, not components/volunteer/) — both
// tracks use it.
//
// Neo-Brutalist surface: cream fill, 2px ink border, hard offset shadow,
// 16px corners. Card and page share the same cream, so it's the border
// and the shadow — not a fill contrast — that lift it off the page.
// That's the whole point of the style, and it's why the border weight
// isn't negotiable per-instance.
export default function Card({ as: Tag = "div", className = "", children, ...rest }) {
  return (
    <Tag
      className={`rounded-lg border-2 border-ink bg-cream p-5 shadow-brutal ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
