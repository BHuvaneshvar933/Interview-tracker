import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { deleteApplication } from "../api/deleteApplication"
import { updateApplication } from "../api/updateApplication.js"
import { addInterview } from "../api/addInterview"
import { useOnlineStatus } from "../hooks/useOnlineStatus"
import { getApplication } from "../repo/applicationsRepo"
import { getToken } from "../utils/auth"

// Icons
const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
)

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const BriefcaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const LinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
)

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const XCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const LoadingSpinner = () => (
  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

function ApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const token = getToken()

  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(null)
  const [showInterviewModal, setShowInterviewModal] = useState(false)
  const [interviewSubmitting, setInterviewSubmitting] = useState(false)
  const [interviewForm, setInterviewForm] = useState({
    roundName: "",
    interviewDate: "",
    result: "PENDING",
    notes: "",
  })

  const loadApplication = async () => {
    try {
      const res = await getApplication(id)
      setApplication(res.data)
      setFormData({
        company: res.data.company,
        role: res.data.role,
        status: res.data.status,
        appliedDate: res.data.appliedDate,
        jobDescription: res.data.jobDescription || "",
        source: res.data.source || "",
        jobUrl: res.data.jobUrl || "",
        location: res.data.location || "",
      })
    } catch (err) {
      setError(err?.message || "Failed to load application")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApplication()
  }, [id])

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this application?")) return
    try {
      await deleteApplication(id)
      navigate("/dashboard")
    } catch (err) {
      alert("Failed to delete application")
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...formData }
      if (!payload.appliedDate) delete payload.appliedDate
      await updateApplication(id, payload)
      setIsEditing(false)
      await loadApplication()
    } catch (err) {
      alert("Failed to update application")
    }
  }

  const handleInterviewSubmit = async (e) => {
    e.preventDefault()
    try {
      setInterviewSubmitting(true)
      await addInterview(id, interviewForm)
      setShowInterviewModal(false)
      setInterviewForm({ roundName: "", interviewDate: "", result: "PENDING", notes: "" })
      await loadApplication()
    } catch (err) {
      alert("Failed to add interview")
    } finally {
      setInterviewSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
        <span className="ml-3 text-dark-400">Loading application...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card text-center py-16">
        <XCircleIcon className="w-12 h-12 text-danger-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Error</h3>
        <p className="text-dark-400 mb-6">{error}</p>
        <button onClick={() => navigate("/dashboard")} className="btn-primary">
          Back to Dashboard
        </button>
      </div>
    )
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: <BriefcaseIcon /> },
    { id: "interviews", label: "Interviews", icon: <CalendarIcon />, count: application.interviews?.length },
    { id: "description", label: "Job Description", icon: <DocumentIcon /> },
    { id: "timeline", label: "Timeline", icon: <ClockIcon /> },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {!token && !online && (
        <div className="px-4 py-3 rounded-2xl border border-warning-500/30 bg-warning-500/10 text-warning-300">
          Offline read-only mode. Editing and deleting require internet + sign-in.
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-xl transition-all mt-1"
          >
            <ArrowLeftIcon />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl lg:text-3xl font-bold text-white">{application.company}</h1>
              <StatusBadge status={application.status} />
            </div>
            <p className="text-dark-400 text-lg">{application.role}</p>
            {application.location && (
              <p className="text-dark-500 text-sm mt-1">{application.location}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {application.jobUrl && (
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center gap-2"
            >
              <LinkIcon />
              <span className="hidden sm:inline">View Job</span>
            </a>
          )}
          <button
            onClick={() => online && setIsEditing(true)}
            disabled={!online}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <EditIcon />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            onClick={() => online && handleDelete()}
            disabled={!online}
            className="btn-danger flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrashIcon />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-700">
        <nav className="flex gap-1 overflow-x-auto pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? "text-primary-400 border-primary-400"
                  : "text-dark-400 border-transparent hover:text-white hover:border-dark-600"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-dark-700">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === "overview" && (
          <OverviewTab application={application} />
        )}
        {activeTab === "interviews" && (
          <InterviewsTab
            interviews={application.interviews}
            onAddClick={() => online && setShowInterviewModal(true)}
            canAdd={online}
          />
        )}
        {activeTab === "description" && (
          <DescriptionTab
            description={application.jobDescription}
            skills={application.extractedSkills}
          />
        )}
        {activeTab === "timeline" && (
          <TimelineTab application={application} />
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <EditModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleUpdate}
          onClose={() => setIsEditing(false)}
        />
      )}

      {/* Interview Modal */}
      {showInterviewModal && (
        <InterviewModal
          form={interviewForm}
          setForm={setInterviewForm}
          onSubmit={handleInterviewSubmit}
          onClose={() => setShowInterviewModal(false)}
          submitting={interviewSubmitting}
        />
      )}
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

function OverviewTab({ application }) {
  const infoItems = [
    { label: "Applied Date", value: application.appliedDate || "Not set" },
    { label: "Last Updated", value: application.lastUpdated || "N/A" },
    { label: "Source", value: application.source?.replace(/_/g, ' ') || "Not specified" },
    { label: "Interviews", value: `${application.interviews?.length || 0} recorded` },
  ]

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Application Details</h3>
        <div className="space-y-4">
          {infoItems.map((item) => (
            <div key={item.label} className="flex justify-between items-center py-2 border-b border-dark-700 last:border-0">
              <span className="text-dark-400">{item.label}</span>
              <span className="text-white font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Skills Required</h3>
        {application.extractedSkills?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {application.extractedSkills.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-lg text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-dark-500">No skills extracted from job description</p>
        )}
      </div>
    </div>
  )
}

function InterviewsTab({ interviews, onAddClick, canAdd }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Interview Rounds</h3>
        <button
          onClick={onAddClick}
          disabled={!canAdd}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon />
          <span>Add Interview</span>
        </button>
      </div>

      {interviews?.length === 0 ? (
        <div className="card text-center py-12">
          <CalendarIcon className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <h4 className="text-white font-medium mb-2">No interviews recorded</h4>
          <p className="text-dark-400 mb-4">Track your interview progress by adding rounds</p>
          <button onClick={onAddClick} className="btn-secondary">
            Add your first interview
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {interviews.map((interview, index) => (
            <div key={index} className="card hover:border-dark-600">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${
                    interview.result === 'PASSED' ? 'bg-success-500/20 text-success-400' :
                    interview.result === 'FAILED' ? 'bg-danger-500/20 text-danger-400' :
                    'bg-warning-500/20 text-warning-400'
                  }`}>
                    {interview.result === 'PASSED' ? <CheckCircleIcon /> :
                     interview.result === 'FAILED' ? <XCircleIcon /> :
                     <ClockIcon />}
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">{interview.roundName}</h4>
                    <p className="text-dark-400 text-sm">{interview.interviewDate}</p>
                    {interview.notes && (
                      <p className="text-dark-300 mt-2 text-sm">{interview.notes}</p>
                    )}
                  </div>
                </div>
                <span className={`badge ${
                  interview.result === 'PASSED' ? 'badge-offer' :
                  interview.result === 'FAILED' ? 'badge-rejected' :
                  'badge-interview'
                }`}>
                  {interview.result}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DescriptionTab({ description, skills }) {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 card">
        <h3 className="text-lg font-semibold text-white mb-4">Job Description</h3>
        {description ? (
          <div className="prose prose-invert max-w-none">
            <p className="text-dark-300 whitespace-pre-wrap leading-relaxed">{description}</p>
          </div>
        ) : (
          <p className="text-dark-500">No job description provided</p>
        )}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Extracted Skills</h3>
        {skills?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-dark-700 text-dark-200 rounded-lg text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-dark-500">No skills extracted</p>
        )}
      </div>
    </div>
  )
}

function TimelineTab({ application }) {
  const events = []

  // Add application created event
  if (application.appliedDate) {
    events.push({
      date: application.appliedDate,
      title: "Application Submitted",
      description: `Applied to ${application.company} for ${application.role}`,
      type: "applied",
    })
  }

  // Add status history events
  if (application.statusHistory?.length > 0) {
    application.statusHistory.forEach((event) => {
      events.push({
        date: event.changedAt?.split('T')[0] || 'Unknown',
        title: `Status: ${event.status}`,
        description: `Application status changed to ${event.status}`,
        type: event.status.toLowerCase(),
      })
    })
  }

  // Add interview events
  if (application.interviews?.length > 0) {
    application.interviews.forEach((interview) => {
      events.push({
        date: interview.interviewDate,
        title: interview.roundName,
        description: `Result: ${interview.result}${interview.notes ? ` - ${interview.notes}` : ''}`,
        type: "interview",
      })
    })
  }

  // Sort by date descending
  events.sort((a, b) => new Date(b.date) - new Date(a.date))

  const getEventStyle = (type) => {
    switch (type) {
      case 'applied': return 'bg-primary-500/20 border-primary-500 text-primary-400'
      case 'interview': return 'bg-warning-500/20 border-warning-500 text-warning-400'
      case 'offer': return 'bg-success-500/20 border-success-500 text-success-400'
      case 'rejected': return 'bg-danger-500/20 border-danger-500 text-danger-400'
      default: return 'bg-dark-700 border-dark-600 text-dark-400'
    }
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-6">Application Timeline</h3>
      
      {events.length === 0 ? (
        <p className="text-dark-500 text-center py-8">No timeline events recorded</p>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-dark-700" />
          
          <div className="space-y-6">
            {events.map((event, index) => (
              <div key={index} className="relative pl-10">
                <div className={`absolute left-0 w-8 h-8 rounded-full border-2 flex items-center justify-center ${getEventStyle(event.type)}`}>
                  <div className="w-2 h-2 rounded-full bg-current" />
                </div>
                <div className="card !p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-white font-medium">{event.title}</h4>
                      <p className="text-dark-400 text-sm mt-1">{event.description}</p>
                    </div>
                    <span className="text-dark-500 text-sm whitespace-nowrap">{event.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EditModal({ formData, setFormData, onSubmit, onClose }) {
  const statusOptions = ["APPLIED", "OA", "INTERVIEW", "OFFER", "REJECTED"]
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Edit Application</h2>
          <button
            onClick={onClose}
            className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-xl transition-all"
          >
            <XIcon />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="select-field"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Applied Date</label>
              <input
                type="date"
                value={formData.appliedDate}
                onChange={(e) => setFormData({ ...formData, appliedDate: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="select-field"
              >
                {sourceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Job URL</label>
            <input
              type="text"
              value={formData.jobUrl}
              onChange={(e) => setFormData({ ...formData, jobUrl: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Job Description</label>
            <textarea
              value={formData.jobDescription}
              onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
              className="input-field min-h-[120px] resize-y"
              rows="4"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-700">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function InterviewModal({ form, setForm, onSubmit, onClose, submitting }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Add Interview</h2>
          <button
            onClick={onClose}
            className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-xl transition-all"
          >
            <XIcon />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Round Name *</label>
            <input
              type="text"
              value={form.roundName}
              onChange={(e) => setForm({ ...form, roundName: e.target.value })}
              className="input-field"
              placeholder="e.g. Phone Screen, Technical Round"
              required
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Date *</label>
              <input
                type="date"
                value={form.interviewDate}
                onChange={(e) => setForm({ ...form, interviewDate: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Result</label>
              <select
                value={form.result}
                onChange={(e) => setForm({ ...form, result: e.target.value })}
                className="select-field"
              >
                <option value="PENDING">Pending</option>
                <option value="PASSED">Passed</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input-field min-h-[80px] resize-y"
              rows="3"
              placeholder="Add any notes about this interview..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-700">
            <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
              {submitting ? (
                <>
                  <LoadingSpinner />
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add Interview</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ApplicationDetail
