import clsx from "clsx"

export default function Button({
  variant = "primary",
  size = "md",
  className,
  disabled,
  children,
  ...props
}) {
  const base =
    "relative inline-flex items-center justify-center gap-2 select-none touch-manipulation " +
    "min-h-[44px] rounded-2xl font-medium transition-all duration-200 " +
    "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"

  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-base",
  }

  const variants = {
    primary:
      "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/15 " +
      "hover:from-emerald-400 hover:to-teal-400 hover:shadow-glow",
    secondary:
      "bg-surfaceAlt/60 text-textPrimary border border-white/10 shadow-inner-light " +
      "hover:bg-surfaceAlt/75 hover:border-white/15",
    ghost:
      "bg-transparent text-textSecondary hover:text-textPrimary hover:bg-surfaceAlt/60 border border-transparent hover:border-white/10",
    danger:
      "bg-danger-600 text-white hover:bg-danger-700 shadow-lg shadow-danger-500/15",
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={clsx(base, sizes[size], variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  )
}
