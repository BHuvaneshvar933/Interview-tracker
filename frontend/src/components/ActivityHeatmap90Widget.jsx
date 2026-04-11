function ymdLocal(d) {
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseYmdLocal(ymd) {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(ymd || ""))
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!y || !mo || !d) return null
  const dt = new Date(y, mo - 1, d)
  if (Number.isNaN(dt.getTime())) return null
  return dt
}

function startOfDayLocal(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDaysLocal(d, days) {
  const x = new Date(d.getTime())
  x.setDate(x.getDate() + days)
  return x
}

function baseRgbForTone(tone) {
  if (tone === "success") return [34, 197, 94] // green-500
  return [16, 185, 129] // emerald-500
}

function cellVisual({ count, maxActivity, tone }) {
  if (!count) {
    return {
      className: "bg-surfaceAlt/55",
      style: undefined,
      intensity: 0,
    }
  }

  const safeMax = Math.max(1, Number(maxActivity) || 1)
  const intensity = Math.max(0.15, (Number(count) || 0) / safeMax)
  const [r, g, b] = baseRgbForTone(tone)

  const alpha = Math.max(0, Math.min(0.9, intensity))
  const glow = intensity > 0.6
    ? {
        boxShadow: `0 0 0 1px rgba(${r}, ${g}, ${b}, 0.16), 0 10px 24px rgba(${r}, ${g}, ${b}, 0.18)`,
      }
    : null

  return {
    className: "",
    style: {
      backgroundColor: `rgba(${r}, ${g}, ${b}, ${alpha})`,
      ...(glow || {}),
    },
    intensity,
  }
}

export function Heatmap90Grid({
  days,
  title = "Activity Heatmap — Last 90 Days",
  unit = "actions",
  tone = "primary",
  showHeader = true,
}) {
  const map = new Map()
  for (const d of Array.isArray(days) ? days : []) {
    if (!d?.date) continue
    map.set(String(d.date), Number(d.count) || 0)
  }

  const today = startOfDayLocal(new Date())
  const start = addDaysLocal(today, -(90 - 1))

  const items = []
  for (let i = 0; i < 90; i += 1) {
    const date = ymdLocal(addDaysLocal(start, i))
    items.push({ date, count: map.get(date) || 0 })
  }

  const total = items.reduce((sum, x) => sum + (Number(x.count) || 0), 0)
  const maxActivity = Math.max(1, ...items.map((x) => Number(x.count) || 0))

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(30, minmax(0, 1fr))",
    gridTemplateRows: "repeat(3, minmax(0, 1fr))",
    gap: "3px",
    overflow: "hidden",
  }

  return (
    <div>
      {showHeader && (
        <div className="flex items-baseline justify-between gap-3 min-w-0">
          <div className="min-w-0 text-sm font-semibold text-textPrimary truncate">{title}</div>
          <div className="shrink-0 text-xs text-textMuted whitespace-nowrap">{total} total {unit}</div>
        </div>
      )}

      <div className={showHeader ? "mt-4" : "mt-2"} style={gridStyle}>
        {items.map((x) => {
          const dt = parseYmdLocal(x.date)
          const label = dt
            ? dt.toLocaleDateString(undefined, { month: "short", day: "numeric" })
            : x.date
          const tip = `${label}: ${x.count} ${unit}`
          const v = cellVisual({ count: x.count, maxActivity, tone })
          return (
            <div
              key={x.date}
              title={tip}
              className={
                `relative rounded-[3px] ${v.className} ` +
                "transition-[background-color,box-shadow,transform] duration-150 ease-out " +
                "transform-gpu sm:hover:scale-[1.4] sm:hover:z-10"
              }
              style={{
                aspectRatio: "1 / 1",
                ...(v.style || {}),
              }}
            />
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-textMuted gap-3">
        <div className="whitespace-nowrap">90 days ago</div>

        <div className="flex items-center gap-2 mx-auto">
          <div>Less</div>
          <div className="flex items-center" style={{ gap: "3px" }}>
            {[0, 0.15, 0.35, 0.6, 0.85].map((a) => {
              const [r, g, b] = baseRgbForTone(tone)
              const style = a <= 0
                ? { backgroundColor: "rgba(255,255,255,0.06)" }
                : { backgroundColor: `rgba(${r}, ${g}, ${b}, ${a})` }
              return (
                <div
                  key={a}
                  className="rounded-[3px]"
                  style={{ width: 10, height: 10, ...style }}
                />
              )
            })}
          </div>
          <div>More</div>
        </div>

        <div className="whitespace-nowrap">Today</div>
      </div>
    </div>
  )
}

export default function ActivityHeatmap90Widget({ days, tone = "primary" }) {
  return (
    <div className="glass-card p-4 sm:p-6 overflow-hidden">
      <Heatmap90Grid days={days} tone={tone} title="Activity Heatmap — Last 90 Days" unit="actions" />
    </div>
  )
}
