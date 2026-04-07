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

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
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

export default api
