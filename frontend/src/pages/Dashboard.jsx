import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { listApplications } from "../repo/applicationsRepo"
import { listTodos } from "../api/todos"
import { getSetting, listHabitLogsForDays, listPomodorosSince, prunePomodorosOlderThan, setSetting } from "../db"
import ActivityHeatmap90Widget from "../components/ActivityHeatmap90Widget"
import { useOnlineStatus } from "../hooks/useOnlineStatus"
import { getToken } from "../utils/auth"
import Button from "../mobile/ui/Button"
import { useTopBarActions } from "../mobile/chrome"
import { listResumes } from "../api/ai"

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4h-3a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-3" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

function yyyyMmDdLocal(d) {
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function dayKeyFromIso(iso) {
  if (!iso) return ""
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return ""
  return yyyyMmDdLocal(t)
}

function timeAgo(iso) {
  if (!iso) return ""
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ""
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function isExternalUrl(url) {
  const u = String(url || "").trim().toLowerCase()
  return u.startsWith("http://") || u.startsWith("https://")
}

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function lastNDaysKeys(n) {
  const out = []
  const today = new Date()
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    d.setDate(d.getDate() - i)
    out.push(yyyyMmDdLocal(d))
  }
  return out
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

  const QUICK_LINKS_KEY = "dashboard:quickLinks"

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
  const [apps, setApps] = useState([])
  const [todosActive, setTodosActive] = useState([])
  const [todosCompleted, setTodosCompleted] = useState([])
  const [pomosRecent, setPomosRecent] = useState([])
  const [pomoMinutesToday, setPomoMinutesToday] = useState(0)
  const [pomoSessionsToday, setPomoSessionsToday] = useState(0)
  const [habitDoneByDay, setHabitDoneByDay] = useState({})
  const [resumes, setResumes] = useState([])
  const [gh, setGh] = useState({ username: "", profile: null, syncedAt: "" })
  const [lc, setLc] = useState({ username: "", profile: null, syncedAt: "" })
  const [ghContrib, setGhContrib] = useState([])

  const [quickLinks, setQuickLinks] = useState([])
  const [qlOpen, setQlOpen] = useState(false)
  const [qlEditingId, setQlEditingId] = useState("")
  const [qlForm, setQlForm] = useState({ title: "", url: "" })
  const [qlError, setQlError] = useState("")

  const loadJobsCount = async () => {
    try {
      const res = await listApplications({ page: 0, size: 200, statusFilter: "", filters: {} })
      const items = res?.data?.content || []
      const list = Array.isArray(items) ? items : []
      setApps(list)
      setJobsCount(list.length)
    } catch {
      setJobsCount(0)
      setApps([])
    }
  }

  const loadTodos = async () => {
    if (!online) {
      setTodosActive([])
      setTodosCompleted([])
      return
    }
    try {
      const [activeRes, completedRes] = await Promise.all([
        listTodos({ status: "active" }),
        listTodos({ status: "completed" }),
      ])
      setTodosActive(Array.isArray(activeRes?.data) ? activeRes.data : [])
      setTodosCompleted(Array.isArray(completedRes?.data) ? completedRes.data : [])
    } catch {
      setTodosActive([])
      setTodosCompleted([])
    }
  }

  const loadPomodoros = async () => {
    try {
      await prunePomodorosOlderThan(60)
      const sinceIso = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      const items = await listPomodorosSince(sinceIso)
      const list = Array.isArray(items) ? items : []
      list.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
      setPomosRecent(list)

      const todayStr = yyyyMmDdLocal(new Date())
      const todays = list.filter((p) => p?.type === "work" && dayKeyFromIso(p?.completedAt) === todayStr)
      setPomoSessionsToday(todays.length)
      setPomoMinutesToday(todays.reduce((sum, p) => sum + (Number(p.duration) || 0), 0))
    } catch {
      setPomosRecent([])
      setPomoSessionsToday(0)
      setPomoMinutesToday(0)
    }
  }

  const loadQuickLinks = async () => {
    try {
      const raw = await getSetting(QUICK_LINKS_KEY)
      setQuickLinks(Array.isArray(raw) ? raw : [])
    } catch {
      setQuickLinks([])
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

  const loadHabitsActivity = async () => {
    try {
      const dayKeys = lastNDaysKeys(90)
      const logsByDay = await listHabitLogsForDays(dayKeys)
      const out = {}
      for (const dayKey of dayKeys) {
        const log = logsByDay?.[dayKey]
        if (!log || typeof log !== "object") {
          out[dayKey] = 0
          continue
        }
        const done = Object.values(log).filter(Boolean).length
        out[dayKey] = done
      }
      setHabitDoneByDay(out)
    } catch {
      setHabitDoneByDay({})
    }
  }

  const loadResumesActivity = async () => {
    if (!online || !token) {
      setResumes([])
      return
    }
    try {
      const res = await listResumes()
      setResumes(Array.isArray(res?.data) ? res.data : [])
    } catch {
      setResumes([])
    }
  }

  useEffect(() => {
    loadJobsCount()
    loadTodos()
    loadPomodoros()
    loadIntegrations()
    loadQuickLinks()
    loadHabitsActivity()
    loadResumesActivity()

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return
      loadJobsCount()
      loadTodos()
      loadPomodoros()
      loadIntegrations()
      loadQuickLinks()
      loadHabitsActivity()
      loadResumesActivity()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  const quote = useMemo(() => {
    const items = [
      "Do the next small thing.",
      "Consistency beats intensity.",
      "Build momentum, not pressure.",
      "Finish one loop: start -> focus -> ship.",
      "Progress is a stack of tiny wins.",
      "Make it easy to do the right thing.",
      "You only need to be brave for 10 minutes.",
      "Clarity first. Speed later.",
      "Action creates information.",
      "Aim for better, not perfect.",
    ]
    return items[Math.floor(Math.random() * items.length)]
  }, [])

  const todayLabel = useMemo(() => {
    try {
      return new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
    } catch {
      return "Today"
    }
  }, [])

  const doneTodayCount = useMemo(() => {
    const todayStr = yyyyMmDdLocal(new Date())
    return (todosCompleted || []).filter((t) => dayKeyFromIso(t?.completedAt) === todayStr).length
  }, [todosCompleted])

  const pendingCount = useMemo(() => {
    return Array.isArray(todosActive) ? todosActive.length : 0
  }, [todosActive])

  const quickLinksSorted = useMemo(() => {
    const list = Array.isArray(quickLinks) ? quickLinks : []
    return [...list].sort((a, b) => {
      const ao = Number(a?.order)
      const bo = Number(b?.order)
      if (!Number.isNaN(ao) && !Number.isNaN(bo) && ao !== bo) return ao - bo
      return String(a?.createdAt || "").localeCompare(String(b?.createdAt || ""))
    })
  }, [quickLinks])

  const focusDistribution = useMemo(() => {
    const todayStr = yyyyMmDdLocal(new Date())
    const map = new Map()
    for (const p of Array.isArray(pomosRecent) ? pomosRecent : []) {
      if (p?.type !== "work") continue
      if (dayKeyFromIso(p?.completedAt) !== todayStr) continue
      const key = String(p?.taskTitle || "").trim() || "Unlabeled"
      map.set(key, (map.get(key) || 0) + (Number(p?.duration) || 0))
    }
    const items = Array.from(map.entries()).map(([label, minutes]) => ({ label, minutes }))
    items.sort((a, b) => b.minutes - a.minutes)
    const total = items.reduce((sum, x) => sum + x.minutes, 0)
    return {
      total,
      items: items.slice(0, 6).map((x) => ({
        ...x,
        pct: total > 0 ? Math.round((x.minutes / total) * 100) : 0,
      })),
    }
  }, [pomosRecent])

  const activityHeatmapDays = useMemo(() => {
    const byDate = new Map()

    // GitHub (optional - cached external signal)
    for (const d of Array.isArray(ghContrib) ? ghContrib : []) {
      if (!d?.date) continue
      byDate.set(String(d.date), (byDate.get(String(d.date)) || 0) + (Number(d.count) || 0))
    }

    // Pomodoros (local)
    for (const p of Array.isArray(pomosRecent) ? pomosRecent : []) {
      if (p?.type !== "work") continue
      const day = dayKeyFromIso(p?.completedAt)
      if (!day) continue
      byDate.set(day, (byDate.get(day) || 0) + 1)
    }

    // Habits (local): count done items per day
    for (const [day, done] of Object.entries(habitDoneByDay || {})) {
      if (!day) continue
      byDate.set(day, (byDate.get(day) || 0) + (Number(done) || 0))
    }

    // To-dos (server): created + completed
    const allTodos = ([]
      .concat(Array.isArray(todosActive) ? todosActive : [])
      .concat(Array.isArray(todosCompleted) ? todosCompleted : []))
    for (const t of allTodos) {
      const createdDay = dayKeyFromIso(t?.createdAt)
      if (createdDay) byDate.set(createdDay, (byDate.get(createdDay) || 0) + 1)
      const completedDay = dayKeyFromIso(t?.completedAt)
      if (completedDay) byDate.set(completedDay, (byDate.get(completedDay) || 0) + 1)
    }

    // Job applications (server/cache): appliedDate + lastUpdated (LocalDate strings)
    for (const a of Array.isArray(apps) ? apps : []) {
      const applied = String(a?.appliedDate || "").trim()
      if (applied) byDate.set(applied, (byDate.get(applied) || 0) + 1)
      const updated = String(a?.lastUpdated || "").trim()
      if (updated) byDate.set(updated, (byDate.get(updated) || 0) + 1)
    }

    // AI resumes (server): createdAt
    for (const r of Array.isArray(resumes) ? resumes : []) {
      const day = dayKeyFromIso(r?.createdAt)
      if (!day) continue
      byDate.set(day, (byDate.get(day) || 0) + 1)
    }

    const days = lastNDaysKeys(90)
    return days.map((date) => ({ date, count: byDate.get(date) || 0 }))
  }, [ghContrib, pomosRecent, habitDoneByDay, todosActive, todosCompleted, apps, resumes])

  const recentActivity = useMemo(() => {
    const out = []
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    for (const p of Array.isArray(pomosRecent) ? pomosRecent : []) {
      if (p?.type !== "work") continue
      const ts = new Date(p.completedAt || 0).getTime()
      if (Number.isNaN(ts) || ts < weekAgo) continue
      const label = String(p?.taskTitle || "").trim() || "Pomodoro"
      out.push({
        id: `pomo:${p.id || ts}`,
        kind: "pomo",
        at: p.completedAt,
        title: label,
        meta: `${Number(p.duration) || 0} min focus`,
        to: "/pomodoro",
      })
    }

    for (const t of Array.isArray(todosCompleted) ? todosCompleted : []) {
      const ts = new Date(t?.completedAt || 0).getTime()
      if (Number.isNaN(ts) || ts < weekAgo) continue
      out.push({
        id: `todo:${t.id || ts}`,
        kind: "todo",
        at: t.completedAt,
        title: t?.title || "To-do completed",
        meta: t?.category ? String(t.category) : "",
        to: t?.id ? `/todos?todoId=${encodeURIComponent(t.id)}` : "/todos",
      })
    }

    out.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime())
    return out.slice(0, 10)
  }, [pomosRecent, todosCompleted])

  const startQuickLinkEdit = (item) => {
    setQlError("")
    if (!item) {
      setQlEditingId("")
      setQlForm({ title: "", url: "" })
      setQlOpen(true)
      return
    }
    setQlEditingId(String(item.id || ""))
    setQlForm({ title: String(item.title || ""), url: String(item.url || "") })
    setQlOpen(true)
  }

  const saveQuickLink = async () => {
    const title = String(qlForm.title || "").trim()
    const url = String(qlForm.url || "").trim()
    if (!title) {
      setQlError("Title is required")
      return
    }
    if (!url) {
      setQlError("URL is required")
      return
    }
    if (!isExternalUrl(url) && !url.startsWith("/")) {
      setQlError("Use an internal path like /pomodoro or a full https:// URL")
      return
    }

    const now = new Date().toISOString()
    const prev = Array.isArray(quickLinks) ? quickLinks : []
    let next
    if (qlEditingId) {
      next = prev.map((x) => (x?.id === qlEditingId ? { ...x, title, url, updatedAt: now } : x))
    } else {
      next = [
        ...prev,
        { id: uuid(), title, url, createdAt: now, updatedAt: now, order: prev.length },
      ]
    }

    try {
      await setSetting(QUICK_LINKS_KEY, next)
      setQuickLinks(next)
      setQlOpen(false)
      setQlEditingId("")
      setQlForm({ title: "", url: "" })
      setQlError("")
    } catch {
      setQlError("Couldn't save link on this device")
    }
  }

  const deleteQuickLink = async (id) => {
    const prev = Array.isArray(quickLinks) ? quickLinks : []
    const next = prev.filter((x) => x?.id !== id)
    try {
      await setSetting(QUICK_LINKS_KEY, next)
      setQuickLinks(next)
    } catch {
      // no-op
    }
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="card overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-surfaceAlt/25 to-teal-500/8" />
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <div className="text-sm text-dark-300">{todayLabel}</div>
              <h1 className="mt-1 text-2xl lg:text-3xl font-bold text-white tracking-tight">Dashboard</h1>
              <p className="text-dark-400 mt-1">{quote}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={() => navigate("/todos")}>To-dos</button>
              <button type="button" className="btn-secondary" onClick={() => navigate("/pomodoro")}>Pomodoro</button>
              <button type="button" className="btn-secondary" onClick={() => navigate("/job-tracker")}>Job Tracker</button>
              <button type="button" className="btn-secondary" onClick={() => navigate("/analytics")}>Analytics</button>
              <button type="button" className="btn-ghost" onClick={() => navigate("/settings")}>Settings</button>
            </div>
          </div>

          {!token && !online && (
            <div className="mt-5 px-4 py-3 rounded-2xl border border-warning-500/30 bg-warning-500/10 text-warning-300">
              Offline mode: some sections may be unavailable.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tasks done today"
          value={online ? doneTodayCount : "—"}
          sub={online ? "completed" : "needs internet"}
          onOpen={() => navigate("/todos")}
        />
        <StatCard
          label="Pomodoros today"
          value={pomoSessionsToday}
          sub={`${pomoMinutesToday} min focus`}
          onOpen={() => navigate("/pomodoro")}
        />
        <StatCard
          label="LeetCode"
          value={lc.profile ? (lc.profile.totalSolved || 0) : "—"}
          sub={lc.profile ? "solved" : "connect profile"}
          onOpen={() => navigate("/settings?tab=integrations")}
        />
        <StatCard
          label={gh.profile || gh.username ? "GitHub (90d)" : "Jobs"}
          value={ghContrib.length > 0 ? ghContrib.reduce((s, d) => s + (Number(d?.count) || 0), 0) : jobsCount}
          sub={ghContrib.length > 0 ? "contributions" : "tracked"}
          onOpen={() => (ghContrib.length > 0 ? navigate("/settings?tab=integrations") : navigate("/job-tracker"))}
        />
      </div>

      <div className="grid gap-4 lg:gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Quick Launch</h2>
                <p className="text-sm text-dark-400 mt-1">Pin resources you use every day.</p>
              </div>
              <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => startQuickLinkEdit(null)}>
                <PlusIcon />
                Add
              </button>
            </div>

            {quickLinksSorted.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dark-700 bg-dark-900/20 px-4 py-3 text-dark-300 text-sm">
                No links yet. Add your resume, portfolio, or target company pages.
              </div>
            ) : (
              <div className="mt-5 grid sm:grid-cols-2 gap-3">
                {quickLinksSorted.map((l) => (
                  <div key={l.id} className="rounded-2xl border border-dark-700 bg-dark-900/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => {
                          const url = String(l?.url || "")
                          if (isExternalUrl(url)) window.open(url, "_blank", "noopener,noreferrer")
                          else navigate(url)
                        }}
                      >
                        <div className="text-white font-semibold truncate">{l.title}</div>
                        <div className="text-xs text-dark-500 mt-1 break-all line-clamp-2">{l.url}</div>
                      </button>
                      <div className="flex items-center gap-1">
                        <button type="button" className="btn-ghost" aria-label="Edit link" onClick={() => startQuickLinkEdit(l)}>
                          <PencilIcon />
                        </button>
                        <button type="button" className="btn-ghost text-danger-300" aria-label="Delete link" onClick={() => deleteQuickLink(l.id)}>
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {qlOpen && (
              <div className="mt-5 pt-5 border-t border-dark-700">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-dark-400">Title</label>
                    <input
                      className="input-field mt-1"
                      value={qlForm.title}
                      onChange={(e) => setQlForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Resume"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-dark-400">URL</label>
                    <input
                      className="input-field mt-1"
                      value={qlForm.url}
                      onChange={(e) => setQlForm((p) => ({ ...p, url: e.target.value }))}
                      placeholder="https://… or /pomodoro"
                    />
                  </div>
                </div>

                {qlError && <div className="mt-3 text-sm text-danger-300">{qlError}</div>}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="btn-primary" onClick={saveQuickLink}>
                    {qlEditingId ? "Save" : "Add link"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setQlOpen(false)
                      setQlEditingId("")
                      setQlForm({ title: "", url: "" })
                      setQlError("")
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                <p className="text-sm text-dark-400 mt-1">Last 7 days across focus and tasks.</p>
              </div>
            </div>

            {recentActivity.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dark-700 bg-dark-900/20 px-4 py-3 text-dark-300 text-sm">
                Nothing logged recently. Start a Pomodoro or knock out a to-do.
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                {recentActivity.map((a) => (
                  <div key={a.id} className="rounded-2xl border border-dark-700 bg-dark-900/15 px-4 py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-white font-medium truncate">{a.title}</div>
                      <div className="text-xs text-dark-500 mt-1 truncate">{a.meta}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-xs text-dark-500 whitespace-nowrap">{timeAgo(a.at)}</div>
                      <button
                        type="button"
                        className="btn-ghost text-xs inline-flex items-center gap-2"
                        onClick={() => navigate(a.to || (a.kind === "pomo" ? "/pomodoro" : "/todos"))}
                        aria-label={a.kind === "pomo" ? "Open Pomodoro" : "Open To-dos"}
                      >
                        Open <ArrowRightIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Pending Tasks</h2>
                <p className="text-sm text-dark-400 mt-1">Your next few to keep moving.</p>
              </div>
              <button type="button" className="btn-ghost text-sm inline-flex items-center gap-2" onClick={() => navigate("/todos")}>Open <ArrowRightIcon /></button>
            </div>

            {!online ? (
              <div className="mt-5 px-4 py-3 rounded-2xl border border-dark-700 bg-dark-900/20 text-sm text-dark-300">
                To-dos need an internet connection right now.
              </div>
            ) : pendingCount === 0 ? (
              <div className="mt-5 rounded-2xl border border-success-500/25 bg-success-500/10 px-4 py-3 text-success-200 text-sm">
                No pending to-dos. Nice.
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                {(todosActive || []).slice(0, 5).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="w-full text-left rounded-2xl border border-dark-700 bg-dark-900/15 px-4 py-3 hover:border-white/10 transition-colors"
                    onClick={() => navigate(`/todos?todoId=${encodeURIComponent(t.id)}`)}
                  >
                    <div className="text-white font-medium truncate">{t.title}</div>
                    <div className="text-xs text-dark-500 mt-1 flex flex-wrap items-center gap-2">
                      {t.category ? <span className="text-emerald-200">{t.category}</span> : null}
                      {t.dueDate ? <span>Due: {String(t.dueDate)}</span> : <span>No due date</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Today’s Focus</h2>
                <p className="text-sm text-dark-400 mt-1">Where your time is going.</p>
              </div>
              <button type="button" className="btn-ghost text-sm inline-flex items-center gap-2" onClick={() => navigate("/pomodoro")}>Open <ArrowRightIcon /></button>
            </div>

            {focusDistribution.total <= 0 ? (
              <div className="mt-5 rounded-2xl border border-dark-700 bg-dark-900/20 px-4 py-3 text-dark-300 text-sm">
                No focus sessions logged today.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {focusDistribution.items.map((x) => (
                  <div key={x.label}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm text-white font-medium truncate">{x.label}</div>
                      <div className="text-xs text-dark-500 whitespace-nowrap">{x.minutes} min ({x.pct}%)</div>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-dark-900/40 border border-dark-700 overflow-hidden">
                      <div className="h-full bg-emerald-500/35" style={{ width: `${x.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Profiles</h2>
                <p className="text-sm text-dark-400 mt-1">Connected stats cached on this device.</p>
              </div>
              <button type="button" className="btn-secondary" onClick={() => navigate("/settings?tab=integrations")}>
                {gh.profile || lc.profile ? "Manage" : "Connect"}
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-dark-700 bg-dark-900/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm text-dark-400">GitHub</div>
                    <div className="mt-1 text-white font-semibold truncate">
                      {gh.profile ? (gh.profile.name || gh.profile.login || gh.username) : "Not connected"}
                    </div>
                    <div className="text-xs text-dark-500 mt-1">Last sync: {formatDateShort(gh.syncedAt)}</div>
                  </div>
                  {ghContrib.length > 0 ? (
                    <div className="text-right">
                      <div className="text-sm text-white font-semibold tabular-nums">{ghContrib.reduce((s, d) => s + (Number(d?.count) || 0), 0)}</div>
                      <div className="text-xs text-dark-500">90d</div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-dark-700 bg-dark-900/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm text-dark-400">LeetCode</div>
                    <div className="mt-1 text-white font-semibold truncate">
                      {lc.profile ? `@${lc.profile.username || lc.username}` : "Not connected"}
                    </div>
                    <div className="text-xs text-dark-500 mt-1">Last sync: {formatDateShort(lc.syncedAt)}</div>
                  </div>
                  {lc.profile ? (
                    <div className="text-right">
                      <div className="text-sm text-white font-semibold tabular-nums">{lc.profile.totalSolved || 0}</div>
                      <div className="text-xs text-dark-500">solved</div>
                    </div>
                  ) : null}
                </div>

                {lc.profile ? (
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    <MiniStat label="Easy" value={lc.profile.easySolved} />
                    <MiniStat label="Med" value={lc.profile.mediumSolved} />
                    <MiniStat label="Hard" value={lc.profile.hardSolved} />
                    <MiniStat label="Rank" value={lc.profile.ranking ? String(lc.profile.ranking).slice(0, 6) : "—"} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ActivityHeatmap90Widget days={activityHeatmapDays} tone="primary" />
    </div>
  )
}

function StatCard({ label, value, sub, onOpen }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-sm text-dark-400 truncate">{label}</div>
          <div className="mt-2 text-4xl font-bold text-white tracking-tight tabular-nums">{value}</div>
          <div className="mt-1 text-sm text-dark-400 truncate">{sub}</div>
        </div>
        <button type="button" className="btn-ghost shrink-0 text-sm inline-flex items-center gap-2" onClick={onOpen}>
          Open <ArrowRightIcon />
        </button>
      </div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-dark-700 bg-dark-800/40 px-3 py-2">
      <div className="text-[11px] text-dark-500">{label}</div>
      <div className="mt-0.5 text-white font-semibold text-sm truncate">{value == null || value === "" ? "—" : String(value)}</div>
    </div>
  )
}
