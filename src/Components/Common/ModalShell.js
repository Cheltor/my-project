import React, { useEffect, useId, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([type='hidden']):not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export default function ModalShell({
  open,
  title,
  onClose,
  onCancel,
  cancelText = "Cancel",
  disableCancel = false,
  actions,
  children,
  dialogClassName = "w-full max-w-xl",
  bodyClassName = "",
  footerClassName = "",
  overlayClassName = "items-center",
  initialFocusRef,
}) {
  const dialogRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const titleId = useId();

  const handleCancel = () => {
    if (disableCancel) {
      return;
    }
    if (onCancel) {
      onCancel();
    } else {
      onClose?.();
    }
  };

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const dialogNode = dialogRef.current;
    if (!dialogNode) {
      return undefined;
    }

    restoreFocusRef.current = document.activeElement;

    const focusTarget = initialFocusRef?.current || dialogNode.querySelector(FOCUSABLE_SELECTOR) || dialogNode;

    const focusTimer = window.setTimeout(() => {
      focusTarget?.focus?.({ preventScroll: true });
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableNodes = Array.from(dialogNode.querySelectorAll(FOCUSABLE_SELECTOR)).filter((node) =>
        node.getAttribute("tabindex") !== "-1"
      );

      if (focusableNodes.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusableNodes[0];
      const last = focusableNodes[focusableNodes.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !dialogNode.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialogNode.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    dialogNode.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      dialogNode.removeEventListener("keydown", handleKeyDown);
      const previous = restoreFocusRef.current;
      restoreFocusRef.current = null;
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, onClose, initialFocusRef]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40 px-4 py-6" aria-hidden={!open}>
      <div className={classNames("flex w-full justify-center", overlayClassName)}>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={classNames(
            "max-h-full transform overflow-hidden rounded-lg bg-white shadow-xl focus:outline-none",
            dialogClassName
          )}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            <button
              type="button"
              onClick={() => onClose?.()}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Close
            </button>
          </div>

          <div className={classNames("px-6 py-5", bodyClassName)}>{children}</div>

          <div className={classNames("flex justify-end gap-3 border-t border-gray-200 px-6 py-4", footerClassName)}>
            <button
              type="button"
              onClick={handleCancel}
              disabled={disableCancel}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
            >
              {cancelText}
            </button>
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}
