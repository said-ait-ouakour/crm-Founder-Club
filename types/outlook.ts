export type OutlookCalendar = {
  id: string
  name: string
}

export type OutlookConnectionStatus = {
  connected: boolean
  connectionId?: string
  connectedAt?: string | null
  primaryCalendarId?: string | null
  primaryCalendarName?: string | null
  tokenExpiresAt?: string | null
  needsCalendarSelection?: boolean
  error?: string
}

