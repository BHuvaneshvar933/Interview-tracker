import api from "./axios"

export const getApplicationById = async (id) => {
  return api.get(`/api/applications/${id}`)
}