'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { OutlookCalendar, OutlookConnectionStatus } from '@/types/outlook'

type FetchError = {
  error?: string
}

const STATUS_ENDPOINT = '/api/outlook/status'
const CONNECT_ENDPOINT = '/api/outlook/connect'
const DISCONNECT_ENDPOINT = '/api/outlook/disconnect'
const CALENDARS_ENDPOINT = '/api/outlook/calendars'
const SELECT_CALENDAR_ENDPOINT = '/api/outlook/calendars/select'

export function useOutlookConnection() {
  const [status, setStatus] = useState<OutlookConnectionStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(STATUS_ENDPOINT, { cache: 'no-store' })

      if (response.status === 401 || response.status === 403) {
        setStatus(null)
        setError('You do not have access to Outlook connections.')
        return
      }

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as FetchError
        throw new Error(data.error || 'Failed to load Outlook connection status.')
      }

      const data = (await response.json()) as OutlookConnectionStatus
      setStatus(data)
      setError(null)
    } catch (err) {
      console.error('[useOutlookConnection] Failed to fetch status:', err)
      setError(err instanceof Error ? err.message : 'Unknown error loading Outlook status.')
    } finally {
      setInitialized(true)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus().catch((err) => console.error(err))
  }, [fetchStatus])

  const connect = useCallback(async () => {
    // include credentials so browser accepts Set-Cookie from the API response
    const response = await fetch(CONNECT_ENDPOINT, { method: 'POST', credentials: 'include' })

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as FetchError
      throw new Error(data.error || 'Unable to start Outlook connection.')
    }

    const data = (await response.json()) as { authorizationUrl?: string }

    if (data.authorizationUrl) {
      window.location.href = data.authorizationUrl
    } else {
      throw new Error('Missing authorization URL from Outlook connect endpoint.')
    }
  }, [])

  const disconnect = useCallback(async () => {
    const response = await fetch(DISCONNECT_ENDPOINT, { method: 'DELETE', credentials: 'include' })

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as FetchError
      throw new Error(data.error || 'Failed to disconnect Outlook.')
    }

    await fetchStatus()
  }, [fetchStatus])

  const loadCalendars = useCallback(async () => {
    const response = await fetch(CALENDARS_ENDPOINT, { credentials: 'include' })

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as FetchError
      throw new Error(data.error || 'Unable to fetch Outlook calendars.')
    }

    const payload = (await response.json()) as {
      calendars?: OutlookCalendar[]
      primaryCalendarId?: string | null
      error?: string
    }

    if (payload.error) {
      throw new Error(payload.error)
    }

    return {
      calendars: payload.calendars ?? [],
      primaryCalendarId: payload.primaryCalendarId ?? null,
    }
  }, [])

  const selectCalendar = useCallback(
    async (calendarId: string) => {
      const response = await fetch(SELECT_CALENDAR_ENDPOINT, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ calendarId }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as FetchError
        throw new Error(data.error || 'Failed to save calendar selection.')
      }

      await fetchStatus()
    },
    [fetchStatus]
  )

  const value = useMemo(
    () => ({
      status,
      loading,
      initialized,
      error,
      refresh: fetchStatus,
      connect,
      disconnect,
      loadCalendars,
      selectCalendar,
    }),
    [status, loading, initialized, error, fetchStatus, connect, disconnect, loadCalendars, selectCalendar]
  )

  return value
}

