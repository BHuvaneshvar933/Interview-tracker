import { useEffect, useState } from "react"
import { createReminder, deleteReminder, listReminders } from "../api/reminders"
import Toast from "./Toast"
import ConfirmDialog from "./ConfirmDialog"
import { formatLocalDateTime, toInstantISOStringFromLocalInput, toLocalDatetimeInputValue } from "../utils/datetime"
import { toUserMessage } from "../utils/errorMessage"

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

function isSameId(a, b) {
  if (!a && !b) return true
  if (!a || !b) return false
  return String(a) === String(b)
}

export default function RemindersPanel({ applicationId, todoId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState({ open: false, message: "", tone: "error" })
  const [confirm, setConfirm] = useState({ open: false, id: null })

  const [form, setForm] = useState(() => ({
    title: todoId ? "To-do reminder" : "Follow up",
    message: "",
    remindAtLocal: toLocalDatetimeInputValue(new Date(Date.now() + 60 * 60 * 1000)),
  }))

  useEffect(() => {
    setForm((f) => ({
      ...f,
      remindAtLocal: f.remindAtLocal || toLocalDatetimeInputValue(new Date(Date.now() + 60 * 60 * 1000)),
    }))
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      setError("")
      const res = await listReminders()
      const all = res.data || []
      const filtered = todoId
        ? all.filter((r) => isSameId(r.todoId, todoId))
        : applicationId
          ? all.filter((r) => isSameId(r.applicationId, applicationId))
          : all
      setItems(filtered)
    } catch (e) {
      setError(toUserMessage(e, "Couldn't load reminders. Please try again."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [applicationId, todoId])

  const submit = async (e) => {
    e.preventDefault()
    const remindAt = toInstantISOStringFromLocalInput(form.remindAtLocal)
    if (!remindAt) {
      setToast({ open: true, message: "Please choose a valid date/time.", tone: "error" })
      return
    }

    try {
      setSubmitting(true)
      await createReminder({
        applicationId,
        todoId,
        title: form.title,
        message: form.message,
        remindAt,
      })
      setToast({ open: true, message: "Reminder created.", tone: "success" })
      setForm((f) => ({ ...f, message: "" }))
      await load()
    } catch (e2) {
      setToast({ open: true, message: toUserMessage(e2, "Couldn't create the reminder. Please try again."), tone: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  const askDelete = (id) => setConfirm({ open: true, id })
  const doDelete = async () => {
    const id = confirm.id
    setConfirm({ open: false, id: null })
    if (!id) return
    try {
      await deleteReminder(id)
      setToast({ open: true, message: "Reminder deleted.", tone: "success" })
      await load()
    } catch (e) {
      setToast({ open: true, message: toUserMessage(e, "Couldn't delete the reminder. Please try again."), tone: "error" })
    }
  }

  return (
    <div className="space-y-6">
      <Toast open={toast.open} message={toast.message} tone={toast.tone} onClose={() => setToast((t) => ({ ...t, open: false }))} />
      <ConfirmDialog
        open={confirm.open}
        title="Delete reminder?"
        message="This will permanently remove it."
        confirmText="Delete"
        cancelText="Cancel"
        tone="danger"
        onCancel={() => setConfirm({ open: false, id: null })}
        onConfirm={doDelete}
      />

      <div className="card">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-200 border border-emerald-500/20">
            <BellIcon />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Reminders</h3>
            <p className="text-dark-400 text-sm">Create follow-ups and get phone notifications (if enabled).</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <label className="block text-sm text-dark-400 mb-2">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="input-field"
              required
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm text-dark-400 mb-2">Remind at *</label>
            <input
              type="datetime-local"
              value={form.remindAtLocal}
              onChange={(e) => setForm((f) => ({ ...f, remindAtLocal: e.target.value }))}
              className="input-field"
              required
            />
          </div>
          <div className="lg:col-span-1 flex items-end">
            <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-50">
              {submitting ? "Creating..." : "Create reminder"}
            </button>
          </div>
          <div className="lg:col-span-3">
            <label className="block text-sm text-dark-400 mb-2">Message</label>
            <input
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              className="input-field"
              placeholder="Optional details"
            />
          </div>
        </form>
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-white font-semibold">Upcoming</div>
            <p className="text-dark-400 text-sm mt-1">
              {todoId
                ? "Only reminders for this to-do are shown here."
                : applicationId
                  ? "Only reminders for this application are shown here."
                  : "All reminders are shown here."}
            </p>
          </div>
          <button type="button" onClick={load} className="btn-ghost">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="mt-6 text-dark-400">Loading reminders...</div>
        ) : error ? (
          <div className="mt-6 text-danger-300">{error}</div>
        ) : items.length === 0 ? (
          <div className="mt-6 text-dark-500">No reminders yet.</div>
        ) : (
          <div className="mt-6 space-y-3">
            {items.map((r) => (
              <div key={r.id} className="rounded-2xl border border-dark-700 bg-dark-800/40 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-white font-semibold break-words">{r.title}</div>
                    <div className="text-dark-400 text-sm mt-1">{formatLocalDateTime(r.remindAt)}</div>
                    {r.message ? <div className="text-dark-300 text-sm mt-2 break-words">{r.message}</div> : null}
                    {r.status ? <div className="text-dark-500 text-xs mt-2">Status: {r.status}</div> : null}
                  </div>
                  <button type="button" onClick={() => askDelete(r.id)} className="btn-ghost text-danger-300 flex items-center justify-center">
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
