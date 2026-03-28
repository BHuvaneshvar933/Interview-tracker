import api from "./axios"

export const addInterview = (id, interviewData) => {
  return api.post(`/api/applications/${id}/interviews`, interviewData)
}
