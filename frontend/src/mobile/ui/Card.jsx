import clsx from "clsx"

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-white/10 bg-gradient-to-b from-surface/70 to-surface/45 shadow-card backdrop-blur-xs",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
