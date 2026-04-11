import localforage from "localforage"

const pomodoroStore = localforage.createInstance({
  name: "capsule",
  storeName: "pomodoros",
  description: "Pomodoro work-session logs",
})

const settingsStore = localforage.createInstance({
  name: "capsule",
  storeName: "settings",
  description: "Local settings and cached integrations",
})

const habitsStore = localforage.createInstance({
  name: "capsule",
  storeName: "habits",
  description: "Habits metadata",
})

const habitLogsStore = localforage.createInstance({
  name: "capsule",
  storeName: "habitLogs",
  description: "Habits daily completion logs",
})

const curatorStore = localforage.createInstance({
  name: "capsule",
  storeName: "curator",
  description: "Saved content curator items",
})

const INDEX_KEY = "pomodoros:index"

const HABITS_INDEX_KEY = "habits:index"
const HABITS_LOG_DAYS_KEY = "habits:logDays"

const CURATOR_INDEX_KEY = "curator:index"

function byIdKey(id) {
  return `pomodoros:byId:${id}`
}

function habitByIdKey(id) {
  return `habits:byId:${id}`
}

function habitDayLogKey(dayKey) {
  return `habits:log:${dayKey}`
}

function curatorByIdKey(id) {
  return `curator:byId:${id}`
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isRecent(iso, days) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return t >= cutoff
}

export async function addPomodoro(entry) {
  const id = uuid()
  const item = {
    id,
    duration: Number(entry?.duration) || 0,
    type: entry?.type || "work",
    taskTitle: entry?.taskTitle || "",
    tags: Array.isArray(entry?.tags) ? entry.tags : [],
    completedAt: entry?.completedAt || new Date().toISOString(),
  }

  await pomodoroStore.setItem(byIdKey(id), item)

  const idx = (await pomodoroStore.getItem(INDEX_KEY)) || []
  const nextIdx = Array.isArray(idx) ? idx : []
  nextIdx.push(id)
  await pomodoroStore.setItem(INDEX_KEY, nextIdx)

  // Keep storage bounded.
  await prunePomodorosOlderThan(60)

  return item
}

export async function listPomodoros() {
  const idx = (await pomodoroStore.getItem(INDEX_KEY)) || []
  const ids = Array.isArray(idx) ? idx : []
  if (ids.length === 0) return []

  const out = []
  for (const id of ids) {
    const item = await pomodoroStore.getItem(byIdKey(id))
    if (item) out.push(item)
  }
  return out
}

export async function listPomodorosSince(sinceIso) {
  const since = new Date(sinceIso || 0).getTime()
  if (Number.isNaN(since)) return []
  const all = await listPomodoros()
  return all.filter((p) => {
    const t = new Date(p.completedAt || 0).getTime()
    return !Number.isNaN(t) && t >= since
  })
}

export async function prunePomodorosOlderThan(days) {
  const idx = (await pomodoroStore.getItem(INDEX_KEY)) || []
  const ids = Array.isArray(idx) ? idx : []
  if (ids.length === 0) return

  const keep = []
  for (const id of ids) {
    const item = await pomodoroStore.getItem(byIdKey(id))
    if (!item) continue
    if (isRecent(item.completedAt, days)) {
      keep.push(id)
    } else {
      await pomodoroStore.removeItem(byIdKey(id))
    }
  }
  await pomodoroStore.setItem(INDEX_KEY, keep)
}

export async function clearPomodoros() {
  const idx = (await pomodoroStore.getItem(INDEX_KEY)) || []
  const ids = Array.isArray(idx) ? idx : []

  for (const id of ids) {
    await pomodoroStore.removeItem(byIdKey(id))
  }

  await pomodoroStore.setItem(INDEX_KEY, [])
}

export function getPomodoroSettings() {
  const raw = typeof window !== "undefined" ? window.localStorage.getItem("pomodoroSettings") : null
  const parsed = raw ? safeJsonParse(raw, {}) : {}
  return {
    focus: Number(parsed.focus) || 25,
    shortBreak: Number(parsed.shortBreak) || 5,
    longBreak: Number(parsed.longBreak) || 15,
    sessionsCount: Number(parsed.sessionsCount) || 4,
  }
}

export function setPomodoroSettings(next) {
  if (typeof window === "undefined") return
  window.localStorage.setItem("pomodoroSettings", JSON.stringify(next || {}))
}

export async function getSetting(key) {
  return settingsStore.getItem(key)
}

export async function setSetting(key, value) {
  return settingsStore.setItem(key, value)
}

export async function removeSetting(key) {
  return settingsStore.removeItem(key)
}

function sortByOrderThenCreated(a, b) {
  const ao = Number(a?.order)
  const bo = Number(b?.order)
  if (!Number.isNaN(ao) && !Number.isNaN(bo) && ao !== bo) return ao - bo
  return String(a?.createdAt || "").localeCompare(String(b?.createdAt || ""))
}

