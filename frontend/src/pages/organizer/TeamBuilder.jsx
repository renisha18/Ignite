// Smart Team Builder — the flagship screen (PROJECT_SPEC.md's USP).
//
// Left: selected volunteers grouped by THEIR OWN skills, so one person
// appears under every skill they hold. Those columns are reference
// lists — nobody is ever removed from them after being assigned; they
// just gain an Assigned badge. Right: the event's roles, each a drop
// zone with a capacity.
//
// The board loads exactly once per event. Every assignment and
// unassignment updates local state from the API response instead of
// refetching, which is what keeps counts, badges and mismatch warnings
// moving instantly.
//
// Depends on: @dnd-kit/core, services/eventService.js,
// services/assignmentService.js, services/errorMessage.js,
// components/ui/*, components/organizer/*
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Toast from "../../components/ui/Toast";
import Alert from "../../components/Alert";
import SkillGroupColumn from "../../components/organizer/SkillGroupColumn";
import RoleDropZone from "../../components/organizer/RoleDropZone";
import { getMyEvents } from "../../services/eventService";
import {
  getCandidates,
  createAssignment,
  deleteAssignment,
} from "../../services/assignmentService";
import { getErrorMessage } from "../../services/errorMessage";

// --- pure board transforms -------------------------------------------
//
// Kept outside the component and free of side effects: given a board and
// an API response, produce the next board. That's what makes "update
// from the response instead of refetching" safe to reason about — the
// same input always yields the same board, and the two mutation paths
// share one definition of what changes.

function applyAssignment(board, assignment) {
  const { volunteerId, roleId, previousRoleId, roleTitle } = assignment;

  const card = {
    assignmentId: assignment.assignmentId,
    volunteerId,
    fullName: assignment.fullName,
    reputationScore: assignment.reputationScore,
    skillMismatch: assignment.skillMismatch,
    missingSkills: assignment.missingSkills,
  };

  const roles = board.roles.map((role) => {
    const isSource = previousRoleId !== null && role.roleId === previousRoleId;
    const isTarget = role.roleId === roleId;
    if (!isSource && !isTarget) return role;

    // Filtering by volunteerId in both branches covers the move case in
    // one pass: they leave the old role and can't be duplicated in the
    // new one even if a response arrives twice.
    let assignments = role.assignments.filter((a) => a.volunteerId !== volunteerId);
    if (isTarget) assignments = [...assignments, card];

    return { ...role, assignments, assignedCount: assignments.length };
  });

  const volunteers = board.volunteers.map((volunteer) =>
    volunteer.volunteerId === volunteerId
      ? {
          ...volunteer,
          assignment: { assignmentId: assignment.assignmentId, roleId, roleTitle },
        }
      : volunteer
  );

  return { ...board, roles, volunteers };
}

function applyUnassignment(board, assignmentId) {
  let freedVolunteerId = null;

  const roles = board.roles.map((role) => {
    if (!role.assignments.some((a) => a.assignmentId === assignmentId)) return role;

    freedVolunteerId = role.assignments.find(
      (a) => a.assignmentId === assignmentId
    ).volunteerId;
    const assignments = role.assignments.filter(
      (a) => a.assignmentId !== assignmentId
    );

    return { ...role, assignments, assignedCount: assignments.length };
  });

  const volunteers = board.volunteers.map((volunteer) =>
    volunteer.volunteerId === freedVolunteerId
      ? { ...volunteer, assignment: null }
      : volunteer
  );

  return { ...board, roles, volunteers };
}

// ---------------------------------------------------------------------

