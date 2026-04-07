import localforage from "localforage"

const store = localforage.createInstance({
  name: "capsule",
  storeName: "offline",
  description: "Offline cache for Capsule",
})

export async function cacheSet(key, value) {
  try {
    await store.setItem(key, value)
  } catch {
    // ignore cache failures
  }
}

export async function cacheGet(key) {
  try {
    return await store.getItem(key)
  } catch {
    return null
  }
}

export async function cacheRemove(key) {
  try {
    await store.removeItem(key)
  } catch {
    // ignore
  }
}

export async function cacheAppendToSet(key, value) {
  try {
    const current = (await store.getItem(key)) || []
    if (!Array.isArray(current)) {
      await store.setItem(key, [value])
      return
    }
    if (!current.includes(value)) current.push(value)
    await store.setItem(key, current)
  } catch {
    // ignore
  }
}
