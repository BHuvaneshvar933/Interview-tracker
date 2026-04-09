import { useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ChevronLeft, MoreVertical, Settings } from "lucide-react"
import Button from "./ui/Button"

const CAPSULE_CORP_LOGO_URL =
  "https://media.licdn.com/dms/image/v2/C4D0BAQHOlReovX7EIA/company-logo_200_200/company-logo_200_200/0/1655274337677/capsule_corp_labs_logo?e=2147483647&v=beta&t=adVTJdNYZOYrARHqX9WQGaVgl2ZunY_75FS0bhmPbw4"

function titleForPath(pathname) {
  if (pathname === "/" || pathname.startsWith("/register")) return "Welcome"
  if (pathname.startsWith("/applications/")) return "Application"
  if (pathname.startsWith("/job-tracker")) return "Job Tracker"
  if (pathname.startsWith("/todos")) return "To-dos"
  if (pathname.startsWith("/pomodoro")) return "Pomodoro"
  if (pathname.startsWith("/analytics")) return "Analytics"
  if (pathname.startsWith("/ai")) return "AI Tools"
  if (pathname.startsWith("/settings")) return "Profile"
  return "Home"
}

export default function TopBar({ onOpenMore, actions }) {
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
    const tabRoots = ["/dashboard", "/job-tracker", "/todos", "/pomodoro", "/settings"]
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
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-2xl text-dark-200 hover:text-white hover:bg-dark-800/60 transition-all duration-200 active:scale-[0.98]"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(isPublic ? "/" : "/dashboard")}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-2xl hover:bg-dark-800/40 transition-all duration-200 active:scale-[0.98]"
                  aria-label="Home"
                >
                  <img
                    src={CAPSULE_CORP_LOGO_URL}
                    alt="Capsule Corp"
                    className="w-8 h-8 object-contain"
                    loading="eager"
                    referrerPolicy="no-referrer"
                  />
                </button>
              )}

              <div className="min-w-0">
                <div className="text-[11px] text-dark-400">Capsule</div>
                <div className="text-base font-semibold text-white truncate">{title}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
              {!isPublic ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="px-3 rounded-2xl"
                    onClick={() => navigate("/settings")}
                    aria-label="Profile"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="px-3 rounded-2xl"
                    onClick={onOpenMore}
                    aria-label="More"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <div className="min-h-[44px] min-w-[44px]" />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
