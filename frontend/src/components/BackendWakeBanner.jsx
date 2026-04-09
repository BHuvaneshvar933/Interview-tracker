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
    httpStatus: 0,
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
        body: "The server was idle. This can take a few seconds.",
      }
    }
    if (state.status === "failed") {
      const s = Number(state.httpStatus) || 0
      if (s === 521) {
        return {
          tone: "border-danger-500/30 bg-danger-500/10 text-danger-300",
          title: "Server is down",
          body: "Error 521: Web server is down. Try again in a moment.",
        }
      }
      if (s === 522 || s === 524) {
        return {
          tone: "border-danger-500/30 bg-danger-500/10 text-danger-300",
          title: "Request timed out",
          body: "The server is taking too long to respond. Try again in a moment.",
        }
      }
      if (s === 502 || s === 503 || s === 504) {
        return {
          tone: "border-danger-500/30 bg-danger-500/10 text-danger-300",
          title: "Server isn’t ready yet",
          body: "The server is starting up. Try again in a moment.",
        }
      }
      return {
        tone: "border-danger-500/30 bg-danger-500/10 text-danger-300",
        title: "Backend not reachable",
        body: state.error ? `Last error: ${state.error}` : "Couldn’t reach the server. Try again in a moment.",
      }
    }
    return null
  }, [state.status, state.error, state.httpStatus])

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
