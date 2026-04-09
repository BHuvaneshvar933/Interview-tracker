import { useEffect, useMemo, useState } from "react"
import { fetchProfessionalAnalytics } from "../api/analytics"
import { useOnlineStatus } from "../hooks/useOnlineStatus"
import { toUserMessage } from "../utils/errorMessage"
import Button from "../mobile/ui/Button"
import { useTopBarActions } from "../mobile/chrome"

import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"

// Icons
const TrendUpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const BriefcaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const LoadingSpinner = () => (
  <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

// Chart colors
const COLORS = {
  primary: '#3457b8',
  primaryLight: '#5b78d6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#a855f7',
  cyan: '#06b6d4',
  pink: '#ec4899',
}

const PIE_COLORS = ['#3457b8', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4']

// Custom tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-dark-400 text-sm mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey || entry.name} className="text-white font-semibold">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

function Analytics() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [pro, setPro] = useState(null)
  const online = useOnlineStatus()

  useTopBarActions(
    <Button
      variant="secondary"
      size="sm"
      className="px-4 rounded-2xl"
      disabled={!online}
      onClick={() => setFilters((f) => ({ ...f, from: "", to: "", groupBy: "month" }))}
      aria-label="Reset filters"
    >
      Reset
    </Button>,
    [online]
  )

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    groupBy: "month",
  })

  useEffect(() => {
    const load = async () => {
      try {
        if (!online) {
          setPro(null)
          setError("")
          setLoading(false)
          return
        }
        setLoading(true)
        setError("")

        const res = await fetchProfessionalAnalytics({
          from: filters.from || undefined,
          to: filters.to || undefined,
          groupBy: filters.groupBy,
          topN: 10,
        })

        setPro(res.data)
      } catch (e) {
        setError(toUserMessage(e, "Couldn't load analytics right now. Please try again."))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [filters.from, filters.to, filters.groupBy, online])

  const statusRows = useMemo(() => {
    const map = pro?.overview?.currentStatusCounts || {}
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({ status, count }))
  }, [pro])

  const appliedTrend = useMemo(() => {
    return (pro?.appliedTrend || []).map((p) => ({
      period: p.period,
      count: p.count,
    }))
  }, [pro])

  const timeToOffer = useMemo(() => {
    return (pro?.timeToOffer || []).map((b) => ({
      bucket: b.bucket,
      count: b.count,
    }))
  }, [pro])

  const aging = useMemo(() => {
    return (pro?.aging || []).map((b) => ({
      bucket: b.bucket,
      count: b.count,
    }))
  }, [pro])

  const funnelData = useMemo(() => {
    const map = pro?.overview?.reachedStageCounts || {}
    const ordered = ["APPLIED", "OA", "INTERVIEW", "OFFER", "REJECTED"]
    return ordered
      .filter((k) => map[k] !== undefined)
      .map((k) => ({ stage: k, count: map[k] }))
  }, [pro])

  const sourceData = useMemo(() => {
    return (pro?.sources || []).map((s) => ({
      name: s.source?.replace(/_/g, ' ') || 'Unknown',
      value: s.count,
    }))
  }, [pro])

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
        <p className="text-dark-400">
          You're offline. You can still browse cached applications and interviews.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Analytics</h1>
          <p className="text-dark-400 mt-1">Track your job search performance</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm text-dark-400 mb-2">From Date</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm text-dark-400 mb-2">To Date</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm text-dark-400 mb-2">Group By</label>
            <select
              value={filters.groupBy}
              onChange={(e) => setFilters((f) => ({ ...f, groupBy: e.target.value }))}
              className="select-field"
            >
              <option value="month">Month</option>
              <option value="day">Day</option>
            </select>
          </div>
          <div className="text-sm text-dark-500 pb-3">
            Set a date range for more precise insights
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<BriefcaseIcon />}
          iconBg="bg-primary-500/20 text-primary-400"
          label="Total Applications"
          value={pro?.overview?.totalApplications ?? 0}
        />
        <StatCard
          icon={<CalendarIcon />}
          iconBg="bg-warning-500/20 text-warning-400"
          label="Interview Rate"
          value={`${(pro?.overview?.interviewRate ?? 0).toFixed(1)}%`}
          trend={pro?.overview?.interviewRate > 20 ? "up" : null}
        />
        <StatCard
          icon={<CheckCircleIcon />}
          iconBg="bg-success-500/20 text-success-400"
          label="Offer Rate"
          value={`${(pro?.overview?.offerRate ?? 0).toFixed(1)}%`}
          trend={pro?.overview?.offerRate > 5 ? "up" : null}
        />
        <StatCard
          icon={<ClockIcon />}
          iconBg="bg-purple-500/20 text-purple-400"
          label="Median Days to Offer"
          value={pro?.overview?.medianDaysToOffer == null ? "-" : Math.round(pro.overview.medianDaysToOffer)}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Funnel Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Application Funnel</h3>
          {funnelData.length === 0 ? (
            <EmptyState message="No funnel data available" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#64748b" />
                  <YAxis dataKey="stage" type="category" stroke="#64748b" width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    fill={COLORS.primary}
                    radius={[0, 4, 4, 0]}
                    name="Applications"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Application Trend */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Application Trend</h3>
          {appliedTrend.length === 0 ? (
            <EmptyState message="No trend data available" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={appliedTrend}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="period" stroke="#64748b" />
                  <YAxis allowDecimals={false} stroke="#64748b" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke={COLORS.primary} 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorCount)"
                    name="Applications"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Current Status */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Current Status Distribution</h3>
          {statusRows.length === 0 ? (
            <EmptyState message="No status data" />
          ) : (
            <div className="space-y-3">
              {statusRows.map((row, index) => {
                const total = statusRows.reduce((acc, r) => acc + r.count, 0)
                const percentage = total > 0 ? (row.count / total) * 100 : 0
                return (
                  <div key={row.status}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-dark-300 text-sm">{row.status}</span>
                      <span className="text-white font-medium">{row.count}</span>
                    </div>
                    <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: PIE_COLORS[index % PIE_COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sources Pie Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Application Sources</h3>
          {sourceData.length === 0 ? (
            <EmptyState message="No source data" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {sourceData.slice(0, 4).map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    <span className="text-dark-400">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Companies */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Top Companies</h3>
          {(pro?.topCompanies || []).length === 0 ? (
            <EmptyState message="No company data" />
          ) : (
            <div className="space-y-3">
              {(pro.topCompanies || []).slice(0, 5).map((company, index) => (
                <div key={company.company} className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center text-xs font-medium bg-dark-700 text-dark-400 rounded-full">
                      {index + 1}
                    </span>
                    <span className="text-dark-200">{company.company}</span>
                  </div>
                  <span className="text-white font-medium">{company.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Time to Offer */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Time to Offer (Days)</h3>
          {timeToOffer.length === 0 ? (
            <EmptyState message="No offer timing data" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeToOffer}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="bucket" stroke="#64748b" />
                  <YAxis allowDecimals={false} stroke="#64748b" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    fill={COLORS.success}
                    radius={[4, 4, 0, 0]}
                    name="Offers"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Open Application Aging */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Open Application Aging</h3>
          {aging.length === 0 ? (
            <EmptyState message="No aging data" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aging}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="bucket" stroke="#64748b" />
                  <YAxis allowDecimals={false} stroke="#64748b" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    fill={COLORS.warning}
                    radius={[4, 4, 0, 0]}
                    name="Applications"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Top Skills */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Most Requested Skills</h3>
        {(pro?.topSkills || []).length === 0 ? (
          <EmptyState message="No skill data extracted" />
        ) : (
          <div className="flex flex-wrap gap-3">
            {(pro.topSkills || []).map((skill) => (
              <div 
                key={skill.skill} 
                className="flex items-center gap-2 px-4 py-2 bg-dark-700 rounded-xl"
              >
                <span className="text-dark-200">{skill.skill}</span>
                <span className="text-xs px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded-full">
                  {skill.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, iconBg, label, value, trend }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${iconBg}`}>
          {icon}
        </div>
        {trend === "up" && (
          <div className="text-success-400">
            <TrendUpIcon />
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-dark-400 text-sm">{label}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
      </div>
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-dark-500">
      <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  )
}

export default Analytics
