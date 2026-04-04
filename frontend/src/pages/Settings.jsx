import { useEffect, useMemo, useState } from "react"
import { getMe } from "../api/account"
import { useOnlineStatus } from "../hooks/useOnlineStatus"
import { getToken } from "../utils/auth"
import PushToggle from "../components/PushToggle"
import Toast from "../components/Toast"
import ConfirmDialog from "../components/ConfirmDialog"

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
  </svg>
)

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 4v5c0 5-3 9-7 9s-7-4-7-9V7l7-4z" />
  </svg>
)

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
)

const DatabaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6c0 1.657 3.582 3 8 3s8-1.343 8-3-3.582-3-8-3-8 1.343-8 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6v6c0 1.657 3.582 3 8 3s8-1.343 8-3V6" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12v6c0 1.657 3.582 3 8 3s8-1.343 8-3v-6" />
  </svg>
)

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

function maskToken(token) {
  if (!token) return ""
  const t = String(token)
  if (t.length <= 16) return t
  return `${t.slice(0, 8)}…${t.slice(-8)}`
}

function isPwaLike() {
  if (typeof window === "undefined") return false
  // iOS Safari uses navigator.standalone; other browsers use display-mode media query.
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator?.standalone
}

export default function Settings() {
  const online = useOnlineStatus()
  const token = getToken()

  const [tab, setTab] = useState("account")
  const [meLoading, setMeLoading] = useState(false)
  const [meError, setMeError] = useState("")
  const [me, setMe] = useState(null)
  const [toast, setToast] = useState({ open: false, message: "", tone: "error" })
  const [confirmLogout, setConfirmLogout] = useState(false)

  const env = useMemo(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001"
    return {
      apiBase,
      pwa: isPwaLike(),
    }
  }, [])

  const refreshMe = async () => {
    if (!online) return
    try {
      setMeLoading(true)
      setMeError("")
      const res = await getMe()
      setMe(res.data)
    } catch (e) {
      setMeError(e?.response?.data?.message || e?.message || "Could not load account")
    } finally {
      setMeLoading(false)
    }
  }

  useEffect(() => {
    refreshMe()
  }, [online])

  const doLogout = () => {
    try {
      localStorage.removeItem("token")
      setToast({ open: true, message: "Signed out.", tone: "success" })
      window.location.href = "/"
    } catch {
      setToast({ open: true, message: "Could not sign out.", tone: "error" })
    }
  }

  return (
    <div className="space-y-6">
      <Toast open={toast.open} message={toast.message} tone={toast.tone} onClose={() => setToast((t) => ({ ...t, open: false }))} />
      <ConfirmDialog
        open={confirmLogout}
        title="Sign out?"
        message="You will need to sign in again to sync data. Offline cached viewing may still work."
        confirmText="Sign out"
        cancelText="Cancel"
        tone="danger"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false)
          doLogout()
        }}
      />

      <div className="card overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white">Settings</h1>
            <p className="text-dark-400 mt-1">Account, notifications, and app diagnostics</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={refreshMe} className="btn-secondary">
              Refresh
            </button>
            <button type="button" onClick={() => setConfirmLogout(true)} className="btn-danger flex items-center gap-2">
              <LogoutIcon />
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-6 border-t border-dark-700/60" />

        <div className="mt-4">
          <nav className="flex gap-1 overflow-x-auto pb-px scrollbar-hide">
            <TabButton active={tab === "account"} onClick={() => setTab("account")} icon={<UserIcon />}>
              Account
            </TabButton>
            <TabButton active={tab === "notifications"} onClick={() => setTab("notifications")} icon={<BellIcon />}>
              Notifications
            </TabButton>
            <TabButton active={tab === "security"} onClick={() => setTab("security")} icon={<ShieldIcon />}>
              Security
            </TabButton>
            <TabButton active={tab === "diagnostics"} onClick={() => setTab("diagnostics")} icon={<DatabaseIcon />}>
              Diagnostics
            </TabButton>
          </nav>
        </div>
      </div>

      {tab === "account" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Profile</h2>
                <p className="text-dark-400 text-sm mt-1">Basic account information from the server</p>
              </div>
              <div className={`text-xs px-2.5 py-1 rounded-full border ${online ? "border-success-500/30 bg-success-500/10 text-success-300" : "border-warning-500/30 bg-warning-500/10 text-warning-300"}`}>
                {online ? "Online" : "Offline"}
              </div>
            </div>

            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              <InfoField label="Email" value={me?.email || (meLoading ? "Loading…" : meError ? "—" : "—")} />
              <InfoField label="Role" value={me?.role || "—"} />
              <InfoField label="User ID" value={me?.id || "—"} />
              <InfoField label="PWA Mode" value={env.pwa ? "Installed" : "Browser"} />
            </div>

            {meError && <div className="mt-4 text-danger-300 text-sm">{meError}</div>}

            {!online && (
              <div className="mt-6 px-4 py-3 rounded-2xl border border-warning-500/30 bg-warning-500/10 text-warning-300">
                You are offline. Account details may be stale until you reconnect.
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
            <p className="text-dark-400 text-sm mt-1">Helpful shortcuts</p>

            <div className="mt-6 space-y-3">
              <button type="button" className="btn-secondary w-full" onClick={() => window.location.reload()}>
                Reload app
              </button>
              <button
                type="button"
                className="btn-ghost w-full"
                onClick={() => {
                  try {
                    navigator.clipboard?.writeText(env.apiBase)
                    setToast({ open: true, message: "API base URL copied.", tone: "success" })
                  } catch {
                    setToast({ open: true, message: "Could not copy.", tone: "error" })
                  }
                }}
              >
                Copy API base URL
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "notifications" && (
        <div className="space-y-6">
          <PushToggle />
          <div className="card">
            <h2 className="text-xl font-semibold text-white">Reminder Delivery</h2>
            <p className="text-dark-400 text-sm mt-1">Current: Push notifications (Android PWA). Email fallback is planned.</p>
            <div className="mt-4 rounded-2xl border border-dark-700 bg-dark-800/40 px-4 py-3 text-dark-300 text-sm">
              Tip: Install the PWA and enable notifications for the most reliable delivery.
            </div>
          </div>
        </div>
      )}

      {tab === "security" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-white">Session</h2>
            <p className="text-dark-400 text-sm mt-1">Your local auth token (never share this)</p>

            <div className="mt-6 rounded-2xl border border-dark-700 bg-dark-900/40 px-4 py-3">
              <div className="text-dark-400 text-xs">Token</div>
              <div className="mt-1 text-white font-mono text-sm break-all">{token ? maskToken(token) : "—"}</div>
            </div>
            <div className="mt-4 text-dark-500 text-xs">
              If you rotate `JWT_SECRET` on the server, all existing tokens become invalid.
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold text-white">Data Safety</h2>
            <p className="text-dark-400 text-sm mt-1">Offline cached data stays on-device</p>
            <div className="mt-6 rounded-2xl border border-dark-700 bg-dark-800/40 px-4 py-3 text-dark-300 text-sm">
              Signing out removes your token. Cached application data may still be visible offline.
            </div>
          </div>
        </div>
      )}

      {tab === "diagnostics" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-white">Connectivity</h2>
            <div className="mt-6 space-y-3">
              <DiagRow label="Online" value={online ? "Yes" : "No"} />
              <DiagRow label="API Base URL" value={env.apiBase} mono />
              <DiagRow label="Service Worker" value={"serviceWorker" in navigator ? "Supported" : "Not supported"} />
              <DiagRow label="Push" value={"PushManager" in window ? "Supported" : "Not supported"} />
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold text-white">Troubleshooting</h2>
            <p className="text-dark-400 text-sm mt-1">When notifications or offline mode act weird</p>
            <div className="mt-6 space-y-3 text-dark-300 text-sm">
              <div className="rounded-2xl border border-dark-700 bg-dark-800/40 px-4 py-3">
                If push won’t subscribe, reload once after first install so the service worker is fully ready.
              </div>
              <div className="rounded-2xl border border-dark-700 bg-dark-800/40 px-4 py-3">
                If you changed backend `ALLOWED_ORIGINS` or `JWT_SECRET`, sign out and sign in again.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 sm:px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-all ${
        active
          ? "text-primary-400 border-primary-400"
          : "text-dark-400 border-transparent hover:text-white hover:border-dark-600"
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function InfoField({ label, value }) {
  return (
    <div className="rounded-2xl border border-dark-700 bg-dark-800/40 px-4 py-3">
      <div className="text-dark-400 text-xs">{label}</div>
      <div className="mt-1 text-white font-semibold break-words">{value}</div>
    </div>
  )
}

function DiagRow({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-dark-400">{label}</div>
      <div className={`text-white text-right break-all ${mono ? "font-mono text-sm" : "font-semibold"}`}>{value}</div>
    </div>
  )
}