export async function ensureDefaultHabits() {
  const idx = (await habitsStore.getItem(HABITS_INDEX_KEY)) || []
  const ids = Array.isArray(idx) ? idx : []
  if (ids.length > 0) return

  const defaults = [
    { name: "1 LeetCode Problem", icon: "\ud83d\udcbb" },
    { name: "Revise 1 GATE Subject", icon: "\ud83c\udf93" },
    { name: "Apply to 2 Jobs", icon: "\ud83d\udcbc" },
    { name: "Read Tech Article", icon: "\ud83d\udcf0" },
    { name: "Drink 8 Glasses Water", icon: "\ud83d\udca7" },
    { name: "30 min Exercise", icon: "\ud83d\udcaa" },
  ]

  const nextIds = []
  for (let i = 0; i < defaults.length; i++) {
    const id = uuid()
    const now = new Date().toISOString()
    const item = {
      id,
      name: defaults[i].name,
      icon: defaults[i].icon,
      order: i,
      createdAt: now,
      updatedAt: now,
    }
    await habitsStore.setItem(habitByIdKey(id), item)
    nextIds.push(id)
  }

  await habitsStore.setItem(HABITS_INDEX_KEY, nextIds)
}

export async function listHabits() {
  const idx = (await habitsStore.getItem(HABITS_INDEX_KEY)) || []
  const ids = Array.isArray(idx) ? idx : []
  if (ids.length === 0) return []

  const out = []
  for (const id of ids) {
    const item = await habitsStore.getItem(habitByIdKey(id))
    if (item) out.push(item)
  }
  return out.sort(sortByOrderThenCreated)
}

export async function createHabit({ name, icon }) {
  const id = uuid()
  const now = new Date().toISOString()
  const n = String(name || "").trim()
  if (!n) throw new Error("Habit name is required")

  const idx = (await habitsStore.getItem(HABITS_INDEX_KEY)) || []
  const ids = Array.isArray(idx) ? idx : []

  const item = {
    id,
    name: n,
    icon: String(icon || "").trim(),
    order: ids.length,
    createdAt: now,
    updatedAt: now,
  }

  await habitsStore.setItem(habitByIdKey(id), item)
  await habitsStore.setItem(HABITS_INDEX_KEY, [...ids, id])
  return item
}

export async function updateHabit(id, patch) {
  const item = await habitsStore.getItem(habitByIdKey(id))
  if (!item) throw new Error("Habit not found")

  const next = {
    ...item,
    name: patch?.name != null ? String(patch.name).trim() : item.name,
    icon: patch?.icon != null ? String(patch.icon).trim() : item.icon,
    updatedAt: new Date().toISOString(),
  }

  if (!next.name) throw new Error("Habit name is required")
  await habitsStore.setItem(habitByIdKey(id), next)
  return next
}

async function ensureDayInLogIndex(dayKey) {
  const raw = (await habitLogsStore.getItem(HABITS_LOG_DAYS_KEY)) || []
  const days = Array.isArray(raw) ? raw : []
  if (days.includes(dayKey)) return days
  const next = [...days, dayKey]
  await habitLogsStore.setItem(HABITS_LOG_DAYS_KEY, next)
  return next
}

async function removeDayFromLogIndex(dayKey) {
  const raw = (await habitLogsStore.getItem(HABITS_LOG_DAYS_KEY)) || []
  const days = Array.isArray(raw) ? raw : []
  if (!days.includes(dayKey)) return days
  const next = days.filter((d) => d !== dayKey)
  await habitLogsStore.setItem(HABITS_LOG_DAYS_KEY, next)
  return next
}

export async function getHabitDayLog(dayKey) {
  const key = habitDayLogKey(dayKey)
  const log = await habitLogsStore.getItem(key)
  return log && typeof log === "object" ? log : {}
}

export async function setHabitDoneForDay(dayKey, habitId, done) {
  const key = habitDayLogKey(dayKey)
  const prev = (await habitLogsStore.getItem(key)) || {}
  const log = prev && typeof prev === "object" ? { ...prev } : {}

  if (done) log[habitId] = true
  else delete log[habitId]

  const hasAny = Object.keys(log).length > 0
  if (!hasAny) {
    await habitLogsStore.removeItem(key)
    await removeDayFromLogIndex(dayKey)
    return {}
  }

  await habitLogsStore.setItem(key, log)
  await ensureDayInLogIndex(dayKey)
  return log
}

export async function toggleHabitDoneForDay(dayKey, habitId) {
  const log = await getHabitDayLog(dayKey)
  const nextDone = !log[habitId]
  return setHabitDoneForDay(dayKey, habitId, nextDone)
}

