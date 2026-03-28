import api from "./axios"

export const fetchApplicationsByStatus = async (status, page = 0, size = 6) => {
  return api.get( `/api/applications/status?status=${status}&page=${page}&size=${size}`)
}