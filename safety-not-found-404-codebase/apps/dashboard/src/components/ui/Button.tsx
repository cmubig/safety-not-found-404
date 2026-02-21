import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-xl border text-sm font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090d17] disabled:pointer-events-none disabled:opacity-50"

    const variants = {
      primary:
        "border-transparent bg-[var(--accent-cyan)] text-[#07121e] hover:brightness-105 hover:shadow-[0_10px_24px_rgba(127,216,255,0.28)]",
      secondary:
        "border-[var(--line-soft)] bg-[var(--bg-panel-strong)] text-[var(--fg-primary)] hover:border-[var(--line-strong)] hover:bg-[#172238]",
      outline:
        "border-[var(--line-strong)] bg-transparent text-[var(--fg-primary)] hover:bg-[#172238]/70 hover:border-[var(--accent-cyan)]/60",
      ghost:
        "border-transparent text-[var(--fg-muted)] hover:bg-[#172238]/60 hover:text-[var(--fg-primary)]",
    }

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 px-3 text-xs",
      lg: "h-11 px-8",
    }

    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`

    return (
      <button ref={ref} className={classes} {...props} />
    )
  }
)
Button.displayName = "Button"

export { Button }
