"use client"

import { useEffect, useState } from "react"
import { ConnectionStep, ConnectionSteps } from "../ui/connection-steps"

import { TConnectionStatus } from "@/lib/types/general"

interface ConnectionStatusProps {
  status: TConnectionStatus
  className?: string
}

export function ConnectionStatus({ status, className }: ConnectionStatusProps) {
  const [steps, setSteps] = useState<ConnectionStep[]>([
    {
      id: "initializing",
      label: "Initializing",
      status: "pending",
    },
    {
      id: "audio_connected",
      label: "Audio connection established",
      status: "pending",
    },
    {
      id: "service_connected",
      label: "Connected to AI service",
      status: "pending",
    },
    {
      id: "bot_connected",
      label: "AI assistant connected",
      status: "pending",
    },
  ])

  useEffect(() => {
    // Update steps based on current status
    setSteps((currentSteps) => {
      const newSteps = [...currentSteps]

      if (status === "initializing") {
        newSteps[0].status = "processing"
        newSteps[1].status = "pending"
        newSteps[2].status = "pending"
        newSteps[3].status = "pending"
      } else if (status === "audio_connected") {
        newSteps[0].status = "completed"
        newSteps[1].status = "completed"
        newSteps[2].status = "processing"
        newSteps[3].status = "pending"
      } else if (status === "service_connected") {
        newSteps[0].status = "completed"
        newSteps[1].status = "completed"
        newSteps[2].status = "completed"
        newSteps[3].status = "processing"
      } else if (status === "bot_connected") {
        newSteps[0].status = "completed"
        newSteps[1].status = "completed"
        newSteps[2].status = "completed"
        newSteps[3].status = "completed"
      } else if (status === "disconnected") {
        // Reset all steps to pending when disconnected
        newSteps.forEach((step) => (step.status = "pending"))
      }

      return newSteps
    })
  }, [status])

  // Don't render anything if we're disconnected
  if (status === "disconnected") {
    return null
  }

  return (
    <div className={className}>
      <ConnectionSteps steps={steps} />
    </div>
  )
}
