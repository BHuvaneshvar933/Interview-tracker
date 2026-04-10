import axios from "axios"

function resolveApiBaseUrl() {
  const configured = (import.meta.env.VITE_API_BASE_URL || "").trim()
  if (configured) return configured

  // In production builds, default to same-origin so the PWA talks to
  // whatever host served it (works for reverse-proxy / single-domain deploys).
  // For local dev/preview on your machine, fall back to the backend dev port.
  if (typeof window !== "undefined") {
    const host = window.location.hostname
    if (host === "localhost" || host === "127.0.0.1") return "http://localhost:5001"
    return window.location.origin
  }

  return "http://localhost:5001"
}

const baseURL = resolveApiBaseUrl()

// A bare client (no auth interceptors) used for wake/health checks.
const wakeClient = axios.create({
  baseURL,
  timeout: 30000,
})

let wakePromise = null
let lastWakeOkAt = 0
const WAKE_OK_TTL_MS = 5 * 60 * 1000

let lastWakeFailAt = 0
let lastWakeFailInfo = null
// Prevent repeated wake attempts when the device has no connectivity but
// navigator.onLine still reports true (common on flaky Wi-Fi / captive portals).
const WAKE_FAIL_TTL_MS = 60 * 1000

function dispatchWakeEvent(detail) {
  if (typeof window === "undefined") return
  try {
    window.dispatchEvent(new CustomEvent("capsule:backendWake", { detail }))
  } catch {
    // no-op
  }
}

function errorInfo(e) {
  const status = e?.response?.status
  const msg = e?.response?.data?.message || e?.message
  const code = e?.code
  return {
    status: status ? Number(status) : 0,
    code: code ? String(code) : "",
    message: msg ? String(msg) : "",
  }
}

function isNetworkOfflineLike(e) {
  // Axios/fetch-style offline error: no HTTP status + generic network failure.
  if (e?.response?.status) return false
  const code = String(e?.code || "")
  const msg = String(e?.message || "").toLowerCase()
  if (code === "ERR_NETWORK") return true
  if (msg.includes("network error")) return true
  if (msg.includes("failed to fetch")) return true
  if (msg.includes("load failed")) return true
  if (msg.includes("the network connection was lost")) return true
  return false
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function warmUpBackend({ force = false, reason = "" } = {}) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, offline: true }
  }

  if (!force && Date.now() - lastWakeOkAt < WAKE_OK_TTL_MS) {
    return { ok: true, cached: true }
  }

  if (!force && lastWakeFailAt && Date.now() - lastWakeFailAt < WAKE_FAIL_TTL_MS) {
    return { ok: false, cached: true, ...(lastWakeFailInfo || {}) }
  }

  if (wakePromise) return wakePromise

  wakePromise = (async () => {
    const startedAt = Date.now()
    dispatchWakeEvent({ status: "starting", reason, attempt: 0, startedAt })

    const delays = [0, 1500, 2500, 4000, 6500, 9000, 12000, 15000]
    let lastErr = null

    for (let i = 0; i < delays.length; i += 1) {
      if (delays[i] > 0) await sleep(delays[i])
      dispatchWakeEvent({ status: "starting", reason, attempt: i + 1, startedAt })

      try {
        const res = await wakeClient.get("/test", {
          params: { t: Date.now() },
          // Treat non-2xx as a response (server is reachable).
          validateStatus: () => true,
        })

        // If we get any 2xx-4xx, the server is awake.
        // Keep retrying for 5xx since it can mean "booting".
        if (res?.status >= 200 && res?.status < 500) {
          lastWakeOkAt = Date.now()
          dispatchWakeEvent({ status: "ready", reason, attempt: i + 1, startedAt, finishedAt: lastWakeOkAt, httpStatus: res.status })
          return { ok: true }
        }

        lastErr = { response: { status: res?.status, data: res?.data } }
      } catch (e) {
        lastErr = e
      }

      // If it's a pure network failure (no response), warming the backend won't help.
      // Stop retrying so offline cached content can load without repeated wake spam.
      if (isNetworkOfflineLike(lastErr)) {
        const info = errorInfo(lastErr)
        lastWakeFailAt = Date.now()
        lastWakeFailInfo = { offline: true, error: info.message, httpStatus: info.status }
        dispatchWakeEvent({
          status: "failed",
          reason,
          attempt: i + 1,
          startedAt,
          offline: true,
          error: info.message,
          httpStatus: info.status,
        })
        return { ok: false, offline: true, error: lastErr }
      }

      // stop retrying if browser reports offline mid-wake
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        const info = errorInfo(lastErr)
        dispatchWakeEvent({
          status: "failed",
          reason,
          attempt: i + 1,
          startedAt,
          offline: true,
          error: info.message,
          httpStatus: info.status,
        })
        return { ok: false, offline: true, error: lastErr }
      }
    }

    const info = errorInfo(lastErr)
    lastWakeFailAt = Date.now()
    lastWakeFailInfo = { offline: false, error: info.message, httpStatus: info.status }
    dispatchWakeEvent({ status: "failed", reason, attempt: delays.length, startedAt, error: info.message, httpStatus: info.status })
    return { ok: false, error: lastErr }
  })()

  try {
    return await wakePromise
  } finally {
    wakePromise = null
  }
}

function shouldAttemptWake(error) {
  const status = error?.response?.status
  if (status === 502 || status === 503 || status === 504) return true

  // timeouts / network-ish failures (no response)
  if (!status) {
    if (error?.code === "ECONNABORTED") return true
    const msg = String(error?.message || "").toLowerCase()
    if (msg.includes("timeout")) return true
  }

  return false
}

const api = axios.create({
  baseURL,
  // Important for offline UX: without a timeout, requests can hang indefinitely
  // when the device reports "online" but has no actual connectivity.
  timeout: 8000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const cfg = error?.config
    if (!cfg) return Promise.reject(error)

    // Avoid infinite loops.
    if (cfg.__capsuleWakeRetried) return Promise.reject(error)

    // Don't wake/retry on auth/client errors.
    const status = error?.response?.status
    if (status && status < 500 && status !== 408) return Promise.reject(error)

    if (!shouldAttemptWake(error)) return Promise.reject(error)

    cfg.__capsuleWakeRetried = true
    const wake = await warmUpBackend({ reason: "request" })
    if (!wake?.ok) return Promise.reject(error)

    return api.request(cfg)
  }
)

export default api
