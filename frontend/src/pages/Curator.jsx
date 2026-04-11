import { useEffect, useMemo, useState } from "react"
import Toast from "../components/Toast"
import {
  createCuratorItem,
  deleteCuratorItem,
  listCuratorItems,
  toggleCuratorFavorite,
  updateCuratorItem,
} from "../db"

const TYPES = [
  { id: "ALL", label: "All" },
  { id: "GITHUB_REPO", label: "GitHub Repo" },
  { id: "TWEET", label: "Tweet / Tip" },
  { id: "IMAGE", label: "Image" },
  { id: "VIDEO", label: "Reel / Video" },
  { id: "NOTE", label: "Note" },
  { id: "ARTICLE", label: "Article" },
]

function parseTags(raw) {
  const s = String(raw || "")
  const parts = s.split(",").map((x) => x.trim()).filter(Boolean)
  // de-dupe preserving order
  const out = []
  const seen = new Set()
  for (const p of parts) {
    const key = p.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}

function formatSavedDate(iso) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" })
  } catch {
    return "—"
  }
}

function detectTypeFromUrl(url) {
  const u = String(url || "").trim().toLowerCase()
  if (!u) return "NOTE"

  // GitHub repo
  if (/^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\/)?$/.test(u)) return "GITHUB_REPO"

  // Twitter/X
  if (u.includes("twitter.com/") || u.includes("x.com/")) return "TWEET"

  // Direct images
  if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg)(\?|#|$)/.test(u)) return "IMAGE"

  // Video-ish
  if (
    u.includes("youtube.com/") ||
    u.includes("youtu.be/") ||
    u.includes("instagram.com/reel") ||
    u.includes("instagram.com/p/") ||
    u.includes("tiktok.com/") ||
    /(\.mp4|\.mov|\.webm)(\?|#|$)/.test(u)
  ) {
    return "VIDEO"
  }

  // Articles
  if (
    u.includes("linkedin.com/") ||
    u.includes("medium.com/") ||
    u.includes("dev.to/") ||
    u.includes("hashnode.com/")
  ) {
    return "ARTICLE"
  }

  return "ARTICLE"
}

function matchesQuery(item, q) {
  const query = String(q || "").trim().toLowerCase()
  if (!query) return true
  const title = String(item?.title || "").toLowerCase()
  const desc = String(item?.description || "").toLowerCase()
  const tags = Array.isArray(item?.tags) ? item.tags.join(" ").toLowerCase() : ""
  return title.includes(query) || desc.includes(query) || tags.includes(query)
}

const StarIcon = ({ filled }) => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor">
    <path
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.518 4.674a1 1 0 00.95.69h4.913c.969 0 1.371 1.24.588 1.81l-3.976 2.889a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.538 1.118l-3.976-2.889a1 1 0 00-1.176 0l-3.976 2.889c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 10.101c-.783-.57-.38-1.81.588-1.81h4.913a1 1 0 00.95-.69l1.518-4.674z"
    />
  </svg>
)

const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4h-3a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-3" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

function badgeStyle(type) {
  const base = "text-xs px-2.5 py-1 rounded-full border"
  if (type === "GITHUB_REPO") return `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-200`
  if (type === "TWEET") return `${base} border-teal-500/30 bg-teal-500/10 text-teal-200`
  if (type === "IMAGE") return `${base} border-sky-500/30 bg-sky-500/10 text-sky-200`
  if (type === "VIDEO") return `${base} border-indigo-500/30 bg-indigo-500/10 text-indigo-200`
  if (type === "ARTICLE") return `${base} border-amber-500/30 bg-amber-500/10 text-amber-200`
  return `${base} border-white/10 bg-surfaceAlt/55 text-textSecondary`
}

function typeLabel(type) {
  return TYPES.find((t) => t.id === type)?.label || "Note"
}

