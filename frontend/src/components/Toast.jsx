import { useEffect } from "react"

export default function Toast({ open, message, tone = "error", onClose, durationMs = 4000 }) {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => onClose?.(), durationMs)
    return () => clearTimeout(t)
  }, [open, onClose, durationMs])

  if (!open) return null

  const styles =
    tone === "success"
      ? "border-success-500/30 bg-success-500/10 text-success-300"
      : tone === "warning"
        ? "border-warning-500/30 bg-warning-500/10 text-warning-300"
        : "border-danger-500/30 bg-danger-500/10 text-danger-300"

  return (
    <div className="fixed left-1/2 top-4 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md">
      <div className={`rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${styles}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm leading-snug">{message}</p>
          <button
            type="button"
            onClick={onClose}
            className="text-dark-200/70 hover:text-white transition-colors"
            aria-label="Close"
          >
            x
          </button>
        </div>
      </div>
    </div>
  )
}
