// Browse Events — the volunteer's event discovery screen.
//
// This page owns data fetching and the loading/empty/error states.
// Presentation lives in EventCard and input handling in EventFilters,
// per CLAUDE.md ("no logic embedded directly in page components" — the
// logic here is the page's own concern: what to fetch and what to show
// while it's in flight).
import { useCallback, useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Alert from "../../components/Alert";
import EventCard from "../../components/volunteer/EventCard";
import EventFilters, {
  EMPTY_FILTERS,
} from "../../components/volunteer/EventFilters";
import { getEvents, getFilterSkills } from "../../services/eventService";
import { getErrorMessage } from "../../services/errorMessage";

function LoadingGrid() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading events"
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="h-44 animate-pulse">
          <div className="h-2 w-20 rounded bg-muted/25" />
          <div className="mt-3 h-4 w-3/4 rounded bg-muted/25" />
          <div className="mt-2 h-3 w-1/2 rounded bg-muted/20" />
          <div className="mt-8 flex gap-2">
            <div className="h-5 w-20 rounded-full bg-muted/20" />
            <div className="h-5 w-16 rounded-full bg-muted/20" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// Per the UI guideline, an empty result is an invitation to widen the
// search, not an apology for failing to find something.
function EmptyState({ filtered, onClear }) {
  return (
    <Card className="border-dashed py-10 text-center">
      <p className="font-display text-lg text-ink">
        {filtered ? "Nothing matches yet" : "No events published just yet"}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        {filtered
          ? "Try a broader search, or drop one of the filters — there may be something close by."
          : "New events appear here as soon as organizers publish them. Worth checking back."}
      </p>
      {filtered && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Clear filters
        </button>
      )}
    </Card>
  );
}

export default function BrowseEvents() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [events, setEvents] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Skill options load once. A failure here is non-fatal — the page
  // still works, the dropdown is just empty — so it doesn't set the
  // page-level error and block the event list.
  useEffect(() => {
    let ignore = false;

    getFilterSkills()
      .then((list) => {
        if (!ignore) setSkills(list);
      })
      .catch(() => {
        if (!ignore) setSkills([]);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Depends on the three primitive fields rather than the `filters`
  // object: a new object identity on every parent render would refetch
  // endlessly even when nothing actually changed.
  const { search, skillId, location } = filters;
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    getEvents({ search, skillId, location })
      .then((list) => {
        // The `ignore` guard is what stops a slow earlier request from
        // overwriting a faster later one when the user types quickly.
        if (!ignore) setEvents(list);
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, "Couldn't load events."));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [search, skillId, location]);

  const handleClear = useCallback(() => setFilters(EMPTY_FILTERS), []);
  const isFiltered = search !== "" || skillId !== "" || location !== "";

  return (
    <>
      <PageHeader
        title="Browse Events"
        subtitle="Published events from approved organizations."
      />

      <EventFilters value={filters} skills={skills} onChange={setFilters} />

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {loading ? (
        <LoadingGrid />
      ) : events.length === 0 ? (
        <EmptyState filtered={isFiltered} onClear={handleClear} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.eventId} event={event} />
          ))}
        </div>
      )}
    </>
  );
}
