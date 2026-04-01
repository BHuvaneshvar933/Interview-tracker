export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  const confirmClass = tone === "danger" ? "btn-danger" : "btn-primary"

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        {message && <p className="mt-2 text-dark-300">{message}</p>}

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button type="button" className={confirmClass} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
