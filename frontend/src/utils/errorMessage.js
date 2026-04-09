export function toUserMessage(err, fallback) {
  const status = err?.response?.status
  const apiMsg = err?.response?.data?.message
  const combined = `${apiMsg || ""} ${err?.message || ""}`.toLowerCase()

  // AI provider billing/quota/credits exhausted
  const looksLikeCreditsGone =
    status === 402 ||
    combined.includes("payment required") ||
    combined.includes("billing") ||
    combined.includes("insufficient") ||
    combined.includes("credits") ||
    combined.includes("credit") ||
    combined.includes("quota") ||
    combined.includes("resource_exhausted") ||
    combined.includes("quota exceeded")
  if (looksLikeCreditsGone) {
    return "This feature is temporarily unavailable due to usage limits. Please try again later."
  }

  if (status === 429) return "Too many requests right now. Please wait a moment and try again."
  if (status === 413) return "That file is too large. Try a smaller PDF."
  if (status === 415) return "Unsupported file type. Please upload a PDF."
  if (status === 401) return "Your session expired. Please sign in again."
  if (status === 403) return "You don't have access to this action."

  // Common "server waking up" / edge proxy errors
  if (status === 502 || status === 503 || status === 504) {
    return "The server isn't ready yet. Please try again in a few seconds."
  }
  if (status === 521) {
    return "The server is currently unavailable (Error 521). Please try again in a moment."
  }
  if (status === 522 || status === 524) {
    return "The request timed out while waiting for the server. Please try again in a moment."
  }
  if (status >= 500) return "The server is having trouble right now. Please try again in a moment."

  // Axios timeout
  if (err?.code === "ECONNABORTED") return "This is taking longer than expected. Please try again."

  // Offline / DNS / network errors
  if (!err?.response) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return "You're offline. Connect to the internet and try again."
    }
    return "Couldn't reach the server. It may be starting up — please try again in a few seconds."
  }

  return apiMsg || fallback || "Something went wrong."
}
