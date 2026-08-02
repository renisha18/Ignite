// Why this exists: create and edit are the same six fields with the
// same rules, so they're one component in one modal rather than two
// forms or two routes. Which mode it's in is decided by whether an
// `event` prop was passed.
//
// Why a modal rather than /organizer/events/new and /:id/edit: the list
// stays on screen behind it, there's no route state to keep in sync,
// and it's less to build — the spec's "avoid unnecessary complexity".
//
// TABS. In EDIT mode the modal shows General / Roles / Sponsors. In
// CREATE mode it shows General only, because Roles and Sponsors both
// need an eventId that doesn't exist until the event is saved — the
// existing create → roles-modal sequence in MyEvents is unchanged.
//
// Roles and Sponsors render components that own their own state and
// requests; this file stays responsible for the event's own fields.
//
// Depends on: components/ui/Modal.jsx, components/ui/Button.jsx,
// components/FormInput.jsx, components/Alert.jsx,
// components/organizer/EventRolesEditor.jsx,
// components/organizer/EventSponsorsTab.jsx,
// services/eventService.js, services/validation.js,
// services/errorMessage.js, services/eventTypes.js
import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormInput from "../FormInput";
import Alert from "../Alert";
import EventRolesEditor from "./EventRolesEditor";
import EventSponsorsTab from "./EventSponsorsTab";
import { createEvent, updateEvent } from "../../services/eventService";
import { validateEventForm } from "../../services/validation";
import { getErrorMessage } from "../../services/errorMessage";
import { EVENT_TYPES } from "../../services/eventTypes";

const TABS = [
  { key: "general", label: "General" },
  { key: "roles", label: "Roles" },
  { key: "sponsors", label: "Sponsors" },
];

// The <form> lives in the modal body but its submit button lives in the
// modal footer, outside the form element. HTML's form="" attribute is
// what connects them.
const FORM_ID = "organizer-event-form";

const EMPTY_FORM = {
  title: "",
  description: "",
  location: "",
  eventType: "",
  eventStart: "",
  eventEnd: "",
  applicationDeadline: "",
};

// Why this conversion is necessary rather than slicing the ISO string:
// the API returns UTC ("2026-09-12T02:30:00.000Z" for an 08:00 IST
// event), and <input type="datetime-local"> expects LOCAL wall-clock
// time. Taking the first 16 characters of the ISO string would show
// 02:30 in the edit form and then save that back as the new start time,
// silently walking every event backwards by the UTC offset on each edit.
function toDateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function formFromEvent(event) {
  if (!event) return EMPTY_FORM;
  return {
    title: event.title ?? "",
    description: event.description ?? "",
    location: event.location ?? "",
    // "" is the placeholder option — events predating the column, and
    // events deliberately left untyped, both land here.
    eventType: event.eventType ?? "",
    eventStart: toDateTimeLocalValue(event.eventStart),
    eventEnd: toDateTimeLocalValue(event.eventEnd),
    applicationDeadline: toDateTimeLocalValue(event.applicationDeadline),
  };
}

