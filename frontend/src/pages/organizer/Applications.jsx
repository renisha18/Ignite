// Application review: three columns of volunteers per event, with
// accept/reject/undo. Per docs/api-contract.md's "Applications
// (organizer's side)".
//
// Why there's an event picker: the nav has one Applications item, but
// GET /events/:eventId/applications is scoped to a single event. The
// page loads the organization's events and reviews one at a time,
// defaulting to the first.
//
// No drag-and-drop here on purpose — that belongs to Team Builder, which
// assigns volunteers to specific roles. This screen only decides who's
// in and who's out.
//
// Depends on: services/eventService.js, services/applicationService.js,
// services/errorMessage.js, components/ui/*, components/organizer/*
import { useCallback, useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Alert from "../../components/Alert";
import ApplicationCard from "../../components/organizer/ApplicationCard";
import ApplicationColumn from "../../components/organizer/ApplicationColumn";
import { getMyEvents } from "../../services/eventService";
import {
  getApplicationsForEvent,
  updateApplicationStatus,
} from "../../services/applicationService";
import { getErrorMessage } from "../../services/errorMessage";

// The whole board in one table: which statuses land in each column, and
// what an application there can become next. Keeping it declarative
// means the columns can't drift out of step with the buttons, and adding
// a transition later is a one-line edit rather than a new branch.
//
// 'withdrawn' appears nowhere: the API already excludes it.
const COLUMNS = [
  {
    key: "pending",
    title: "Pending",
    statuses: ["applied"],
    empty: "No one is waiting for a decision.",
    actions: [
      { status: "selected", label: "Select", variant: "primary" },
      { status: "rejected", label: "Reject", variant: "ghost" },
    ],
  },
  {
    key: "selected",
    title: "Selected",
    // 'confirmed' shares this column — both mean the volunteer is in.
    // The chip on each card distinguishes them.
    statuses: ["selected", "confirmed"],
    empty: "No volunteers selected yet.",
    actions: [
      { status: "applied", label: "Move back to Pending", variant: "secondary" },
      { status: "rejected", label: "Reject", variant: "ghost" },
    ],
  },
  {
    key: "rejected",
    title: "Rejected",
    statuses: ["rejected"],
    empty: "No one has been rejected.",
    actions: [
      { status: "applied", label: "Move back to Pending", variant: "secondary" },
      { status: "selected", label: "Select", variant: "primary" },
    ],
  },
];

export default function Applications() {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [eventsLoading, setEventsLoading] = useState(true);

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // { applicationId, status } for the decision currently in flight.
  const [pending, setPending] = useState(null);
  const [actionError, setActionError] = useState("");

  // Events load once. The first one becomes the default selection so the
  // page opens with something on screen rather than an empty picker.
  useEffect(() => {
    let ignore = false;

    getMyEvents()
      .then((list) => {
        if (ignore) return;
        setEvents(list);
        if (list.length > 0) setEventId(String(list[0].eventId));
      })
      .catch((err) => {
        if (!ignore) setLoadError(getErrorMessage(err, "Couldn't load your events."));
      })
      .finally(() => {
        if (!ignore) setEventsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const loadApplications = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setActionError("");
    try {
      setApplications(await getApplicationsForEvent(eventId));
      setLoadError("");
    } catch (err) {
      setApplications([]);
      setLoadError(getErrorMessage(err, "Couldn't load applications for this event."));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  async function handleAction(application, status) {
    setPending({ applicationId: application.applicationId, status });
    setActionError("");
    try {
      const updated = await updateApplicationStatus(application.applicationId, status);
      // Swap the record rather than refetching: PATCH returns the same
      // shape the list does, so replacing it in place moves the card to
      // its new column immediately, with no round trip and no flicker.
      setApplications((prev) =>
        prev.map((item) =>
          item.applicationId === updated.applicationId ? updated : item
        )
      );
    } catch (err) {
      setActionError(getErrorMessage(err, "Couldn't update that application."));
    } finally {
      setPending(null);
    }
  }

  const selectedEvent = events.find((e) => String(e.eventId) === String(eventId));

  return (
    <>
      <PageHeader
        title="Applications"
        subtitle="Review who applied to your events and decide who's in."
        actions={
          events.length > 0 && (
            <label className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Event
              </span>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="max-w-[16rem] rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-maroon focus:ring-2 focus:ring-maroon-light/30"
              >
                {events.map((event) => (
                  <option key={event.eventId} value={event.eventId}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
          )
        }
      />

      {loadError && (
        <div className="mb-6">
          <Alert variant="error">{loadError}</Alert>
        </div>
      )}

      {actionError && (
        <div className="mb-6">
          <Alert variant="error">{actionError}</Alert>
        </div>
      )}

      {eventsLoading ? (
        <p className="text-sm text-muted">Loading your events…</p>
      ) : events.length === 0 ? (
        <Card className="border-dashed text-center">
          <p className="font-display text-base font-semibold text-ink">
            No events yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Applications appear here once you&apos;ve created an event and
            volunteers have applied to it.
          </p>
        </Card>
      ) : loading ? (
        <p className="text-sm text-muted">Loading applications…</p>
      ) : applications.length === 0 && !loadError ? (
        <Card className="border-dashed text-center">
          <p className="font-display text-base font-semibold text-ink">
            No applications yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Nobody has applied to {selectedEvent?.title ?? "this event"} so far.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const inColumn = applications.filter((application) =>
              column.statuses.includes(application.status)
            );

            return (
              <ApplicationColumn
                key={column.key}
                title={column.title}
                count={inColumn.length}
                empty={column.empty}
              >
                {inColumn.map((application) => (
                  <ApplicationCard
                    key={application.applicationId}
                    application={application}
                    actions={column.actions}
                    onAction={handleAction}
                    pendingStatus={
                      pending?.applicationId === application.applicationId
                        ? pending.status
                        : null
                    }
                    disabled={pending?.applicationId === application.applicationId}
                  />
                ))}
              </ApplicationColumn>
            );
          })}
        </div>
      )}
    </>
  );
}
