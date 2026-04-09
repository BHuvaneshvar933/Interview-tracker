import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { logout } from "../utils/auth"
import { useOnlineStatus } from "../hooks/useOnlineStatus"
import { getToken } from "../utils/auth"
import BackendWakeBanner from "./BackendWakeBanner"

// Icons as simple SVG components
const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
)

const AnalyticsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4m10-2l1.5 3L22 7.5l-3 1.5L17 12l-1.5-3L12 7.5l3.5-1.5L17 3zM5 21v-4m-2 2h4" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const CheckListIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6h11M9 12h11M9 18h11" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h.01M4 12h.01M4 18h.01" />
  </svg>
)

const TimerIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l2 2m6-2a8 8 0 11-16 0 8 8 0 0116 0z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3h6" />
  </svg>
)

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

const BriefcaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

const LogoMark = ({ className = "w-8 h-8" }) => (
  <img
    src="/capsule-corp.svg"
    alt="Capsule"
    className={`${className} object-contain`}
    loading="eager"
  />
)

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

import { useEffect, useState } from "react"

function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const online = useOnlineStatus()
  const token = getToken()

  // Prevent background scroll when the mobile sidebar is open.
  useEffect(() => {
    if (typeof document === "undefined") return
    if (!sidebarOpen) return

    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
    }
  }, [sidebarOpen])

  // If a nav overlay is open, close it on route change.
  useEffect(() => {
    // Intentionally closing UI state on navigation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpen(false)
  }, [location.pathname])

  // Escape closes the mobile sidebar.
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!sidebarOpen) return
    const onKeyDown = (e) => {
      if (e.key === "Escape") setSidebarOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [sidebarOpen])

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  const navGroups = [
    {
      title: "Dashboard",
      items: [{ to: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> }],
    },
    {
      title: "Career",
      items: [
        { to: "/job-tracker", label: "Job Tracker", icon: <BriefcaseIcon /> },
        { to: "/analytics", label: "Analytics", icon: <AnalyticsIcon /> },
        { to: "/ai", label: "AI Tools", icon: <SparklesIcon /> },
      ],
    },
    {
      title: "Focus",
      items: [
        { to: "/todos", label: "To-dos", icon: <CheckListIcon /> },
        { to: "/pomodoro", label: "Pomodoro", icon: <TimerIcon /> },
      ],
    },
    {
      title: "Settings",
      items: [{ to: "/settings", label: "Settings", icon: <SettingsIcon /> }],
    },
  ]

  return (
    <div className="min-h-dvh bg-transparent flex lg:h-dvh">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onTouchMove={(e) => e.preventDefault()}
        />
      )}

      {/* Sidebar */}
      <aside className={`
         fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-dark-800/45 backdrop-blur-xl border-r border-dark-700/60
         h-dvh
         transform transition-transform duration-300 ease-out
         ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
       `}>
        <div className="flex flex-col h-full min-h-0">
          {/* Logo area */}
          <div className="p-6 border-b border-dark-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg shadow-primary-500/30">
                <LogoMark />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Capsule</h1>
                <p className="text-xs text-dark-400">Keep it together</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
           <nav className="flex-1 min-h-0 p-4 space-y-2 overflow-y-auto overscroll-contain">
             {navGroups.map((group, gi) => (
               <div key={group.title} className={gi === 0 ? "" : "pt-3"}>
                <p className="px-4 py-2 text-xs font-semibold text-dark-500 uppercase tracking-wider">
                  {group.title}
                </p>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) => (isActive ? "nav-item-active" : "nav-item")}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom section */}
          <div className="p-4 border-t border-dark-700/50">
            <button
              onClick={handleLogout}
              className="nav-item w-full text-danger-400 hover:text-danger-300 hover:bg-danger-500/10"
            >
              <LogoutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-dvh min-w-0 lg:min-h-0 lg:h-dvh">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-dark-800/55 backdrop-blur-xl border-b border-dark-700/60">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-dark-300 hover:text-white hover:bg-dark-700 rounded-xl transition-colors"
            >
              <MenuIcon />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg">
                <LogoMark className="w-6 h-6" />
              </div>
              <span className="font-bold text-white">Capsule</span>
            </div>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden lg:min-h-0 lg:overflow-y-auto">
          {!online && (
            <div className="mb-4 px-4 py-3 rounded-2xl border border-warning-500/30 bg-warning-500/10 text-warning-300">
              Offline mode: showing cached applications and interviews.
              {!token && " (Read-only until you sign in again.)"}
            </div>
          )}
           <BackendWakeBanner />
          <div className="animate-fade-in w-full">
            <div className="w-full max-w-[1100px] 2xl:max-w-[1280px] mx-auto">
              {children}
            </div>
          </div>
         </main>
      </div>
    </div>
  )
}

export default Layout
