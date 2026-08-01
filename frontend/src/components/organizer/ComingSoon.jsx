// Why this exists: six skeleton pages would otherwise be six copies of
// the same placeholder block. Each page owns its own PageHeader
// (title/subtitle are real content, decided per screen) and drops this
// in for the body until its feature is built.
//
// Why not import pages/volunteer/ComingSoon.jsx: that file's own header
// says "when the last one goes, delete this file" — the volunteer track
// will remove it as they finish their screens, which would break every
// organizer page. Same markup, but the dependency would be a landmine.
// It reuses ui/Card exactly as the volunteer one does, so there's no
// second surface style here.
//
// Delete the <ComingSoon /> line from a page as you implement it. When
// the last one goes, delete this file.
import Card from "../ui/Card";

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
