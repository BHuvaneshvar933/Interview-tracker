import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { createTodo, deleteTodo, listTodos, updateTodo } from "../api/todos"
import { useOnlineStatus } from "../hooks/useOnlineStatus"
import Toast from "../components/Toast"
import ConfirmDialog from "../components/ConfirmDialog"
import RemindersPanel from "../components/RemindersPanel"

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const BellIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    />
  </svg>
)

function formatDue(due) {
  if (!due) return "No due date"
  try {
    const d = new Date(`${due}T00:00:00`)
    return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "2-digit" }).format(d)
  } catch {
    return due
  }
}

function isOverdue(due) {
  if (!due) return false
  try {
    const today = new Date()
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const d = new Date(`${due}T00:00:00`).getTime()
    return d < t
  } catch {
    return false
  }
}

function priorityTone(priority) {
  const p = (priority || "").toUpperCase()
  if (p === "HIGH") return "border-danger-500/30 bg-danger-500/10 text-danger-300"
  if (p === "LOW") return "border-dark-700 bg-dark-800/40 text-dark-300"
  return "border-warning-500/30 bg-warning-500/10 text-warning-300"
}

export default function Todos() {
  const online = useOnlineStatus()
  const [searchParams, setSearchParams] = useSearchParams()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [toast, setToast] = useState({ open: false, message: "", tone: "error" })
  const [confirm, setConfirm] = useState({ open: false, id: null })

  const [openRemindersForId, setOpenRemindersForId] = useState(null)

  useEffect(() => {
    const fromUrl = searchParams.get("todoId")
    if (fromUrl) {
      setOpenRemindersForId(fromUrl)
      // Scroll/highlight target todo if it's in the current list.
      window.setTimeout(() => {
        const el = document.getElementById(`todo-${fromUrl}`)
        if (el?.scrollIntoView) el.scrollIntoView({ block: "center", behavior: "smooth" })
      }, 50)
    }
  }, [searchParams])

  const [status, setStatus] = useState("active")
  const [category, setCategory] = useState("")
  const [q, setQ] = useState("")

  const [showNew, setShowNew] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    priority: "MEDIUM",
    dueDate: "",
  })

  const categories = useMemo(() => {
    const set = new Set()
    for (const t of items) {
      if (t.category) set.add(t.category)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [items])

  const load = async () => {
    try {
      setLoading(true)
      setError("")
      const res = await listTodos({ status, category: category || undefined, q: q || undefined })
      setItems(res.data || [])
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load todos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!online) {
      setLoading(false)
      setError("To-dos require internet access right now.")
      return
    }
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [online, status, category, q])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setToast({ open: true, message: "Title is required.", tone: "error" })
      return
    }
    try {
      setSubmitting(true)
      await createTodo({
        title: form.title.trim(),
        description: form.description || undefined,
        category: form.category || undefined,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
      })
      setToast({ open: true, message: "To-do created.", tone: "success" })
      setForm({ title: "", description: "", category: "", priority: "MEDIUM", dueDate: "" })
      setShowNew(false)
      await load()
    } catch (e2) {
      setToast({ open: true, message: e2?.response?.data?.message || e2?.message || "Could not create to-do.", tone: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleComplete = async (todo) => {
    try {
      await updateTodo(todo.id, { completed: !todo.completed })
      setItems((prev) => prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t)))
    } catch {
      setToast({ open: true, message: "Could not update to-do.", tone: "error" })
    }
  }

  const askDelete = (id) => setConfirm({ open: true, id })
  const doDelete = async () => {
    const id = confirm.id
    setConfirm({ open: false, id: null })
    if (!id) return
    try {
      await deleteTodo(id)
      setToast({ open: true, message: "To-do deleted.", tone: "success" })
      setItems((prev) => prev.filter((t) => t.id !== id))
    } catch {
      setToast({ open: true, message: "Could not delete to-do.", tone: "error" })
    }
  }

  return (
    <div className="space-y-6">
      <Toast open={toast.open} message={toast.message} tone={toast.tone} onClose={() => setToast((t) => ({ ...t, open: false }))} />
      <ConfirmDialog
        open={confirm.open}
        title="Delete to-do?"
        message="This will permanently remove it."
        confirmText="Delete"
        cancelText="Cancel"
        tone="danger"
        onCancel={() => setConfirm({ open: false, id: null })}
        onConfirm={doDelete}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">To-dos</h1>
          <p className="text-dark-400 mt-1">Capture tasks, plan your follow-ups, and keep momentum.</p>
        </div>
        <button
          type="button"
          className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!online}
          onClick={() => setShowNew(true)}
        >
          <PlusIcon />
          New to-do
        </button>
      </div>

      <div className="card">
        <div className="grid lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-400">
              <SearchIcon />
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="input-field pl-12"
              placeholder="Search by title or description…"
            />
          </div>

          <select value={status} onChange={(e) => setStatus(e.target.value)} className="select-field">
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="all">All</option>
          </select>

          <select value={category} onChange={(e) => setCategory(e.target.value)} className="select-field">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!online ? (
        <div className="card border-warning-500/30 bg-warning-500/10">
          <div className="text-warning-300">Offline mode: to-dos aren’t cached yet.</div>
        </div>
      ) : loading ? (
        <div className="card">
          <div className="text-dark-400">Loading to-dos…</div>
        </div>
      ) : error ? (
        <div className="card border-danger-500/30 bg-danger-500/10">
          <div className="text-danger-300">{error}</div>
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-14">
          <div className="text-white font-semibold">No to-dos yet</div>
          <div className="text-dark-400 mt-1">Create one and start checking them off.</div>
          <button type="button" className="btn-secondary mt-5" onClick={() => setShowNew(true)}>
            Create your first to-do
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <div
              key={t.id}
              id={`todo-${t.id}`}
              className={`card hover:border-dark-600 ${t.id === openRemindersForId ? "ring-1 ring-primary-500/40" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleComplete(t)}
                    className={`mt-0.5 w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${
                      t.completed
                        ? "bg-success-500/15 border-success-500/30 text-success-300"
                        : "bg-dark-900/30 border-dark-700 text-dark-300 hover:text-white hover:border-dark-600"
                    }`}
                    aria-label={t.completed ? "Mark as active" : "Mark as completed"}
                  >
                    {t.completed ? <CheckIcon /> : null}
                  </button>
                  <div className="min-w-0">
                    <div className={`text-white font-semibold break-words ${t.completed ? "line-through opacity-70" : ""}`}>
                      {t.title}
                    </div>
                    {t.description ? (
                      <div className={`text-dark-300 text-sm mt-1 break-words ${t.completed ? "line-through opacity-70" : ""}`}>
                        {t.description}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${priorityTone(t.priority)}`}>{t.priority || "MEDIUM"}</span>
                      <span className="text-xs px-2.5 py-1 rounded-full border border-dark-700 bg-dark-800/40 text-dark-300">
                        {formatDue(t.dueDate)}
                      </span>
                      {t.dueDate && !t.completed && isOverdue(t.dueDate) && (
                        <span className="text-xs px-2.5 py-1 rounded-full border border-danger-500/30 bg-danger-500/10 text-danger-300">
                          Overdue
                        </span>
                      )}
                      {t.category ? (
                        <span className="text-xs px-2.5 py-1 rounded-full border border-primary-500/20 bg-primary-500/10 text-primary-300">
                          {t.category}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenRemindersForId(t.id)
                      setSearchParams({ todoId: t.id })
                    }}
                    className="btn-ghost text-primary-300 flex items-center justify-center"
                    aria-label="Remind me"
                    title="Remind me"
                  >
                    <BellIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => askDelete(t.id)}
                    className="btn-ghost text-danger-300 flex items-center justify-center"
                    aria-label="Delete"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {openRemindersForId && (
        <div
          className="modal-overlay"
          onClick={() => {
            setOpenRemindersForId(null)
            setSearchParams({})
          }}
        >
          <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">To-do reminders</h2>
                <p className="text-dark-400 mt-1">Create a reminder and get a push notification (if enabled).</p>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setOpenRemindersForId(null)
                  setSearchParams({})
                }}
              >
                Close
              </button>
            </div>

            <div className="mt-6">
              <RemindersPanel todoId={openRemindersForId} />
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal-content max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">New to-do</h2>
                <p className="text-dark-400 mt-1">Make it small and specific.</p>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setShowNew(false)}>
                Close
              </button>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="input-field"
                  placeholder="e.g. Follow up with recruiter"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="input-field min-h-[90px] resize-y"
                  rows="3"
                  placeholder="Optional details"
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="select-field"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Due date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="input-field"
                    placeholder="e.g. Interviews"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-4 border-t border-dark-700">
                <button type="button" className="btn-secondary" onClick={() => setShowNew(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Creating…" : "Create to-do"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
