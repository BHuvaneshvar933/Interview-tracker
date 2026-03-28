import api from "./axios"

export const fetchAnalytics = () => {
  return api.get("/api/applications/analytics")
}

export const fetchMonthlyTrend = () => {
  return api.get("/api/applications/analytics/monthly")
}

export const fetchProfessionalAnalytics = (params = {}) => {
  const qs = new URLSearchParams()

  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === null || v === undefined) return
    if (typeof v === "string" && v.trim() === "") return
    qs.set(k, String(v))
  })

  const suffix = qs.toString() ? `?${qs.toString()}` : ""
  return api.get(`/api/applications/analytics/pro${suffix}`)
}
