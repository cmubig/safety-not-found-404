import * as React from "react"

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={`appearance-none flex h-10 w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-panel-strong)] px-3 py-2 text-sm text-[var(--fg-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/50 focus-visible:border-[var(--accent-cyan)]/50 disabled:cursor-not-allowed disabled:opacity-50 pr-9 ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[var(--fg-muted)]">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }
