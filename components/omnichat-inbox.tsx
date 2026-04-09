"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Linkedin,
  ExternalLink,
  RefreshCw,
  Search,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LinkedInLeadSelectionModal, type PotentialLead } from "@/components/linkedin-lead-selection-modal"
import { toast } from "sonner"

type Channel = "email" | "sms" | "whatsapp" | "linkedin"

interface Message {
  id: string
  text: string
  timestamp: string
  isInbound: boolean
  channel: Channel
  senderName?: string
}

interface Lead {
  id: string
  contact_first_name?: string
  contact_last_name?: string
  contact_email?: string
  business_name?: string
  mobile_phone?: string
  linkedin_company_url?: string
  linkedin_invite_accepted?: boolean
}

interface OmniChatInboxProps {
  leadId: string
  channel: Channel
  leadName?: string
  /** When provided (e.g. from lead page connection API), used for LinkedIn "connected" state so inbox shows Search & connect instead of Connect LinkedIn */
  userLinkedInConnected?: boolean
  /** When true, we already have a chat / invitation sent; show "waiting for acceptance" instead of "Search & connect" */
  linkedinLeadHasChat?: boolean
  /** LinkedIn profile picture URL (from Unipile) for the lead – shown in header avatar */
  leadProfilePictureUrl?: string | null
  /** Connected user's Unipile account ID – shown on profile link for traceability */
  userUnipileAccountId?: string | null
  /** Lead's LinkedIn account ID (provider_id) – shown on profile link for traceability */
  leadLinkedinAccountId?: string | null
  /** When set, after successful bulk add from Search & connect we redirect to /leads filtered by this company name */
  sourceLeadCompany?: string | null
  /** Whether the lead has accepted the LinkedIn invitation (from DB field linkedin_invite_accepted) */
  linkedinInviteAccepted?: boolean
}

function truncateId(id: string | null | undefined, max = 12): string {
  if (!id) return "—"
  return id.length > max ? `${id.slice(0, max)}…` : id
}

/** Parse webhook response: array like [{ status, potential_leads }], single object { status, potential_leads }, or raw array of lead objects */
function parsePotentialLeadsResponse(body: unknown): PotentialLead[] {
  if (!body || typeof body !== "object") return []
  const raw = body as Record<string, unknown>
  let list: unknown[] | undefined
  let wrapper: Record<string, unknown> | null = null
  if (Array.isArray(body)) {
    const item = (body as Record<string, unknown>[]).find(
      (x) => x && typeof x === "object" && (x as Record<string, unknown>).status === "potential_leads"
    ) as Record<string, unknown> | undefined
    wrapper = item ?? null
    list = item?.potential_leads as unknown[] | undefined
    // If no wrapper found, treat body as raw array of leads when elements look like leads (provider_id or name)
    if (!Array.isArray(list) && body.length > 0) {
      const first = body[0] as Record<string, unknown>
      if (first && typeof first === "object" && (first.provider_id != null || first.name != null)) {
        list = body as unknown[]
      }
    }
  } else if (raw.status === "potential_leads" && Array.isArray(raw.potential_leads)) {
    list = raw.potential_leads
    wrapper = raw
  }
  if (!Array.isArray(list) || list.length === 0) return []
  // If wrapper specified a smaller count/total, use it so UI count matches actual returned size
  const w = wrapper ?? raw
  const maxCount =
    typeof w?.count === "number" ? (w as any).count : typeof w?.total === "number" ? (w as any).total : null
  const listToUse =
    maxCount != null && maxCount >= 0 && maxCount < list.length ? list.slice(0, maxCount) : list
  return listToUse
    .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
    .map((x) => ({
      provider_id: String(x.provider_id ?? ""),
      name: String(x.name ?? ""),
      profile_url: typeof x.profile_url === "string" ? x.profile_url : undefined,
      headline: typeof x.headline === "string" ? x.headline : undefined,
      company: typeof x.company === "string" ? x.company : undefined,
      location: typeof x.location === "string" ? x.location : undefined,
      network_distance: typeof x.network_distance === "string" ? x.network_distance : undefined,
    })) as PotentialLead[]
}

