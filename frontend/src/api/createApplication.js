import api from "./axios"

export const createApplication = (data) => {
  return api.post("/api/applications", data)
}
