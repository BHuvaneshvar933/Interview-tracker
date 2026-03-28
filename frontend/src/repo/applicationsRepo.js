import { fetchApplications } from "../api/applications"
import { fetchApplicationsByStatus } from "../api/fetchApplicationsByStatus"
import { searchApplications } from "../api/searchApplications"
import { getApplicationById } from "../api/getApplicationById"

import { cacheAppendToSet, cacheGet, cacheSet } from "../offline/cache"

const INDEX_KEY = "applications:index"

function appKey(id) {
  return `applications:byId:${id}`
}

function listKey({ page, size, statusFilter, filters }) {
  const payload = {
    page: page ?? 0,
    size: size ?? 9,
    statusFilter: statusFilter || "",
    filters: filters || {},
  }
  return `applications:list:${encodeURIComponent(JSON.stringify(payload))}`
}

function isOnline() {
  if (typeof navigator === "undefined") return true
  return navigator.onLine
}

async function cacheApplicationsFromList(listData) {
  const apps = listData?.content || []
  for (const app of apps) {
    if (!app?.id) continue
    await cacheSet(appKey(app.id), {
      data: app,
      cachedAt: Date.now(),
    })
    await cacheAppendToSet(INDEX_KEY, app.id)
  }
}

export async function listApplications({ page = 0, size = 9, statusFilter = "", filters = {} }) {
  const key = listKey({ page, size, statusFilter, filters })

  if (isOnline()) {
    try {
      const isSearching = Boolean(
        filters.company ||
          filters.role ||
          filters.status ||
          filters.skill ||
          filters.fromDate ||
          filters.toDate
      )

      let res
      if (isSearching) {
        res = await searchApplications(filters, page, size)
      } else if (statusFilter) {
        res = await fetchApplicationsByStatus(statusFilter, page, size)
      } else {
        res = await fetchApplications(page, size)
      }

      const listData = res.data
      await cacheSet(key, { data: listData, cachedAt: Date.now() })
      await cacheApplicationsFromList(listData)

      return { data: listData, fromCache: false }
    } catch {
      // fall through to cache
    }
  }

  const cached = await cacheGet(key)
  if (cached?.data) {
    return { data: cached.data, fromCache: true, cachedAt: cached.cachedAt }
  }

  // fallback: synthesize a list from the index
  const ids = (await cacheGet(INDEX_KEY)) || []
  if (!Array.isArray(ids) || ids.length === 0) {
    return { data: { content: [], totalPages: 0, totalElements: 0, number: page }, fromCache: true }
  }

  const apps = []
  for (const id of ids) {
    const item = await cacheGet(appKey(id))
    if (item?.data) apps.push(item.data)
  }

  apps.sort((a, b) => {
    const ad = new Date(a.appliedDate || 0).getTime()
    const bd = new Date(b.appliedDate || 0).getTime()
    return bd - ad
  })

  const start = page * size
  const content = apps.slice(start, start + size)
  const totalPages = Math.max(1, Math.ceil(apps.length / size))

  return {
    data: {
      content,
      totalPages,
      totalElements: apps.length,
      number: page,
    },
    fromCache: true,
  }
}

export async function getApplication(id) {
  if (isOnline()) {
    try {
      const res = await getApplicationById(id)
      const data = res.data
      await cacheSet(appKey(id), { data, cachedAt: Date.now() })
      await cacheAppendToSet(INDEX_KEY, id)
      return { data, fromCache: false }
    } catch {
      // fall through
    }
  }

  const cached = await cacheGet(appKey(id))
  if (cached?.data) return { data: cached.data, fromCache: true, cachedAt: cached.cachedAt }
  throw new Error("Not available offline")
}
