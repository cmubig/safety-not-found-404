import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "default", ...props }, ref) => {
    // Base styles: purely strict monochrome, sharp corners or slightly rounded, NO gradients
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-50"

    const variants = {
      primary: "bg-white text-black hover:bg-neutral-200",
      secondary: "bg-neutral-800 text-white hover:bg-neutral-700",
      outline: "border border-neutral-700 bg-transparent hover:bg-neutral-800 text-white",
      ghost: "hover:bg-neutral-800 hover:text-white text-neutral-300",
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
