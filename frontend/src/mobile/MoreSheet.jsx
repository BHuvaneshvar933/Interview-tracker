import { NavLink, useNavigate } from "react-router-dom"
import { BarChart3, LogOut, Sparkles } from "lucide-react"
import { logout } from "../utils/auth"

export default function MoreSheet({ open, onClose }) {
  const navigate = useNavigate()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-label="Close"
      />

        <div className="absolute left-0 right-0 bottom-0">
          <div className="w-full max-w-[420px] mx-auto px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <div className="rounded-3xl border border-dark-700/70 bg-dark-900/80 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-dark-700 mx-auto" />
              <div className="mt-3 text-sm font-semibold text-white">More</div>
              <div className="mt-1 text-xs text-dark-400">Tools and account actions</div>
            </div>

            <div className="px-2 pb-2">
              <SheetLink to="/analytics" icon={BarChart3} label="Analytics" onClick={onClose} />
              <SheetLink to="/ai" icon={Sparkles} label="AI Tools" onClick={onClose} />

              <button
                type="button"
                className="w-full min-h-[48px] px-4 rounded-2xl flex items-center gap-3 text-left text-danger-300 hover:text-danger-200 hover:bg-danger-500/10 transition-all duration-200 active:scale-[0.98]"
                onClick={() => {
                  onClose()
                  logout()
                  navigate("/")
                }}
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Log out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
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
            ? "bg-primary-500/12 border border-primary-500/25 text-primary-100"
            : "text-dark-100 hover:bg-dark-800/60",
        ].join(" ")
      }
    >
      {Icon ? <Icon className="w-5 h-5" /> : null}
      <span className="text-sm font-medium">{label}</span>
    </NavLink>
  )
}
