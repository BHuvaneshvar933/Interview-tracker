import clsx from "clsx"

export default function Input({ className, ...props }) {
  return (
    <input
      className={clsx(
        "w-full min-h-[44px] rounded-2xl bg-dark-900/40 border border-dark-700/70 px-4 py-2.5 text-white",
        "placeholder:text-dark-400",
        "focus:outline-none focus:ring-2 focus:ring-primary-500/35 focus:border-primary-500/60",
        "transition-all duration-200",
        className
      )}
      {...props}
    />
  )
}