export async function listHabitLogsForDays(dayKeys) {
  const out = {}
  const keys = Array.isArray(dayKeys) ? dayKeys : []
  for (const dayKey of keys) {
    // eslint-disable-next-line no-await-in-loop
    out[dayKey] = await getHabitDayLog(dayKey)
  }
  return out
}

export async function deleteHabit(id) {
  await habitsStore.removeItem(habitByIdKey(id))
  const idx = (await habitsStore.getItem(HABITS_INDEX_KEY)) || []
  const ids = Array.isArray(idx) ? idx : []
  const nextIds = ids.filter((x) => x !== id)
  await habitsStore.setItem(HABITS_INDEX_KEY, nextIds)

  const rawDays = (await habitLogsStore.getItem(HABITS_LOG_DAYS_KEY)) || []
  const days = Array.isArray(rawDays) ? rawDays : []
  const keptDays = []

  for (const dayKey of days) {
    // eslint-disable-next-line no-await-in-loop
    const key = habitDayLogKey(dayKey)
    // eslint-disable-next-line no-await-in-loop
    const prev = (await habitLogsStore.getItem(key)) || {}
    const log = prev && typeof prev === "object" ? { ...prev } : {}
    if (log[id] == null) {
      keptDays.push(dayKey)
      continue
    }
    delete log[id]
    if (Object.keys(log).length === 0) {
      // eslint-disable-next-line no-await-in-loop
      await habitLogsStore.removeItem(key)
      continue
    }
    // eslint-disable-next-line no-await-in-loop
    await habitLogsStore.setItem(key, log)
    keptDays.push(dayKey)
  }

  await habitLogsStore.setItem(HABITS_LOG_DAYS_KEY, keptDays)
}

export async function clearHabits() {
  await Promise.all([
    habitsStore.clear(),
    habitLogsStore.clear(),
  ])
}

export async function resetHabitsToDefaults() {
  await clearHabits()
  await ensureDefaultHabits()
  return listHabits()
}

export async function listCuratorItems() {
  const idx = (await curatorStore.getItem(CURATOR_INDEX_KEY)) || []
  const ids = Array.isArray(idx) ? idx : []
  if (ids.length === 0) return []

  const out = []
  for (const id of ids) {
    // eslint-disable-next-line no-await-in-loop
    const item = await curatorStore.getItem(curatorByIdKey(id))
    if (item) out.push(item)
  }

  out.sort((a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")))
  return out
}

export async function createCuratorItem(entry) {
  const now = new Date().toISOString()
  const id = uuid()
  const title = String(entry?.title || "").trim()
  if (!title) throw new Error("Title is required")

  const item = {
    id,
    url: entry?.url ? String(entry.url).trim() : "",
    type: String(entry?.type || "NOTE"),
    title,
    description: entry?.description ? String(entry.description).trim() : "",
    tags: Array.isArray(entry?.tags) ? entry.tags : [],
    favorite: Boolean(entry?.favorite),
    createdAt: now,
    updatedAt: now,
  }

  await curatorStore.setItem(curatorByIdKey(id), item)
  const rawIdx = (await curatorStore.getItem(CURATOR_INDEX_KEY)) || []
  const ids = Array.isArray(rawIdx) ? rawIdx : []
  await curatorStore.setItem(CURATOR_INDEX_KEY, [...ids, id])
  return item
}

export async function updateCuratorItem(id, patch) {
  const prev = await curatorStore.getItem(curatorByIdKey(id))
  if (!prev) throw new Error("Item not found")

  const next = {
    ...prev,
    url: patch?.url != null ? String(patch.url).trim() : prev.url,
    type: patch?.type != null ? String(patch.type) : prev.type,
    title: patch?.title != null ? String(patch.title).trim() : prev.title,
    description: patch?.description != null ? String(patch.description).trim() : prev.description,
    tags: patch?.tags != null ? (Array.isArray(patch.tags) ? patch.tags : []) : prev.tags,
    favorite: patch?.favorite != null ? Boolean(patch.favorite) : Boolean(prev.favorite),
    updatedAt: new Date().toISOString(),
  }

  if (!next.title) throw new Error("Title is required")
  await curatorStore.setItem(curatorByIdKey(id), next)
  return next
}

export async function deleteCuratorItem(id) {
  await curatorStore.removeItem(curatorByIdKey(id))
  const rawIdx = (await curatorStore.getItem(CURATOR_INDEX_KEY)) || []
  const ids = Array.isArray(rawIdx) ? rawIdx : []
  await curatorStore.setItem(CURATOR_INDEX_KEY, ids.filter((x) => x !== id))
}

export async function toggleCuratorFavorite(id) {
  const prev = await curatorStore.getItem(curatorByIdKey(id))
  if (!prev) throw new Error("Item not found")
  const next = {
    ...prev,
    favorite: !prev.favorite,
    updatedAt: new Date().toISOString(),
  }
  await curatorStore.setItem(curatorByIdKey(id), next)
  return next
}
