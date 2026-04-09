import { NavLink, useLocation } from "react-router-dom"
import clsx from "clsx"

export default function BottomNav({ items }) {
  const location = useLocation()
  const pathname = location.pathname

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="bg-dark-950/70 backdrop-blur-xl border-t border-dark-700/60">
        <div className="max-w-[420px] mx-auto px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
          <nav className="grid grid-cols-5 gap-1">
            {items.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/")
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={clsx(
                    "min-h-[52px] rounded-2xl px-2 py-2",
                    "flex flex-col items-center justify-center gap-1",
                    "transition-all duration-200 active:scale-[0.98]",
                    active
                      ? "bg-primary-500/12 border border-primary-500/25 text-primary-200 shadow-[0_0_0_1px_rgba(52,87,184,0.12)]"
                      : "text-dark-300 hover:text-white hover:bg-dark-800/60"
                  )}
                >
                  <Icon className={clsx("w-5 h-5", active ? "text-primary-200" : "text-dark-300")} />
                  <span className={clsx("text-[11px] leading-none", active ? "text-primary-100" : "text-dark-400")}>
                    {item.label}
                  </span>
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}
