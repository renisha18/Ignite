// Why this exists: the organizer's event form and its delete
// confirmation are both overlays, and the volunteer track will want the
// same thing. One dialog shell means the backdrop, escape handling and
// scroll locking are written once, not per overlay.
//
// Lives in components/ui/ rather than components/organizer/ because
// nothing about it is organizer-specific.
//
// Deliberately NOT a full focus trap: it moves focus into the panel on
// open, restores it on close, and closes on Escape or a backdrop click.
// Tabbing can still escape the dialog. A real trap needs either a
// dependency or a good deal of code, and the spec says prefer hackathon
// simplicity — worth revisiting if this ships beyond the demo.
//
// Rendered inline (no portal) at z-50, which clears the layout's
// sticky top bar at z-10.
import { useEffect, useRef } from "react";

const SIZES = {
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  // Why onClose goes through a ref instead of into the dependency array:
  // callers pass an inline arrow, so its identity changes on every
  // parent render. Depending on it would tear down and re-run the effect
  // below on each keystroke in a form inside the dialog — which calls
  // panelRef.focus() again and yanks the caret out of the input the user
  // is typing in. The ref keeps the latest handler without making the
  // effect depend on its identity.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;

    // Remember where focus was so closing the dialog returns the user
    // to the button that opened it, rather than the top of the page.
    previouslyFocused.current = document.activeElement;
    panelRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") onCloseRef.current?.();
    }
    document.addEventListener("keydown", handleKeyDown);

    // Stop the page behind the dialog from scrolling under it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      // Why onMouseDown and the target check rather than onClick: a click
      // whose press started inside the panel and finished on the backdrop
      // (a text selection drag that overshoots) would otherwise close the
      // dialog and throw away what the user typed.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current?.();
      }}
      // Literal black/white here rather than the bg-ink / bg-background
      // tokens: those tokens aren't defined in index.css yet, and a scrim
      // or panel that renders transparent makes the dialog unusable
      // rather than merely off-palette. Swap both to the tokens once the
      // theme is fixed.
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:items-center"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${SIZES[size] ?? SIZES.md} rounded-lg border border-muted/25 bg-white shadow-lg outline-none`}
      >
        <header className="border-b border-muted/25 px-5 py-4">
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-muted">{description}</p>
          )}
        </header>

        <div className="px-5 py-4">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-muted/25 px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
