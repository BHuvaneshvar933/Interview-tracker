import api from "./axios"

export function listReminders() {
  return api.get("/api/reminders")
}

export function createReminder(payload) {
  return api.post("/api/reminders", payload)
}

export function deleteReminder(id) {
  return api.delete(`/api/reminders/${id}`)
}
