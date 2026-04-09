import { useEffect, useMemo, useRef, useState } from "react"
import {
  createHabit,
  deleteHabit,
  resetHabitsToDefaults,
  ensureDefaultHabits,
  listHabitLogsForDays,
  listHabits,
  setHabitDoneForDay,
  toggleHabitDoneForDay,
  updateHabit,
} from "../db"
import Toast from "../components/Toast"
import ConfirmDialog from "../components/ConfirmDialog"
import Button from "../mobile/ui/Button"
import { useTopBarActions } from "../mobile/chrome"

function yyyyMmDdLocal(d) {
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDays(dayKey, deltaDays) {
  const d = new Date(`${dayKey}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dayKey
  d.setDate(d.getDate() + deltaDays)
  return yyyyMmDdLocal(d)
}

function lastNDays(n, fromDayKey) {
  const out = []
  for (let i = n - 1; i >= 0; i--) out.push(addDays(fromDayKey, -i))
  return out
}

function formatDayLabel(dayKey) {
  try {
    const d = new Date(`${dayKey}T00:00:00`)
    return d.toLocaleDateString(undefined, { weekday: "short" })
  } catch {
    return ""
  }
}

function intensityTone(pct) {
  if (pct >= 100) return "success"
  if (pct >= 66) return "strong"
  if (pct > 0) return "light"
  return "none"
}

function intensityClass(pct) {
  const tone = intensityTone(pct)
  if (tone === "success") return "bg-success-500/20 border-success-500/30"
  if (tone === "strong") return "bg-emerald-500/20 border-emerald-500/30"
  if (tone === "light") return "bg-teal-500/12 border-teal-500/25"
  return "bg-dark-800/30 border-dark-700"
}

function plural(n, one, many) {
  return n === 1 ? one : many
}

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
)

export default function Habits() {
  const todayKey = useMemo(() => yyyyMmDdLocal(new Date()), [])
  const [selectedDay, setSelectedDay] = useState(todayKey)
  const dayKeys = useMemo(() => lastNDays(30, todayKey), [todayKey])

  const [habits, setHabits] = useState([])
  const [logsByDay, setLogsByDay] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [toast, setToast] = useState({ open: false, message: "", tone: "error" })
  const [confirmDelete, setConfirmDelete] = useState({ open: false, habit: null })
  const [confirmReset, setConfirmReset] = useState(false)

  const [newName, setNewName] = useState("")
  const [newIcon, setNewIcon] = useState("")
  const newNameRef = useRef(null)

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState("")
  const [editIcon, setEditIcon] = useState("")

  const [streaks, setStreaks] = useState({})

  useTopBarActions(
    <Button
      variant="secondary"
      size="sm"
      className="px-4 rounded-2xl"
      onClick={() => {
        setSelectedDay(todayKey)
        setTimeout(() => newNameRef.current?.focus?.(), 50)
      }}
      aria-label="New habit"
    >
      New
    </Button>,
    [todayKey]
  )

  const selectedLog = useMemo(() => logsByDay[selectedDay] || {}, [logsByDay, selectedDay])

  const doneCount = useMemo(() => {
    if (!habits.length) return 0
    let n = 0
    for (const h of habits) if (selectedLog[h.id]) n++
    return n
  }, [habits, selectedLog])

  const totalCount = habits.length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const meterBarClass = pct >= 100 ? "bg-emerald-500" : "bg-teal-500"
  const meterTextClass = pct >= 100 ? "text-emerald-200" : "text-textPrimary"

  const daySummaries = useMemo(() => {
    const total = totalCount
    return dayKeys.map((dayKey) => {
      const log = logsByDay[dayKey] || {}
      if (total <= 0) return { dayKey, done: 0, total: 0, pct: 0 }
      let done = 0
      for (const h of habits) if (log[h.id]) done++
      const p = Math.round((done / total) * 100)
      return { dayKey, done, total, pct: p }
    })
  }, [dayKeys, habits, logsByDay, totalCount])

  const selectedSummary = useMemo(
    () => daySummaries.find((d) => d.dayKey === selectedDay) || { dayKey: selectedDay, done: doneCount, total: totalCount, pct },
    [daySummaries, selectedDay, doneCount, totalCount, pct]
  )

  const isViewingPast = selectedDay !== todayKey

  const loadAll = async () => {
    try {
      setLoading(true)
      setError("")

      await ensureDefaultHabits()
      const [h, logs] = await Promise.all([listHabits(), listHabitLogsForDays(dayKeys)])
      setHabits(h)
      setLogsByDay(logs)
    } catch (e) {
      setError(e?.message || "Couldn't load habits")
    } finally {
      setLoading(false)
    }
  }

  const doReset = async () => {
    try {
      const nextHabits = await resetHabitsToDefaults()
      const logs = await listHabitLogsForDays(dayKeys)
      setHabits(nextHabits)
      setLogsByDay(logs)
      setSelectedDay(todayKey)
      setEditingId(null)
      setToast({ open: true, message: "Reset to starter checklist.", tone: "success" })
    } catch (e) {
      setToast({ open: true, message: e?.message || "Couldn't reset habits", tone: "error" })
    } finally {
      setConfirmReset(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const computeStreak = async (habitId) => {
      let n = 0
      for (let i = 0; i < 365; i++) {
        const dayKey = addDays(todayKey, -i)
        const log = logsByDay[dayKey] || (await listHabitLogsForDays([dayKey]))[dayKey]
        if (!log?.[habitId]) break
        n++
      }
      return n
    }

    const run = async () => {
      const out = {}
      for (const h of habits) {
        // eslint-disable-next-line no-await-in-loop
        out[h.id] = await computeStreak(h.id)
      }
      setStreaks(out)
    }

    if (habits.length) run()
    else setStreaks({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, logsByDay, todayKey])

  const onToggle = async (habitId) => {
    try {
      const nextLog = await toggleHabitDoneForDay(selectedDay, habitId)
      setLogsByDay((m) => ({ ...m, [selectedDay]: nextLog }))
    } catch (e) {
      setToast({ open: true, message: e?.message || "Couldn't update habit", tone: "error" })
    }
  }

  const onCreate = async () => {
    try {
      const item = await createHabit({ name: newName, icon: newIcon })
      setHabits((h) => [...h, item])
      setNewName("")
      setNewIcon("")
      setToast({ open: true, message: "Habit created.", tone: "success" })
      setTimeout(() => newNameRef.current?.focus?.(), 50)
    } catch (e) {
      setToast({ open: true, message: e?.message || "Couldn't create habit", tone: "error" })
    }
  }

  const beginEdit = (habit) => {
    setEditingId(habit.id)
    setEditName(habit.name || "")
    setEditIcon(habit.icon || "")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName("")
    setEditIcon("")
  }

  const saveEdit = async () => {
    try {
      const next = await updateHabit(editingId, { name: editName, icon: editIcon })
      setHabits((hs) => hs.map((h) => (h.id === next.id ? next : h)))
      cancelEdit()
      setToast({ open: true, message: "Habit updated.", tone: "success" })
    } catch (e) {
      setToast({ open: true, message: e?.message || "Couldn't update habit", tone: "error" })
    }
  }

  const requestDelete = (habit) => {
    setConfirmDelete({ open: true, habit })
  }

  const confirmDeleteHabit = async () => {
    const habit = confirmDelete.habit
    if (!habit) return
    try {
      await deleteHabit(habit.id)
      setHabits((hs) => hs.filter((h) => h.id !== habit.id))
      setLogsByDay((m) => {
        const next = { ...m }
        for (const k of Object.keys(next)) {
          const log = next[k]
          if (!log || typeof log !== "object") continue
          if (!log[habit.id]) continue
          const copy = { ...log }
          delete copy[habit.id]
          next[k] = copy
        }
        return next
      })
      if (editingId === habit.id) cancelEdit()
      setToast({ open: true, message: "Habit deleted.", tone: "success" })
    } catch (e) {
      setToast({ open: true, message: e?.message || "Couldn't delete habit", tone: "error" })
    } finally {
      setConfirmDelete({ open: false, habit: null })
    }
  }

  const setAllForDay = async (done) => {
    if (!habits.length) return
    try {
      let nextLog = { ...(logsByDay[selectedDay] || {}) }
      for (const h of habits) {
        // eslint-disable-next-line no-await-in-loop
        nextLog = await setHabitDoneForDay(selectedDay, h.id, done)
      }
      setLogsByDay((m) => ({ ...m, [selectedDay]: nextLog }))
    } catch (e) {
      setToast({ open: true, message: e?.message || "Couldn't update habits", tone: "error" })
    }
  }

  return (
    <div className="space-y-6 w-full min-w-0 overflow-x-hidden">
      <Toast open={toast.open} message={toast.message} tone={toast.tone} onClose={() => setToast((t) => ({ ...t, open: false }))} />

      <ConfirmDialog
        open={confirmDelete.open}
        title="Delete habit?"
        message="This removes the habit and all its historical logs on this device."
        confirmText="Delete"
        cancelText="Cancel"
        tone="danger"
        onCancel={() => setConfirmDelete({ open: false, habit: null })}
        onConfirm={confirmDeleteHabit}
      />

      <ConfirmDialog
        open={confirmReset}
        title="Reset checklist?"
        message="This will replace your current habits with the starter checklist and clear all habit history on this device."
        confirmText="Reset"
        cancelText="Cancel"
        tone="danger"
        onCancel={() => setConfirmReset(false)}
        onConfirm={doReset}
      />

      <div className="card overflow-x-hidden">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white">Habits</h1>
            <p className="text-sm text-dark-400 mt-1">Track daily habits locally, across any day.</p>
          </div>

          <div className="flex items-center gap-2">
            {habits.length > 0 ? (
              <button type="button" className="btn-ghost text-sm" onClick={() => setConfirmReset(true)}>
                Reset
              </button>
            ) : null}
            {isViewingPast ? (
              <button type="button" className="btn-secondary" onClick={() => setSelectedDay(todayKey)}>
                Today
              </button>
            ) : (
              <div className="text-xs px-2.5 py-1 rounded-full border border-dark-700 bg-dark-900/20 text-dark-300">
                Today
              </div>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-dark-500">Last 30 days</div>
            <div className="text-xs text-dark-500 tabular-nums">{selectedSummary.done}/{selectedSummary.total} done</div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {daySummaries.map((d) => {
              const selected = d.dayKey === selectedDay
              const isToday = d.dayKey === todayKey
              return (
                <button
                  key={d.dayKey}
                  type="button"
                  onClick={() => setSelectedDay(d.dayKey)}
                  className={[
                    "flex flex-col items-center gap-1 min-w-[44px]",
                    selected ? "" : "opacity-90 hover:opacity-100",
                  ].join(" ")}
                  aria-label={`Select ${d.dayKey}`}
                >
                  <div
                    className={[
                      "w-10 h-10 rounded-full border flex items-center justify-center text-sm font-semibold",
                      intensityClass(d.pct),
                      selected ? "ring-2 ring-emerald-500/55" : "",
                      isToday ? "shadow-inner-light" : "",
                    ].join(" ")}
                    title={`${d.dayKey}: ${d.done}/${d.total} (${d.pct}%)`}
                  >
                    {String(d.dayKey).slice(-2)}
                  </div>
                  <div className={"text-[11px] " + (selected ? "text-white" : "text-dark-500")}>{formatDayLabel(d.dayKey)}</div>
                  {isToday ? <div className="w-1 h-1 rounded-full bg-emerald-400" /> : <div className="w-1 h-1" />}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-dark-700">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-dark-400">Daily completion</div>
              <div className={`mt-1 text-3xl font-bold tabular-nums ${meterTextClass}`}>{pct}%</div>
              <div className="mt-1 text-sm text-dark-400 tabular-nums">{doneCount}/{totalCount} done for {selectedDay}</div>
            </div>

            {totalCount > 0 ? (
              <div className="flex gap-2">
                <button type="button" className="btn-secondary" onClick={() => setAllForDay(true)}>
                  Mark all
                </button>
                <button type="button" className="btn-ghost" onClick={() => setAllForDay(false)}>
                  Clear
                </button>
              </div>
            ) : null}
          </div>

            <div className="mt-4 h-3 rounded-full bg-dark-900/40 border border-dark-700 overflow-hidden">
              <div className={`h-full ${meterBarClass}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
            </div>
        </div>
      </div>

      <div className="card overflow-x-hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Checklist</h2>
            <p className="text-sm text-dark-400 mt-1">Tap to toggle completion for the selected day.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <div className="rounded-2xl border border-dark-700 bg-dark-900/20 p-4 overflow-x-hidden">
            <div className="text-sm font-semibold text-white">Add a habit</div>
            <div className="mt-3 flex flex-col sm:flex-row gap-3 w-full min-w-0">
              <input
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                className="input-field w-full min-w-0 sm:w-24"
                placeholder="Icon (e.g. \ud83d\udca7)"
                aria-label="Habit icon"
              />
              <input
                ref={newNameRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input-field w-full min-w-0"
                placeholder="Habit name"
                aria-label="Habit name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCreate()
                }}
              />
              <Button
                variant="primary"
                size="md"
                className="rounded-2xl w-full sm:w-auto shrink-0"
                onClick={onCreate}
                aria-label="Create habit"
              >
                Create
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-dark-400">Loading…</div>
          ) : error ? (
            <div className="px-4 py-3 rounded-2xl border border-danger-500/30 bg-danger-500/10 text-danger-300 text-sm">
              {error}
            </div>
          ) : habits.length === 0 ? (
            <div className="text-sm text-dark-400">No habits yet.</div>
          ) : (
            habits.map((h) => {
              const done = !!selectedLog[h.id]
              const editing = editingId === h.id
              const streak = Number(streaks[h.id]) || 0
             return (
                 <div key={h.id} className="rounded-2xl border border-dark-700 bg-dark-800/35 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 w-full min-w-0 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => onToggle(h.id)}
                      className="relative z-0 flex-1 min-w-0 flex items-start gap-3 text-left group"
                      aria-label={done ? `Mark ${h.name} not done` : `Mark ${h.name} done`}
                    >
                      <div
                        className={[
                          "mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center",
                          done
                            ? "bg-success-500/20 border-success-500/40 text-success-200"
                            : "bg-dark-900/20 border-dark-700 text-dark-400",
                        ].join(" ")}
                      >
                        {done ? <CheckIcon /> : null}
                      </div>

                      <div className="min-w-0 w-full">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-8 h-8 rounded-xl border border-dark-700 bg-dark-900/20 flex items-center justify-center text-base">
                            {h.icon || "\u2022"}
                          </span>
                          {editing ? (
                            <div className="w-full min-w-0">
                              <div className="grid grid-cols-1 sm:grid-cols-[96px_minmax(0,1fr)] gap-2 w-full min-w-0">
                                <input
                                  value={editIcon}
                                  onChange={(e) => setEditIcon(e.target.value)}
                                  className="input-field w-full min-w-0"
                                  placeholder="Icon"
                                  aria-label="Edit icon"
                                />
                                <input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="input-field w-full min-w-0"
                                  placeholder="Habit name"
                                  aria-label="Edit name"
                                />
                              </div>

                              <div className="mt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <button type="button" className="btn-secondary w-full sm:w-auto" onClick={saveEdit}>
                                  Save
                                </button>
                                <button type="button" className="btn-ghost w-full sm:w-auto" onClick={cancelEdit}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="min-w-0">
                              <div className={"text-white font-semibold truncate " + (done ? "line-through opacity-80" : "")}>
                                {h.name}
                              </div>
                              {streak > 0 ? (
                                <div className="mt-1 inline-flex items-center gap-2">
                                    <span className="text-[11px] px-2 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-200">
                                      {streak} {plural(streak, "day", "days")} streak
                                    </span>
                                </div>
                              ) : (
                                <div className="mt-1 text-xs text-dark-500">No streak yet</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>

                    {!editing ? (
                      <div className="relative z-10 flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button type="button" className="btn-ghost" onClick={() => beginEdit(h)} aria-label="Edit habit">
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost text-danger-300 hover:text-danger-200"
                          onClick={() => requestDelete(h)}
                          aria-label="Delete habit"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Last 30 days</h2>
            <p className="text-sm text-dark-400 mt-1">Overall completion intensity for each day.</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 sm:grid-cols-10 gap-2">
          {daySummaries.map((d) => {
            const selected = d.dayKey === selectedDay
            const isToday = d.dayKey === todayKey
            return (
              <button
                key={d.dayKey}
                type="button"
                onClick={() => setSelectedDay(d.dayKey)}
                className={[
                  "h-9 rounded-xl border flex items-center justify-center text-xs tabular-nums",
                  intensityClass(d.pct),
                  selected ? "ring-2 ring-emerald-500/55" : "",
                  isToday ? "outline outline-1 outline-emerald-500/30" : "",
                ].join(" ")}
                title={`${d.dayKey}: ${d.done}/${d.total} (${d.pct}%)`}
                aria-label={`${d.dayKey}: ${d.done}/${d.total} (${d.pct}%)`}
              >
                {String(d.dayKey).slice(-2)}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
