import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { listApplications } from "../repo/applicationsRepo"
import { listTodos } from "../api/todos"
import { getSetting, listPomodorosSince, prunePomodorosOlderThan } from "../db"
import Heatmap90d from "../components/Heatmap90d"
import { useOnlineStatus } from "../hooks/useOnlineStatus"
import { getToken } from "../utils/auth"
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const PIE_COLORS = ["#3457b8", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#a855f7"]

function yyyyMmDdLocal(d) {
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function statusDot(status) {
  const s = String(status || "").toUpperCase()
  if (s.includes("OFFER")) return "bg-success-400"
  if (s.includes("INTERVIEW")) return "bg-warning-400"
  if (s === "OA" || s.includes("ASSESS")) return "bg-primary-400"
  if (s.includes("REJECT")) return "bg-danger-400"
  if (s.includes("APPL")) return "bg-dark-300"
  return "bg-dark-400"
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

  const [appsSummary, setAppsSummary] = useState({ total: 0, byStatus: {} })
  const [todoSummary, setTodoSummary] = useState({ pending: 0, done: 0 })
  const [pomoToday, setPomoToday] = useState({ sessions: 0, minutes: 0, topics: [] })

  const [gh, setGh] = useState({ username: "", profile: null, syncedAt: "" })
  const [lc, setLc] = useState({ username: "", profile: null, syncedAt: "" })
  const [ghContrib, setGhContrib] = useState([])

  const loadAppsSummary = async () => {
    try {
      const res = await listApplications({ page: 0, size: 200, statusFilter: "", filters: {} })
      const items = res?.data?.content || []

      const byStatus = {}
      for (const a of items) {
        const s = a?.status || "UNKNOWN"
        byStatus[s] = (byStatus[s] || 0) + 1
      }

      setAppsSummary({ total: items.length, byStatus })
    } catch {
      setAppsSummary({ total: 0, byStatus: {} })
    }
  }

  const loadTodoSummary = async () => {
    if (!online) {
      setTodoSummary({ pending: 0, done: 0 })
      return
    }
    try {
      const [active, completed] = await Promise.all([
        listTodos({ status: "active" }),
        listTodos({ status: "completed" }),
      ])
      setTodoSummary({ pending: (active.data || []).length, done: (completed.data || []).length })
    } catch {
      setTodoSummary({ pending: 0, done: 0 })
    }
  }

  const loadPomoToday = async () => {
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

      const sessions = todays.length
      const minutes = todays.reduce((sum, p) => sum + (Number(p.duration) || 0), 0)

      const map = new Map()
      for (const p of todays) {
        const k = p.taskTitle || "(Untitled)"
        map.set(k, (map.get(k) || 0) + (Number(p.duration) || 0))
      }
      const topics = Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

      setPomoToday({ sessions, minutes, topics })
    } catch {
      setPomoToday({ sessions: 0, minutes: 0, topics: [] })
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
    loadAppsSummary()
    loadTodoSummary()
    loadPomoToday()
    loadIntegrations()

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return
      loadAppsSummary()
      loadTodoSummary()
      loadPomoToday()
      loadIntegrations()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  const appStatusData = useMemo(() => {
    const entries = Object.entries(appsSummary.byStatus || {})
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
    return entries
  }, [appsSummary])

  const todayLabel = useMemo(() => {
    try {
      return new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
    } catch {
      return "Today"
    }
  }, [])

  const topStatuses = useMemo(() => appStatusData.slice(0, 5), [appStatusData])
  const maxStatusCount = useMemo(() => {
    const m = Math.max(0, ...topStatuses.map((x) => Number(x.value) || 0))
    return m || 1
  }, [topStatuses])

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-dark-800/30 to-success-500/5" />
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
              <div className="text-sm text-dark-400">Applications</div>
              <div className="mt-2 text-4xl font-bold text-white tracking-tight">{appsSummary.total}</div>
            </div>
            <button type="button" className="btn-ghost text-sm" onClick={() => navigate("/job-tracker")}>Open <ArrowRightIcon /></button>
          </div>

          {topStatuses.length > 0 ? (
            <div className="mt-5 space-y-2">
              {topStatuses.map((x) => {
                const pct = Math.round(((Number(x.value) || 0) / maxStatusCount) * 100)
                return (
                  <div key={x.name} className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full ${statusDot(x.name)}`} />
                        <span className="text-sm text-dark-200 truncate">{x.name}</span>
                      </div>
                      <span className="text-sm text-dark-400 tabular-nums">{x.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-dark-900/40 border border-dark-700 overflow-hidden">
                      <div className="h-full bg-primary-500/60" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-5 text-sm text-dark-400">No applications yet.</div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-dark-400">To-dos</div>
              <div className="mt-2 text-4xl font-bold text-white tracking-tight">{todoSummary.pending}</div>
              <div className="mt-1 text-sm text-dark-400">{todoSummary.done} completed</div>
            </div>
            <button type="button" className="btn-ghost text-sm" onClick={() => navigate("/todos")}>Open <ArrowRightIcon /></button>
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
              <div className="mt-2 flex items-end gap-3">
                <div className="text-4xl font-bold text-white tracking-tight tabular-nums">{pomoToday.minutes}</div>
                <div className="text-sm text-dark-400 pb-1">minutes</div>
              </div>
              <div className="mt-1 text-sm text-dark-400">{pomoToday.sessions} sessions today</div>
            </div>
            <button type="button" className="btn-ghost text-sm" onClick={() => navigate("/pomodoro")}>Open <ArrowRightIcon /></button>
          </div>

          {pomoToday.minutes > 0 && (
            <div className="mt-5 pt-4 border-t border-dark-700 grid grid-cols-2 gap-3 items-center">
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pomoToday.topics} dataKey="value" nameKey="name" innerRadius={26} outerRadius={44} paddingAngle={2}>
                      {pomoToday.topics.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1">
                {pomoToday.topics.slice(0, 3).map((t) => (
                  <div key={t.name} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-dark-200 truncate">{t.name}</span>
                    <span className="text-xs text-dark-500 whitespace-nowrap tabular-nums">{t.value}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {(gh.profile || lc.profile || ghContrib.length > 0 || lc.profile?.submissionDays90d?.length > 0) && (
        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Profiles</h2>
              <p className="text-sm text-dark-400 mt-1">Your connected stats (cached on this device).</p>
            </div>
            <button type="button" className="btn-ghost text-sm" onClick={() => navigate("/settings")}>
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
