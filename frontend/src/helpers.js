export function formatTimer(totalSeconds) {
  const s = Math.max(0, Number(totalSeconds) || 0)
  const mm = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  const pad = (n) => String(n).padStart(2, "0")
  return `${pad(mm)}:${pad(ss)}`
}
