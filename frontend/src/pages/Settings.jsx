import { useEffect, useMemo, useState } from "react"
import { getMe } from "../api/account"
import { useOnlineStatus } from "../hooks/useOnlineStatus"
import { getSetting, removeSetting, setSetting } from "../db"
import {
  fetchGitHubContributions90d,
  fetchGitHubProfile,
  fetchLeetCodeProfile,
  normalizeGitHubUsername,
  normalizeLeetCodeUsername,
} from "../utils/integrations"
import Heatmap90d from "../components/Heatmap90d"
import PushToggle from "../components/PushToggle"
import Toast from "../components/Toast"
import ConfirmDialog from "../components/ConfirmDialog"
import { toUserMessage } from "../utils/errorMessage"
import Button from "../mobile/ui/Button"
import { useTopBarActions } from "../mobile/chrome"
import { useMediaQuery } from "../hooks/useMediaQuery"

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
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

function isPwaLike() {
  if (typeof window === "undefined") return false
  // iOS Safari uses navigator.standalone; other browsers use display-mode media query.
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator?.standalone
}

export default function Settings() {
  const online = useOnlineStatus()
  const isMobile = useMediaQuery("(max-width: 768px)")
  // Note: token isn't needed here; sign-in/out handled globally.

  const [tab, setTab] = useState("account")
  const [meLoading, setMeLoading] = useState(false)
  const [meError, setMeError] = useState("")
  const [me, setMe] = useState(null)
  const [toast, setToast] = useState({ open: false, message: "", tone: "error" })
  // Sign-out is handled from the main sidebar; keep Settings focused on preferences.


  const [ghUsername, setGhUsername] = useState("")
  const [ghProfile, setGhProfile] = useState(null)
  const [ghContrib, setGhContrib] = useState([])
  const [ghSyncedAt, setGhSyncedAt] = useState("")
  const [ghBusy, setGhBusy] = useState(false)
  const [ghError, setGhError] = useState("")

  const [lcUsername, setLcUsername] = useState("")
  const [lcProfile, setLcProfile] = useState(null)
  const [lcSyncedAt, setLcSyncedAt] = useState("")
  const [lcBusy, setLcBusy] = useState(false)
  const [lcError, setLcError] = useState("")

  const [confirmClearIntegrations, setConfirmClearIntegrations] = useState(false)

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
      setMeError(toUserMessage(e, "Couldn't load your account details. Please try again."))
    } finally {
      setMeLoading(false)
    }
  }

  useTopBarActions(
    isMobile ? null : (
      <Button
        variant="secondary"
        size="sm"
        className="px-4 rounded-2xl"
        onClick={refreshMe}
        disabled={!online}
        aria-label="Refresh account"
      >
        Refresh
      </Button>
    ),
    [online, isMobile]
  )

  useEffect(() => {
    refreshMe()
  }, [online])

  useEffect(() => {
    if (tab !== "integrations") return
    let mounted = true

    const load = async () => {
      try {
        const [
          storedGhUsername,
          storedGhProfile,
          storedGhContrib,
          storedGhSyncedAt,
          storedLcUsername,
          storedLcProfile,
          storedLcSyncedAt,
        ] = await Promise.all([
          getSetting("integrations:githubUsername"),
          getSetting("integrations:githubProfile"),
          getSetting("integrations:githubContrib90d"),
          getSetting("integrations:githubSyncedAt"),
          getSetting("integrations:leetcodeUsername"),
          getSetting("integrations:leetcodeProfile"),
          getSetting("integrations:leetcodeSyncedAt"),
        ])

        if (!mounted) return
        setGhUsername(storedGhUsername || "")
        setGhProfile(storedGhProfile || null)
        setGhContrib(Array.isArray(storedGhContrib) ? storedGhContrib : [])
        setGhSyncedAt(storedGhSyncedAt || "")

        setLcUsername(storedLcUsername || "")
        setLcProfile(storedLcProfile || null)
        setLcSyncedAt(storedLcSyncedAt || "")
      } catch {
        // no-op
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [tab])

  // (removed) sign out action

  const syncGitHub = async () => {
    const u = normalizeGitHubUsername(ghUsername)
    setGhUsername(u)
    setGhError("")
    if (!u) {
      setGhError("Enter a GitHub username")
      return
    }
    if (!online) {
      setGhError("You are offline")
      return
    }

    try {
      setGhBusy(true)
      const [profile, contrib90d] = await Promise.all([
        fetchGitHubProfile(u),
        fetchGitHubContributions90d(u),
      ])
      const iso = new Date().toISOString()

      await Promise.all([
        setSetting("integrations:githubUsername", u),
        setSetting("integrations:githubProfile", profile),
        setSetting("integrations:githubContrib90d", contrib90d),
        setSetting("integrations:githubSyncedAt", iso),
      ])

      setGhProfile(profile)
      setGhContrib(contrib90d)
      setGhSyncedAt(iso)
      setToast({ open: true, message: "GitHub synced.", tone: "success" })
    } catch (e) {
      setGhError(toUserMessage(e, "Couldn't sync GitHub right now. Please try again."))
    } finally {
      setGhBusy(false)
    }
  }

  const syncLeetCode = async () => {
    const u = normalizeLeetCodeUsername(lcUsername)
    setLcUsername(u)
    setLcError("")
    if (!u) {
      setLcError("Enter a LeetCode username")
      return
    }
    if (!online) {
      setLcError("You are offline")
      return
    }

    try {
      setLcBusy(true)
      const profile = await fetchLeetCodeProfile(u)
      const iso = new Date().toISOString()

      await Promise.all([
        setSetting("integrations:leetcodeUsername", u),
        setSetting("integrations:leetcodeProfile", profile),
        setSetting("integrations:leetcodeSyncedAt", iso),
      ])

      setLcProfile(profile)
      setLcSyncedAt(iso)
      setToast({ open: true, message: "LeetCode synced.", tone: "success" })
    } catch (e) {
      setLcError(toUserMessage(e, "Couldn't sync LeetCode right now. Please try again."))
    } finally {
      setLcBusy(false)
    }
  }

  const clearIntegrations = async () => {
    await Promise.all([
      removeSetting("integrations:githubUsername"),
      removeSetting("integrations:githubProfile"),
      removeSetting("integrations:githubContrib90d"),
      removeSetting("integrations:githubSyncedAt"),
      removeSetting("integrations:leetcodeUsername"),
      removeSetting("integrations:leetcodeProfile"),
      removeSetting("integrations:leetcodeSyncedAt"),
    ])

    setGhUsername("")
    setGhProfile(null)
    setGhContrib([])
    setGhSyncedAt("")
    setGhError("")

    setLcUsername("")
    setLcProfile(null)
    setLcSyncedAt("")
    setLcError("")

    setToast({ open: true, message: "Integrations cleared.", tone: "success" })
  }

  return (
    <div className="space-y-6">
      <Toast open={toast.open} message={toast.message} tone={toast.tone} onClose={() => setToast((t) => ({ ...t, open: false }))} />
      <ConfirmDialog
        open={confirmClearIntegrations}
        title="Clear integrations?"
        message="This removes cached GitHub/LeetCode usernames and stats from this device."
        confirmText="Clear"
        cancelText="Cancel"
        tone="danger"
        onCancel={() => setConfirmClearIntegrations(false)}
        onConfirm={async () => {
          setConfirmClearIntegrations(false)
          await clearIntegrations()
        }}
      />

      <div className="card overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white">Settings</h1>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button type="button" onClick={refreshMe} className="btn-secondary">
              Refresh
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
            <TabButton active={tab === "integrations"} onClick={() => setTab("integrations")} icon={<DatabaseIcon />}>
              Integrations
            </TabButton>
          </nav>
        </div>
      </div>

      {tab === "account" && (
        <div className="space-y-6">
          <div className="card">
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
              <InfoField label="PWA Mode" value={env.pwa ? "Installed" : "Browser"} />
            </div>

            {meError && <div className="mt-4 text-danger-300 text-sm">{meError}</div>}

            {!online && (
              <div className="mt-6 px-4 py-3 rounded-2xl border border-warning-500/30 bg-warning-500/10 text-warning-300">
                You are offline. Account details may be stale until you reconnect.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "integrations" && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Profile & Integrations</h2>
                <p className="text-dark-400 text-sm mt-1">Connect public profiles and cache stats locally.</p>
              </div>
              <button type="button" onClick={() => setConfirmClearIntegrations(true)} className="btn-danger">
                Clear cache
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-dark-700 bg-dark-800/40 px-4 py-3 text-dark-300 text-sm">
              Add your GitHub and LeetCode usernames, sync public stats, and use them across the app.
            </div>

            {!online && (
              <div className="mt-4 px-4 py-3 rounded-2xl border border-warning-500/30 bg-warning-500/10 text-warning-300 text-sm">
                You are offline. You can still view cached data, but syncing requires internet.
              </div>
            )}

            <div className="mt-6 grid sm:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-dark-700 bg-dark-800/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-white font-semibold">GitHub</div>
                  <button type="button" onClick={syncGitHub} disabled={!online || ghBusy} className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed">
                    {ghBusy ? "Syncing…" : "Sync"}
                  </button>
                </div>
                <div className="mt-3">
                  <label className="block text-xs text-dark-400">Username</label>
                  <input
                    value={ghUsername}
                    onChange={(e) => setGhUsername(e.target.value)}
                    placeholder="e.g. torvalds"
                    className="input-field mt-1"
                  />
                  {ghError && <div className="mt-2 text-sm text-danger-300">{ghError}</div>}
                </div>

                {ghProfile && (
                  <div className="mt-4 pt-4 border-t border-dark-700">
                    <div className="flex items-start gap-3">
                      {ghProfile.avatarUrl ? (
                        <img
                          src={ghProfile.avatarUrl}
                          alt=""
                          className="w-10 h-10 rounded-xl border border-dark-700 bg-dark-900/30"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl border border-dark-700 bg-dark-900/30" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-semibold truncate">{ghProfile.name || ghProfile.login}</div>
                        <div className="text-dark-400 text-sm truncate">@{ghProfile.login}</div>
                      </div>
                      {ghProfile.htmlUrl && (
                        <a className="btn-ghost text-sm" href={ghProfile.htmlUrl} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      )}
                    </div>

                    {ghProfile.bio && (
                      <div className="mt-3 text-sm text-dark-300 break-words">{ghProfile.bio}</div>
                    )}

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <MiniStat label="Repos" value={ghProfile.publicRepos} />
                      <MiniStat label="Followers" value={ghProfile.followers} />
                      <MiniStat label="Following" value={ghProfile.following} />
                    </div>

                    <div className="mt-4">
                      <Heatmap90d days={ghContrib} tone="primary" />
                      <div className="mt-2 text-xs text-dark-500">Last synced: {ghSyncedAt ? new Date(ghSyncedAt).toLocaleString() : "—"}</div>
                    </div>
                  </div>
                )}

                {!ghProfile && (
                  <div className="mt-4 pt-4 border-t border-dark-700 text-sm text-dark-400">
                    Not connected yet.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-dark-700 bg-dark-800/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-white font-semibold">LeetCode</div>
                  <button type="button" onClick={syncLeetCode} disabled={!online || lcBusy} className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed">
                    {lcBusy ? "Syncing…" : "Sync"}
                  </button>
                </div>
                <div className="mt-3">
                  <label className="block text-xs text-dark-400">Username</label>
                  <input
                    value={lcUsername}
                    onChange={(e) => setLcUsername(e.target.value)}
                    placeholder="e.g. johndoe"
                    className="input-field mt-1"
                  />
                  {lcError && <div className="mt-2 text-sm text-danger-300">{lcError}</div>}
                </div>

                {lcProfile && (
                  <div className="mt-4 pt-4 border-t border-dark-700">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white font-semibold truncate">@{lcProfile.username || lcUsername}</div>
                        <div className="text-dark-400 text-sm">Solved: <span className="text-white font-semibold">{lcProfile.totalSolved || 0}</span></div>
                      </div>
                      {lcUsername && (
                        <a className="btn-ghost text-sm" href={`https://leetcode.com/${encodeURIComponent(lcUsername)}/`} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2">
                      <MiniStat label="Easy" value={lcProfile.easySolved} />
                      <MiniStat label="Med" value={lcProfile.mediumSolved} />
                      <MiniStat label="Hard" value={lcProfile.hardSolved} />
                      <MiniStat label="Total" value={lcProfile.totalSolved} />
                    </div>

                    <div className="mt-4">
                      <Heatmap90d days={lcProfile.submissionDays90d} tone="success" />
                      <div className="mt-2 text-xs text-dark-500">Last synced: {lcSyncedAt ? new Date(lcSyncedAt).toLocaleString() : "—"}</div>
                    </div>
                  </div>
                )}

                {!lcProfile && (
                  <div className="mt-4 pt-4 border-t border-dark-700 text-sm text-dark-400">
                    Not connected yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "notifications" && (
        <div className="space-y-6">
          <PushToggle />
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

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-dark-700 bg-dark-800/40 px-3 py-2">
      <div className="text-[11px] text-dark-500">{label}</div>
      <div className="mt-0.5 text-white font-semibold text-sm">{Number(value) || 0}</div>
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
