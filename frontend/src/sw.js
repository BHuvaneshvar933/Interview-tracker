/* eslint-disable no-restricted-globals */
import { clientsClaim, skipWaiting } from "workbox-core"
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching"
import { registerRoute, NavigationRoute } from "workbox-routing"
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies"
import { ExpirationPlugin } from "workbox-expiration"

skipWaiting()
clientsClaim()
cleanupOutdatedCaches()

precacheAndRoute(self.__WB_MANIFEST)

// SPA navigation fallback
const handler = createHandlerBoundToURL("/index.html")
registerRoute(new NavigationRoute(handler, { denylist: [/^\/api\//] }))

// Fonts caching
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new StaleWhileRevalidate({
    cacheName: "google-fonts-stylesheets",
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
)

registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-webfonts",
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
)

// Push notifications
self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event?.data?.json?.() || {}
  } catch {
    // ignore
  }

  const title = data.title || "Reminder"
  const message = data.message || "You have an upcoming reminder."
  const url = data.url || "/dashboard"

  event.waitUntil(
    self.registration.showNotification(title, {
      body: message,
      data: { url },
      tag: "jobtracker-reminder",
      renotify: true,
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification?.data?.url || "/dashboard"

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      for (const client of allClients) {
        // Focus an existing client if possible
        if ("focus" in client) {
          try {
            await client.focus()
            if ("navigate" in client) await client.navigate(url)
            return
          } catch {
            // continue
          }
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(url)
      }
    })()
  )
})
