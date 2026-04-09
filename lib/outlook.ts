import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import type { OutlookCalendar } from '@/types/outlook'

const REQUIRED_SCOPES = [
  'offline_access',
  'Calendars.ReadWrite',
  'Calendars.ReadWrite.Shared',
  'openid',
  'profile',
  'email',
]

/** Thrown when the mailbox does not support Microsoft Graph (e.g. on-premise, soft-deleted, or some hosted plans like GoDaddy Essentials). */
export class OutlookMailboxNotSupportedError extends Error {
  readonly code = 'MailboxNotEnabledForRESTAPI'
  constructor(message: string = 'Your mailbox does not support calendar sync. This can happen with on-premise Exchange, some hosted plans (e.g. GoDaddy), or inactive mailboxes. Use a Microsoft 365 or Exchange Online mailbox for full calendar sync.') {
    super(message)
    this.name = 'OutlookMailboxNotSupportedError'
  }
}

function parseGraphError(responseBody: string, context: string): never {
  try {
    const parsed = JSON.parse(responseBody) as { error?: { code?: string; message?: string } }
    const code = parsed?.error?.code
    const msg = parsed?.error?.message ?? responseBody
    if (code === 'MailboxNotEnabledForRESTAPI') {
      throw new OutlookMailboxNotSupportedError(
        'Your mailbox does not support calendar sync (e.g. on-premise or some hosted plans like GoDaddy). Use a Microsoft 365 or Exchange Online mailbox.'
      )
    }
    throw new Error(`${context}: ${msg}`)
  } catch (e) {
    if (e instanceof OutlookMailboxNotSupportedError) throw e
    throw new Error(`${context}: ${responseBody}`)
  }
}

export type OutlookConnectionRow = {
  id: string
  user_id: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  primary_calendar_id: string | null
  connected_at: string | null
  updated_at: string | null
}

type TokenResponse = {
  token_type: string
  scope: string
  expires_in: number
  ext_expires_in?: number
  access_token: string
  refresh_token?: string
}

function resolveEncryptionKey(): Buffer {
  const key = process.env.OUTLOOK_TOKEN_ENCRYPTION_KEY

  if (!key) {
    throw new Error('OUTLOOK_TOKEN_ENCRYPTION_KEY environment variable is required')
  }

  if (/^[0-9a-fA-F]+$/.test(key) && key.length === 64) {
    return Buffer.from(key, 'hex')
  }

  try {
    const buffer = Buffer.from(key, 'base64')
    if (buffer.length === 32) {
      return buffer
    }
  } catch {
    // ignore decode errors
  }

  if (key.length === 32) {
    return Buffer.from(key)
  }

  throw new Error('OUTLOOK_TOKEN_ENCRYPTION_KEY must be a 32-byte key (hex, base64, or utf-8)')
}

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function getAuthorizationScopes() {
  return REQUIRED_SCOPES.join(' ')
}

let cachedEncryptionKey: Buffer | null = null

function getEncryptionKey() {
  if (!cachedEncryptionKey) {
    cachedEncryptionKey = resolveEncryptionKey()
  }
  return cachedEncryptionKey
}

export function getOutlookConfig() {
  const clientId = process.env.OUTLOOK_CLIENT_ID
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET
  const tenantId = process.env.OUTLOOK_TENANT_ID || 'common'
  const redirectUri = process.env.OUTLOOK_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Outlook OAuth is not fully configured. Please set OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, and OUTLOOK_REDIRECT_URI.'
    )
  }

  return { clientId, clientSecret, tenantId, redirectUri }
}

export function createPkcePair() {
  const codeVerifier = base64UrlEncode(crypto.randomBytes(64))
  const codeChallenge = base64UrlEncode(crypto.createHash('sha256').update(codeVerifier).digest())
  return { codeVerifier, codeChallenge }
}

export function encryptToken(plainText: string | null | undefined) {
  if (!plainText) return null

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([iv, authTag, ciphertext]).toString('base64')
}

