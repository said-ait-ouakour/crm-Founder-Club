"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, BookOpen, X } from "lucide-react"
import { useState } from "react"

interface TrainingNotificationBannerProps {
  onDismiss?: () => void
}

export function TrainingNotificationBanner({ onDismiss }: TrainingNotificationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  if (isDismissed) return null

  return (
    <Alert className="border-orange-200 bg-orange-50 text-orange-800 mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <span className="font-medium">
            Account Locked: Your account is currently locked and cannot make calls to leads.
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  )
}
