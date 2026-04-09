import { useEffect, useMemo, useState } from "react"
import { Home, BriefcaseBusiness, CheckSquare, Timer, CheckCircle2 } from "lucide-react"
import { useLocation } from "react-router-dom"
import TopBar from "./TopBar"
import BottomNav from "./BottomNav"
import MoreSheet from "./MoreSheet"
import BackendWakeBanner from "../components/BackendWakeBanner"
import { MobileChromeContext } from "./chrome"

export default function AppLayout({ children }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [topBarActions, setTopBarActions] = useState(null)
  const location = useLocation()

  const chromeValue = useMemo(() => ({ setTopBarActions }), [setTopBarActions])

  const hideBottomNav = useMemo(() => {
    const p = location.pathname
    return p.startsWith("/applications/")
  }, [location.pathname])

  const navItems = useMemo(
    () => [
      { to: "/dashboard", label: "Home", icon: Home },
      { to: "/job-tracker", label: "Jobs", icon: BriefcaseBusiness },
      { to: "/todos", label: "To-dos", icon: CheckSquare },
      { to: "/pomodoro", label: "Focus", icon: Timer },
      { to: "/habits", label: "Habits", icon: CheckCircle2 },
    ],
    []
  )

  // Close the sheet on navigation.
  useEffect(() => {
    // Intentionally closing UI state on navigation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMoreOpen(false)
  }, [location.pathname])

  // Escape closes the sheet.
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!moreOpen) return
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMoreOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [moreOpen])

  // Prevent background scroll when the sheet is open.
  useEffect(() => {
    if (typeof document === "undefined") return
    if (!moreOpen) return

    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
    }
  }, [moreOpen])

  return (
    <MobileChromeContext.Provider value={chromeValue}>
      <div className="min-h-dvh bg-transparent overflow-x-hidden">
        <TopBar actions={topBarActions} onOpenMore={() => setMoreOpen(true)} />

          <div className="flex justify-center">
            <main className="w-full max-w-[420px] mx-auto px-4 pt-4 pb-24">
              <BackendWakeBanner />
              <div className="space-y-4">{children}</div>
            </main>
          </div>

        {!hideBottomNav ? <BottomNav items={navItems} /> : null}
        <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
      </div>
    </MobileChromeContext.Provider>
  )
}
