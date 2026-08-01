// Why this exists: nine skeleton pages would otherwise be nine copies
// of the same placeholder block. Each page owns its own PageHeader
// (title/subtitle are real content, decided per screen) and drops this
// in for the body until its feature is built.
//
// Delete the <ComingSoon /> line from a page as you implement it. When
// the last one goes, delete this file.
import Card from "../../components/ui/Card";

export default function ComingSoon({ note }) {
  return (
    <Card className="border-dashed">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        Coming soon
      </p>
      {note && <p className="mt-2 text-sm text-ink/70">{note}</p>}
    </Card>
  );
}
