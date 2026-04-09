import { useEffect, useMemo, useRef, useState } from "react"

import { formatTimer } from "../helpers"
import {
  addPomodoro,
  clearPomodoros,
  getPomodoroSettings,
  listPomodorosSince,
  prunePomodorosOlderThan,
  setPomodoroSettings,
} from "../db"
import Button from "../mobile/ui/Button"
import { useTopBarActions } from "../mobile/chrome"

const GearIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const PlayIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7L8 5z" />
  </svg>
)

const PauseIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
  </svg>
)

const ResetIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 10a8 8 0 00-14.9-3M4 14a8 8 0 0014.9 3" />
  </svg>
)

const StopIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 6h12v12H6z" />
  </svg>
)

const SkipIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M7 6v12l10-6L7 6zm12 0h-2v12h2V6z" />
  </svg>
)

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

function clamp(n, min, max) {
  const x = Number(n)
  if (Number.isNaN(x)) return min
  return Math.max(min, Math.min(max, x))
}

function yyyyMmDd(d) {
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function dayKeyFromIso(iso) {
  const d = new Date(iso || 0)
  if (Number.isNaN(d.getTime())) return ""
  return yyyyMmDd(d)
}

function parseTags(raw) {
  if (!raw) return []
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function intensityClass(minutes) {
  if (minutes > 180) return "bg-primary-500/35 border-primary-500/40"
  if (minutes > 120) return "bg-primary-500/25 border-primary-500/30"
  if (minutes > 60) return "bg-primary-500/15 border-primary-500/25"
  if (minutes > 0) return "bg-primary-500/10 border-primary-500/20"
  return "bg-dark-800/30 border-dark-700"
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime || "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function csvEscape(value) {
  const s = String(value ?? "")
  if (/[\n\r,"]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export default function Pomodoro() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState(() => getPomodoroSettings())
  const [dangerOpen, setDangerOpen] = useState(false)

  useTopBarActions(
    <Button
      variant="secondary"
      size="sm"
      className="px-4 rounded-2xl"
      onClick={() => setSettingsOpen(true)}
      aria-label="Pomodoro Settings"
    >
      <GearIcon />
    </Button>,
    []
  )

  const modes = useMemo(() => {
    const focus = clamp(settings.focus, 1, 300) * 60
    const shortBreak = clamp(settings.shortBreak, 1, 120) * 60
    const longBreak = clamp(settings.longBreak, 1, 240) * 60
    return [
      { id: "work", label: "Focus", seconds: focus },
      { id: "short_break", label: "Short Break", seconds: shortBreak },
      { id: "long_break", label: "Long Break", seconds: longBreak },
    ]
  }, [settings])

  const [modeIndex, setModeIndex] = useState(0)
  const mode = modes[modeIndex] || modes[0]

  const [timeLeft, setTimeLeft] = useState(mode.seconds)
  const [isRunning, setIsRunning] = useState(false)
  const [sessionsCompleted, setSessionsCompleted] = useState(0)

  const [taskCategory, setTaskCategory] = useState("GATE")
  const [taskTitle, setTaskTitle] = useState("")
  const [tagsRaw, setTagsRaw] = useState("")

  const [recentPomodoros, setRecentPomodoros] = useState([])
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(() => yyyyMmDd(new Date()))

  const minDate = useMemo(() => new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), [])
  const maxDate = useMemo(() => new Date(), [])

  const endAtRef = useRef(null)
  const modeRef = useRef(mode)
  const modeIndexRef = useRef(modeIndex)
  const settingsRef = useRef(settings)
  const timeLeftRef = useRef(timeLeft)
  const sessionsRef = useRef(sessionsCompleted)
  const labelRef = useRef({ taskCategory, taskTitle, tagsRaw })

  useEffect(() => {
    modeRef.current = mode
  }, [mode])
  useEffect(() => {
    modeIndexRef.current = modeIndex
  }, [modeIndex])
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])
  useEffect(() => {
    timeLeftRef.current = timeLeft
  }, [timeLeft])
  useEffect(() => {
    sessionsRef.current = sessionsCompleted
  }, [sessionsCompleted])
  useEffect(() => {
    labelRef.current = { taskCategory, taskTitle, tagsRaw }
  }, [taskCategory, taskTitle, tagsRaw])

  const refreshRecent = async () => {
    await prunePomodorosOlderThan(60)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const items = await listPomodorosSince(sixtyDaysAgo)
    items.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    setRecentPomodoros(items)
  }

  const exportCsv = async () => {
    await prunePomodorosOlderThan(60)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const items = await listPomodorosSince(sixtyDaysAgo)
    items.sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())

    const header = ["completedAt", "durationMin", "taskTitle", "tags"].join(",")
    const rows = items
      .filter((p) => p && p.type === "work")
      .map((p) => {
        const tags = Array.isArray(p.tags) ? p.tags.join("|") : ""
        return [
          csvEscape(p.completedAt || ""),
          csvEscape(Number(p.duration) || 0),
          csvEscape(p.taskTitle || ""),
          csvEscape(tags),
        ].join(",")
      })

    const content = [header, ...rows].join("\n")
    const ts = new Date().toISOString().slice(0, 10)
    downloadText(`capsule-pomodoro-${ts}.csv`, content, "text/csv")
  }

  useEffect(() => {
    refreshRecent()
  }, [])

  // When mode changes (via mode buttons), reset timer if not running.
  // Do NOT reset on pause/stop, otherwise resume can't work.
  const lastModeKeyRef = useRef(`${modeIndex}:${mode.seconds}`)
  useEffect(() => {
    if (isRunning) return
    const nextKey = `${modeIndex}:${mode.seconds}`
    const changed = lastModeKeyRef.current !== nextKey
    lastModeKeyRef.current = nextKey
    if (changed) setTimeLeft(mode.seconds)
  }, [modeIndex, mode.seconds, isRunning])

  // Running tick (wall-clock based so it stays accurate in background).
  useEffect(() => {
    if (!isRunning) return
    const t = window.setInterval(() => {
      const endAt = endAtRef.current
      if (!endAt) return
      const remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0) {
        // auto-complete
        completeSession(false, 0)
      }
    }, 500)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning])

  const resolvedTitle = () => {
    if (taskCategory !== "Others") return taskCategory
    const t = String(taskTitle || "").trim()
    return t || "General Focus"
  }

  const logWorkIfNeeded = async (finalTimeLeft) => {
    const m = modeRef.current
    if (!m || m.id !== "work") return
    const total = m.seconds
    const elapsedSeconds = Math.max(0, total - (Number(finalTimeLeft) || 0))
    if (elapsedSeconds <= 0) return

    // Spec: only log if at least 1 minute of focus happened.
    const elapsedMinutes = Math.floor(elapsedSeconds / 60)
    if (elapsedMinutes < 1) return
    const labels = labelRef.current
    const category = labels?.taskCategory || "Others"
    const custom = labels?.taskTitle || ""
    const title = category !== "Others" ? category : (String(custom).trim() || "General Focus")
    const tags = parseTags(labels?.tagsRaw)

    await addPomodoro({
      duration: elapsedMinutes,
      type: "work",
      taskTitle: title,
      tags,
      completedAt: new Date().toISOString(),
    })
    await refreshRecent()
  }

  const completeSession = async (isStop, finalTimeLeft) => {
    setIsRunning(false)
    endAtRef.current = null

    const m = modeRef.current
    const s = settingsRef.current
    const isWork = m?.id === "work"

    if (isWork) {
      await logWorkIfNeeded(finalTimeLeft)
    }

    // Stop: never auto-switch, and keep remaining time (so user can resume).
    if (isStop) return

    // Determine next mode.
    if (isWork) {
      const willCountForCadence = (sessionsRef.current || 0) + 1
      const sessionsCount = Math.max(1, Number(s?.sessionsCount) || 4)
      const goLong = willCountForCadence % sessionsCount === 0
      const nextIdx = goLong ? 2 : 1

      // Only increment sessionsCompleted when it completes naturally.
      const natural = (Number(finalTimeLeft) || 0) <= 0
      if (natural) setSessionsCompleted((n) => n + 1)

      setModeIndex(nextIdx)
      setTimeLeft(modes[nextIdx].seconds)
      return
    }

    // Break => work
    setModeIndex(0)
    setTimeLeft(modes[0].seconds)
  }

  const toggleRunning = () => {
    if (isRunning) {
      // pause
      const endAt = endAtRef.current
      if (endAt) {
        const remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000))
        setTimeLeft(remaining)
      }
      endAtRef.current = null
      setIsRunning(false)
      return
    }
    // play
    endAtRef.current = Date.now() + (timeLeftRef.current || 0) * 1000
    setIsRunning(true)
  }

  const reset = () => {
    setIsRunning(false)
    endAtRef.current = null
    setTimeLeft(mode.seconds)
  }

  const stopAndLog = () => {
    const endAt = endAtRef.current
    const remaining = endAt ? Math.max(0, Math.round((endAt - Date.now()) / 1000)) : (timeLeftRef.current || 0)
    setTimeLeft(remaining)
    completeSession(true, remaining)
  }

  const skip = () => {
    completeSession(false, timeLeftRef.current)
  }

  const canGoPrevMonth = useMemo(() => {
    const prev = new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1)
    return prev.getTime() >= new Date(minDate.getFullYear(), minDate.getMonth(), 1).getTime()
  }, [monthCursor, minDate])

  const canGoNextMonth = useMemo(() => {
    const next = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1)
    return next.getTime() <= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1).getTime()
  }, [monthCursor, maxDate])

  const goPrevMonth = () => {
    if (!canGoPrevMonth) return
    setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }

  const goNextMonth = () => {
    if (!canGoNextMonth) return
    setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  const clearHistory = async () => {
    await clearPomodoros()
    setDangerOpen(false)
    setSelectedDate(yyyyMmDd(new Date()))
    setMonthCursor(() => {
      const d = new Date()
      return new Date(d.getFullYear(), d.getMonth(), 1)
    })
    await refreshRecent()
  }

  const updateSetting = (key, value) => {
    const next = {
      ...settings,
      [key]: Math.max(1, Math.round(Number(value) || 1)),
    }
    setSettings(next)
    setPomodoroSettings(next)
  }

  const todayStr = yyyyMmDd(new Date())
  const todayPoms = useMemo(() => {
    return (recentPomodoros || []).filter((p) => dayKeyFromIso(p?.completedAt) === todayStr)
  }, [recentPomodoros, todayStr])

  const todayMinutes = useMemo(() => todayPoms.reduce((sum, p) => sum + (Number(p.duration) || 0), 0), [todayPoms])

  const dailyFocusMap = useMemo(() => {
    const map = {}
    for (const p of recentPomodoros || []) {
      if (p?.type !== "work") continue
      const day = dayKeyFromIso(p?.completedAt)
      if (!day) continue
      map[day] = (map[day] || 0) + (Number(p.duration) || 0)
    }
    return map
  }, [recentPomodoros])

  const displayPomodoros = useMemo(() => {
    const list = (recentPomodoros || []).filter((p) => dayKeyFromIso(p?.completedAt) === selectedDate)
    list.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    return list
  }, [recentPomodoros, selectedDate])

  const monthDays = useMemo(() => {
    const year = monthCursor.getFullYear()
    const month = monthCursor.getMonth()
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)

    // Monday-first grid
    const dow = first.getDay() // 0..6, Sun..Sat
    const leading = (dow + 6) % 7

    const days = []
    for (let i = 0; i < leading; i++) days.push(null)
    for (let d = 1; d <= last.getDate(); d++) {
      days.push(new Date(year, month, d))
    }
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [monthCursor])

  const ring = useMemo(() => {
    const total = mode.seconds
    const remaining = timeLeft
    const progress = total > 0 ? (total - remaining) / total : 0
    const clamped = clamp(progress, 0, 1)
    const radius = 86
    const circumference = 2 * Math.PI * radius
    const offset = circumference * (1 - clamped)
    return { radius, circumference, offset }
  }, [mode.seconds, timeLeft])

  return (
    <div className="space-y-8">
      <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Pomodoro</h1>
        </div>
        <button type="button" onClick={() => setSettingsOpen(true)} className="btn-secondary flex items-center gap-2">
          <GearIcon />
          Settings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Timer section keeps its card on all sizes */}
          <div className="card flex flex-col items-center text-center">
            <div className="w-full flex flex-col items-center justify-center gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-dark-400 text-sm">Mode</div>
                <div className="text-white font-semibold text-lg">{mode.label}</div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 w-full lg:w-auto lg:flex lg:gap-2">
                {modes.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={isRunning}
                    onClick={() => setModeIndex(idx)}
                    className={`w-full lg:w-auto min-h-[40px] px-2 py-2 rounded-xl border text-[12px] sm:text-sm leading-tight whitespace-nowrap truncate font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      idx === modeIndex
                        ? "border-primary-500/40 bg-primary-500/10 text-primary-200"
                        : "border-dark-700 bg-dark-800/40 text-dark-300 hover:text-white hover:border-dark-600"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center">
              <div className="relative w-[220px] h-[220px] sm:w-[240px] sm:h-[240px]">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  <defs>
                    <linearGradient id="workGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#3457b8" />
                      <stop offset="100%" stopColor="#5b78d6" />
                    </linearGradient>
                  </defs>
                  <circle cx="100" cy="100" r={ring.radius} stroke="rgba(51,65,85,0.85)" strokeWidth="12" fill="none" />
                  <circle
                    cx="100"
                    cy="100"
                    r={ring.radius}
                    stroke={mode.id === "work" ? "url(#workGrad)" : "#22c55e"}
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={ring.circumference}
                    strokeDashoffset={ring.offset}
                    transform="rotate(-90 100 100)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-5xl font-bold text-white tracking-tight">{formatTimer(timeLeft)}</div>
                  <div className="mt-2 text-sm text-dark-400">{mode.id === "work" ? "Focus time" : "Break time"}</div>
                </div>
              </div>
            </div>

            <div className="mt-8 w-full flex flex-col sm:flex-row sm:items-center justify-center gap-3">
              <button type="button" onClick={toggleRunning} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
                {isRunning ? <PauseIcon /> : <PlayIcon />}
                {isRunning ? "Pause" : timeLeft < mode.seconds ? "Resume" : "Start"}
              </button>
              <button type="button" onClick={reset} className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto">
                <ResetIcon />
                Reset
              </button>
              {isRunning && (
                <button type="button" onClick={stopAndLog} className="btn-danger flex items-center justify-center gap-2 w-full sm:w-auto">
                  <StopIcon />
                  Pause & Log
                </button>
              )}
              <button type="button" onClick={skip} className="btn-ghost flex items-center justify-center gap-2 w-full sm:w-auto">
                <SkipIcon />
                Skip
              </button>
            </div>

            <div className="mt-6 w-full flex flex-col items-center gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm text-dark-400">Long break after</div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <div className="text-white font-semibold">{Math.max(1, settings.sessionsCount)} focus sessions</div>
                <div className="flex items-center justify-center gap-1">
                  {Array.from({ length: Math.max(1, settings.sessionsCount) }).map((_, i) => {
                    const filled = i < (sessionsCompleted % Math.max(1, settings.sessionsCount))
                    return (
                      <span
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full border ${
                          filled ? "bg-primary-400 border-primary-400" : "bg-dark-800 border-dark-600"
                        }`}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Session Label */}
          <div className="card bg-transparent border-0 shadow-none rounded-none p-0 hover:border-transparent hover:shadow-none sm:bg-dark-800/55 sm:border sm:border-dark-700/70 sm:rounded-2xl sm:p-6 sm:shadow-card sm:hover:border-dark-600 sm:hover:shadow-card-hover">
            <div className="py-8 border-b border-dark-800/60 sm:py-0 sm:border-0">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Session Label</h3>
                  <p className="text-dark-400 text-sm mt-1">Tag what you’re focusing on (saved with the work log).</p>
                </div>
              </div>

              <div className="mt-5 grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Category</label>
                  <select value={taskCategory} onChange={(e) => setTaskCategory(e.target.value)} className="select-field">
                    <option value="GATE">GATE</option>
                    <option value="LeetCode">LeetCode</option>
                    <option value="Project">Project</option>
                    <option value="Reading">Reading</option>
                    <option value="Others">Others (Custom)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Title</label>
                  {taskCategory === "Others" ? (
                    <input
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="input-field"
                      placeholder="e.g. System design notes"
                    />
                  ) : (
                    <div className="rounded-2xl border border-dark-700 bg-dark-800/40 px-4 py-3 text-white font-semibold">
                      {resolvedTitle()}
                    </div>
                  )}
                  {taskCategory === "Others" && (
                    <div className="text-xs text-dark-500 mt-2">Blank defaults to “General Focus”.</div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-dark-300 mb-2">Tags (comma-separated)</label>
                <input
                  value={tagsRaw}
                  onChange={(e) => setTagsRaw(e.target.value)}
                  className="input-field"
                  placeholder="e.g. graphs, dp, revision"
                />
              </div>
            </div>
          </div>

          {/* Today */}
          <div className="card bg-transparent border-0 shadow-none rounded-none p-0 hover:border-transparent hover:shadow-none sm:bg-dark-800/55 sm:border sm:border-dark-700/70 sm:rounded-2xl sm:p-6 sm:shadow-card sm:hover:border-dark-600 sm:hover:shadow-card-hover">
            <div className="py-8 border-b border-dark-800/60 sm:py-0 sm:border-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Today</h3>
                  <p className="text-dark-400 text-sm mt-1">
                    You’ve completed {todayPoms.length} sessions ({todayMinutes} min) today.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2">
                  <button
                    type="button"
                    onClick={refreshRecent}
                    className="btn-ghost w-full sm:w-auto inline-flex items-center justify-center"
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={exportCsv}
                    className="btn-ghost w-full sm:w-auto inline-flex items-center justify-center"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setDangerOpen(true)}
                    className="btn-ghost w-full sm:w-auto inline-flex items-center justify-center text-danger-300 hover:text-danger-200"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Calendar */}
          <div className="card bg-transparent border-0 shadow-none rounded-none p-0 hover:border-transparent hover:shadow-none sm:bg-dark-800/55 sm:border sm:border-dark-700/70 sm:rounded-2xl sm:p-6 sm:shadow-card sm:hover:border-dark-600 sm:hover:shadow-card-hover">
            <div className="pt-2 pb-8 border-b border-dark-800/60 sm:pt-0 sm:pb-0 sm:border-0">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center sm:text-left">
                  <h3 className="text-lg font-semibold text-white">60-Day Calendar</h3>
                  <p className="text-dark-400 text-sm mt-1">Intensity reflects total focus minutes per day.</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button type="button" className="btn-ghost" disabled={!canGoPrevMonth} onClick={goPrevMonth}>
                    <ChevronLeftIcon />
                  </button>
                  <div className="text-white font-semibold whitespace-nowrap">
                    {monthCursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
                  </div>
                  <button type="button" className="btn-ghost" disabled={!canGoNextMonth} onClick={goNextMonth}>
                    <ChevronRightIcon />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-7 gap-2 text-xs text-dark-500">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="text-center">
                    {d}
                  </div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-2">
                {monthDays.map((d, idx) => {
                  if (!d) return <div key={idx} className="h-10" />
                  const dayStr = yyyyMmDd(d)
                  const minutes = dailyFocusMap[dayStr] || 0
                  const selected = dayStr === selectedDate

                  const t = d.getTime()
                  const minT = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime()
                  const maxT = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()).getTime()
                  const inRange = t >= minT && t <= maxT

                  return (
                    <button
                      key={dayStr}
                      type="button"
                      disabled={!inRange}
                      onClick={() => setSelectedDate(dayStr)}
                      className={`h-10 rounded-xl border flex items-center justify-center transition-all ${intensityClass(minutes)} ${
                        selected ? "ring-2 ring-primary-500/40" : "hover:border-dark-600"
                      } ${!inRange ? "opacity-35 cursor-not-allowed" : ""}`}
                      title={`${dayStr} • ${minutes} min`}
                    >
                      <span className={minutes > 0 ? "text-white font-semibold" : "text-dark-400"}>{d.getDate()}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Sessions */}
          <div className="card bg-transparent border-0 shadow-none rounded-none p-0 hover:border-transparent hover:shadow-none sm:bg-dark-800/55 sm:border sm:border-dark-700/70 sm:rounded-2xl sm:p-6 sm:shadow-card sm:hover:border-dark-600 sm:hover:shadow-card-hover">
            <div className="py-8 border-b border-dark-800/60 sm:py-0 sm:border-0">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Sessions</h3>
                  <p className="text-dark-400 text-sm mt-1">{selectedDate}</p>
                </div>
                <div className="text-sm text-dark-400 tabular-nums">{displayPomodoros.length} logs</div>
              </div>

              <div className="mt-4 space-y-3 max-h-64 sm:max-h-80 lg:max-h-[520px] overflow-auto pr-1">
                {displayPomodoros.length === 0 ? (
                  <div className="text-dark-500 text-sm py-10 text-center">No logs.</div>
                ) : (
                  displayPomodoros.map((p) => {
                    const end = new Date(p.completedAt)
                    const start = new Date(end.getTime() - (Number(p.duration) || 0) * 60 * 1000)
                    const time = `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    return (
                      <div key={p.id} className="rounded-2xl border border-dark-700 bg-dark-800/40 px-4 py-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-white font-semibold break-words">{p.taskTitle || "(Untitled)"}</div>
                            <div className="text-dark-400 text-xs mt-1">
                              {time} • {p.duration} min
                            </div>
                            {Array.isArray(p.tags) && p.tags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {p.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="text-xs px-2.5 py-1 rounded-full border border-dark-600 bg-dark-900/20 text-dark-300"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

        {dangerOpen && (
          <div className="modal-overlay" onClick={() => setDangerOpen(false)}>
            <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-white">Clear Pomodoro history?</h3>
              <p className="mt-2 text-dark-300">This permanently deletes your local focus logs on this device.</p>

              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setDangerOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="btn-danger" onClick={clearHistory}>
                  Clear history
                </button>
              </div>
            </div>
          </div>
        )}

      {settingsOpen && (
        <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">Timer Settings</h3>
                <p className="mt-2 text-dark-300">Changes save instantly to this device.</p>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setSettingsOpen(false)}>
                Close
              </button>
            </div>

            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              <SettingField label="Focus (min)" value={settings.focus} onChange={(v) => updateSetting("focus", v)} />
              <SettingField label="Short break (min)" value={settings.shortBreak} onChange={(v) => updateSetting("shortBreak", v)} />
              <SettingField label="Long break (min)" value={settings.longBreak} onChange={(v) => updateSetting("longBreak", v)} />
              <SettingField label="Long break after N" value={settings.sessionsCount} onChange={(v) => updateSetting("sessionsCount", v)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-dark-300 mb-2">{label}</label>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
      />
    </div>
  )
}
