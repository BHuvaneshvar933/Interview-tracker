import api from "../api/axios"

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i)
  return output
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

export function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  return Notification.permission
}

export async function getVapidPublicKey() {
  const res = await api.get("/api/push/public-key")
  return (res.data || "").trim()
}

export async function getExistingSubscription() {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration()
  if (reg) return reg.pushManager.getSubscription()
  const ready = await navigator.serviceWorker.ready
  return ready.pushManager.getSubscription()
}

export async function subscribeToPush() {
  if (!pushSupported()) throw new Error("Push not supported")

  // Request permission first while we still have a clear user gesture.
  // Some mobile browsers won't show a prompt if we await network/async work first.
  const currentPermission = getNotificationPermission()
  if (currentPermission === "denied") {
    throw new Error("Notifications are blocked. Re-enable them in browser/app settings, then try again.")
  }
  if (currentPermission !== "granted") {
    const permission = await Notification.requestPermission()
    if (permission !== "granted") throw new Error("Notifications permission denied")
  }

  const publicKey = await getVapidPublicKey()
  if (!publicKey) throw new Error("Push is not configured on the server")

  // Prefer a concrete registration; `ready` can stall if the SW isn't controlling yet.
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) {
    throw new Error("Service worker not ready yet. Reload the app once and try again.")
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  const json = sub.toJSON()
  await api.post("/api/push/subscribe", {
    endpoint: json.endpoint,
    keys: json.keys,
    userAgent: navigator.userAgent,
  })

  return sub
}

export async function unsubscribeFromPush() {
  const sub = await getExistingSubscription()
  if (!sub) return
  const json = sub.toJSON()
  try {
    await api.post("/api/push/unsubscribe", { endpoint: json.endpoint })
  } catch {
    // ignore
  }
  await sub.unsubscribe()
}
