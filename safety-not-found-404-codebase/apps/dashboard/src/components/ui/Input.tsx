import * as React from "react"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`flex h-10 w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-panel-strong)] px-3 py-2 text-sm text-[var(--fg-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--fg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/50 focus-visible:border-[var(--accent-cyan)]/50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
