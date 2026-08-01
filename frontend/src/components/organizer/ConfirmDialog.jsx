// Why this exists: deleting an event is destructive and irreversible —
// the backend hard-deletes, and applications and assignments cascade
// away with it. A single click must never be enough.
//
// Built on ui/Modal rather than window.confirm() so the warning can
// actually explain the consequences, and so a failed delete can surface
// its error in place instead of vanishing with the native dialog.
//
// Depends on: components/ui/Modal.jsx, components/ui/Button.jsx
import Modal from "../ui/Modal";
import Button from "../ui/Button";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onCancel}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="text-sm text-ink/80">{message}</p>}
      {/* Slot for anything extra the caller needs to show — e.g. a
          server error from a delete that was refused. */}
      {children}
    </Modal>
  );
}
