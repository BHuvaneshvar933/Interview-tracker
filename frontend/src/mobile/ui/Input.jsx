import clsx from "clsx"

export default function Input({ className, ...props }) {
  return (
    <input
      className={clsx(
        "w-full min-h-[44px] rounded-2xl bg-surface/50 border border-white/10 px-4 py-2.5 text-textPrimary",
        "placeholder:text-textMuted",
        "focus:outline-none focus:ring-2 focus:ring-emerald-500/35 focus:border-emerald-500/60",
        "transition-all duration-200",
        className
      )}
      {...props}
    />
  )
}
