import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { listApplications } from "../repo/applicationsRepo"
import { listTodos } from "../api/todos"
import { listPomodorosSince, prunePomodorosOlderThan, getSetting } from "../db"
import Heatmap90d from "../components/Heatmap90d"
import { useOnlineStatus } from "../hooks/useOnlineStatus"
import { getToken } from "../utils/auth"
import Button from "../mobile/ui/Button"
import { useTopBarActions } from "../mobile/chrome"

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

function yyyyMmDdLocal(d) {
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDateShort(iso) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" })
  } catch {
    return "—"
  }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const token = getToken()

  useTopBarActions(
    <Button
      variant="primary"
      size="sm"
      className="px-4 rounded-2xl"
      onClick={() => navigate("/job-tracker")}
      aria-label="Open Job Tracker"
    >
      Jobs
    </Button>,
    [navigate]
  )

  const [jobsCount, setJobsCount] = useState(0)
  const [tasksPending, setTasksPending] = useState(0)
  const [pomoMinutes, setPomoMinutes] = useState(0)
  const [gh, setGh] = useState({ username: "", profile: null, syncedAt: "" })
  const [lc, setLc] = useState({ username: "", profile: null, syncedAt: "" })
  const [ghContrib, setGhContrib] = useState([])

  const loadJobsCount = async () => {
    try {
      const res = await listApplications({ page: 0, size: 200, statusFilter: "", filters: {} })
      const items = res?.data?.content || []
      setJobsCount(Array.isArray(items) ? items.length : 0)
    } catch {
      setJobsCount(0)
    }
  }

  const loadTasksPending = async () => {
    if (!online) {
      setTasksPending(0)
      return
    }
    try {
      const active = await listTodos({ status: "active" })
      setTasksPending(Array.isArray(active.data) ? active.data.length : 0)
    } catch {
      setTasksPending(0)
    }
  }

  const loadPomoMinutes = async () => {
    try {
      await prunePomodorosOlderThan(60)
      const sinceIso = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      const items = await listPomodorosSince(sinceIso)
      const todayStr = yyyyMmDdLocal(new Date())
      const todays = (items || []).filter((p) => {
        if (!p || p.type !== "work") return false
        const t = new Date(p.completedAt || 0)
        if (Number.isNaN(t.getTime())) return false
        return yyyyMmDdLocal(t) === todayStr
      })
      const minutes = todays.reduce((sum, p) => sum + (Number(p.duration) || 0), 0)
      setPomoMinutes(minutes)
    } catch {
      setPomoMinutes(0)
    }
  }

  const loadIntegrations = async () => {
    try {
      const [
        ghUsername,
        ghProfile,
        ghSyncedAt,
        ghContrib90d,
        lcUsername,
        lcProfile,
        lcSyncedAt,
      ] = await Promise.all([
        getSetting("integrations:githubUsername"),
        getSetting("integrations:githubProfile"),
        getSetting("integrations:githubSyncedAt"),
        getSetting("integrations:githubContrib90d"),
        getSetting("integrations:leetcodeUsername"),
        getSetting("integrations:leetcodeProfile"),
        getSetting("integrations:leetcodeSyncedAt"),
      ])

      setGh({ username: ghUsername || "", profile: ghProfile || null, syncedAt: ghSyncedAt || "" })
      setLc({ username: lcUsername || "", profile: lcProfile || null, syncedAt: lcSyncedAt || "" })
      setGhContrib(Array.isArray(ghContrib90d) ? ghContrib90d : [])
    } catch {
      setGh({ username: "", profile: null, syncedAt: "" })
      setLc({ username: "", profile: null, syncedAt: "" })
      setGhContrib([])
    }
  }

  useEffect(() => {
    loadJobsCount()
    loadTasksPending()
    loadPomoMinutes()
    loadIntegrations()

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return
      loadJobsCount()
      loadTasksPending()
      loadPomoMinutes()
      loadIntegrations()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  const todayLabel = useMemo(() => {
    try {
      return new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
    } catch {
      return "Today"
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden relative sm:block hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-surfaceAlt/25 to-teal-500/6" />
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="text-sm text-dark-300">{todayLabel}</div>
              <h1 className="mt-1 text-2xl lg:text-3xl font-bold text-white tracking-tight">Dashboard</h1>
              <p className="text-dark-400 mt-1">A quick snapshot of what matters today.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={() => navigate("/job-tracker")}>Job Tracker</button>
              <button type="button" className="btn-secondary" onClick={() => navigate("/todos")}>To-dos</button>
              <button type="button" className="btn-secondary" onClick={() => navigate("/pomodoro")}>Pomodoro</button>
              <button type="button" className="btn-secondary" onClick={() => navigate("/settings")}>Settings</button>
            </div>
          </div>

          {!token && !online && (
            <div className="mt-5 px-4 py-3 rounded-2xl border border-warning-500/30 bg-warning-500/10 text-warning-300">
              Offline mode: some sections may be unavailable.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:gap-6 lg:grid-cols-3">
        <div className="card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-dark-400">Jobs</div>
              <div className="mt-2 text-4xl font-bold text-white tracking-tight tabular-nums">{jobsCount}</div>
              <div className="mt-1 text-sm text-dark-400">in your pipeline</div>
            </div>
            <button type="button" className="btn-ghost text-sm inline-flex items-center gap-2" onClick={() => navigate("/job-tracker")}>Open <ArrowRightIcon /></button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-dark-400">To-dos</div>
              <div className="mt-2 text-4xl font-bold text-white tracking-tight tabular-nums">{tasksPending}</div>
              <div className="mt-1 text-sm text-dark-400">pending</div>
            </div>
            <button type="button" className="btn-ghost text-sm inline-flex items-center gap-2" onClick={() => navigate("/todos")}>Open <ArrowRightIcon /></button>
          </div>

          {!online && (
            <div className="mt-5 px-4 py-3 rounded-2xl border border-dark-700 bg-dark-900/20 text-sm text-dark-300">
              To-dos need an internet connection right now.
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-dark-400">Focus</div>
              <div className="mt-2 text-4xl font-bold text-white tracking-tight tabular-nums">{pomoMinutes}</div>
              <div className="mt-1 text-sm text-dark-400">minutes today</div>
            </div>
            <button type="button" className="btn-ghost text-sm inline-flex items-center gap-2" onClick={() => navigate("/pomodoro")}>Open <ArrowRightIcon /></button>
          </div>
        </div>
      </div>

      {(gh.profile || lc.profile || ghContrib.length > 0 || lc.profile?.submissionDays90d?.length > 0) && (
        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Profiles</h2>
              <p className="text-sm text-dark-400 mt-1">Your connected stats (cached on this device).</p>
            </div>
            <button type="button" className="btn-ghost text-sm inline-flex items-center gap-2" onClick={() => navigate("/settings")}>
              Manage <ArrowRightIcon />
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-dark-700 bg-dark-900/20 p-4">
              <div className="text-sm text-dark-400">GitHub</div>
              <div className="mt-2 text-white font-semibold truncate">
                {gh.profile ? (gh.profile.name || gh.profile.login || gh.username) : "Not connected"}
              </div>
              <div className="text-sm text-dark-400 truncate">
                {gh.profile ? `@${gh.profile.login || gh.username}` : "Add a username in Settings"}
              </div>
              <div className="mt-3 text-xs text-dark-500">Last sync: {formatDateShort(gh.syncedAt)}</div>
            </div>

            <div className="rounded-2xl border border-dark-700 bg-dark-900/20 p-4">
              <div className="text-sm text-dark-400">LeetCode</div>
              <div className="mt-2 text-white font-semibold truncate">
                {lc.profile ? `@${lc.profile.username || lc.username}` : "Not connected"}
              </div>
              <div className="text-sm text-dark-400">
                {lc.profile ? `Solved: ${lc.profile.totalSolved || 0}` : "Add a username in Settings"}
              </div>
              <div className="mt-3 text-xs text-dark-500">Last sync: {formatDateShort(lc.syncedAt)}</div>
            </div>

            <div className="rounded-2xl border border-dark-700 bg-dark-900/20 p-4">
              <div className="text-sm text-dark-400">Activity</div>
              <div className="mt-2 text-sm text-dark-200">Last 90 days</div>
              <div className="mt-3 text-xs text-dark-500">Tip: open Settings to resync anytime.</div>
            </div>
          </div>

          {(ghContrib.length > 0 || lc.profile?.submissionDays90d?.length > 0) && (
            <div className="mt-5 pt-5 border-t border-dark-700 grid gap-4 lg:grid-cols-2">
              {ghContrib.length > 0 && (
                <div className="rounded-2xl border border-dark-700 bg-dark-900/10 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-dark-400">GitHub contributions</div>
                      <div className="text-sm text-dark-200 mt-1">@{gh.profile?.login || gh.username}</div>
                    </div>
                    <div className="text-xs text-dark-500">90 days</div>
                  </div>
                  <div className="mt-4">
                    <Heatmap90d days={ghContrib} tone="primary" />
                  </div>
                </div>
              )}

              {lc.profile?.submissionDays90d?.length > 0 && (
                <div className="rounded-2xl border border-dark-700 bg-dark-900/10 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-dark-400">LeetCode submissions</div>
                      <div className="text-sm text-dark-200 mt-1">@{lc.profile.username || lc.username}</div>
                    </div>
                    <div className="text-xs text-dark-500">90 days</div>
                  </div>
                  <div className="mt-4">
                    <Heatmap90d days={lc.profile.submissionDays90d} tone="success" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
