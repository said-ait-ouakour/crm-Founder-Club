'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { OutlookCalendar, OutlookConnectionStatus } from '@/types/outlook'
import { RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type CalendarSelectorProps = {
  status: OutlookConnectionStatus | null
  loadCalendars: () => Promise<{ calendars: OutlookCalendar[]; primaryCalendarId: string | null }>
  onSelect: (calendarId: string) => Promise<void>
  disabled?: boolean
  className?: string
}

export function OutlookCalendarSelector({
  status,
  loadCalendars,
  onSelect,
  disabled,
  className,
}: CalendarSelectorProps) {
  const [calendars, setCalendars] = useState<OutlookCalendar[]>([])
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const isConnected = status?.connected ?? false
  const isDisabled = disabled || !isConnected

  const fetchCalendars = useCallback(async () => {
    if (!isConnected) {
      setCalendars([])
      setSelectedCalendar(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { calendars: items, primaryCalendarId } = await loadCalendars()
      setCalendars(items)
      setSelectedCalendar(primaryCalendarId)

      if (!items.length) {
        setError('No calendars were returned by Outlook.')
      }
    } catch (err) {
      console.error('[OutlookCalendarSelector] Failed to load calendars:', err)
      setError(err instanceof Error ? err.message : 'Unable to load calendars.')
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, loadCalendars])

  useEffect(() => {
    if (isConnected) {
      fetchCalendars().catch((err) => console.error(err))
    } else {
      setCalendars([])
      setSelectedCalendar(null)
    }
  }, [isConnected, fetchCalendars, status?.primaryCalendarId])

  const handleSelect = useCallback(
    async (calendarId: string) => {
      setIsSaving(true)
      setError(null)
      try {
        await onSelect(calendarId)
        setSelectedCalendar(calendarId)
        toast({
          title: 'Calendar Updated',
          description: 'Outlook calendar updated.',
        })
      } catch (err) {
        console.error('[OutlookCalendarSelector] Selection failed:', err)
        toast({
          variant: 'destructive',
          title: 'Selection Failed',
          description: err instanceof Error ? err.message : 'Unable to save calendar selection.',
        })
      } finally {
        setIsSaving(false)
      }
    },
    [onSelect, toast]
  )

  const helperText = useMemo(() => {
    if (!isConnected) {
      return 'Connect Outlook to pick a primary calendar for syncing.'
    }

    if (isLoading) {
      return 'Loading calendars from Outlook...'
    }

    if (error) {
      return error
    }

    if (!calendars.length) {
      return 'We could not find any calendars in Outlook.'
    }

    if (status?.needsCalendarSelection) {
      return 'Select a calendar to enable sync.'
    }

    return 'Choose the calendar you want to sync with CRM.'
  }, [isConnected, isLoading, error, calendars.length, status?.needsCalendarSelection])

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-border bg-card/60 p-4 shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold leading-tight">Primary Outlook calendar</p>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => fetchCalendars().catch((err) => console.error(err))}
          disabled={isDisabled || isLoading}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          <span className="sr-only">Refresh calendars</span>
        </Button>
      </div>

      {isDisabled ? (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      ) : isLoading ? (
        <Skeleton className="h-9 w-full" />
      ) : (
        <Select
          value={selectedCalendar ?? undefined}
          onValueChange={(value) => handleSelect(value).catch((err) => console.error(err))}
          disabled={isSaving || !calendars.length}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a calendar" />
          </SelectTrigger>
          <SelectContent>
            {calendars.map((calendar) => (
              <SelectItem key={calendar.id} value={calendar.id}>
                {calendar.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  )
}

