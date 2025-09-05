import * as React from "react"
import { cn } from "../lib/utils"

const Slider = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    onValueChange?: (value: number[]) => void
    value?: number[]
    max?: number
    step?: number
  }
>(({ className, onValueChange, value = [0], max = 100, step = 1, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = [parseInt(e.target.value)];
    onValueChange?.(newValue);
  };

  return (
    <input
      type="range"
      className={cn(
        "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider",
        className
      )}
      ref={ref}
      value={value[0]}
      onChange={handleChange}
      max={max}
      step={step}
      {...props}
    />
  )
})
Slider.displayName = "Slider"

export { Slider }

