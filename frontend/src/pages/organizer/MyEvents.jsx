// The organizer's event lifecycle screen: list, create, edit, delete,
// and manage each event's roles. Per docs/api-contract.md's Events and
// Event roles sections.
//
// Roles are handled in their own dialog rather than inside the event
// form, because POST /events/:eventId/roles needs an eventId that
// doesn't exist until the event is created. Creating an event therefore
// opens the roles dialog straight afterwards — that's the "sequential"
// flow: event first, then its roles, each saving independently.
//
// Depends on: services/eventService.js, services/errorMessage.js,
// components/ui/*, components/organizer/*
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Alert from "../../components/Alert";
import OrganizerEventCard from "../../components/organizer/OrganizerEventCard";
import EventFormModal from "../../components/organizer/EventFormModal";
import EventRolesModal from "../../components/organizer/EventRolesModal";
import ConfirmDialog from "../../components/organizer/ConfirmDialog";
import { getMyEvents, deleteEvent } from "../../services/eventService";
import { getErrorMessage } from "../../services/errorMessage";

export default function MyEvents() {
  const { organization } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // null means "create"; an event object means "edit that one".
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Tracked by id, not by object: the roles dialog stays open across
  // refetches, and holding a snapshot would leave it rendering the role
  // list as it was before the change it just made.
  const [rolesEventId, setRolesEventId] = useState(null);
  const rolesEvent = events.find((e) => e.eventId === rolesEventId) ?? null;

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // The backend gates event CREATION on the org being approved
  // (eventController.createEvent). Editing and deleting existing events
  // are not gated, so those actions stay available either way.
  const isApproved = organization?.status === "approved";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEvents(await getMyEvents());
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Couldn't load your events."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingEvent(null);
    setFormOpen(true);
  }

  function openEdit(event) {
    setEditingEvent(event);
    setFormOpen(true);
  }

  // Refetch rather than splicing the returned event into local state:
  // the list is ordered by event_start, so an edited date would need
  // re-sorting anyway, and one extra request is cheaper than a
  // client-side copy of the server's ordering rules.
  async function handleSaved(saved, { created } = {}) {
    setFormOpen(false);
    setEditingEvent(null);
    await load();

    // A new event has no roles, and an event with no roles gives
    // volunteers nothing to apply for — so go straight there rather than
    // leaving it as something to remember later.
    if (created && saved?.eventId) setRolesEventId(saved.eventId);
  }

  function requestDelete(event) {
    setDeleteError("");
    setDeleteTarget(event);
  }

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteEvent(deleteTarget.eventId);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      // Most likely a 409: certificates have already been issued
      // against this event, so it can't be deleted. Keep the dialog
      // open and say why instead of closing on a failure.
      setDeleteError(getErrorMessage(err, "Couldn't delete this event."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="My Events"
        subtitle="Create, edit and manage the events your organization is running."
        actions={
          // Disabled rather than hidden: a missing button reads as "this
          // product can't do that", a disabled one reads as "not yet".
          // The backend would 403 anyway — this just isn't the first
          // time the organizer should hear about it.
          <Button onClick={openCreate} disabled={!isApproved}>
            Create Event
          </Button>
        }
      />

      {!isApproved && (
        <div className="mb-6">
          <Alert variant="info">
            Your organization is <strong>{organization?.status ?? "not approved"}</strong>.
            An admin needs to approve it before you can create events. You can
            still edit or delete events you already have.
          </Alert>
        </div>
      )}

      {loadError && (
        <div className="mb-6">
          <Alert variant="error">{loadError}</Alert>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading your events…</p>
      ) : events.length === 0 && !loadError ? (
        <Card className="border-dashed text-center">
          <p className="font-display text-base font-semibold text-ink">
            No events yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {isApproved
              ? "Create your first event and volunteers will be able to find and apply to it."
              : "Once an admin approves your organization, you'll be able to create your first event here."}
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {events.map((event) => (
            <OrganizerEventCard
              key={event.eventId}
              event={event}
              onEdit={openEdit}
              onDelete={requestDelete}
              onManageRoles={(target) => setRolesEventId(target.eventId)}
            />
          ))}
        </ul>
      )}

      <EventFormModal
        open={formOpen}
        event={editingEvent}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <EventRolesModal
        open={Boolean(rolesEvent)}
        event={rolesEvent}
        onClose={() => setRolesEventId(null)}
        onChanged={load}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this event?"
        message={
          deleteTarget
            ? `"${deleteTarget.title}" will be permanently deleted, along with every application and volunteer assignment attached to it. This can't be undone.`
            : ""
        }
        confirmLabel="Delete event"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      >
        {deleteError && (
          <div className="mt-3">
            <Alert variant="error">{deleteError}</Alert>
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}
