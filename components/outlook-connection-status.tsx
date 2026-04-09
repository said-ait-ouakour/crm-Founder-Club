'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { OutlookConnectionStatus } from '@/types/outlook'
import { AlertTriangle, CheckCircle2, Circle, CircleSlash, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

const IndicatorIcon = ({
  loading,
  error,
  isConnected,
}: {
  loading?: boolean
  error?: string | null
  isConnected: boolean
}) => {
  const getStatus = () => {
    if (loading)
      return { icon: Loader2, label: 'Checking...', color: 'text-muted-foreground' }
    if (error)
      return { icon: AlertTriangle, label: 'Error', color: 'text-amber-700' }
    if (isConnected)
      return { icon: CheckCircle2, label: 'Connected', color: 'text-emerald-700' }
    return { icon: CircleSlash, label: 'Disconnected', color: 'text-red-700' }
  }

  const { icon: Icon, color } = getStatus()

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-6 w-6 ${color} ${loading ? 'animate-spin' : ''}`} />
      {/* <span className={`text-sm font-medium ${color}`}>{label}</span> */}
    </div>
  )
}

type OutlookConnectionStatusProps = {
  status: OutlookConnectionStatus | null
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  className?: string
}

export function OutlookConnectionStatus({
  status,
  loading,
  error,
  onRetry,
  className,
}: OutlookConnectionStatusProps) {
  const isConnected = status?.connected ?? false

  const indicatorColor = () => {
    if (loading) return 'text-muted-foreground'
    if (error) return 'text-amber-500'
    return isConnected ? 'text-emerald-500' : 'text-red-500'
  }

  const headline = () => {
    if (loading) return 'Checking Outlook connection...'
    if (error) return 'Unable to verify Outlook connection'
    return isConnected ? 'Outlook calendar connected' : 'Outlook calendar not connected'
  }

  const description = () => {
    if (loading) {
      return 'Hang tight while we verify your Outlook link.'
    }

    if (error) {
      return 'We could not reach the Outlook service. Try again in a moment.'
    }

    if (!isConnected) {
      return 'Connect your Outlook account to sync meetings and availability.'
    }

    if (status?.primaryCalendarName) {
      return `Primary calendar: ${status.primaryCalendarName}`
    }

    if (status?.needsCalendarSelection) {
      return 'Choose a primary calendar to begin syncing.'
    }

    return 'Connection is active and ready.'
  }

  const connectedAt = (() => {
    if (!status?.connectedAt || loading || error) return null
    try {
      return format(new Date(status.connectedAt), 'PPpp')
    } catch (formatError) {
      console.warn('[OutlookConnectionStatus] Failed to format date:', formatError)
      return null
    }
  })()

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-border bg-card/60 p-4 shadow-sm',
        className
      )}
    >
      <div className="mt-0.5">
        <IndicatorIcon loading={loading} error={error} isConnected={isConnected} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold leading-tight">{headline()}</p>
          {!loading && !error && isConnected && (
            <span className={cn('text-xs font-medium uppercase', indicatorColor())}>Connected</span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description()}</p>
        {connectedAt && (
          <p className="mt-2 text-xs text-muted-foreground/80">
            Connected on <span className="font-medium text-foreground">{connectedAt}</span>
          </p>
        )}
        {error && onRetry && (
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={onRetry} disabled={loading}>
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