export default function EventFormModal({
  open,
  event,
  onClose,
  onSaved,
  onRolesChanged,
}) {
  const isEdit = Boolean(event);

  const [tab, setTab] = useState("general");
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset whenever the dialog opens, or opens onto a different event —
  // otherwise the previous event's values would still be sitting in
  // state the next time it's opened.
  //
  // Keyed on event?.eventId rather than the `event` object: MyEvents now
  // derives that object from its events array, so it gets a new identity
  // on every refetch. Depending on identity would wipe whatever the
  // organizer had typed on the General tab the moment a role or sponsor
  // change triggered a reload.
  useEffect(() => {
    if (!open) return;
    setForm(formFromEvent(event));
    setFieldErrors({});
    setServerError("");
    setTab("general");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event?.eventId]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear this field's error as soon as it's touched, same as the
    // auth forms do.
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");

    const errors = validateEventForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    try {
      // Sent as-is: the datetime-local strings are local wall-clock
      // time, which is exactly what the backend normalises to MySQL
      // DATETIME. Empty optional fields go up as "" and the backend
      // stores NULL, which is how a value gets cleared on edit.
      // The saved event is handed back so the caller can act on it —
      // MyEvents uses the new eventId to open the roles dialog straight
      // after a create, since roles can't exist before the event does.
      if (isEdit) {
        const saved = await updateEvent(event.eventId, form);
        onSaved(saved, { created: false });
      } else {
        const created = await createEvent(form);
        onSaved(created, { created: true });
      }
    } catch (err) {
      setServerError(
        getErrorMessage(
          err,
          isEdit ? "Couldn't save your changes." : "Couldn't create the event."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      size="lg"
      title={isEdit ? "Edit event" : "Create event"}
      description={
        isEdit
          ? "Changes are visible to volunteers as soon as you save."
          : "Your event is published as soon as it's created."
      }
      footer={
        // Only the General tab has anything to submit. Roles and
        // Sponsors save each change as it's made, so their footer is
        // just a way out of the dialog.
        tab === "general" ? (
          <>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form={FORM_ID} loading={saving}>
              {isEdit ? "Save changes" : "Create event"}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        )
      }
    >
      {/* Tabs only in edit mode: Roles and Sponsors both need an
          eventId, which doesn't exist until the event is saved. */}
      {isEdit && (
        <div
          role="tablist"
          aria-label="Event sections"
          className="mb-5 flex gap-2 border-b-2 border-ink pb-3"
        >
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => setTab(item.key)}
              className={`rounded-lg border-2 border-ink px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all duration-100 ${
                tab === item.key
                  ? "bg-gold text-ink shadow-brutal-sm"
                  : "bg-cream text-ink/70 hover:bg-gold-light/40 hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {tab === "roles" && isEdit && (
        <EventRolesEditor event={event} onChanged={onRolesChanged} />
      )}

      {tab === "sponsors" && isEdit && <EventSponsorsTab event={event} />}

      <form
        id={FORM_ID}
        onSubmit={handleSubmit}
        noValidate
        // Kept mounted but hidden on other tabs, so switching away and
        // back doesn't discard half-typed edits.
        className={`flex-col gap-4 ${tab === "general" ? "flex" : "hidden"}`}
      >
        <Alert variant="error">{serverError}</Alert>

        <FormInput
          label="Title"
          name="title"
          value={form.title}
          onChange={handleChange}
          error={fieldErrors.title}
          placeholder="Beach Cleanup Drive"
        />

        <FormInput
          label="Description (optional)"
          name="description"
          value={form.description}
          onChange={handleChange}
          error={fieldErrors.description}
          placeholder="What will volunteers be doing?"
          multiline
          rows={3}
        />

        <FormInput
          label="Location (optional)"
          name="location"
          value={form.location}
          onChange={handleChange}
          error={fieldErrors.location}
          placeholder="Marina Beach, Chennai"
        />

        {/* The only new field on this tab. A fixed list rather than free
            text: sponsor recommendations group on exact type equality,
            so "Beach cleanup" and "beach-cleanup" would split one
            category in two. Blank is valid and stored as NULL — events
            predating the column keep working untyped. */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="eventType"
            className="text-xs font-bold uppercase tracking-wide text-ink"
          >
            Event type (optional)
          </label>
          <select
            id="eventType"
            name="eventType"
            value={form.eventType}
            onChange={handleChange}
            className="rounded-lg border-2 border-ink bg-cream px-3 py-2 text-sm text-ink shadow-brutal-sm outline-none transition-all duration-100 focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal"
          >
            <option value="">Not specified</option>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted">
            Used to suggest sponsors from similar past events.
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Starts"
            name="eventStart"
            type="datetime-local"
            value={form.eventStart}
            onChange={handleChange}
            error={fieldErrors.eventStart}
          />

          <FormInput
            label="Ends (optional)"
            name="eventEnd"
            type="datetime-local"
            value={form.eventEnd}
            onChange={handleChange}
            error={fieldErrors.eventEnd}
          />
        </div>

        <FormInput
          label="Application deadline (optional)"
          name="applicationDeadline"
          type="datetime-local"
          value={form.applicationDeadline}
          onChange={handleChange}
          error={fieldErrors.applicationDeadline}
        />
      </form>
    </Modal>
  );
}
