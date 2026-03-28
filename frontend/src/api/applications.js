import api from "./axios"

export const fetchApplications = async (page = 0, size = 6) => {
  return api.get(
    `/api/applications?page=${page}&size=${size}&sortBy=appliedDate&direction=desc`
  )
}