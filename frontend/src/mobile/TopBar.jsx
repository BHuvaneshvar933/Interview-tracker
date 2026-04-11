import { useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ChevronLeft } from "lucide-react"

const CAPSULE_CORP_LOGO_URL = "/capsule-corp.svg"

function titleForPath(pathname) {
  if (pathname === "/" || pathname.startsWith("/register")) return "Welcome"
  if (pathname.startsWith("/applications/")) return "Application"
  if (pathname.startsWith("/job-tracker")) return "Job Tracker"
  if (pathname.startsWith("/todos")) return "To-dos"
  if (pathname.startsWith("/pomodoro")) return "Pomodoro"
  if (pathname.startsWith("/habits")) return "Habits"
  if (pathname.startsWith("/curator")) return "Curator"
  if (pathname.startsWith("/analytics")) return "Analytics"
  if (pathname.startsWith("/ai")) return "AI Tools"
  if (pathname.startsWith("/settings")) return "Settings"
  return "Home"
}

export default function TopBar({ onOpenMenu, actions }) {
  const location = useLocation()
  const navigate = useNavigate()
  const title = useMemo(() => titleForPath(location.pathname), [location.pathname])

  const isPublic = useMemo(() => {
    const p = location.pathname
    return p === "/" || p.startsWith("/register")
  }, [location.pathname])

  const showBack = useMemo(() => {
    const p = location.pathname
    if (p === "/" || p.startsWith("/register")) return false
    const tabRoots = ["/dashboard", "/job-tracker", "/todos", "/pomodoro", "/habits", "/settings"]
    const isTab = tabRoots.some((t) => p === t || p.startsWith(t + "/"))
    return !isTab
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-40 bg-transparent">
      <div className="bg-transparent">
        <div className="w-full max-w-[420px] mx-auto px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {showBack ? (
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-2xl text-textSecondary hover:text-textPrimary hover:bg-surfaceAlt/60 transition-all duration-200 active:scale-[0.98]"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  if (isPublic) {
                    navigate("/")
                    return
                  }
                  if (typeof onOpenMenu === "function") {
                    onOpenMenu()
                    return
                  }
                  navigate("/dashboard")
                }}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-2xl hover:bg-surfaceAlt/40 transition-all duration-200 active:scale-[0.98]"
                aria-label={isPublic ? "Home" : "Open menu"}
              >
                <img
                  src={CAPSULE_CORP_LOGO_URL}
                  alt="Capsule Corp"
                  className="w-8 h-8 object-contain"
                  loading="eager"
                />
              </button>

              <div className="min-w-0">
                <div className="text-[11px] text-textMuted">Capsule</div>
                <div className="text-base font-semibold text-white truncate">{title}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
              {isPublic ? (
                <div className="min-h-[44px] min-w-[44px]" />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
