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

const INDEX_KEY = "pomodoros:index"

function byIdKey(id) {
  return `pomodoros:byId:${id}`
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
