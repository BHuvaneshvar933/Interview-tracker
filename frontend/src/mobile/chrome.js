import { createContext, useContext, useEffect } from "react"

export const MobileChromeContext = createContext(null)

export function useMobileChrome() {
  return useContext(MobileChromeContext)
}

// Sets the right-side TopBar action area (mobile shell only).
// Safe to call from pages that also render on desktop.
export function useTopBarActions(actions, deps = []) {
  const chrome = useMobileChrome()

  useEffect(() => {
    if (!chrome?.setTopBarActions) return
    chrome.setTopBarActions(actions || null)
    return () => chrome.setTopBarActions(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chrome, ...deps])
}