export default function TeamBuilder() {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [eventsLoading, setEventsLoading] = useState(true);

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [activeVolunteerId, setActiveVolunteerId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  // A few pixels of movement before a drag starts, so clicking the
  // unassign × or just tapping a card doesn't register as a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Same event-picker pattern as the Applications page.
  useEffect(() => {
    let ignore = false;

    getMyEvents()
      .then((list) => {
        if (ignore) return;
        setEvents(list);
        if (list.length > 0) setEventId(String(list[0].eventId));
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, "Couldn't load your events."));
      })
      .finally(() => {
        if (!ignore) setEventsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // The only board fetch: on load, and again only when the event changes.
  useEffect(() => {
    if (!eventId) return undefined;

    let ignore = false;
    setLoading(true);
    setError("");

    getCandidates(eventId)
      .then((data) => {
        if (!ignore) setBoard(data);
      })
      .catch((err) => {
        if (ignore) return;
        setBoard(null);
        setError(getErrorMessage(err, "Couldn't load the team board."));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [eventId]);

  const volunteersById = useMemo(
    () => new Map((board?.volunteers ?? []).map((v) => [v.volunteerId, v])),
    [board]
  );

  const activeVolunteer =
    activeVolunteerId === null ? null : volunteersById.get(activeVolunteerId);

  const handleDragEnd = useCallback(
    async (event) => {
      setActiveVolunteerId(null);

      const { active, over } = event;
      if (!over || !board) return;

      const volunteerId = active.data.current?.volunteerId;
      const roleId = over.data.current?.roleId;
      if (volunteerId === undefined || roleId === undefined) return;

      const volunteer = volunteersById.get(volunteerId);
      const role = board.roles.find((r) => r.roleId === roleId);
      if (!volunteer || !role) return;

      // Already here — nothing to do, and no need to bother the server.
      if (volunteer.assignment?.roleId === roleId) return;

      // Instant feedback. The server re-checks this under a row lock, so
      // this is a courtesy for the common case, not the actual gate.
      if (role.assignedCount >= role.capacity) {
        setToast({ variant: "error", message: `${role.title} role is already full.` });
        return;
      }

      // Captured before the state update, for the move message.
      const fromTitle = volunteer.assignment?.roleTitle ?? null;

      setBusy(true);
      setError("");
      try {
        const assignment = await createAssignment({
          applicationId: volunteer.applicationId,
          roleId,
        });

        setBoard((current) => (current ? applyAssignment(current, assignment) : current));

        setToast({
          variant: "success",
          message: fromTitle
            ? `${volunteer.fullName} moved from ${fromTitle} to ${role.title}.`
            : `${volunteer.fullName} assigned to ${role.title}.`,
        });
      } catch (err) {
        // Covers the race the client check can't: someone else filled
        // the last seat between render and drop.
        setToast({
          variant: "error",
          message: getErrorMessage(err, "Couldn't assign that volunteer."),
        });
      } finally {
        setBusy(false);
      }
    },
    [board, volunteersById]
  );

  const handleUnassign = useCallback(async (assignment) => {
    setBusy(true);
    setError("");
    try {
      await deleteAssignment(assignment.assignmentId);
      setBoard((current) =>
        current ? applyUnassignment(current, assignment.assignmentId) : current
      );
    } catch (err) {
      setToast({
        variant: "error",
        message: getErrorMessage(err, "Couldn't unassign that volunteer."),
      });
    } finally {
      setBusy(false);
    }
  }, []);

  const hasVolunteers = (board?.volunteers.length ?? 0) > 0;

  return (
    <>
      <PageHeader
        title="Team Builder"
        subtitle="Drag selected volunteers into the roles your event needs."
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

      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {eventsLoading ? (
        <p className="text-sm text-muted">Loading your events…</p>
      ) : events.length === 0 ? (
        <Card className="border-dashed text-center">
          <p className="font-display text-base font-semibold text-ink">No events yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Create an event and select some volunteers before building a team.
          </p>
        </Card>
      ) : loading ? (
        <p className="text-sm text-muted">Loading the team board…</p>
      ) : !board ? null : !hasVolunteers ? (
        // Deliberately not empty drag columns: with nobody selected the
        // board would look broken rather than unstarted, and the fix is
        // on a different page.
        <Card className="border-dashed text-center">
          <p className="font-display text-base font-semibold text-ink">
            No selected volunteers yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Go to Applications and select volunteers first.
          </p>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) =>
            setActiveVolunteerId(active.data.current?.volunteerId ?? null)
          }
          onDragCancel={() => setActiveVolunteerId(null)}
          onDragEnd={handleDragEnd}
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section>
              <h2 className="mb-3 font-display text-sm font-semibold tracking-tight text-ink">
                Selected volunteers by skill
              </h2>
              {board.skillGroups.length === 0 ? (
                <p className="text-sm text-muted">Nothing to show.</p>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  {board.skillGroups.map((group) => (
                    <SkillGroupColumn
                      key={group.skillId ?? "no-skills"}
                      group={group}
                      // Ids into `volunteers`, already reputation-sorted
                      // by the server — resolved here so a volunteer in
                      // several groups is still one object in state.
                      volunteers={group.volunteerIds
                        .map((id) => volunteersById.get(id))
                        .filter(Boolean)}
                      disabled={busy}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 font-display text-sm font-semibold tracking-tight text-ink">
                Event roles
              </h2>
              {board.roles.length === 0 ? (
                <Card className="border-dashed text-center">
                  <p className="text-sm text-muted">
                    This event has no roles yet. Add them from My Events.
                  </p>
                </Card>
              ) : (
                <div className="flex flex-col gap-4">
                  {board.roles.map((role) => (
                    <RoleDropZone
                      key={role.roleId}
                      role={role}
                      onUnassign={handleUnassign}
                      disabled={busy}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* The card that follows the cursor. Rendering it here rather
              than transforming the original keeps the source column from
              reflowing mid-drag. */}
          <DragOverlay dropAnimation={{ duration: 200, easing: "ease-out" }}>
            {activeVolunteer && (
              <div className="pointer-events-none">
                <Card className="p-3 shadow-lg">
                  <p className="text-sm font-semibold text-ink">
                    {activeVolunteer.fullName}
                  </p>
                  <span className="font-mono text-[11px] tabular-nums text-muted">
                    {activeVolunteer.reputationScore === null
                      ? "—"
                      : Number(activeVolunteer.reputationScore).toFixed(0)}
                  </span>
                </Card>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <Toast
        message={toast?.message}
        variant={toast?.variant}
        onDismiss={() => setToast(null)}
      />
    </>
  );
}
