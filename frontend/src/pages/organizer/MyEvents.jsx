// The organizer's event lifecycle screen: list, create, edit, delete.
// Per docs/api-contract.md's Events section.
//
// Event roles are deliberately absent — POST /events/:eventId/roles and
// /roles/:roleId aren't built on the backend yet, so a roles editor
// here would 404 on every action. Roles ship as one feature (backend
// plus UI) in a later session; eventService already holds the calls.
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
  async function handleSaved() {
    setFormOpen(false);
    setEditingEvent(null);
    await load();
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
