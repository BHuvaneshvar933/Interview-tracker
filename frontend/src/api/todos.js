import api from "./axios"

export function listTodos(params) {
  return api.get("/api/todos", { params })
}

export function createTodo(payload) {
  return api.post("/api/todos", payload)
}

export function updateTodo(id, payload) {
  return api.put(`/api/todos/${id}`, payload)
}

export function deleteTodo(id) {
  return api.delete(`/api/todos/${id}`)
}
