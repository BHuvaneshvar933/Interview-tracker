import clsx from "clsx"

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-dark-700/70 bg-dark-800/55 shadow-card",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
