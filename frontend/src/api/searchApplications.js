import api from "./axios"

export const searchApplications = async (filters, page = 0, size = 6) => {
  const params = new URLSearchParams()

  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value === null || value === undefined) return
    if (typeof value === "string" && value.trim() === "") return
    params.set(key, value)
  })

  params.set("page", String(page))
  params.set("size", String(size))
  params.set("sortBy", "appliedDate")
  params.set("direction", "desc")

  // `fromDate`/`toDate` are supported by the backend on /filter
  return api.get(`/api/applications/filter?${params}`)
}