export function decryptToken(encrypted: string | null | undefined) {
  if (!encrypted) return null

  // Check if it looks like a plain OAuth token (JWT format or long alphanumeric string)
  // OAuth tokens are typically much longer than encrypted tokens and don't have base64 padding patterns
  // Encrypted tokens are base64 with specific structure (IV + authTag + ciphertext)
  const looksLikePlainToken = encrypted.length > 200 || /^[A-Za-z0-9_-]+$/.test(encrypted)
  
  try {
    const buffer = Buffer.from(encrypted, 'base64')
    // Check if it's encrypted (has IV and auth tag) or plain text
    // Encrypted tokens have at least 28 bytes (12 IV + 16 auth tag + ciphertext)
    // Also check if it looks like a plain OAuth token
    if (buffer.length < 28 || looksLikePlainToken) {
      // Likely plain text, return as-is
      return encrypted
    }
    
    const iv = buffer.subarray(0, 12)
    const authTag = buffer.subarray(12, 28)
    const ciphertext = buffer.subarray(28)

    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv)
    decipher.setAuthTag(authTag)

    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return plain.toString('utf8')
  } catch (error) {
    // If decryption fails, assume it's plain text (for backward compatibility with email_connections)
    // Only log if it's not obviously a plain token to reduce noise
    if (!looksLikePlainToken) {
      console.warn('Failed to decrypt token, treating as plain text')
    }
    return encrypted
  }
}

function calculateExpiry(expiresInSeconds: number) {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)
  return expiresAt.toISOString()
}

// Unified demo calendar: all users share Terry's Outlook for meetings
const DEMO_MEETINGS_CALENDAR_USER_ID = "f47d6b92-5086-4451-9fca-03df24bc01a5";

export async function getOutlookConnection(userId: string) {
  const supabase = await createClient()
  
  console.log('[getOutlookConnection] Fetching connection for user_id:', userId)
  
  // Demo mode: all users use the same unified calendar (Terry's)
  const targetUserId = DEMO_MEETINGS_CALENDAR_USER_ID
  
  // Get connection from email_connections table
  const { data: emailConnection, error: emailError } = await supabase
    .from('email_connections')
    .select('*')
    .eq('user_id', targetUserId)
    .maybeSingle()

  if (emailError) {
    console.error('[getOutlookConnection] Error fetching connection:', emailError)
    throw emailError
  }

  if (!emailConnection) {
    console.log('[getOutlookConnection] No connection found for user_id:', targetUserId)
    return null
  }

  console.log('[getOutlookConnection] Found connection (unified demo calendar):', {
    connectionId: emailConnection.id,
    userId: emailConnection.user_id,
    primaryCalendarId: emailConnection.primary_calendar_id,
    requestedByUserId: userId
  })

  // Convert email_connections format to OutlookConnectionRow format
  return {
    id: emailConnection.id,
    user_id: emailConnection.user_id,
    access_token: emailConnection.access_token, // Plain text tokens from email_connections
    refresh_token: emailConnection.refresh_token,
    token_expires_at: emailConnection.token_expires_at,
    primary_calendar_id: emailConnection.primary_calendar_id,
    connected_at: emailConnection.connected_at,
    updated_at: emailConnection.updated_at,
  } as OutlookConnectionRow
}

export async function upsertOutlookConnection(
  userId: string,
  tokenPayload: TokenResponse,
  primaryCalendarId?: string | null,
  existingConnection?: OutlookConnectionRow | null
) {
  const supabase = await createClient()
  // Store tokens as plain text in email_connections (not encrypted)
  // The email_connections table stores plain tokens
  const connectedAt =
    existingConnection?.connected_at && !existingConnection?.connected_at.startsWith('1970')
      ? existingConnection.connected_at
      : new Date().toISOString()

  // Check if connection exists first
  const { data: existing, error: checkError } = await supabase
    .from('email_connections')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError
  }

  const connectionData = {
      user_id: userId,
    access_token: tokenPayload.access_token, // Plain text, not encrypted
    refresh_token: tokenPayload.refresh_token || null,
      token_expires_at: calculateExpiry(tokenPayload.expires_in),
      primary_calendar_id: primaryCalendarId ?? null,
      connected_at: connectedAt,
      updated_at: new Date().toISOString(),
  }

  let error
  if (existing) {
    // Update existing connection
    const { error: updateError } = await supabase
      .from('email_connections')
      .update(connectionData)
      .eq('user_id', userId)
    error = updateError
  } else {
    // Insert new connection
    const { error: insertError } = await supabase
      .from('email_connections')
      .insert(connectionData)
    error = insertError
  }

  if (error) {
    throw error
  }
}

