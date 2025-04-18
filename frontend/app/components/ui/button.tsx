import * as React from "react"

/**
 * Button - Basic button component with minimal styling
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <button className={className} ref={ref} {...props}>
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"
