import api from "./axios"

export function uploadResume(resumeFile) {
  const form = new FormData()
  form.append("resumeFile", resumeFile)
  return api.post("/api/resumes", form)
}

export function listResumes() {
  return api.get("/api/resumes")
}

export function analyzeResume(resumeFile, jobDescription) {
  const form = new FormData()
  form.append("resumeFile", resumeFile)
  form.append("jobDescription", jobDescription)
  return api.post("/api/analyze-resume", form)
}

export function generateQuestions({ company, role, resumeId, difficulty }) {
  return api.post("/api/generate-questions", {
    company,
    role,
    resumeId,
    difficulty: difficulty || undefined,
  })
}

export function getQuestionSet(questionSetId) {
  return api.get(`/api/questions/${questionSetId}`)
}
