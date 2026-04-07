function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

async function fetchJson(url, { headers, timeoutMs } = {}) {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null
  const t = ctrl && timeoutMs ? setTimeout(() => ctrl.abort(), timeoutMs) : null

  let res
  try {
    res = await fetch(url, {
      method: "GET",
      signal: ctrl ? ctrl.signal : undefined,
      headers: {
        Accept: "application/json",
        ...(headers || {}),
      },
    })
  } finally {
    if (t) clearTimeout(t)
  }

  const text = await res.text()
  const data = text ? safeJsonParse(text, null) : null

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Request failed (${res.status})`
    const err = new Error(msg)
    err.status = res.status
    throw err
  }

  return data
}

export function normalizeGitHubUsername(raw) {
  return String(raw || "")
    .trim()
    .replace(/^@/, "")
}

export function normalizeLeetCodeUsername(raw) {
  return String(raw || "").trim()
}

export async function fetchGitHubProfile(username) {
  const u = normalizeGitHubUsername(username)
  if (!u) throw new Error("GitHub username is required")

  const data = await fetchJson(`https://api.github.com/users/${encodeURIComponent(u)}`)
  return {
    login: data?.login || u,
    name: data?.name || "",
    avatarUrl: data?.avatar_url || "",
    htmlUrl: data?.html_url || "",
    bio: data?.bio || "",
    company: data?.company || "",
    location: data?.location || "",
    publicRepos: Number(data?.public_repos) || 0,
    followers: Number(data?.followers) || 0,
    following: Number(data?.following) || 0,
  }
}

// Uses a public proxy API (no auth) to fetch contributions.
// Response shape varies by provider, so we normalize to [{ date: 'YYYY-MM-DD', count: number }]
export async function fetchGitHubContributions90d(username) {
  const u = normalizeGitHubUsername(username)
  if (!u) throw new Error("GitHub username is required")

  // Common public endpoint used in many projects.
  const raw = await fetchJson(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(u)}?y=last`)

  const days = []
  // jogruber: { contributions: [{ date: 'YYYY-MM-DD', count: n, level: n }, ...] }
  const arr = Array.isArray(raw?.contributions) ? raw.contributions : []
  for (const d of arr) {
    if (!d?.date) continue
    days.push({ date: d.date, count: Number(d.count) || 0 })
  }

  // keep last 90 by date order (API typically returns chronological)
  return days.slice(-90)
}

export async function fetchLeetCodeProfile(username) {
  const u = normalizeLeetCodeUsername(username)
  if (!u) throw new Error("LeetCode username is required")

  const endpoints = [
    `https://leetcode-stats-api.herokuapp.com/${encodeURIComponent(u)}`,
    `https://leetcode-api-faisalshohag.vercel.app/${encodeURIComponent(u)}`,
    `https://alfa-leetcode-api.onrender.com/${encodeURIComponent(u)}`,
  ]

  let raw = null
  let lastErr = null
  for (const url of endpoints) {
    try {
      raw = await fetchJson(url, { timeoutMs: 12000 })
      lastErr = null
      break
    } catch (e) {
      lastErr = e
      const status = Number(e?.status) || 0
      // If the username doesn't exist, don't bother trying other providers.
      if (status === 404) break
      // For transient errors (5xx/429), try next provider.
      if (status >= 500 || status === 429) continue
      // Unknown client-side error: try next provider anyway.
    }
  }

  if (!raw) {
    const status = Number(lastErr?.status) || 0
    if (status >= 500) throw new Error("LeetCode stats service is temporarily unavailable. Try again in a bit.")
    throw new Error(lastErr?.message || "LeetCode sync failed")
  }

  // Normalize across different public proxy shapes.
  const pickNum = (...vals) => {
    for (const v of vals) {
      const n = Number(v)
      if (!Number.isNaN(n) && Number.isFinite(n)) return n
    }
    return 0
  }

  const totalSolved = pickNum(raw?.totalSolved, raw?.solved, raw?.solvedTotal, raw?.totalSolvedCount)
  const totalQuestions = pickNum(raw?.totalQuestions, raw?.total, raw?.totalQuestionsCount)

  const easySolved = pickNum(raw?.easySolved, raw?.easy, raw?.easySolvedCount)
  const totalEasy = pickNum(raw?.totalEasy, raw?.easyTotal, raw?.totalEasyCount)

  const mediumSolved = pickNum(raw?.mediumSolved, raw?.medium, raw?.mediumSolvedCount)
  const totalMedium = pickNum(raw?.totalMedium, raw?.mediumTotal, raw?.totalMediumCount)

  const hardSolved = pickNum(raw?.hardSolved, raw?.hard, raw?.hardSolvedCount)
  const totalHard = pickNum(raw?.totalHard, raw?.hardTotal, raw?.totalHardCount)

  // submissionCalendar is usually an object keyed by unix seconds -> count.
  let cal = null
  if (raw?.submissionCalendar && typeof raw.submissionCalendar === "object") {
    cal = raw.submissionCalendar
  } else if (typeof raw?.submissionCalendar === "string") {
    const parsed = safeJsonParse(raw.submissionCalendar, null)
    if (parsed && typeof parsed === "object") cal = parsed
  } else if (raw?.data?.submissionCalendar && typeof raw.data.submissionCalendar === "object") {
    cal = raw.data.submissionCalendar
  }

  const entries = cal ? Object.entries(cal) : []

  const days = entries
    .map(([k, v]) => {
      const ts = Number(k) * 1000
      const d = new Date(ts)
      if (Number.isNaN(d.getTime())) return null
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, "0")
      const dd = String(d.getDate()).padStart(2, "0")
      return { date: `${yyyy}-${mm}-${dd}`, count: Number(v) || 0 }
    })
    .filter(Boolean)
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  return {
    username: u,
    totalSolved,
    totalQuestions,
    easySolved,
    totalEasy,
    mediumSolved,
    totalMedium,
    hardSolved,
    totalHard,
    acceptanceRate: raw?.acceptanceRate || raw?.acceptance || "",
    ranking: raw?.ranking || raw?.rank || "",
    contributionPoints: raw?.contributionPoints || "",
    reputation: raw?.reputation || "",
    submissionDays90d: entries.length ? days.slice(-90) : [],
  }
}
