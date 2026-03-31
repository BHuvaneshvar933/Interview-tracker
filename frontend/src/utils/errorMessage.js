export function toUserMessage(err, fallback) {
  const status = err?.response?.status
  const apiMsg = err?.response?.data?.message

  if (status === 429) return "AI is rate-limited right now. Wait 30-60 seconds and try again."
  if (status === 413) return "That file is too large. Try a smaller PDF."
  if (status === 415) return "Unsupported file type. Please upload a PDF."
  if (status === 401) return "Your session expired. Please sign in again."
  if (status === 403) return "You don't have access to this action."
  if (status >= 500) return "Server error. Try again in a moment."

  // Axios timeout
  if (err?.code === "ECONNABORTED") return "Request timed out. Check your connection and try again."
  // Offline / DNS / network errors
  if (!err?.response) return "Network error. Check your connection and try again."

  return apiMsg || fallback || "Something went wrong."
}