export async function deleteOutlookConnection(userId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('email_connections').delete().eq('user_id', userId)

  if (error) {
    throw error
  }
}

export async function updatePrimaryCalendar(userId: string, calendarId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('email_connections')
    .update({
      primary_calendar_id: calendarId,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}

export function hasValidAccessToken(connection: OutlookConnectionRow | null) {
  if (!connection?.token_expires_at) return false
  const expiresAt = new Date(connection.token_expires_at).getTime()
  const now = Date.now()
  const buffer = 5 * 60 * 1000 // 5 minutes
  return expiresAt - buffer > now
}

export async function refreshAccessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string
) {
  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: getAuthorizationScopes(),
  })

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh Outlook token: ${error}`)
  }

  return (await response.json()) as TokenResponse
}

export async function ensureAccessToken(
  connection: OutlookConnectionRow,
  tenantId: string,
  clientId: string,
  clientSecret: string
) {
  const accessToken = decryptToken(connection.access_token)

  if (!accessToken) {
    throw new Error('Stored Outlook access token could not be decrypted')
  }

  if (hasValidAccessToken(connection)) {
    return { accessToken, updatedConnection: null as OutlookConnectionRow | null }
  }

  const refreshToken = decryptToken(connection.refresh_token)

  if (!refreshToken) {
    throw new Error('No refresh token available to renew Outlook access')
  }

  const refreshed = await refreshAccessToken(tenantId, clientId, clientSecret, refreshToken)
  await upsertOutlookConnection(
    connection.user_id,
    refreshed,
    connection.primary_calendar_id,
    connection
  )
  const updatedConnection = await getOutlookConnection(connection.user_id)

  if (!updatedConnection) {
    throw new Error('Failed to reload Outlook connection after refresh')
  }

  const updatedAccessToken = decryptToken(updatedConnection.access_token)

  if (!updatedAccessToken) {
    throw new Error('Failed to decrypt refreshed Outlook access token')
  }

  return { accessToken: updatedAccessToken, updatedConnection }
}

export async function fetchCalendars(accessToken: string): Promise<OutlookCalendar[]> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me/calendars?$select=id,name', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    parseGraphError(errorText, 'Failed to fetch Outlook calendars')
  }

  const data = await response.json()
  return (data?.value as OutlookCalendar[]) ?? []
}

export type OutlookEvent = {
  id: string
  subject: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  location?: { displayName: string; locationType?: string; uniqueId?: string; uniqueIdType?: string }
  locations?: Array<{ displayName: string; locationType?: string; uniqueId?: string; uniqueIdType?: string }>
  organizer?: { emailAddress: { name: string; address: string } }
  webLink?: string
  categories?: string[]
  attendees?: Array<{
    type: string
    status: { response: string; time: string }
    emailAddress: { name: string; address: string }
  }>
  onlineMeeting?: {
    joinUrl?: string
  }
  body?: {
    contentType: string
    content: string
  }
  bodyPreview?: string
  isOnlineMeeting?: boolean
  onlineMeetingProvider?: string
  isCancelled?: boolean
  isOrganizer?: boolean
  showAs?: string
  importance?: string
  sensitivity?: string
  createdDateTime?: string
  lastModifiedDateTime?: string
}

export async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string,
  startDate: Date,
  endDate: Date
): Promise<OutlookEvent[]> {
  const startDateTime = startDate.toISOString()
  const endDateTime = endDate.toISOString()
  
  // Fetch comprehensive event data including categories, attendees, online meeting info
  // Use $top=1000 to get more events per page (default is 10, max is usually 1000)
  // NOTE: /me/ endpoint uses the access token's owner's calendar
  let url: string | null = `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/calendarView?startDateTime=${encodeURIComponent(startDateTime)}&endDateTime=${encodeURIComponent(endDateTime)}&$top=1000&$select=id,subject,start,end,location,locations,organizer,webLink,categories,attendees,onlineMeeting,body,bodyPreview,isOnlineMeeting,onlineMeetingProvider,isCancelled,isOrganizer,showAs,importance,sensitivity,createdDateTime,lastModifiedDateTime`
  
  console.log('[fetchCalendarEvents] Fetching events from calendar:', {
    calendarId: calendarId,
    startDate: startDateTime,
    endDate: endDateTime,
    url: url.substring(0, 150) + '...'
  })
  
  const allEvents: OutlookEvent[] = []
  let pageCount = 0
  const maxPages = 100 // Safety limit to prevent infinite loops
  
  // Handle pagination - fetch all pages until there's no nextLink
  while (url && pageCount < maxPages) {
    pageCount++
    console.log(`[Outlook] Fetching page ${pageCount}: ${url.substring(0, 100)}...`)
  
  const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Outlook] Failed to fetch page ${pageCount}:`, errorText)
      parseGraphError(errorText, 'Failed to fetch Outlook calendar events')
    }

    const data = await response.json()
    const events = (data?.value as OutlookEvent[]) ?? []
    allEvents.push(...events)
    
    // Log first event's organizer to verify we're getting different calendars
    if (events.length > 0 && pageCount === 1) {
      console.log(`[Outlook] Page ${pageCount} first event organizer:`, {
        subject: events[0]?.subject,
        organizerEmail: events[0]?.organizer?.emailAddress?.address,
        organizerName: events[0]?.organizer?.emailAddress?.name,
        calendarId: calendarId
      })
    }
    
    console.log(`[Outlook] Page ${pageCount}: fetched ${events.length} events (total: ${allEvents.length})`)
    
    // Check if there's a next page - use the full URL from @odata.nextLink
    const nextLink = data['@odata.nextLink'] as string | undefined
    if (nextLink) {
      console.log(`[Outlook] Found nextLink, fetching next page...`)
      url = nextLink
    } else {
      console.log(`[Outlook] No more pages, fetched all ${allEvents.length} events`)
      url = null
    }
  }
  
  if (pageCount >= maxPages) {
    console.warn(`[Outlook] Reached max pages limit (${maxPages}), may have missed some events`)
  }
  
  console.log(`[Outlook] Total fetched ${allEvents.length} events from ${startDateTime} to ${endDateTime} across ${pageCount} pages`)
  
  return allEvents
}

