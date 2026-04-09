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
      "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/15 " +
      "hover:from-primary-400 hover:to-primary-600 hover:shadow-glow",
    secondary:
      "bg-dark-800/70 text-white border border-dark-700/70 shadow-inner-light " +
      "hover:bg-dark-700/70 hover:border-dark-600",
    ghost:
      "bg-transparent text-dark-100 hover:bg-dark-800/60 border border-transparent hover:border-dark-700/60",
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
