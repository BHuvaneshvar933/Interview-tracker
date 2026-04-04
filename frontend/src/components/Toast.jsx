import { useEffect } from "react"

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

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
            className="p-1 -m-1 text-dark-200/70 hover:text-white transition-colors"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