// Fetch available categories for the user's calendar
export async function fetchOutlookCategories(accessToken: string) {
  const response = await fetch('https://graph.microsoft.com/v1.0/me/outlook/masterCategories', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    parseGraphError(errorText, 'Failed to fetch Outlook categories')
  }

  const data = await response.json()
  return (data?.value as Array<{ id: string; displayName: string; color: string }>) ?? []
}

// Update event categories
export async function updateEventCategories(
  accessToken: string,
  eventId: string,
  categories: string[]
) {
  const url = `https://graph.microsoft.com/v1.0/me/events/${eventId}`
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      categories,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    parseGraphError(errorText, 'Failed to update event categories')
  }

  return (await response.json()) as OutlookEvent
}

export type CreateOutlookEventParams = {
  subject: string
  start: Date
  end: Date
  body?: string
  location?: string
  attendees?: Array<{ email: string; name?: string }>
}

export async function createOutlookEvent(
  accessToken: string,
  calendarId: string,
  eventData: CreateOutlookEventParams
): Promise<OutlookEvent> {
  const eventPayload = {
    subject: eventData.subject,
    start: {
      dateTime: eventData.start.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
    end: {
      dateTime: eventData.end.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
    body: eventData.body
      ? {
          contentType: 'HTML',
          content: eventData.body,
        }
      : undefined,
    location: eventData.location
      ? {
          displayName: eventData.location,
        }
      : undefined,
    attendees: eventData.attendees?.map((attendee) => ({
      emailAddress: {
        address: attendee.email,
        name: attendee.name || attendee.email,
      },
      type: 'required',
    })),
  }

  const url = `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    parseGraphError(errorText, 'Failed to create Outlook calendar event')
  }

  const data = await response.json()
  return data as OutlookEvent
}

export { REQUIRED_SCOPES }

