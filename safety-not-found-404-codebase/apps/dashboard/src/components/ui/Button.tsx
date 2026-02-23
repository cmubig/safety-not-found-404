import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50"

    const variants = {
      primary: "bg-white text-black hover:bg-neutral-200 active:bg-neutral-300",
      secondary: "bg-neutral-900 text-white border border-neutral-700 hover:bg-neutral-800",
      outline: "border border-neutral-700 bg-transparent text-neutral-100 hover:bg-neutral-900 hover:border-neutral-500",
      ghost: "text-neutral-300 hover:bg-neutral-900 hover:text-white",
    }

    const sizes = {
      default: "h-9 px-4 py-2",
      sm: "h-8 px-3 text-xs",
      lg: "h-10 px-8",
    }

    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`

    return (
      <button ref={ref} className={classes} {...props} />
    )
  }
)
Button.displayName = "Button"

export { Button }
