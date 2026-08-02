// One number on the volunteer dashboard's at-a-glance strip.
//
// Built on <Card /> rather than its own bordered div so the borders,
// corners and shadow come from the same place as every other surface in
// the app — a dashboard that's heavier or rounder than the page it links
// to reads as a different product. The only local addition is
// shadow-brutal-lg, which lifts these above the sections below them
// without changing the geometry.
//
// Deliberately dumb: it takes a value and a label. Every derivation
// happens in Dashboard.jsx, so this can be dropped anywhere a single
// figure needs presenting.
//
// Depends on: components/ui/Card.jsx
import Card from "../ui/Card";

export default function StatCard({ value, label, hint, accent = false }) {
  return (
    // h-full so a two-line label in one card doesn't leave its
    // neighbours short — the grid stretches, the Card fills.
    <Card className={`h-full shadow-brutal-lg ${accent ? "bg-gold" : ""}`}>
      <p
        className={`font-display text-3xl font-black leading-none tabular-nums ${
          accent ? "text-ink" : "text-primary"
        }`}
      >
        {/* tabular-nums keeps the row from shifting as figures change
            width — 1 and 11 occupy the same space. */}
        {value}
      </p>
      <p className="mt-2 text-[10px] font-bold uppercase leading-tight tracking-[0.16em] text-ink">
        {label}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
