import { useEffect, useMemo, useState } from "react"
import {
  getExistingSubscription,
  getNotificationPermission,
  pushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "../push/push"
import Toast from "./Toast"

export default function PushToggle() {
  const [supported, setSupported] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState({ open: false, message: "", tone: "error" })
  const [needsReload, setNeedsReload] = useState(false)

  const permission = useMemo(() => getNotificationPermission(), [enabled, supported])

  useEffect(() => {
    setSupported(pushSupported())
    ;(async () => {
      try {
        const sub = await getExistingSubscription()
        if (sub) {
          setEnabled(true)
          return
        }

        // If the SW isn't ready yet, `navigator.serviceWorker.ready` can stall.
        // Give the user an actionable fallback instead of silently failing.
        const timeoutMs = 1200
        const fallback = await Promise.race([
          new Promise((resolve) => setTimeout(() => resolve("timeout"), timeoutMs)),
          (async () => {
            await navigator.serviceWorker.getRegistration()
            return "ok"
          })(),
        ])
        if (fallback === "timeout") setNeedsReload(true)
      } catch {
        setEnabled(false)
      }
    })()
  }, [])

  const toggle = async () => {
    if (!supported) return
    try {
      setBusy(true)
      if (enabled) {
        await unsubscribeFromPush()
        setEnabled(false)
        setToast({ open: true, message: "Notifications disabled.", tone: "success" })
      } else {
        if (permission === "denied") {
          throw new Error("Notifications are blocked. Re-enable them in browser/app settings, then try again.")
        }
        await subscribeToPush()
        setEnabled(true)
        setToast({ open: true, message: "Notifications enabled.", tone: "success" })
      }
    } catch (e) {
      setToast({ open: true, message: e?.message || "Could not update notification settings.", tone: "error" })
    } finally {
      setBusy(false)
    }
  }

  if (!supported) {
    return (
      <div className="card">
        <div className="text-white font-semibold">Notifications</div>
        <p className="text-dark-400 text-sm mt-1">Push notifications are not supported on this device/browser.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <Toast open={toast.open} message={toast.message} tone={toast.tone} onClose={() => setToast((t) => ({ ...t, open: false }))} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-white font-semibold">Notifications</div>
          <p className="text-dark-400 text-sm mt-1">Enable phone notifications for reminders.</p>
          {permission === "denied" && (
            <p className="text-danger-300 text-sm mt-2">
              Notifications are blocked for this app. Allow notifications in your browser/app settings, then reload and try again.
            </p>
          )}
          {needsReload && (
            <p className="text-dark-400 text-sm mt-2">
              If this is your first time enabling notifications, reload the app once so the service worker is ready.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={busy || permission === "denied"}
          className={enabled ? "btn-secondary" : "btn-primary"}
        >
          {busy ? "Working..." : enabled ? "Disable" : "Enable"}
        </button>
      </div>
      {needsReload && (
        <div className="mt-4">
          <button type="button" onClick={() => window.location.reload()} className="btn-ghost">
            Reload app
          </button>
        </div>
      )}
    </div>
  )
}
