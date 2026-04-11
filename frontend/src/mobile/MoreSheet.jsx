import { NavLink, useNavigate } from "react-router-dom"
import { BarChart3, Bookmark, LogOut, Sparkles, CheckCircle2, Settings, X } from "lucide-react"
import { logout } from "../utils/auth"

export default function MoreSheet({ open, onClose }) {
  const navigate = useNavigate()

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/55 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
        aria-label="Close"
        tabIndex={open ? 0 : -1}
      />

      <aside
        className={`absolute inset-y-0 left-0 w-[78vw] max-w-[320px] bg-dark-800/45 backdrop-blur-xl border-r border-dark-700/60 shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col min-h-0">
          <div className="pt-[calc(env(safe-area-inset-top)+0.75rem)] px-4 pb-4 border-b border-dark-700/50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Menu</div>
                <div className="text-xs text-textMuted mt-0.5">Tools and account actions</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-2xl text-textSecondary hover:text-textPrimary hover:bg-surfaceAlt/60 transition-all duration-200 active:scale-[0.98]"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3">
            <SheetLink to="/settings" icon={Settings} label="Settings" onClick={onClose} />
            <SheetLink to="/curator" icon={Bookmark} label="Curator" onClick={onClose} />
            <SheetLink to="/habits" icon={CheckCircle2} label="Habits" onClick={onClose} />
            <SheetLink to="/analytics" icon={BarChart3} label="Analytics" onClick={onClose} />
            <SheetLink to="/ai" icon={Sparkles} label="AI Tools" onClick={onClose} />
          </nav>

          <div className="px-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 border-t border-dark-700/50">
            <button
              type="button"
              className="w-full min-h-[48px] px-4 rounded-2xl flex items-center gap-3 text-left text-danger-300 hover:text-danger-200 hover:bg-danger-500/10 transition-all duration-200 active:scale-[0.98]"
              onClick={() => {
                onClose()
                logout()
                navigate("/")
              }}
              tabIndex={open ? 0 : -1}
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Log out</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}

function SheetLink({ to, icon: Icon, label, onClick }) {
  return (
      <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) =>
          [
            "w-full min-h-[48px] px-4 rounded-2xl flex items-center gap-3 transition-all duration-200 active:scale-[0.98]",
            isActive
              ? "bg-emerald-500/10 border border-emerald-500/25 text-textPrimary"
              : "text-textSecondary hover:bg-surfaceAlt/60",
          ].join(" ")
        }
      >
      {Icon ? <Icon className="w-5 h-5" /> : null}
      <span className="text-sm font-medium">{label}</span>
    </NavLink>
  )
}
