// Why this exists: nearly every volunteer screen is a list or grid of
// surfaces — event cards, application rows, certificate tiles. One
// surface component keeps the radius, shadow and border consistent
// instead of each page inventing its own.
//
// Generic on purpose (components/ui/, not components/volunteer/) — the
// organizer track can use it too.
export default function Card({ as: Tag = "div", className = "", children, ...rest }) {
  return (
    <Tag
      className={`rounded-lg border border-muted/25 bg-background p-5 shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
