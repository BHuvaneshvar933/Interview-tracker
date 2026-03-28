import api from "./axios"

/**
 * Delete application by ID
 * @param {string} id
 */
export const deleteApplication = async (id) => {
  return api.delete(`/api/applications/${id}`)
}