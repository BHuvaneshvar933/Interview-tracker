import api from "./axios"

export const updateApplication = (id, data) => {
  return api.put(`/api/applications/${id}`, data)
}
