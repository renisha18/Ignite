// Manage the roles on one event: the categories of work it needs, and
// how many volunteers each category takes (event_roles.capacity).
//
// Why a separate modal from EventFormModal rather than a step inside it:
// roles need an eventId, which doesn't exist until the event is created.
// Splitting them means each dialog does one thing, and each role saves
// independently — so a failure on the third role can't leave the event
// or the first two in a half-written state. MyEvents opens this
// automatically right after a create, and on demand from a card.
//
// The role list isn't fetched here: GET /events/mine already returns
// roles, so the parent passes the event down and refetches after each
// change through onChanged(). That avoids inventing an endpoint the
// contract doesn't have.
//
// Depends on: components/ui/Modal.jsx, components/ui/Button.jsx,
// components/FormInput.jsx, components/Alert.jsx,
// services/eventService.js, services/validation.js,
// services/errorMessage.js
import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormInput from "../FormInput";
import Alert from "../Alert";
import {
  createEventRole,
  updateEventRole,
  deleteEventRole,
} from "../../services/eventService";
import { validateRoleForm } from "../../services/validation";
import { getErrorMessage } from "../../services/errorMessage";

const EMPTY_DRAFT = { title: "", capacity: "" };

// One existing role: editable in place, saved or removed on its own.
function RoleRow({ role, onSave, onDelete, busy }) {
  const [draft, setDraft] = useState({
    title: role.title,
    capacity: String(role.capacity),
  });
  const [errors, setErrors] = useState({});

  // Re-sync when the parent refetches — otherwise a row would keep
  // showing stale local text after someone else's change came back.
  useEffect(() => {
    setDraft({ title: role.title, capacity: String(role.capacity) });
    setErrors({});
  }, [role.roleId, role.title, role.capacity]);

  const dirty =
    draft.title !== role.title || draft.capacity !== String(role.capacity);

  function handleSave() {
    const found = validateRoleForm(draft);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    onSave(role.roleId, {
      title: draft.title.trim(),
      capacity: Number(draft.capacity),
    });
  }

  return (
    <li className="rounded-lg border border-muted/25 p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <FormInput
          label="Role"
          name={`role-title-${role.roleId}`}
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          error={errors.title}
        />
        <FormInput
          label="Volunteers needed"
          name={`role-capacity-${role.roleId}`}
          type="number"
          value={draft.capacity}
          onChange={(e) => setDraft((d) => ({ ...d, capacity: e.target.value }))}
          error={errors.capacity}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-muted">
          {role.filledCount ?? 0} of {role.capacity} filled
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => onDelete(role)}
            disabled={busy}
          >
            Remove
          </Button>
          <Button
            variant="secondary"
            onClick={handleSave}
            disabled={!dirty || busy}
          >
            Save
          </Button>
        </div>
      </div>
    </li>
  );
}

export default function EventRolesModal({ open, event, onClose, onChanged }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  const roles = event?.roles ?? [];

  useEffect(() => {
    if (!open) return;
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setServerError("");
  }, [open, event?.eventId]);

  // Every mutation follows the same shape: run it, let the parent
  // refetch, surface anything that went wrong in place. Wrapping it once
  // keeps the three handlers below to their actual differences.
  async function run(action) {
    setBusy(true);
    setServerError("");
    try {
      await action();
      await onChanged();
      return true;
    } catch (err) {
      setServerError(getErrorMessage(err, "Couldn't save that role."));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    const found = validateRoleForm(draft);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    const ok = await run(() =>
      createEventRole(event.eventId, {
        title: draft.title.trim(),
        capacity: Number(draft.capacity),
      })
    );
    // Only clear the form on success — a failed add shouldn't throw away
    // what the organizer typed.
    if (ok) {
      setDraft(EMPTY_DRAFT);
      setErrors({});
    }
  }

  function handleSaveRole(roleId, body) {
    return run(() => updateEventRole(roleId, body));
  }

  function handleDeleteRole(role) {
    // No second confirm dialog here: a role with applicants or
    // assignments is refused by the server with a 409 explaining why, so
    // the destructive case is already blocked rather than warned about.
    return run(() => deleteEventRole(role.roleId));
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      size="lg"
      title="Roles for this event"
      description={
        event
          ? `${event.title} — the categories you need volunteers for, and how many each one takes.`
          : ""
      }
      footer={
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Alert variant="error">{serverError}</Alert>

        {roles.length === 0 ? (
          <p className="text-sm text-muted">
            No roles yet. Volunteers will see this event, but with nothing to
            apply for — add at least one below.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {roles.map((role) => (
              <RoleRow
                key={role.roleId}
                role={role}
                busy={busy}
                onSave={handleSaveRole}
                onDelete={handleDeleteRole}
              />
            ))}
          </ul>
        )}

        <div className="rounded-lg border border-dashed border-muted/40 p-3">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            Add a role
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
            <FormInput
              label="Role"
              name="new-role-title"
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
              error={errors.title}
              placeholder="Photography"
            />
            <FormInput
              label="Volunteers needed"
              name="new-role-capacity"
              type="number"
              value={draft.capacity}
              onChange={(e) =>
                setDraft((d) => ({ ...d, capacity: e.target.value }))
              }
              error={errors.capacity}
              placeholder="5"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={handleAdd} loading={busy}>
              Add role
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
