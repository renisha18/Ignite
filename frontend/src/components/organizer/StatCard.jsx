// A single headline number: icon tile, value, label.
//
// Wraps the shared ui/Card rather than restyling a div, so the dashboard
// tiles sit on the same surface as every other card in the app. The icon
// tile matches the sidebar's treatment exactly — bordered square, white
// on maroon or ink on gold — because white on gold measures ~2.2:1 and
// fails AA.
//
// Presentational only: it takes a formatted value and renders it.
//
// Depends on: components/ui/Card.jsx
import Card from "../ui/Card";

const TONES = {
  primary: "bg-primary text-cream",
  gold: "bg-gold text-ink",
};

export default function StatCard({ label, value, icon, tone = "primary" }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-ink ${
            TONES[tone] ?? TONES.primary
          }`}
        >
          <svg
            className="h-[18px] w-[18px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {icon.map((d) => (
              <path key={d} d={d} />
            ))}
          </svg>
        </span>

        <div className="min-w-0">
          <p className="font-display text-2xl font-extrabold leading-none tabular-nums text-ink">
            {value}
          </p>
          <p className="mt-1 truncate font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {label}
          </p>
        </div>
      </div>
    </Card>
  );
}
