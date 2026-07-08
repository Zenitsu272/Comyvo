"use client";

interface ModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function Modal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  loading = false,
}: ModalProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn-ghost btn" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className={variant === "danger" ? "btn-danger btn" : "btn-solid btn"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Loading…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
