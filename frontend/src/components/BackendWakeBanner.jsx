import { useEffect, useMemo, useState } from "react"
import { warmUpBackend } from "../api/axios"

function formatSeconds(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}m ${String(r).padStart(2, "0")}s`
}

export default function BackendWakeBanner() {
  const [state, setState] = useState({
    status: "idle",
    startedAt: 0,
    attempt: 0,
    reason: "",
    error: "",
  })

  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const onWake = (e) => {
      const d = e?.detail || {}
      setState((s) => ({ ...s, ...d }))
    }
    window.addEventListener("capsule:backendWake", onWake)
    return () => window.removeEventListener("capsule:backendWake", onWake)
  }, [])

  useEffect(() => {
    if (state.status !== "starting") return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [state.status])

  const show = state.status === "starting" || state.status === "failed"

  const copy = useMemo(() => {
    if (state.status === "starting") {
      return {
        tone: "border-warning-500/30 bg-warning-500/10 text-warning-300",
        title: "Waking up server",
        body: "Backend is on Render free tier; first request may take a bit.",
      }
    }
    if (state.status === "failed") {
      return {
        tone: "border-danger-500/30 bg-danger-500/10 text-danger-300",
        title: "Backend not reachable",
        body: state.error ? `Last error: ${state.error}` : "Still trying? Check connection or retry in a moment.",
      }
    }
    return null
  }, [state.status, state.error])

  if (!show || !copy) return null

  const elapsed = state.startedAt ? now - state.startedAt : 0

  return (
    <div className={`mb-4 px-4 py-3 rounded-2xl border ${copy.tone}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="font-semibold">{copy.title}</div>
          <div className="text-sm opacity-90">{copy.body}</div>
        </div>
        <div className="flex items-center gap-3">
          {state.status === "failed" && (
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => warmUpBackend({ force: true, reason: "manual" })}
            >
              Retry now
            </button>
          )}
          <div className="text-xs opacity-80 whitespace-nowrap">
            {state.attempt ? `Attempt ${state.attempt}` : ""}
            {state.startedAt ? ` · ${formatSeconds(elapsed)}` : ""}
          </div>
        </div>
      </div>
    </div>
  )
}
