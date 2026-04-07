import { useEffect, useState } from "react"
import { createApplication } from "../api/createApplication"
import { deleteApplication } from "../api/deleteApplication"
import { useNavigate } from "react-router-dom"
import { useOnlineStatus } from "../hooks/useOnlineStatus"
import { listApplications } from "../repo/applicationsRepo"
import { getToken } from "../utils/auth"
import Toast from "../components/Toast"
import ConfirmDialog from "../components/ConfirmDialog"

// Icons
const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const BriefcaseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const LoadingSpinner = () => (
  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

function Dashboard() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState({ open: false, message: "", tone: "error" })
  const [confirm, setConfirm] = useState({ open: false, id: null })
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [statusFilter, setStatusFilter] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState({
    company: "",
    role: "",
    status: "",
    skill: "",
    fromDate: "",
    toDate: ""
  })

  const navigate = useNavigate()
  const online = useOnlineStatus()
  const token = getToken()

  const [formData, setFormData] = useState({
    company: "",
    role: "",
    jobDescription: "",
    appliedDate: "",
    source: "",
    jobUrl: "",
    location: "",
  })

  const loadApplications = async () => {
    try {
      setLoading(true)

      const { data } = await listApplications({
        page,
        size: 9,
        statusFilter,
        filters,
      })

      setApplications(data.content || [])
      setTotalPages(data.totalPages || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const delay = setTimeout(() => {
      loadApplications()
    }, 300)

    return () => clearTimeout(delay)
  }, [page, statusFilter, filters])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") loadApplications()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [page, statusFilter, filters])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.company.trim()) errors.company = "Company is required"
    if (!formData.role.trim()) errors.role = "Role is required"
    if (!formData.jobDescription.trim()) errors.jobDescription = "Job description is required"
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      setSubmitting(true)
      setFormErrors({})

      const payload = { ...formData }
      if (!payload.appliedDate) delete payload.appliedDate
      if (!payload.source) delete payload.source
      if (!payload.jobUrl) delete payload.jobUrl
      if (!payload.location) delete payload.location

      await createApplication(payload)

      setShowModal(false)
      setFormData({
        company: "",
        role: "",
        jobDescription: "",
        appliedDate: "",
        source: "",
        jobUrl: "",
        location: "",
      })

      setPage(0)
      loadApplications()
    } catch (err) {
      setToast({ open: true, message: "Could not create application. Please try again.", tone: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    setConfirm({ open: true, id })
  }

  const confirmDelete = async () => {
    const id = confirm.id
    setConfirm({ open: false, id: null })
    if (!id) return

    try {
      await deleteApplication(id)
      setToast({ open: true, message: "Application deleted.", tone: "success" })
      loadApplications()
    } catch {
      setToast({ open: true, message: "Could not delete application. Please try again.", tone: "error" })
    }
  }

  const clearFilters = () => {
    setFilters({
      company: "",
      role: "",
      status: "",
      skill: "",
      fromDate: "",
      toDate: "",
    })
    setStatusFilter("")
    setPage(0)
  }

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "APPLIED", label: "Applied" },
    { value: "OA", label: "Online Assessment" },
    { value: "INTERVIEW", label: "Interview" },
    { value: "OFFER", label: "Offer" },
    { value: "REJECTED", label: "Rejected" },
  ]

  return (
    <div className="space-y-6">
      <Toast
        open={toast.open}
        message={toast.message}
        tone={toast.tone}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />

      <ConfirmDialog
        open={confirm.open}
        title="Delete application?"
        message="This will permanently remove it."
        confirmText="Delete"
        cancelText="Cancel"
        tone="danger"
        onCancel={() => setConfirm({ open: false, id: null })}
        onConfirm={confirmDelete}
      />

      {!token && !online && (
        <div className="mb-2 px-4 py-3 rounded-2xl border border-warning-500/30 bg-warning-500/10 text-warning-300">
          Offline read-only mode. Some actions are disabled until you sign in again.
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Job Tracker</h1>
          <p className="text-dark-400 mt-1">Track and manage your job applications</p>
        </div>
        <button
          onClick={() => {
            if (!online) return
            setShowModal(true)
          }}
          disabled={!online}
          className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon />
          <span>New Application</span>
        </button>
      </div>

      {/* Filters Section */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Search input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search by company..."
              value={filters.company}
              onChange={(e) => setFilters({ ...filters, company: e.target.value })}
              className="input-field pl-12"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(0)
              setStatusFilter(e.target.value)
            }}
            className="select-field w-full sm:w-48"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Toggle advanced filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary w-full sm:w-auto flex items-center justify-center gap-2 ${showFilters ? 'bg-primary-500/20 border-primary-500/30' : ''}`}
          >
            <FilterIcon />
            <span>Filters</span>
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-dark-700 animate-fade-in-down">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-dark-400 mb-2">Role</label>
                <input
                  type="text"
                  placeholder="e.g. Software Engineer"
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-2">Skill</label>
                <input
                  type="text"
                  placeholder="e.g. JAVA, PYTHON"
                  value={filters.skill}
                  onChange={(e) => setFilters({ ...filters, skill: e.target.value.toUpperCase() })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-2">From Date</label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-2">To Date</label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={clearFilters} className="btn-ghost text-sm">
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Applications Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
          <span className="ml-3 text-dark-400">Loading applications...</span>
        </div>
      ) : applications.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <BriefcaseIcon />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No applications found</h3>
          <p className="text-dark-400 mb-6">
            {statusFilter || filters.company
              ? "Try adjusting your filters"
              : "Start tracking your job applications"}
          </p>
          {!statusFilter && !filters.company && (
            <button
              onClick={() => online && setShowModal(true)}
              disabled={!online}
              className="btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add your first application
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {applications.map((app, index) => (
            <ApplicationCard
              key={app.id}
              app={app}
              index={index}
              online={online}
              onDelete={handleDelete}
              onClick={() => navigate(`/applications/${app.id}`)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide py-1">
          <button
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="btn-secondary p-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon />
          </button>
          
          <div className="flex items-center gap-1">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-10 h-10 rounded-xl font-medium transition-all ${
                  page === i
                    ? 'bg-primary-500 text-white'
                    : 'text-dark-400 hover:bg-dark-700'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            disabled={page + 1 >= totalPages}
            onClick={() => setPage(page + 1)}
            className="btn-secondary p-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon />
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal
          formData={formData}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          close={() => setShowModal(false)}
          formErrors={formErrors}
          submitting={submitting}
        />
      )}
    </div>
  )
}

function ApplicationCard({ app, index, onDelete, onClick, online }) {
  return (
    <div
      onClick={onClick}
      className="card cursor-pointer group animate-fade-in-up hover:border-primary-500/30"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-white truncate group-hover:text-primary-400 transition-colors">
            {app.company}
          </h3>
          <p className="text-sm sm:text-base text-dark-400 truncate">{app.role}</p>
        </div>
        <StatusBadge status={app.status} />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-dark-400">
          <CalendarIcon />
          <span>Applied: {app.appliedDate || 'Not set'}</span>
        </div>
        {app.interviews?.length > 0 && (
          <div className="flex items-center gap-2 text-dark-400">
            <BriefcaseIcon />
            <span>{app.interviews.length} interview{app.interviews.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {app.extractedSkills?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {app.extractedSkills.slice(0, 4).map((skill, i) => (
            <span
              key={i}
              className="text-xs px-2 py-1 bg-dark-700 text-dark-300 rounded-lg"
            >
              {skill}
            </span>
          ))}
          {app.extractedSkills.length > 4 && (
            <span className="text-xs px-2 py-1 text-dark-500">
              +{app.extractedSkills.length - 4} more
            </span>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-dark-700 flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          className="text-sm text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1 transition-colors"
        >
          View details
          <ArrowRightIcon />
        </button>
        <button
          onClick={(e) => onDelete(app.id, e)}
          disabled={!online}
          className="p-2 text-dark-500 hover:text-danger-400 hover:bg-danger-500/10 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-dark-500"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    APPLIED: "badge-applied",
    OA: "badge-oa",
    INTERVIEW: "badge-interview",
    OFFER: "badge-offer",
    REJECTED: "badge-rejected",
  }

  return (
    <span className={`badge ${styles[status] || "bg-dark-600 text-dark-300"}`}>
      {status}
    </span>
  )
}

function Modal({ formData, handleChange, handleSubmit, close, formErrors, submitting }) {
  const sourceOptions = [
    { value: "", label: "Select source..." },
    { value: "COMPANY_SITE", label: "Company Website" },
    { value: "LINKEDIN", label: "LinkedIn" },
    { value: "REFERRAL", label: "Referral" },
    { value: "RECRUITER", label: "Recruiter" },
    { value: "JOB_BOARD", label: "Job Board" },
    { value: "OTHER", label: "Other" },
  ]

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">New Application</h2>
          <button
            onClick={close}
            className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-xl transition-all"
          >
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Company *
              </label>
              <input
                name="company"
                placeholder="e.g. Google"
                value={formData.company}
                onChange={handleChange}
                className="input-field"
              />
              {formErrors.company && (
                <p className="text-danger-400 text-xs mt-1">{formErrors.company}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Role *
              </label>
              <input
                name="role"
                placeholder="e.g. Software Engineer"
                value={formData.role}
                onChange={handleChange}
                className="input-field"
              />
              {formErrors.role && (
                <p className="text-danger-400 text-xs mt-1">{formErrors.role}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Job Description *
            </label>
            <textarea
              name="jobDescription"
              placeholder="Paste the job description here for skill extraction..."
              value={formData.jobDescription}
              onChange={handleChange}
              className="input-field min-h-[120px] resize-y"
              rows="4"
            />
            {formErrors.jobDescription && (
              <p className="text-danger-400 text-xs mt-1">{formErrors.jobDescription}</p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Applied Date
              </label>
              <input
                type="date"
                name="appliedDate"
                value={formData.appliedDate}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Source
              </label>
              <select
                name="source"
                value={formData.source}
                onChange={handleChange}
                className="select-field"
              >
                {sourceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Location
              </label>
              <input
                name="location"
                placeholder="e.g. San Francisco, CA"
                value={formData.location}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Job URL
              </label>
              <input
                name="jobUrl"
                placeholder="https://..."
                value={formData.jobUrl}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-dark-700">
            <button
              type="button"
              onClick={close}
              disabled={submitting}
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <LoadingSpinner />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Application</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Dashboard
