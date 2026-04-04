import api from "./axios"

export function getMe() {
  return api.get("/api/account/me")
}
