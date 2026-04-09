"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Mail, 
  ExternalLink, 
  MessageSquare, 
  Eye, 
  MousePointer,
  X,
  Clock,
  User,
  Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmailNotificationToastProps {
  notification: {
    type: 'email_notification'
    leadId: string
    eventType: 'opened' | 'clicked' | 'replied' | 'seen'
    leadName: string
    businessName?: string
    leadStatus: string
    timestamp: string
    metadata?: any
    redirectUrl: string
    message: string
  }
  onClose: () => void
  onViewLead: (leadId: string) => void
  autoClose?: boolean
  autoCloseDelay?: number
}

export function EmailNotificationToast({ 
  notification, 
  onClose, 
  onViewLead,
  autoClose = true,
  autoCloseDelay = 8000
}: EmailNotificationToastProps) {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState(autoCloseDelay / 1000)

  // Auto-close functionality
  useEffect(() => {
    if (!autoClose) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsVisible(false)
          setTimeout(onClose, 300) // Allow fade out animation
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [autoClose, onClose])

  const handleViewLead = () => {
    onViewLead(notification.leadId)
    onClose()
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'opened':
        return <Eye className="h-4 w-4 text-blue-600" />
      case 'clicked':
        return <MousePointer className="h-4 w-4 text-green-600" />
      case 'replied':
        return <MessageSquare className="h-4 w-4 text-purple-600" />
      case 'seen':
        return <Eye className="h-4 w-4 text-orange-600" />
      default:
        return <Mail className="h-4 w-4 text-gray-600" />
    }
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'opened':
        return 'border-blue-200 bg-blue-50'
      case 'clicked':
        return 'border-green-200 bg-green-50'
      case 'replied':
        return 'border-purple-200 bg-purple-50'
      case 'seen':
        return 'border-orange-200 bg-orange-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'qualified':
        return 'bg-green-100 text-green-800'
      case 'open':
        return 'bg-blue-100 text-blue-800'
      case 'disqualified':
        return 'bg-red-100 text-red-800'
      case 'converted':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isVisible) return null

  return (
    <Card className={cn(
      "fixed top-4 right-4 z-50 w-96 shadow-lg border-l-4 transition-all duration-300",
      getEventColor(notification.eventType),
      "animate-in slide-in-from-right-full"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0">
              {getEventIcon(notification.eventType)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="text-sm font-semibold text-gray-900 truncate">
                  {notification.leadName}
                </h4>
                <Badge variant="outline" className={getStatusColor(notification.leadStatus)}>
                  {notification.leadStatus}
                </Badge>
              </div>
              
              {notification.businessName && (
                <div className="flex items-center space-x-1 mb-2">
                  <Building2 className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-600 truncate">
                    {notification.businessName}
                  </span>
                </div>
              )}
              
              <p className="text-sm text-gray-700 mb-2">
                {notification.message}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                {autoClose && timeRemaining > 0 && (
                  <div className="text-xs text-gray-400">
                    Auto-close in {timeRemaining}s
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleViewLead}
              className="text-xs h-7 px-2"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Lead
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-7 w-7 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {/* Progress bar for auto-close */}
        {autoClose && timeRemaining > 0 && (
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-gray-400 h-1 rounded-full transition-all duration-1000"
              style={{ 
                width: `${(timeRemaining / (autoCloseDelay / 1000)) * 100}%` 
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
