import { useEffect, useState } from "react"

export function useMediaQuery(query) {
  const getMatch = () => {
    if (typeof window === "undefined") return false
    return window.matchMedia?.(query)?.matches ?? false
  }

  const [matches, setMatches] = useState(getMatch)

  useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia?.(query)
    if (!mql) return

    const onChange = () => setMatches(mql.matches)
    onChange()

    if (mql.addEventListener) mql.addEventListener("change", onChange)
    else mql.addListener(onChange)

    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange)
      else mql.removeListener(onChange)
    }
  }, [query])

  return matches
}