export default function Curator() {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState("")
  const [typeTab, setTypeTab] = useState("ALL")

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState("")
  const [autoType, setAutoType] = useState(true)
  const [form, setForm] = useState({
    url: "",
    type: "NOTE",
    title: "",
    description: "",
    tags: "",
  })
  const [error, setError] = useState("")
  const [toast, setToast] = useState({ open: false, tone: "success", message: "" })

  const load = async () => {
    const list = await listCuratorItems()
    setItems(list)
  }

  useEffect(() => {
    load()
  }, [])

  // Allow quick-save via custom event (extension/content script can dispatch this).
  useEffect(() => {
    const onQuickSave = async (e) => {
      const d = e?.detail || {}
      const url = String(d.url || "").trim()
      if (!url) return
      const title = String(d.title || "").trim() || url
      const tags = Array.isArray(d.tags) ? d.tags : ["Saved from Extension"]
      const type = detectTypeFromUrl(url)
      try {
        await createCuratorItem({ url, type, title, description: "", tags })
        await load()
        setToast({ open: true, tone: "success", message: "Saved" })
      } catch {
        setToast({ open: true, tone: "error", message: "Couldn’t save" })
      }
    }
    window.addEventListener("capsule:save-content", onQuickSave)
    return () => window.removeEventListener("capsule:save-content", onQuickSave)
  }, [])

  const filtered = useMemo(() => {
    const base = Array.isArray(items) ? items : []
    return base
      .filter((x) => (typeTab === "ALL" ? true : x.type === typeTab))
      .filter((x) => matchesQuery(x, query))
  }, [items, query, typeTab])

  const openCreate = () => {
    setError("")
    setEditingId("")
    setAutoType(true)
    setForm({ url: "", type: "NOTE", title: "", description: "", tags: "" })
    setOpen(true)
  }

  const openEdit = (item) => {
    setError("")
    setEditingId(String(item?.id || ""))
    setAutoType(false)
    setForm({
      url: String(item?.url || ""),
      type: String(item?.type || "NOTE"),
      title: String(item?.title || ""),
      description: String(item?.description || ""),
      tags: Array.isArray(item?.tags) ? item.tags.join(", ") : "",
    })
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    setError("")
  }

  const onChangeUrl = (nextUrl) => {
    setForm((p) => ({ ...p, url: nextUrl }))
    if (!editingId && autoType) {
      const nextType = detectTypeFromUrl(nextUrl)
      setForm((p) => ({ ...p, type: nextType }))
    }
  }

  const save = async () => {
    setError("")
    const payload = {
      url: form.url ? String(form.url).trim() : "",
      type: String(form.type),
      title: String(form.title).trim(),
      description: String(form.description || "").trim(),
      tags: parseTags(form.tags),
    }
    try {
      if (editingId) {
        await updateCuratorItem(editingId, payload)
        setToast({ open: true, tone: "success", message: "Updated" })
      } else {
        await createCuratorItem(payload)
        setToast({ open: true, tone: "success", message: "Saved" })
      }
      await load()
      close()
    } catch (e) {
      setError(e?.message || "Couldn’t save")
    }
  }

  const deleteItem = async (id) => {
    try {
      await deleteCuratorItem(id)
      await load()
      setToast({ open: true, tone: "success", message: "Deleted" })
    } catch {
      setToast({ open: true, tone: "error", message: "Couldn’t delete" })
    }
  }

  const toggleFav = async (id) => {
    try {
      const next = await toggleCuratorFavorite(id)
      setItems((prev) => (Array.isArray(prev) ? prev.map((x) => (x.id === id ? next : x)) : prev))
    } catch {
      // no-op
    }
  }

  return (
    <div className="space-y-6">
      <Toast
        open={toast.open}
        tone={toast.tone}
        message={toast.message}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      <div className="card overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-surfaceAlt/25 to-teal-500/8" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Content Curator</h1>
            <p className="text-sm text-dark-400 mt-1">A personal save-anything board for links and notes, stored locally on this device.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-primary" onClick={openCreate}>Save Content</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <input
              className="input-field"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, description, or tags…"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {TYPES.map((t) => {
            const active = typeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeTab(t.id)}
                className={
                  "whitespace-nowrap px-3 py-2 rounded-xl text-sm font-medium border transition-all duration-200 " +
                  (active
                    ? "bg-emerald-500/10 border-emerald-500/25 text-textPrimary"
                    : "bg-surfaceAlt/40 border-white/10 text-textSecondary hover:text-textPrimary hover:bg-surfaceAlt/60")
                }
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="rounded-2xl border border-white/10 bg-surfaceAlt/35 p-6 text-center">
            <div className="text-white font-semibold">Nothing here yet</div>
            <div className="text-sm text-textSecondary mt-1">
              {items.length === 0
                ? "Save your first link, note, or resource to build your personal board."
                : "No saved items match your search or filters."}
            </div>
            <div className="mt-4">
              <button type="button" className="btn-primary" onClick={openCreate}>
                {items.length === 0 ? "Add your first item" : "Save Content"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((x) => (
            <div key={x.id} className="card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={badgeStyle(x.type)}>{typeLabel(x.type)}</span>
                    {x.favorite ? <span className="text-xs text-emerald-200">Favorited</span> : null}
                  </div>
                  <div className="mt-2 text-white font-semibold leading-snug">{x.title}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" className="btn-ghost" aria-label="Edit" onClick={() => openEdit(x)}>
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    className={"btn-ghost " + (x.favorite ? "text-amber-300 hover:text-amber-200" : "")}
                    aria-label={x.favorite ? "Unfavorite" : "Favorite"}
                    onClick={() => toggleFav(x.id)}
                  >
                    <StarIcon filled={Boolean(x.favorite)} />
                  </button>
                  <button type="button" className="btn-ghost text-danger-300" aria-label="Delete" onClick={() => deleteItem(x.id)}>
                    <TrashIcon />
                  </button>
                </div>
              </div>

              {x.description ? (
                <div className="mt-2 text-sm text-textSecondary">{x.description}</div>
              ) : null}

              {Array.isArray(x.tags) && x.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {x.tags.slice(0, 8).map((t) => (
                    <span key={t} className="text-xs px-2.5 py-1 rounded-full border border-white/10 bg-surfaceAlt/55 text-textSecondary">
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                <div className="text-xs text-textMuted">Saved {formatSavedDate(x.createdAt)}</div>
                {x.url ? (
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-sm"
                    onClick={() => window.open(String(x.url), "_blank", "noopener,noreferrer")}
                  >
                    Open
                  </button>
                ) : (
                  <div className="text-xs text-textMuted">No link</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <div className="modal-overlay" onClick={close}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">{editingId ? "Edit Content" : "Save Content"}</h2>
                <p className="text-sm text-textSecondary mt-1">Save anything useful. Everything stays on this device.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="block text-xs text-dark-400">URL (optional)</label>
                <input
                  className="input-field mt-1"
                  value={form.url}
                  onChange={(e) => onChangeUrl(e.target.value)}
                  placeholder="https://… or leave blank for a note"
                />
                {!editingId ? (
                  <div className="mt-1 text-xs text-textMuted">Type auto-detect runs while creating.</div>
                ) : null}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-dark-400">Type</label>
                  <select
                    className="select-field mt-1"
                    value={form.type}
                    onChange={(e) => {
                      setAutoType(false)
                      setForm((p) => ({ ...p, type: e.target.value }))
                    }}
                  >
                    {TYPES.filter((t) => t.id !== "ALL").map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-dark-400">Title (required)</label>
                  <input
                    className="input-field mt-1"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Give it a recognizable name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-dark-400">Description (optional)</label>
                <textarea
                  className="input-field mt-1 min-h-[96px]"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Why you saved it / key takeaways…"
                />
              </div>

              <div>
                <label className="block text-xs text-dark-400">Tags (comma-separated)</label>
                <input
                  className="input-field mt-1"
                  value={form.tags}
                  onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                  placeholder="e.g. system design, interview, css"
                />
              </div>

              {error ? <div className="text-sm text-danger-300">{error}</div> : null}
            </div>

            <div className="mt-7 flex flex-col sm:flex-row sm:items-center justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
              {editingId ? (
                <button
                  type="button"
                  className="btn-danger"
                  onClick={async () => {
                    await deleteItem(editingId)
                    close()
                  }}
                >
                  Delete
                </button>
              ) : null}
              <button type="button" className="btn-primary" onClick={save}>{editingId ? "Update" : "Save"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