const getChannelIcon = (channel: Channel) => {
  switch (channel) {
    case "email":
      return <Mail className="h-4 w-4" />
    case "whatsapp":
      return <MessageSquare className="h-4 w-4 text-green-600" />
    case "sms":
      return <Phone className="h-4 w-4 text-blue-600" />
    case "linkedin":
      return <Linkedin className="h-4 w-4 text-[#0A66C2]" />
    default:
      return <Mail className="h-4 w-4" />
  }
}

const getChannelColor = (channel: Channel) => {
  switch (channel) {
    case "email":
      return "bg-gray-100 text-gray-700"
    case "whatsapp":
      return "bg-green-100 text-green-700"
    case "sms":
      return "bg-blue-100 text-blue-700"
    case "linkedin":
      return "bg-[#0A66C2]/10 text-[#0A66C2]"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

function formatTimestamp(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  if (isToday) {
    return time
  } else if (isYesterday) {
    return `Yesterday ${time}`
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + time
  }
}

export function OmniChatInbox({
  leadId,
  channel,
  leadName,
  userLinkedInConnected: userLinkedInConnectedProp,
  linkedinLeadHasChat,
  leadProfilePictureUrl: leadProfilePictureUrlProp,
  userUnipileAccountId: userUnipileAccountIdProp,
  leadLinkedinAccountId: leadLinkedinAccountIdProp,
  sourceLeadCompany,
  linkedinInviteAccepted: linkedinInviteAcceptedProp,
}: OmniChatInboxProps) {
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [messageText, setMessageText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [canSend, setCanSend] = useState(false)
  const [userLinkedInConnectedFromApi, setUserLinkedInConnectedFromApi] = useState(false)
  // Prefer prop from parent (lead page connection API); fallback to value from messages API
  const userLinkedInConnected = userLinkedInConnectedProp ?? userLinkedInConnectedFromApi
  const [linkedinProfileUrl, setLinkedinProfileUrl] = useState<string | null>(null)
  const [leadProfilePictureUrlFromApi, setLeadProfilePictureUrlFromApi] = useState<string | null>(null)
  const [userUnipileAccountIdFromApi, setUserUnipileAccountIdFromApi] = useState<string | null>(null)
  const [leadLinkedinAccountIdFromApi, setLeadLinkedinAccountIdFromApi] = useState<string | null>(null)
  const displayProfilePictureUrl = leadProfilePictureUrlProp ?? leadProfilePictureUrlFromApi
  const displayUserUnipileAccountId = userUnipileAccountIdProp ?? userUnipileAccountIdFromApi
  const displayLeadLinkedinAccountId = leadLinkedinAccountIdProp ?? leadLinkedinAccountIdFromApi
  const [potentialLeads, setPotentialLeads] = useState<PotentialLead[]>([])
  const [showPotentialModal, setShowPotentialModal] = useState(false)
  const [isStartingSearch, setIsStartingSearch] = useState(false)
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const displayName = leadName ||
    (lead ? `${lead.contact_first_name || ""} ${lead.contact_last_name || ""}`.trim() : "") ||
    "Lead"

  const loadMessages = useCallback(async () => {
    if (!leadId) return

    setLoading(true)
    setError(null)

    try {
      // Fetch lead info
      const { data: leadData } = await supabase
        .from("leads")
        .select("id, contact_first_name, contact_last_name, contact_email, business_name, mobile_phone, linkedin_company_url, linkedin_invite_accepted")
        .eq("id", leadId)
        .single()

      if (leadData) {
        setLead(leadData)
      }

      if (channel === "linkedin") {
        // Fetch LinkedIn messages
        const { data: session } = await supabase.auth.getSession()
        const token = session?.session?.access_token

        const res = await fetch(`/api/leads/${leadId}/linkedin/messages`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })

        if (res.ok) {
          const data = await res.json()
          const linkedinMessages: Message[] = (data.messages || []).map((msg: any) => ({
            id: msg.id,
            text: msg.text || "",
            timestamp: msg.timestamp || new Date().toISOString(),
            isInbound: msg.direction === "inbound",
            channel: "linkedin" as Channel,
            senderName: msg.senderName,
          }))
          setMessages(linkedinMessages)
          setCanSend(data.canSendMessage || false)
          setUserLinkedInConnectedFromApi(data.userLinkedInConnected ?? false)
          setLinkedinProfileUrl(data.linkedinProfileUrl || null)
          setLeadProfilePictureUrlFromApi(data.leadProfilePictureUrl || null)
          setUserUnipileAccountIdFromApi(data.userUnipileAccountId || null)
          setLeadLinkedinAccountIdFromApi(data.lead?.linkedinAccountId || null)
        }
      } else {
        // Fetch email/SMS/WhatsApp messages using the RPC function
        const { data: bundle } = await supabase.rpc("get_lead_conversation_bundle", {
          p_lead_id: leadId,
          p_email_limit: 100,
          p_whatsapp_limit: 100,
          p_calls_limit: 50,
        })

        if (bundle) {
          const combinedMessages: Message[] = []

          // Process email messages
          if (channel === "email" && bundle.email_messages) {
            for (const msg of bundle.email_messages) {
              combinedMessages.push({
                id: msg.id,
                text: msg.content || "",
                timestamp: msg.last_update || msg.created_at || new Date().toISOString(),
                isInbound: (msg.direction || "").toLowerCase() === "inbound",
                channel: "email",
                senderName: msg.direction === "inbound" ? displayName : "You",
              })
            }
          }

          // Process WhatsApp messages
          if ((channel === "whatsapp" || channel === "sms") && bundle.whatsapp_messages) {
            for (const msg of bundle.whatsapp_messages) {
              const msgChannel = (msg.message_type || "").toLowerCase() === "whatsapp" ? "whatsapp" : "sms"
              if (msgChannel === channel || channel === "sms") {
                combinedMessages.push({
                  id: msg.id,
                  text: msg.message_text || "",
                  timestamp: msg.sent_at || msg.created_at || new Date().toISOString(),
                  isInbound: msg.is_inbound === true,
                  channel: msgChannel as Channel,
                  senderName: msg.is_inbound ? displayName : "You",
                })
              }
            }
          }

          // Sort by timestamp
          combinedMessages.sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )

          setMessages(combinedMessages)
          setCanSend(true)
        }
      }
    } catch (err) {
      console.error("Error loading messages:", err)
      setError("Failed to load messages")
    } finally {
      setLoading(false)
    }
  }, [leadId, channel, displayName, supabase])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSearchAndConnect = useCallback(async () => {
    if (channel !== "linkedin" || !leadId) return
    setIsStartingSearch(true)
    setError(null)
    setPotentialLeads([])
    setShowPotentialModal(false)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token
      const res = await fetch(`/api/leads/${leadId}/linkedin/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      })
      const body = await res.json().catch(() => null)
      const parsed = parsePotentialLeadsResponse(body)
      if (parsed.length > 0) {
        setPotentialLeads(parsed)
        setShowPotentialModal(true)
        toast.info(`Found ${parsed.length} potential lead(s). Select to create and start.`)
      } else if (!res.ok) {
        setError(body?.error || body?.details || "Search failed")
        toast.error(body?.error || body?.details || "Search failed")
      } else {
        toast.info(body?.message || "No potential leads found for this search.")
      }
    } catch (err) {
      console.error("Search & connect error:", err)
      setError("Failed to search for leads")
      toast.error("Failed to search for leads")
    } finally {
      setIsStartingSearch(false)
    }
  }, [channel, leadId, supabase])

  const handlePotentialLeadsConfirm = useCallback(
    async (selected: PotentialLead[]) => {
      if (selected.length === 0 || !leadId) return
      setIsBulkSubmitting(true)
      try {
        const { data: session } = await supabase.auth.getSession()
        const token = session?.session?.access_token
        const res = await fetch("/api/leads/linkedin/bulk-start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            leads: selected.map((l) => ({
              provider_id: l.provider_id,
              name: l.name,
              profile_url: l.profile_url,
              company: l.company,
              headline: l.headline,
            })),
            source_lead_id: leadId,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(data?.error || data?.details || "Failed to create leads and start")
          return
        }
        setShowPotentialModal(false)
        setPotentialLeads([])
        const wr = data.workflow_response as { message?: string; results?: Array<{ data?: Array<{ status?: string; message?: string }> }> } | undefined
        const webhookMessage = wr?.message
        const firstResult = Array.isArray(wr?.results) ? wr.results[0] : undefined
        const resultsData = firstResult?.data ?? firstResult
        const resultItems = Array.isArray(resultsData) ? resultsData : []
        if (webhookMessage) {
          toast.success(webhookMessage)
        } else if (resultItems.length > 0) {
          const names = resultItems
            .filter((item: { status?: string }) => item?.status === "agent_started")
            .map((item: { message?: string }) => {
              const m = item?.message ?? ""
              const match = m.match(/for (.+)$/)
              return match ? match[1].trim() : null
            })
            .filter(Boolean)
          toast.success(
            names.length > 0
              ? `Lead created and agent started for: ${names.join(", ")}`
              : data?.message || `Created ${selected.length} lead(s) and started LinkedIn agent.`
          )
        } else {
          toast.success(data?.message || `Created ${selected.length} lead(s) and started LinkedIn agent.`)
        }
        if (sourceLeadCompany?.trim()) {
          try {
            const companyName = sourceLeadCompany.trim()
            const filterData = {
              searchTerm: companyName,
              filters: {},
              currentPage: 1,
              timestamp: Date.now(),
            }
            sessionStorage.setItem("leads-page-filters", JSON.stringify(filterData))
            router.push("/leads")
            return
          } catch {
            loadMessages()
          }
        } else {
          loadMessages()
        }
      } catch (err) {
        console.error("Bulk start error:", err)
        toast.error("Failed to create leads and start")
      } finally {
        setIsBulkSubmitting(false)
      }
    },
    [leadId, loadMessages, supabase, sourceLeadCompany, router]
  )

  const handleSend = async () => {
    if (!messageText.trim() || sending || !canSend) return

    setSending(true)
    try {
      if (channel === "linkedin") {
        const { data: session } = await supabase.auth.getSession()
        const token = session?.session?.access_token

        const res = await fetch(`/api/leads/${leadId}/linkedin/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text: messageText }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.message) {
            setMessages(prev => [...prev, {
              id: data.message.id,
              text: data.message.text || messageText,
              timestamp: data.message.timestamp || new Date().toISOString(),
              isInbound: false,
              channel: "linkedin",
              senderName: "You",
            }])
          }
          setMessageText("")
        } else {
          const errorData = await res.json()
          setError(errorData.error || "Failed to send message")
        }
      } else {
        // For email/SMS/WhatsApp, we'd need to implement similar send logic
        // For now, show a message to use the full inbox
        setError("Please use the full inbox to send messages for this channel")
      }
    } catch (err) {
      console.error("Error sending message:", err)
      setError("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-3">
          {channel === "linkedin" && displayProfilePictureUrl?.startsWith("https://media.licdn.com") ? (
            <div className="relative h-10 w-10 flex-shrink-0 rounded-full overflow-hidden bg-blue-500">
              <Image
                src={displayProfilePictureUrl}
                alt={displayName}
                fill
                className="object-cover"
                sizes="40px"
                unoptimized
              />
            </div>
          ) : (
            <Avatar className="h-10 w-10">
              {channel === "linkedin" && displayProfilePictureUrl ? (
                <AvatarImage
                  src={displayProfilePictureUrl}
                  alt={displayName}
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <AvatarFallback className="bg-blue-500 text-white font-semibold">
                {displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{displayName}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs py-0 h-5", getChannelColor(channel))}>
                {getChannelIcon(channel)}
                <span className="ml-1 capitalize">{channel}</span>
              </Badge>
              {lead?.contact_email && (
                <span className="text-xs text-gray-500">{lead.contact_email}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {channel === "linkedin" && !(linkedinLeadHasChat || messages.length > 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSearchAndConnect}
              disabled={isStartingSearch}
              className="text-[#0A66C2] border-[#0A66C2]/30 hover:bg-[#0A66C2]/10"
            >
              {isStartingSearch ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-1" />
              )}
              Search & connect
            </Button>
          )}
          {(linkedinProfileUrl || lead?.linkedin_company_url) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" asChild className="text-[#0A66C2] border-[#0A66C2]/30 hover:bg-[#0A66C2]/10">
                    <a href={linkedinProfileUrl || lead?.linkedin_company_url || "#"} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-4 w-4 mr-1" />
                      Profile
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  <p>Open LinkedIn profile</p>
                  {displayLeadLinkedinAccountId && (
                    <p className="mt-0.5 text-muted-foreground">Lead LinkedIn ID: {truncateId(displayLeadLinkedinAccountId, 20)}</p>
                  )}
                  {displayUserUnipileAccountId && (
                    <p className="text-muted-foreground">Via your account: {truncateId(displayUserUnipileAccountId, 20)}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button variant="ghost" size="icon" onClick={loadMessages} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={channel === "linkedin" ? `/leads/${leadId}?channel=linkedin` : `/leads/${leadId}/inbox`}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Full View
            </Link>
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {/* Invitation Accepted system message */}
        {channel === "linkedin" && (linkedinInviteAcceptedProp || lead?.linkedin_invite_accepted) && (
          <div className="flex justify-center my-2">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-green-50 border border-green-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
              <span className="text-xs font-medium text-green-700">
                {displayName} accepted invitation
              </span>
            </div>
          </div>
        )}
        {messages.length === 0 && !(channel === "linkedin" && (linkedinInviteAcceptedProp || lead?.linkedin_invite_accepted)) ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No messages yet</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.isInbound ? "justify-start" : "justify-end"
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-lg px-4 py-2 shadow-sm",
                  msg.isInbound
                    ? "bg-white border border-gray-200"
                    : "bg-blue-600 text-white"
                )}
              >
                {msg.isInbound && (
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    {msg.senderName || displayName}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                <p
                  className={cn(
                    "text-xs mt-1",
                    msg.isInbound ? "text-gray-400" : "text-blue-200"
                  )}
                >
                  {formatTimestamp(msg.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Composer */}
      <div className="border-t bg-white p-4">
        {channel === "linkedin" && !userLinkedInConnected ? (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">
              Connect your LinkedIn account in your profile to send messages
            </p>
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link href="/profile">Connect LinkedIn</Link>
            </Button>
          </div>
        ) : channel === "linkedin" && userLinkedInConnected && !canSend ? (
          <div className="space-y-3">
            {(linkedinLeadHasChat || messages.length > 0) ? (
              <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                Invitation sent. Waiting for <strong>{displayName}</strong> to accept your connection. You can send messages once they accept.
              </p>
            ) : (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Lead not connected yet. Use <strong>Search & connect</strong> above to find this lead on LinkedIn and start a conversation.
              </p>
            )}
            <div className="flex gap-2">
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="You can type here once the lead is connected…"
                className="min-h-[60px] resize-none flex-1"
                disabled
              />
              <Button disabled className="self-end">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={`Type a ${channel} message...`}
              className="min-h-[60px] resize-none flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <Button
              onClick={handleSend}
              disabled={!messageText.trim() || sending || !canSend}
              className="self-end"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>

      {channel === "linkedin" && (
        <LinkedInLeadSelectionModal
          open={showPotentialModal}
          onOpenChange={setShowPotentialModal}
          potentialLeads={potentialLeads}
          sourceLeadId={leadId}
          sourceLeadName={leadName || displayName}
          onConfirm={handlePotentialLeadsConfirm}
          isLoading={isBulkSubmitting}
        />
      )}
    </div>
  )
}
