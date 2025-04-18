"use client"

import { cn } from "@/app/lib/utils"
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react"

export type ConnectionStep = {
  id: string
  label: string
  status: "pending" | "processing" | "completed" | "failed"
}

interface ConnectionStepsProps {
  steps: ConnectionStep[]
  className?: string
}

export function ConnectionSteps({ steps, className }: ConnectionStepsProps) {
  return (
    <div className={cn("flex flex-col space-y-1", className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              {
                "text-white":
                  step.status === "pending" || step.status === "processing",
                "text-green-500": step.status === "completed",
                "text-red-500": step.status === "failed",
              }
            )}
          >
            {step.status === "pending" && <Circle className="h-5 w-5" />}
            {step.status === "processing" && (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            {step.status === "completed" && (
              <CheckCircle2 className="h-5 w-5" />
            )}
            {step.status === "failed" && <XCircle className="h-5 w-5" />}
          </div>
          <span
            className={cn("ml-3 text-sm font-medium", {
              "text-white":
                step.status === "pending" || step.status === "processing",
              "text-green-500": step.status === "completed",
              "text-red-500": step.status === "failed",
            })}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  )
}
