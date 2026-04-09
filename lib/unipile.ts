interface UnipileRequestOptions extends RequestInit {
  searchParams?: Record<string, string | number | undefined | null>
}

export interface UnipileMessage {
  id?: string
  object?: string
  provider_id?: string
  sender_id?: string
  sender_attendee_id?: string
  sender_urn?: string
  chat_id?: string
  text?: string
  html?: string
  timestamp?: string
  is_sender?: boolean | number
  attachments?: Array<{
    id?: string
    file_name?: string
    mime_type?: string
    size?: number
    url?: string
  }>
  [key: string]: any
}

export interface UnipileAccount {
  id: string
  object?: string
  name?: string
  type?: string
  provider?: string
  status?: string
  created_at?: string
  [key: string]: any
}

export interface UnipileHostedAuthLinkResponse {
  object: string
  url: string
  code?: string
  expires_at?: string
}

export interface UnipileChat {
  id: string
  object?: string
  provider_id?: string
  account_id?: string
  name?: string
  type?: string
  attendees?: Array<{
    id?: string
    provider_id?: string
    name?: string
    profile_url?: string
  }>
  last_message?: UnipileMessage
  updated_at?: string
  created_at?: string
  [key: string]: any
}

export interface UnipileChatListResponse {
  object: string
  items: UnipileChat[]
  cursor?: string
  has_more?: boolean
}

export interface UnipileMessageListResponse {
  object: string
  items: UnipileMessage[]
  meta?: Record<string, any>
}

export interface UnipileSendMessageResponse {
  object: string
  item: UnipileMessage
}

export interface UnipileUserProfile {
  object?: string
  provider_id?: string
  public_identifier?: string
  first_name?: string
  last_name?: string
  headline?: string
  profile_url?: string
  profile_picture_url?: string
  location?: string
  connections_count?: number
  [key: string]: any
}

const DEFAULT_BASE_URL = process.env.UNIPILE_API_BASE_URL || process.env.UNIPILE_BASE_URL
const API_KEY = process.env.UNIPILE_API_KEY

if (!DEFAULT_BASE_URL) {
  console.warn("[unipile] UNIPILE_API_BASE_URL is not defined. Set it to your Unipile DSN, e.g. https://api1.unipile.com:13111/api/v1/")
}

if (!API_KEY) {
  console.warn("[unipile] UNIPILE_API_KEY is not defined. Requests to Unipile API will fail until provided.")
}

const normalizeBaseUrl = (baseUrl?: string | null) => {
  if (!baseUrl) return ""
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
}

const baseUrl = normalizeBaseUrl(DEFAULT_BASE_URL)

const buildUrl = (path: string, searchParams?: Record<string, string | number | undefined | null>) => {
  if (!baseUrl) {
    throw new Error("Unipile base URL is not configured. Please set UNIPILE_API_BASE_URL.")
  }

  const normalizedPath = path.startsWith("http") ? path : `${baseUrl}${path.replace(/^\//, "")}`
  const url = new URL(normalizedPath)

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value))
      }
    })
  }

  return url
}

const withAuthHeaders = (headers?: HeadersInit): HeadersInit => {
  const merged = new Headers(headers)
  merged.set("Accept", "application/json")
  if (!merged.has("X-API-KEY") && API_KEY) {
    merged.set("X-API-KEY", API_KEY)
  }
  return merged
}

const unipileFetch = async (path: string, { searchParams, headers, ...init }: UnipileRequestOptions = {}) => {
  const url = buildUrl(path, searchParams)
  const response = await fetch(url, {
    ...init,
    headers: withAuthHeaders(headers),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`[Unipile] Request failed (${response.status}): ${errorBody}`)
  }

  return response
}

export const unipile = {
  async listChatMessages(chatId: string, params?: Record<string, string | number | undefined | null>) {
    const response = await unipileFetch(`chats/${chatId}/messages`, {
      searchParams: params,
    })
    return (await response.json()) as UnipileMessageListResponse
  },

  async sendMessageToChat(chatId: string, text: string, additionalFormEntries?: Record<string, string | Blob>) {
    const formData = new FormData()
    formData.set("text", text)

    if (additionalFormEntries) {
      Object.entries(additionalFormEntries).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }

    const response = await unipileFetch(`chats/${chatId}/messages`, {
      method: "POST",
      body: formData,
    })
    return (await response.json()) as UnipileSendMessageResponse
  },

  async startChat(accountId: string, attendeeId: string, text: string, extraFormData?: Record<string, string | Blob>) {
    const formData = new FormData()
    formData.set("account_id", accountId)
    formData.append("attendees_ids", attendeeId)
    formData.set("text", text)

    if (extraFormData) {
      Object.entries(extraFormData).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }

    const response = await unipileFetch("chats", {
      method: "POST",
      body: formData,
    })
    return (await response.json()) as UnipileSendMessageResponse
  },

  async createHostedAuthLink(options: {
    type: "create" | "reconnect"
    provider?: string
    api_url?: string
    expiresOn?: string
    success_redirect_url?: string
    failure_redirect_url?: string
    notify_url?: string
    name?: string
    reconnect_account?: string
  }) {
    const defaultExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, ".000Z")
    
    const body: Record<string, any> = {
      type: options.type,
      api_url: options.api_url || baseUrl.replace(/\/$/, ""),
      expiresOn: options.expiresOn || defaultExpiry,
    }

    if (options.provider) body.providers = [options.provider]
    if (options.success_redirect_url) body.success_redirect_url = options.success_redirect_url
    if (options.failure_redirect_url) body.failure_redirect_url = options.failure_redirect_url
    if (options.notify_url) body.notify_url = options.notify_url
    if (options.name) body.name = options.name
    if (options.type === "reconnect" && options.reconnect_account) {
      body.reconnect_account = options.reconnect_account
    }

    const response = await unipileFetch("hosted/accounts/link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    return (await response.json()) as UnipileHostedAuthLinkResponse
  },

  async getAccount(accountId: string) {
    const response = await unipileFetch(`accounts/${accountId}`)
    return (await response.json()) as UnipileAccount
  },

  async listAccounts(params?: Record<string, string | number | undefined | null>) {
    const response = await unipileFetch("accounts", {
      searchParams: params,
    })
    return (await response.json()) as { object: string; items: UnipileAccount[] }
  },

  async deleteAccount(accountId: string) {
    const response = await unipileFetch(`accounts/${accountId}`, {
      method: "DELETE",
    })
    return response.ok
  },

  async listChats(accountId: string, params?: Record<string, string | number | undefined | null>) {
    const response = await unipileFetch(`chats`, {
      searchParams: {
        account_id: accountId,
        ...params,
      },
    })
    return (await response.json()) as UnipileChatListResponse
  },

  async getChat(chatId: string) {
    const response = await unipileFetch(`chats/${chatId}`)
    return (await response.json()) as UnipileChat
  },

  async listAllChats(params?: Record<string, string | number | undefined | null>) {
    const response = await unipileFetch(`chats`, {
      searchParams: params,
    })
    return (await response.json()) as UnipileChatListResponse
  },

  async getUser(providerId: string, accountId: string) {
    const response = await unipileFetch(`users/${providerId}`, {
      searchParams: {
        account_id: accountId,
      },
    })
    return (await response.json()) as UnipileUserProfile
  },

  /** Get the LinkedIn profile of the account owner (the connected user). Returns provider_id for traceability. */
  async getOwnProfile(accountId: string) {
    const response = await unipileFetch("users/me", {
      searchParams: { account_id: accountId },
    })
    return (await response.json()) as UnipileUserProfile
  },
}

export type UnipileClient = typeof unipile

