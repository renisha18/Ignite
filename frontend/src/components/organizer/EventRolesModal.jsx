// Manage the roles on one event: the categories of work it needs, and
// how many volunteers each category takes (event_roles.capacity).
//
// Opened by the "Manage roles" button on OrganizerEventCard. Props and
// behaviour are unchanged; the list and add-form moved into
// EventRolesEditor so the Edit Event modal's Roles tab could render the
// same editor without a second copy of the logic. This file is now just
// the dialog around it.
//
// MyEvents opens this automatically right after creating an event,
// since roles can't exist before the event does.
//
// Depends on: components/ui/Modal.jsx, components/ui/Button.jsx,
// components/organizer/EventRolesEditor.jsx
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import EventRolesEditor from "./EventRolesEditor";

export default function EventRolesModal({ open, event, onClose, onChanged }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Roles for this event"
      description={
        event
          ? `${event.title} — the categories you need volunteers for, and how many each one takes.`
          : ""
      }
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <EventRolesEditor event={event} onChanged={onChanged} />
    </Modal>
  );
}
