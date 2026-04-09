import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { fetchProfessionalAnalytics } from "../api/analytics"
import { useOnlineStatus } from "../hooks/useOnlineStatus"
import { toUserMessage } from "../utils/errorMessage"
import Button from "../mobile/ui/Button"
import { useTopBarActions } from "../mobile/chrome"
import { listApplications } from "../repo/applicationsRepo"

const LoadingSpinner = () => (
  <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d, days) {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

function formatLocalISODate(d) {
  const x = new Date(d)
  const yyyy = x.getFullYear()
  const mm = String(x.getMonth() + 1).padStart(2, "0")
  const dd = String(x.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function daysBetween(a, b) {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime()
  return Math.round(ms / 86400000)
}

function dayName(i) {
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  return names[i] || "-"
}

function classifyRole(role) {
  const r = String(role || "").toLowerCase()
  if (r.includes("backend") || r.includes("back-end") || r.includes("server") || r.includes("api")) return "Backend"
  if (r.includes("frontend") || r.includes("front-end") || r.includes("ui") || r.includes("react")) return "Frontend"
  if (r.includes("full") || r.includes("fullstack") || r.includes("full-stack")) return "Full-stack"
  if (r.includes("data") || r.includes("ml") || r.includes("ai") || r.includes("analytics")) return "Data"
  if (r.includes("devops") || r.includes("sre") || r.includes("platform")) return "Platform"
  return "Other"
}

function clampPct(n) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

function formatDelta(n, unit = "") {
  const x = Number(n || 0)
  if (x > 0) return `+${x}${unit}`
  if (x < 0) return `${x}${unit}`
  return `0${unit}`
}

function pluralize(n, singular, plural) {
  return Number(n) === 1 ? singular : plural
}

function formatMaybeDecimal(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return "0"
  if (Math.abs(x % 1) < 1e-9) return String(Math.trunc(x))
  return x.toFixed(1)
}

function Analytics() {
  const online = useOnlineStatus()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [overall, setOverall] = useState(null)
  const [weekCompare, setWeekCompare] = useState(null)
  const [appsInfo, setAppsInfo] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useTopBarActions(
    <Button
      variant="secondary"
      size="sm"
      className="px-4 rounded-2xl"
      disabled={!online}
      onClick={() => setReloadKey((k) => k + 1)}
      aria-label="Refresh analytics"
    >
      Refresh
    </Button>,
    [online]
  )

  useEffect(() => {
    const load = async () => {
      try {
        if (!online) {
          setOverall(null)
          setWeekCompare(null)
          setAppsInfo(null)
          setError("")
          setLoading(false)
          return
        }

        setLoading(true)
        setError("")

        const today = startOfDay(new Date())
        const currentFrom = addDays(today, -6)
        const currentTo = today
        const prevFrom = addDays(today, -13)
        const prevTo = addDays(today, -7)

        const [overallRes, currentWeekRes, prevWeekRes, appsRes] = await Promise.all([
          fetchProfessionalAnalytics({ groupBy: "month", topN: 10 }),
          fetchProfessionalAnalytics({
            from: formatLocalISODate(currentFrom),
            to: formatLocalISODate(currentTo),
            groupBy: "day",
            topN: 10,
          }),
          fetchProfessionalAnalytics({
            from: formatLocalISODate(prevFrom),
            to: formatLocalISODate(prevTo),
            groupBy: "day",
            topN: 10,
          }),
          listApplications({ page: 0, size: 200, statusFilter: "", filters: {} }),
        ])

        setOverall(overallRes.data)
        setWeekCompare({ current: currentWeekRes.data, previous: prevWeekRes.data })
        setAppsInfo(appsRes?.data || null)
      } catch (e) {
        setError(toUserMessage(e, "Couldn't load analytics right now. Please try again."))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [online, reloadKey])

  const derived = useMemo(() => {
    const overview = overall?.overview
    const total = overview?.totalApplications ?? 0
    const current = overview?.currentStatusCounts || {}
    const reached = overview?.reachedStageCounts || {}

    const interviews = reached.INTERVIEW ?? 0
    const rejections = current.REJECTED ?? 0
    const responseRate = overview?.interviewRate ?? (total > 0 ? (interviews / total) * 100 : 0)

    const wc = weekCompare || {}
    const thisWeekApplied = wc.current?.overview?.totalApplications ?? 0
    const prevWeekApplied = wc.previous?.overview?.totalApplications ?? 0
    const appliedDelta = thisWeekApplied - prevWeekApplied

    const thisWeekResponse = wc.current?.overview?.interviewRate ?? 0
    const prevWeekResponse = wc.previous?.overview?.interviewRate ?? 0
    const responseDelta = thisWeekResponse - prevWeekResponse

    const apps = appsInfo?.content || []
    const today = startOfDay(new Date())
    const from7 = addDays(today, -6)
    const from14 = addDays(today, -13)
    const prevTo = addDays(today, -7)

    let lastAppliedAt = null
    const dowCounts = new Array(7).fill(0)

    const byRole = new Map()
    let weekdayTotal = 0
    let weekdayResponded = 0
    let weekendTotal = 0
    let weekendResponded = 0

    const isResponded = (app) => {
      const s = String(app?.status || "")
      return s && s !== "APPLIED"
    }

    let appliedLast7 = 0
    let appliedPrev7 = 0

    for (const app of apps) {
      const ad = app?.appliedDate ? startOfDay(new Date(app.appliedDate)) : null
      if (ad) {
        if (ad >= from7 && ad <= today) appliedLast7++
        else if (ad >= from14 && ad <= prevTo) appliedPrev7++

        if (!lastAppliedAt || ad > lastAppliedAt) lastAppliedAt = ad
        dowCounts[ad.getDay()] = (dowCounts[ad.getDay()] || 0) + 1
      }

      const category = classifyRole(app?.role)
      const prev = byRole.get(category) || { total: 0, responded: 0 }
      prev.total += 1
      if (isResponded(app)) prev.responded += 1
      byRole.set(category, prev)

      if (ad) {
        const dow = ad.getDay()
        const weekend = dow === 0 || dow === 6
        if (weekend) {
          weekendTotal += 1
          if (isResponded(app)) weekendResponded += 1
        } else {
          weekdayTotal += 1
          if (isResponded(app)) weekdayResponded += 1
        }
      }
    }

    let mostActive = 0
    for (let i = 1; i < dowCounts.length; i++) {
      if ((dowCounts[i] || 0) > (dowCounts[mostActive] || 0)) mostActive = i
    }

    const daysSinceLast = lastAppliedAt ? daysBetween(lastAppliedAt, today) : null

    const roleBest = Array.from(byRole.entries())
      .map(([name, v]) => ({
        name,
        total: v.total,
        responded: v.responded,
        rate: v.total > 0 ? (v.responded / v.total) * 100 : 0,
      }))
      .filter((r) => r.total >= 4)
      .sort((a, b) => b.rate - a.rate)[0]

    const weekdayRate = weekdayTotal > 0 ? (weekdayResponded / weekdayTotal) * 100 : 0
    const weekendRate = weekendTotal > 0 ? (weekendResponded / weekendTotal) * 100 : 0

    const suggestions = []

    if (daysSinceLast != null && daysSinceLast >= 3) {
      suggestions.push({
        tone: "warning",
        title: `You haven't applied in ${daysSinceLast} days`,
        detail: "Add 1-2 applications today to keep momentum.",
        emphasis: true,
      })
    }

    const aging31 = (overall?.aging || []).find((b) => b.bucket === "31+")?.count || 0
    if (aging31 > 0) {
      suggestions.push({
        tone: "warning",
        title: `${aging31} open applications are 31+ days old`,
        detail: "Follow up or close them so your pipeline stays accurate.",
        emphasis: !suggestions.length,
      })
    }

    if (roleBest) {
      suggestions.push({
        tone: "good",
        title: `You get more responses from ${roleBest.name} roles`,
        detail: `${roleBest.rate.toFixed(0)}% response (${roleBest.responded}/${roleBest.total}). Prioritize similar postings.`,
        emphasis: !suggestions.length,
      })
    }

    if (weekdayTotal >= 10 && weekendTotal >= 4) {
      const diff = weekdayRate - weekendRate
      if (Math.abs(diff) >= 10) {
        suggestions.push({
          tone: diff > 0 ? "good" : "neutral",
          title: diff > 0 ? "Weekday applications perform better" : "Weekend applications perform better",
          detail: `${weekdayRate.toFixed(0)}% weekday vs ${weekendRate.toFixed(0)}% weekend response.`,
          emphasis: false,
        })
      }
    }

    const statusRows = [
      { key: "APPLIED", label: "Applied", count: current.APPLIED ?? 0, tone: "neutral" },
      { key: "OA", label: "OA", count: current.OA ?? 0, tone: "neutral" },
      { key: "INTERVIEW", label: "Interview", count: current.INTERVIEW ?? 0, tone: "good" },
      { key: "OFFER", label: "Offer", count: current.OFFER ?? 0, tone: "good" },
      { key: "REJECTED", label: "Rejected", count: current.REJECTED ?? 0, tone: "bad" },
    ].filter((r) => r.count > 0)

    const statusTotal = statusRows.reduce((acc, r) => acc + r.count, 0)

    const sampleNote = appsInfo?.totalElements && appsInfo.totalElements > apps.length ? "Insights use the most recent 200 applications." : ""

    return {
      total,
      interviews,
      rejections,
      responseRate,
      appliedLast7,
      appliedPrev7,
      appliedDelta,
      thisWeekResponse,
      prevWeekResponse,
      responseDelta,
      daysSinceLast,
      mostActiveDay: dayName(mostActive),
      statusRows,
      statusTotal,
      suggestions: suggestions.slice(0, 3),
      sampleNote,
    }
  }, [overall, weekCompare, appsInfo])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <LoadingSpinner />
        <span className="mt-4 text-dark-400">Loading analytics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card text-center py-16">
        <h3 className="text-xl font-semibold text-white mb-2">Error</h3>
        <p className="text-dark-400">{error}</p>
      </div>
    )
  }

  if (!online) {
    return (
      <div className="card text-center py-16">
        <h3 className="text-xl font-semibold text-white mb-2">Analytics requires internet</h3>
        <p className="text-dark-400">You're offline. You can still browse cached applications and interviews.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Desktop header (mobile uses TopBar actions) */}
      <div className="card overflow-hidden relative sm:block hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-surfaceAlt/25 to-teal-500/6" />
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Analytics</h1>
              <p className="text-dark-400 mt-1">Quick signal. Clear next actions.</p>
              {derived?.sampleNote ? <div className="text-xs text-dark-500 mt-2">{derived.sampleNote}</div> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={() => navigate("/job-tracker")}>Job Tracker</button>
              <button
                type="button"
                className="btn-secondary"
                disabled={!online}
                onClick={() => setReloadKey((k) => k + 1)}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total applications" value={derived.total} tone="neutral" />
        <StatCard label="Interviews" value={derived.interviews} tone="positive" />
        <StatCard label="Rejections" value={derived.rejections} tone="negative" />
        <StatCard label="Response rate" value={`${clampPct(derived.responseRate).toFixed(1)}%`} tone="neutral" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        <section className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-white">Weekly progress</h2>
          <p className="text-sm text-dark-400 mt-1">Text-only trends compared to last week.</p>
          <div className="mt-4 space-y-2">
            <SentenceTrend
              text={`Applied ${derived.appliedLast7} ${pluralize(derived.appliedLast7, "job", "jobs")} this week`}
              delta={derived.appliedDelta}
              suffix="vs last week"
            />
            <SentenceTrend
              text={`Response rate ${clampPct(derived.thisWeekResponse).toFixed(1)}% this week`}
              delta={derived.responseDelta}
              suffix="vs last week"
              unit="%"
            />
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-semibold text-white">Activity</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-dark-400">Last application</span>
              <span className="text-white font-medium tabular-nums">
                {derived.daysSinceLast == null
                  ? "-"
                  : `${derived.daysSinceLast} day${derived.daysSinceLast === 1 ? "" : "s"} ago`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-dark-400">Most active day</span>
              <span className="text-white font-medium">{derived.mostActiveDay || "-"}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Insights</h2>
            <p className="text-sm text-dark-400 mt-1">Simple suggestions that help you decide what to do next.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {derived.suggestions?.length ? (
            derived.suggestions.map((s) => (
              <InsightCard key={s.title} title={s.title} detail={s.detail} tone={s.tone} emphasis={s.emphasis} />
            ))
          ) : (
            <div className="sm:col-span-2 lg:col-span-3">
              <EmptyState message="No strong patterns yet. Add a few more applications and check back." />
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold text-white">Status breakdown</h2>
        <p className="text-sm text-dark-400 mt-1">Current pipeline snapshot.</p>

        <div className="mt-4 space-y-3">
          {derived.statusRows?.length ? (
            derived.statusRows.map((r) => (
              <BreakdownRow key={r.key} label={r.label} count={r.count} total={derived.statusTotal} tone={r.tone} />
            ))
          ) : (
            <EmptyState message="No applications yet." />
          )}
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value, tone }) {
  const dot =
    tone === "positive"
      ? "bg-emerald-400"
      : tone === "negative"
        ? "bg-danger-400"
        : "bg-dark-500"

  return (
    <div className="card">
      <div className="flex items-center gap-2 text-sm text-dark-400">
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        <span>{label}</span>
      </div>
      <div className="mt-3 text-4xl font-bold text-white tracking-tight tabular-nums">{value}</div>
    </div>
  )
}

function SentenceTrend({ text, delta, suffix, unit = "" }) {
  const n = Number(delta || 0)

  if (!Number.isFinite(n) || n === 0) {
    return <div className="text-sm text-dark-300">{text}</div>
  }

  const num = unit ? formatMaybeDecimal(n) : String(Math.trunc(n))
  const deltaText = `${n > 0 ? "+" : ""}${num}${unit}`
  const tone = n > 0 ? "text-emerald-300" : "text-rose-300"

  return (
    <div className="text-sm text-dark-300">
      {text}{" "}
      <span className={`text-xs font-medium tabular-nums ${tone}`} title={suffix || ""}>
        ({deltaText})
      </span>
    </div>
  )
}

function InsightCard({ title, detail, tone, emphasis }) {
  const left = tone === "good" ? "bg-emerald-400" : tone === "warning" ? "bg-warning-400" : "bg-dark-500"
  const wrap =
    emphasis
      ? "border-emerald-500/25 bg-emerald-500/5"
      : tone === "warning"
        ? "border-warning-500/30 bg-warning-500/10"
        : "border-dark-700 bg-dark-900/20"

  return (
    <div className={`rounded-2xl border ${wrap} p-4 flex gap-3 animate-fade-in-up`}>
      <div className={`w-1.5 rounded-full ${left}`} />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="mt-1 text-xs text-dark-300 leading-relaxed">{detail}</div>
      </div>
    </div>
  )
}

function BreakdownRow({ label, count, total, tone }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  const bar = tone === "good" ? "bg-emerald-500/60" : tone === "bad" ? "bg-rose-500/60" : "bg-white/25"

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-dark-300">{label}</div>
        <div className="text-sm text-white font-medium tabular-nums">{count}</div>
      </div>
      <div className="mt-2 h-2 rounded-full bg-dark-800/60 border border-dark-700 overflow-hidden">
        <div className={`h-full ${bar} transition-all duration-500`} style={{ width: `${clampPct(pct)}%` }} />
      </div>
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="rounded-2xl border border-dark-700 bg-dark-900/20 px-4 py-3 text-sm text-dark-300">{message}</div>
  )
}

export default Analytics
