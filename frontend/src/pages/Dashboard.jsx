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

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#a855f7"]

function yyyyMmDdLocal(d) {
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-dark-400 mt-1">Overview across Capsule</p>
        </div>
      </div>

      {!token && !online && (
        <div className="px-4 py-3 rounded-2xl border border-warning-500/30 bg-warning-500/10 text-warning-300">
          Offline read-only mode. Some widgets may be unavailable.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-dark-400">Job applications</p>
              <p className="mt-1 text-3xl font-bold text-white">{appsSummary.total}</p>
              <p className="mt-1 text-sm text-dark-400">Tracked so far</p>
            </div>
            <button type="button" onClick={() => navigate("/job-tracker")} className="btn-ghost text-sm">
              View <ArrowRightIcon />
            </button>
          </div>

          {appStatusData.length > 0 && (
            <div className="mt-4 pt-4 border-t border-dark-700 space-y-2">
              {appStatusData.slice(0, 4).map((x) => (
                <div key={x.name} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-dark-300 truncate">{x.name}</span>
                  <span className="text-sm text-dark-400 whitespace-nowrap">{x.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-dark-400">To-dos</p>
              <p className="mt-1 text-3xl font-bold text-white">{todoSummary.pending}</p>
              <p className="mt-1 text-sm text-dark-400">Pending ({todoSummary.done} done)</p>
            </div>
            <button type="button" onClick={() => navigate("/todos")} className="btn-ghost text-sm">
              View <ArrowRightIcon />
            </button>
          </div>

          {!online && (
            <div className="mt-4 pt-4 border-t border-dark-700 text-sm text-dark-400">
              To-dos require internet right now.
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-dark-400">Pomodoro today</p>
              <p className="mt-1 text-3xl font-bold text-white">{pomoToday.sessions}</p>
              <p className="mt-1 text-sm text-dark-400">{pomoToday.minutes} min focused</p>
            </div>
            <button type="button" onClick={() => navigate("/pomodoro")} className="btn-ghost text-sm">
              View <ArrowRightIcon />
            </button>
          </div>

          {pomoToday.minutes > 0 && (
            <div className="mt-4 pt-4 border-t border-dark-700 grid grid-cols-2 gap-3 items-center">
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
                {pomoToday.topics.slice(0, 3).map((t, i) => (
                  <div key={t.name} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-dark-300 truncate">{t.name}</span>
                    <span className="text-xs text-dark-500 whitespace-nowrap">{t.value}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {(gh.profile || lc.profile) && (
        <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
          {gh.profile && (
            <div className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-dark-400">GitHub</p>
                  <p className="mt-1 text-lg font-semibold text-white truncate">
                    {gh.profile.name || gh.profile.login || gh.username}
                  </p>
                  <p className="text-sm text-dark-400 truncate">@{gh.profile.login || gh.username}</p>
                </div>
                <button type="button" className="btn-ghost text-sm" onClick={() => navigate("/settings")}>
                  Manage <ArrowRightIcon />
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-dark-700 space-y-2 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-dark-400">Repos</div>
                  <div className="text-white font-semibold">{String(gh.profile.publicRepos || 0)}</div>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="text-dark-400">Followers</div>
                  <div className="text-white font-semibold">{String(gh.profile.followers || 0)}</div>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="text-dark-400">Last sync</div>
                  <div className="text-white font-semibold">{gh.syncedAt ? new Date(gh.syncedAt).toLocaleDateString() : "—"}</div>
                </div>
              </div>
            </div>
          )}

          {lc.profile && (
            <div className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-dark-400">LeetCode</p>
                  <p className="mt-1 text-lg font-semibold text-white truncate">@{lc.profile.username || lc.username}</p>
                  <p className="text-sm text-dark-400">Solved: {lc.profile.totalSolved || 0}</p>
                </div>
                <button type="button" className="btn-ghost text-sm" onClick={() => navigate("/settings")}>
                  Manage <ArrowRightIcon />
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-dark-700 space-y-2 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-dark-400">Easy</div>
                  <div className="text-white font-semibold">{String(lc.profile.easySolved || 0)}</div>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="text-dark-400">Medium</div>
                  <div className="text-white font-semibold">{String(lc.profile.mediumSolved || 0)}</div>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="text-dark-400">Hard</div>
                  <div className="text-white font-semibold">{String(lc.profile.hardSolved || 0)}</div>
                </div>
              </div>
            </div>
          )}

          {gh.profile && ghContrib.length > 0 && (
            <div className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-dark-400">GitHub contributions</p>
                  <p className="mt-1 text-lg font-semibold text-white">@{gh.profile.login || gh.username}</p>
                </div>
                <button type="button" className="btn-ghost text-sm" onClick={() => navigate("/settings")}>
                  Manage <ArrowRightIcon />
                </button>
              </div>
              <div className="mt-4">
                <Heatmap90d days={ghContrib} tone="primary" />
              </div>
            </div>
          )}

          {lc.profile?.submissionDays90d?.length > 0 && (
            <div className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-dark-400">LeetCode submissions</p>
                  <p className="mt-1 text-lg font-semibold text-white">@{lc.profile.username || lc.username}</p>
                </div>
                <button type="button" className="btn-ghost text-sm" onClick={() => navigate("/settings")}>
                  Manage <ArrowRightIcon />
                </button>
              </div>
              <div className="mt-4">
                <Heatmap90d days={lc.profile.submissionDays90d} tone="success" />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Quick actions</h2>
            <p className="text-sm text-dark-400 mt-1">Jump to a module</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => navigate("/job-tracker")}>Job Tracker</button>
            <button type="button" className="btn-secondary" onClick={() => navigate("/todos")}>To-dos</button>
            <button type="button" className="btn-secondary" onClick={() => navigate("/pomodoro")}>Pomodoro</button>
            <button type="button" className="btn-secondary" onClick={() => navigate("/analytics")}>Analytics</button>
            <button type="button" className="btn-secondary" onClick={() => navigate("/ai")}>AI Tools</button>
            <button type="button" className="btn-secondary" onClick={() => navigate("/settings")}>Settings</button>
          </div>
        </div>
      </div>
    </div>
  )
}
