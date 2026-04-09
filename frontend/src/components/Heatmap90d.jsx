function clamp(n, min, max) {
  const x = Number(n)
  if (Number.isNaN(x)) return min
  return Math.max(min, Math.min(max, x))
}

function ymdLocal(d) {
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function startOfDayLocal(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDaysLocal(d, days) {
  const x = new Date(d.getTime())
  x.setDate(x.getDate() + days)
  return x
}

function cellClass(count, tone) {
  const n = Number(count) || 0
  if (n <= 0) return "bg-dark-800/30 border-dark-700"

  // 1..4
  const level = clamp(Math.ceil(Math.log2(n + 1)), 1, 4)
  const base = tone === "success" ? "success" : "primary"

  if (base === "success") {
    if (level === 1) return "bg-success-500/10 border-success-500/20"
    if (level === 2) return "bg-success-500/15 border-success-500/25"
    if (level === 3) return "bg-success-500/25 border-success-500/30"
    return "bg-success-500/35 border-success-500/40"
  }

  if (level === 1) return "bg-teal-500/10 border-teal-500/18"
  if (level === 2) return "bg-emerald-500/10 border-emerald-500/18"
  if (level === 3) return "bg-emerald-500/16 border-emerald-500/22"
  return "bg-emerald-500/22 border-emerald-500/26"
}

export default function Heatmap90d({ days, tone = "primary" }) {
  const map = new Map()
  for (const d of Array.isArray(days) ? days : []) {
    if (!d?.date) continue
    map.set(String(d.date), Number(d.count) || 0)
  }

  const today = startOfDayLocal(new Date())
  const start = addDaysLocal(today, -(90 - 1))

  const items = []
  for (let i = 0; i < 90; i++) {
    const date = ymdLocal(addDaysLocal(start, i))
    items.push({ date, count: map.get(date) || 0 })
  }

  // Monday-first padding.
  const pad = (start.getDay() + 6) % 7
  const cells = Array.from({ length: pad }).map(() => null).concat(items)
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const total = items.reduce((sum, x) => sum + (Number(x.count) || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-textSecondary">Last 90 days</div>
        <div className="text-sm text-textSecondary">Total: <span className="text-textPrimary font-semibold">{total}</span></div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="inline-flex gap-1">
          {weeks.map((w, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {w.map((c, ci) => {
                if (!c) return <div key={ci} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                const title = `${c.date} • ${c.count}`
                return (
                  <div
                    key={ci}
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border ${cellClass(c.count, tone)}`}
                    title={title}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
