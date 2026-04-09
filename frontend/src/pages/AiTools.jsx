import { useEffect, useMemo, useState } from "react"
import { useOnlineStatus } from "../hooks/useOnlineStatus"
import { toUserMessage } from "../utils/errorMessage"
import Button from "../mobile/ui/Button"
import { useTopBarActions } from "../mobile/chrome"

import {
  analyzeResume,
  generateQuestions,
  listResumes,
  uploadResume,
} from "../api/ai"

const UploadIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
)

const SparkIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)

const LibraryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
)

const QuestionIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z" />
  </svg>
)


const LoadingSpinner = () => (
  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "-"
  const units = ["B", "KB", "MB", "GB"]
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

export default function AiTools() {
  const online = useOnlineStatus()
  const [tab, setTab] = useState("matcher")

  useTopBarActions(
    <Button
      variant="secondary"
      size="sm"
      className="px-4 rounded-2xl"
      disabled={!online}
      onClick={() => setTab("matcher")}
      aria-label="Resume matcher"
    >
      Matcher
    </Button>,
    [online]
  )

  const [resumesLoading, setResumesLoading] = useState(true)
  const [resumesError, setResumesError] = useState("")
  const [resumes, setResumes] = useState([])

  const refreshResumes = async () => {
    try {
      setResumesLoading(true)
      setResumesError("")
      const res = await listResumes()
      setResumes(res.data || [])
    } catch (e) {
      setResumesError(toUserMessage(e, "Failed to load resumes"))
    } finally {
      setResumesLoading(false)
    }
  }

  useEffect(() => {
    if (!online) return
    refreshResumes()
  }, [online])

  // (removed) resumesById was unused

  return (
    <div className="space-y-6">
      <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">AI Tools</h1>
          <p className="text-dark-400 mt-1">Resume matching, interview prep, and vector search</p>
        </div>
      </div>

      {!online && (
        <div className="card border-warning-500/30 bg-warning-500/10">
          <p className="text-warning-300">AI features require internet access.</p>
        </div>
      )}

      <div className="border-b border-dark-700">
        <nav className="flex gap-1 overflow-x-auto pb-px">
          <TabButton active={tab === "matcher"} onClick={() => setTab("matcher")} icon={<SparkIcon />}>
            Resume Matcher
          </TabButton>
          <TabButton active={tab === "questions"} onClick={() => setTab("questions")} icon={<QuestionIcon />}>
            Questions
          </TabButton>
          <TabButton active={tab === "library"} onClick={() => setTab("library")} icon={<LibraryIcon />}>
            Resume Library
          </TabButton>
        </nav>
      </div>

      {tab === "matcher" && (
        <ResumeMatcher online={online} onSavedResume={refreshResumes} />
      )}

      {tab === "questions" && (
        <QuestionGenerator
          online={online}
          resumesLoading={resumesLoading}
          resumesError={resumesError}
          resumes={resumes}
          onRefreshResumes={refreshResumes}
        />
      )}

      {tab === "library" && (
        <ResumeLibrary
          online={online}
          resumesLoading={resumesLoading}
          resumesError={resumesError}
          resumes={resumes}
          onRefreshResumes={refreshResumes}
        />
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 sm:px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-all ${
        active
          ? "text-emerald-300 border-emerald-400"
          : "text-dark-400 border-transparent hover:text-white hover:border-dark-600"
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function FileDrop({ file, setFile, disabled }) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (disabled) return
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        if (disabled) return
        const f = e.dataTransfer.files?.[0]
        if (f) setFile(f)
      }}
      className={`border-2 border-dashed rounded-2xl p-4 sm:p-6 transition-all ${
        disabled
          ? "border-dark-700 bg-dark-800/30 opacity-60"
          : dragOver
            ? "border-emerald-400 bg-emerald-500/10"
            : "border-dark-700 bg-dark-800/40 hover:border-dark-600"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="p-3 rounded-xl bg-dark-700 text-dark-200">
            <UploadIcon />
          </div>
          <div className="min-w-0">
            <div className="text-white font-semibold">Upload resume (PDF)</div>
            <div className="text-dark-400 text-sm">Drag & drop or browse. Stored securely per user.</div>
            {file && (
              <div className="mt-2 text-sm text-dark-200 min-w-0">
                <span className="font-medium break-all">{file.name}</span>{" "}
                <span className="text-dark-500">({formatBytes(file.size)})</span>
              </div>
            )}
          </div>
        </div>
        <label className={`btn-secondary cursor-pointer inline-flex items-center justify-center ${disabled ? "pointer-events-none" : ""}`}>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) setFile(f)
            }}
          />
          Browse
        </label>
      </div>
    </div>
  )
}

function ResumeMatcher({ online, onSavedResume }) {
  const [file, setFile] = useState(null)
  const [jobDescription, setJobDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState(null)

  const run = async () => {
    if (!file) {
      setError("Please upload a PDF resume")
      return
    }
    if (!jobDescription.trim()) {
      setError("Please paste a job description")
      return
    }

    try {
      setLoading(true)
      setError("")
      setResult(null)
      const res = await analyzeResume(file, jobDescription)
      setResult(res.data)
      onSavedResume?.()
    } catch (e) {
      setError(toUserMessage(e, "Failed to analyze resume"))
    } finally {
      setLoading(false)
    }
  }

  const score = result?.analysis?.matchScore
  const scorePct = typeof score === "number" ? clamp(score, 0, 100) : null

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-white">AI Resume-Job Matcher</h3>
          <p className="text-dark-400 text-sm mt-1">Upload a resume PDF and paste the job description.</p>
        </div>

        <FileDrop file={file} setFile={setFile} disabled={!online || loading} />

        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">Job Description</label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="input-field min-h-[140px] sm:min-h-[220px] resize-y"
            placeholder="Paste the job description here..."
            disabled={!online || loading}
          />
        </div>

        {error && (
          <div className="p-4 bg-danger-500/10 border border-danger-500/30 rounded-xl">
            <p className="text-danger-400 text-sm">{error}</p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={run}
                disabled={!online || loading}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => {
                  setError("")
                  setResult(null)
                }}
                className="btn-ghost"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={run}
            disabled={!online || loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <LoadingSpinner /> : <SparkIcon />}
            Analyze
          </button>
          {result?.resumeId && (
            <span className="text-dark-400 text-sm">
              Saved as resumeId: <span className="text-dark-200 font-mono">{result.resumeId}</span>
            </span>
          )}
        </div>
      </div>

       <div className="space-y-6 lg:sticky lg:top-6">
         <div className="card">
           <h3 className="text-lg font-semibold text-white mb-4">Match Score</h3>
          {scorePct == null ? (
            <EmptyPanel text="Run an analysis to see results." />
          ) : (
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-dark-700" />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(#3457b8 ${scorePct * 3.6}deg, #334155 0deg)`,
                  }}
                />
                <div className="absolute inset-2 rounded-full bg-dark-800 flex items-center justify-center">
                  <div className="text-white font-bold text-xl">{scorePct}</div>
                </div>
              </div>
              <div>
                <div className="text-dark-300">Overall match</div>
                <div className="text-dark-500 text-sm">Based on skills + keywords + requirements alignment</div>
              </div>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <SkillCard title="Matching Skills" skills={result?.analysis?.matchingSkills} tone="primary" />
          <SkillCard title="Missing Skills" skills={result?.analysis?.missingSkills} tone="danger" />
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-3">Gap Analysis</h3>
          {result?.analysis?.gapAnalysis ? (
            <p className="text-dark-300 leading-relaxed whitespace-pre-wrap">{result.analysis.gapAnalysis}</p>
          ) : (
            <EmptyPanel text="No gap analysis yet." />
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-3">Tailored Suggestions</h3>
          {Array.isArray(result?.analysis?.suggestions) && result.analysis.suggestions.length > 0 ? (
            <ul className="space-y-2">
              {result.analysis.suggestions.map((s, idx) => (
                <li key={idx} className="text-dark-300 flex gap-2">
                  <span className="text-emerald-300">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyPanel text="No suggestions yet." />
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-3">Keywords to Add</h3>
          {Array.isArray(result?.analysis?.keywordsToAdd) && result.analysis.keywordsToAdd.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {result.analysis.keywordsToAdd.map((k, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-dark-700 text-dark-200 rounded-lg text-sm">
                  {k}
                </span>
              ))}
            </div>
          ) : (
            <EmptyPanel text="No keywords yet." />
          )}
        </div>
      </div>
    </div>
  )
}

function SkillCard({ title, skills, tone }) {
  const border = tone === "danger" ? "border-danger-500/30" : "border-emerald-500/25"
  const bg = tone === "danger" ? "bg-danger-500/10" : "bg-emerald-500/10"
  const text = tone === "danger" ? "text-danger-300" : "text-emerald-200"

  return (
    <div className={`card ${border} ${bg}`}>
      <h4 className={`font-semibold ${text} mb-3`}>{title}</h4>
      {Array.isArray(skills) && skills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {skills.map((s, idx) => (
            <span key={idx} className="px-3 py-1.5 bg-dark-800/60 border border-dark-700 rounded-lg text-sm text-dark-200">
              {s}
            </span>
          ))}
        </div>
      ) : (
        <EmptyPanel text="No data" />
      )}
    </div>
  )
}

function QuestionGenerator({ online, resumesLoading, resumesError, resumes, onRefreshResumes }) {
  const [resumeId, setResumeId] = useState("")
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [difficulty, setDifficulty] = useState("mixed")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!resumeId && resumes?.length) setResumeId(resumes[0].resumeId)
  }, [resumes, resumeId])

  const run = async () => {
    if (!resumeId) {
      setError("Select a resume")
      return
    }
    if (!company.trim() || !role.trim()) {
      setError("Company and role are required")
      return
    }

    try {
      setLoading(true)
      setError("")
      setData(null)
      const res = await generateQuestions({ company, role, resumeId, difficulty })
      setData(res.data)
    } catch (e) {
      setError(toUserMessage(e, "Failed to generate questions"))
    } finally {
      setLoading(false)
    }
  }

  const grouped = useMemo(() => {
    const questions = data?.payload?.questions || []
    const out = { TECHNICAL: [], BEHAVIORAL: [], COMPANY: [], OTHER: [] }
    for (const q of questions) {
      const k = out[q.type] ? q.type : "OTHER"
      out[k].push(q)
    }
    return out
  }, [data])

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-white">AI Interview Question Generator</h3>
          <p className="text-dark-400 text-sm mt-1">Generates role-specific, behavioral, and company questions.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Resume</label>
            <select
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              className="select-field"
              disabled={!online || loading}
            >
              {resumes?.map((r) => (
                <option key={r.resumeId} value={r.resumeId}>
                  {r.fileName || r.resumeId}
                </option>
              ))}
            </select>
            {resumesLoading && <p className="text-xs text-dark-500 mt-2">Loading resumes...</p>}
            {resumesError && <p className="text-xs text-danger-400 mt-2">{resumesError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="select-field"
              disabled={!online || loading}
            >
              <option value="mixed">Mixed</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Company</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="input-field"
              placeholder="e.g. Amazon"
              disabled={!online || loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Role</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input-field"
              placeholder="e.g. Backend Engineer"
              disabled={!online || loading}
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-danger-500/10 border border-danger-500/30 rounded-xl">
            <p className="text-danger-400 text-sm">{error}</p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={run}
                disabled={!online || loading}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Try again
              </button>
              <button type="button" onClick={() => setError("")} className="btn-ghost">
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={run}
            disabled={!online || loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <LoadingSpinner /> : <QuestionIcon />}
            Generate
          </button>
          <button
            onClick={onRefreshResumes}
            disabled={!online || loading}
            className="btn-secondary"
          >
            Refresh resumes
          </button>
        </div>

        {!resumes?.length && online && (
          <div className="p-4 bg-dark-700/30 border border-dark-600 rounded-xl text-sm text-dark-300">
            Upload a resume in the Resume Library tab first.
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-3">Topics</h3>
          {Array.isArray(data?.payload?.topics) && data.payload.topics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.payload.topics.map((t, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-dark-700 text-dark-200 rounded-lg text-sm">
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <EmptyPanel text="Generate a pack to see topics." />
          )}
          {data?.questionSetId && (
            <p className="text-xs text-dark-500 mt-3">
              Saved questionSetId: <span className="font-mono text-dark-300">{data.questionSetId}</span>
            </p>
          )}
        </div>

        <QuestionGroup title="Technical" questions={grouped.TECHNICAL} tone="primary" />
        <QuestionGroup title="Behavioral" questions={grouped.BEHAVIORAL} tone="warning" />
        <QuestionGroup title="Company" questions={grouped.COMPANY} tone="success" />
        {grouped.OTHER.length > 0 && <QuestionGroup title="Other" questions={grouped.OTHER} />}
      </div>
    </div>
  )
}

function QuestionGroup({ title, questions, tone }) {
  const header =
    tone === "success"
      ? "text-success-300"
      : tone === "warning"
        ? "text-warning-300"
        : "text-emerald-200"

  return (
    <div className="card">
      <h3 className={`text-lg font-semibold mb-3 ${header}`}>{title} Questions</h3>
      {Array.isArray(questions) && questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-dark-700/30 border border-dark-600">
              <div className="flex items-center justify-between gap-4">
                <div className="text-white font-medium">{q.question}</div>
                <span className="text-xs px-2 py-1 rounded-full bg-dark-800 text-dark-300 border border-dark-600 whitespace-nowrap">
                  {q.difficulty || "-"}
                </span>
              </div>
              <div className="text-xs text-dark-500 mt-1">{q.topic}</div>
              {q.guidance && <div className="text-sm text-dark-300 mt-3">{q.guidance}</div>}
            </div>
          ))}
        </div>
      ) : (
        <EmptyPanel text="No questions yet." />
      )}
    </div>
  )
}

function ResumeLibrary({ online, resumesLoading, resumesError, resumes, onRefreshResumes }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  const doUpload = async () => {
    if (!file) {
      setError("Choose a PDF")
      return
    }
    try {
      setUploading(true)
      setError("")
      await uploadResume(file)
      setFile(null)
      await onRefreshResumes()
    } catch (e) {
      setError(toUserMessage(e, "Upload failed"))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-white">Resume Library</h3>
          <p className="text-dark-400 text-sm mt-1">Upload resumes once and reuse them for AI features.</p>
        </div>

        <FileDrop file={file} setFile={setFile} disabled={!online || uploading} />

        {error && (
          <div className="p-4 bg-danger-500/10 border border-danger-500/30 rounded-xl">
            <p className="text-danger-400 text-sm">{error}</p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={doUpload}
                disabled={!online || uploading}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Try again
              </button>
              <button type="button" onClick={() => setError("")} className="btn-ghost">
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={doUpload}
            disabled={!online || uploading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? <LoadingSpinner /> : <UploadIcon />}
            Upload
          </button>
          <button onClick={onRefreshResumes} disabled={!online || uploading} className="btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Your Resumes</h3>
          <button onClick={onRefreshResumes} disabled={!online} className="btn-ghost">
            Refresh
          </button>
        </div>

        {resumesLoading ? (
          <div className="flex items-center gap-3 text-dark-400 py-8">
            <LoadingSpinner />
            Loading...
          </div>
        ) : resumesError ? (
          <p className="text-danger-400 text-sm">{resumesError}</p>
        ) : resumes.length === 0 ? (
          <EmptyPanel text="No resumes uploaded yet." />
        ) : (
          <div className="space-y-3">
            {resumes.map((r) => (
              <div key={r.resumeId} className="p-4 rounded-2xl bg-dark-700/30 border border-dark-600">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-white font-medium break-all">{r.fileName || "(unnamed)"}</div>
                    <div className="text-xs text-dark-500 font-mono mt-1">{r.resumeId}</div>
                  </div>
                  <div className="text-right text-xs text-dark-500">
                    <div>{formatBytes(r.fileSize)}</div>
                    <div>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyPanel({ text }) {
  return (
    <div className="py-10 text-center text-dark-500 text-sm">
      {text}
    </div>
  )
}
