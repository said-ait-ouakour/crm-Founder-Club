"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, Mail, MessageSquare, Smartphone, ArrowLeft, GripVertical, Search, X, Linkedin } from "lucide-react"
import { cn } from "@/lib/utils"
import { OmniChatInbox } from "@/components/omnichat-inbox"

// --- TYPES ---
interface Conversation {
  id: string
  lead_id: string
  lead_name: string
  lead_email: string
  last_message: string
  last_message_date: string
  channel: "email" | "sms" | "whatsapp" | "linkedin"
  unread?: boolean
  is_unanswered?: boolean
  lead_profile_picture_url?: string | null
}

// --- HELPER FUNCTIONS ---
const getChannelIcon = (channel: string) => {
  switch (channel) {
    case "email":
      return <Mail className="h-4 w-4" />
    case "whatsapp":
      return (
        <svg className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="none">
          <g>
            <path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.67.15-.198.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.571-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.363.71.306 1.263.489 1.695.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path fill="currentColor" d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.462 3.479 1.338 4.995L2.003 22l5.13-1.342c1.47.805 3.13 1.245 4.87 1.245 5.514 0 9.997-4.483 9.997-9.997 0-2.666-1.04-5.17-2.929-7.06C17.174 3.043 14.67 2.003 12.004 2.003zm0 17.995c-1.57 0-3.104-.418-4.44-1.21l-.318-.188-3.045.797.812-2.97-.206-.306c-.82-1.22-1.25-2.64-1.25-4.108 0-4.135 3.364-7.5 7.5-7.5 2.003 0 3.89.78 5.304 2.195 1.414 1.414 2.196 3.3 2.196 5.304 0 4.135-3.365 7.5-7.5 7.5z" />
          </g>
        </svg>
      )
    case "sms":
      return <Smartphone className="h-4 w-4 text-blue-600" />
    case "linkedin":
      return <Linkedin className="h-4 w-4 text-[#0A66C2]" />
    default:
      return <Mail className="h-4 w-4" />
  }
}

const getChannelColor = (channel: string) => {
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

function formatMessageTimestamp(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  if (isToday) {
    return `Today at ${time}`
  } else if (isYesterday) {
    return `Yesterday at ${time}`
  } else {
    return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }) + " at " + time
  }
}

// --- API FETCH FUNCTION ---
const fetchConversations = async (
  page: number,
  pageSize: number,
  search: string = '',
  channel: string = 'all'
): Promise<{ conversations: any[]; total: number }> => {
  const offset = (page - 1) * pageSize
  const params = new URLSearchParams({
    limit: pageSize.toString(),
    offset: offset.toString(),
  })

  if (search.trim()) {
    params.set('search', search.trim())
  }
  if (channel !== 'all') {
    params.set('channel', channel)
  }

  const res = await fetch(`/api/omnichat/conversations?${params}`)
  if (!res.ok) throw new Error("Network response was not ok")
  return res.json()
}

// --- CONVERSATION CARD COMPONENT ---
const ConversationCard = ({
  conversation,
  isSelected,
  onSelect
}: {
  conversation: Conversation
  isSelected?: boolean
  onSelect?: () => void
}) => {
  return (
    <div
      className={cn(
        "p-3 border-b cursor-pointer transition-colors hover:bg-gray-50",
        conversation.unread && "bg-blue-50/50",
        conversation.is_unanswered && "bg-amber-50/50 border-l-2 border-l-amber-400",
        isSelected && "bg-blue-100 border-l-4 border-l-blue-500"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        {conversation.channel === "linkedin" && conversation.lead_profile_picture_url?.startsWith("https://media.licdn.com") ? (
          <div className="relative h-10 w-10 flex-shrink-0 rounded-full overflow-hidden bg-blue-500">
            <Image
              src={conversation.lead_profile_picture_url}
              alt={conversation.lead_name}
              fill
              className="object-cover"
              sizes="40px"
              unoptimized
            />
          </div>
        ) : (
          <Avatar className="h-10 w-10 flex-shrink-0">
            {conversation.channel === "linkedin" && conversation.lead_profile_picture_url ? (
              <AvatarImage
                src={conversation.lead_profile_picture_url}
                alt={conversation.lead_name}
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            ) : null}
            <AvatarFallback className="bg-blue-500 text-white font-semibold text-sm">
              {conversation.lead_name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className={cn(
                "font-medium text-gray-900 truncate text-sm",
                (conversation.unread || conversation.is_unanswered) && "font-semibold"
              )}>
                {conversation.lead_name}
              </h3>
              {conversation.is_unanswered && (
                <span className="h-2 w-2 bg-amber-500 rounded-full flex-shrink-0" title="Needs reply"></span>
              )}
              {conversation.unread && !conversation.is_unanswered && (
                <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0"></span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn("text-xs py-0 h-5", getChannelColor(conversation.channel))}>
              {getChannelIcon(conversation.channel)}
              <span className="ml-1 capitalize">{conversation.channel}</span>
            </Badge>
            <span className="text-xs text-gray-500">
              {formatMessageTimestamp(conversation.last_message_date)}
            </span>
          </div>

          <p className="text-xs text-gray-600 line-clamp-1">
            {conversation.last_message || "No message content"}
          </p>
        </div>
      </div>
    </div>
  )
}

// --- RESIZABLE DIVIDER COMPONENT ---
const ResizableDivider = ({
  onResize,
  className
}: {
  onResize: (deltaX: number) => void
  className?: string
}) => {
  const dividerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    startX.current = e.clientX
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const deltaX = e.clientX - startX.current
      startX.current = e.clientX
      onResize(deltaX)
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [onResize])

  return (
    <div
      ref={dividerRef}
      className={cn(
        "w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize flex items-center justify-center group transition-colors",
        className
      )}
      onMouseDown={handleMouseDown}
    >
      <GripVertical className="h-6 w-6 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

export default function OmniChatPage() {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(15)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)

  // Filter and search state
  const [searchInput, setSearchInput] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [channelFilter, setChannelFilter] = useState<"all" | "email" | "sms" | "whatsapp" | "linkedin">("all")

  // Data fetching state
  const [data, setData] = useState<{ conversations: any[]; total: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Panel width state
  const [leftPanelWidth, setLeftPanelWidth] = useState(350)
  const containerRef = useRef<HTMLDivElement>(null)

  const MIN_LEFT_WIDTH = 280
  const MAX_LEFT_WIDTH = 600

  // Fetch conversations
  useEffect(() => {
    let cancelled = false
    
    const loadConversations = async () => {
      setIsLoading(true)
      setIsError(false)
      setError(null)
      
      try {
        const result = await fetchConversations(currentPage, pageSize, appliedSearch, channelFilter)
        if (!cancelled) {
          setData(result)
        }
      } catch (err) {
        if (!cancelled) {
          setIsError(true)
          setError(err instanceof Error ? err : new Error("Failed to fetch conversations"))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }
    
    loadConversations()
    
    return () => {
      cancelled = true
    }
  }, [currentPage, pageSize, appliedSearch, channelFilter])

  const conversations: Conversation[] = data?.conversations?.map((item: any) => ({
    id: item.id || item.conversation_id,
    lead_id: item.lead_id,
    lead_name: item.lead_name,
    lead_email: item.lead_email,
    last_message: item.last_message,
    last_message_date: item.last_message_date,
    channel: item.channel,
    is_unanswered: item.is_unanswered,
    unread: item.is_unanswered,
    lead_profile_picture_url: item.lead_profile_picture_url ?? null
  })) || []

  const totalConversations = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(totalConversations / pageSize))

  const handleApplySearch = () => {
    setAppliedSearch(searchInput)
    setCurrentPage(1)
    setSelectedIndex(null)
    setSelectedConversation(null)
  }

  const handleChannelChange = (channel: "all" | "email" | "sms" | "whatsapp" | "linkedin") => {
    setChannelFilter(channel)
    setCurrentPage(1)
    setSelectedIndex(null)
    setSelectedConversation(null)
  }

  const handleClearFilters = () => {
    setSearchInput("")
    setAppliedSearch("")
    setChannelFilter("all")
    setCurrentPage(1)
    setSelectedIndex(null)
    setSelectedConversation(null)
  }

  const handleResize = useCallback((deltaX: number) => {
    setLeftPanelWidth(prev => {
      const newWidth = prev + deltaX
      return Math.min(Math.max(newWidth, MIN_LEFT_WIDTH), MAX_LEFT_WIDTH)
    })
  }, [])

  const handleSelectConversation = (conversation: Conversation, index: number) => {
    setSelectedIndex(index)
    setSelectedConversation(conversation)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (conversations.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => {
            const next = prev === null ? 0 : Math.min(prev + 1, conversations.length - 1)
            if (conversations[next]) {
              setSelectedConversation(conversations[next])
            }
            return next
          })
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => {
            const next = prev === null ? 0 : Math.max((prev || 0) - 1, 0)
            if (conversations[next]) {
              setSelectedConversation(conversations[next])
            }
            return next
          })
          break
        case 'Escape':
          e.preventDefault()
          setSelectedIndex(null)
          setSelectedConversation(null)
          break
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (currentPage < totalPages) {
              setCurrentPage(prev => prev + 1)
              setSelectedIndex(null)
              setSelectedConversation(null)
            }
          }
          break
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (currentPage > 1) {
              setCurrentPage(prev => prev - 1)
              setSelectedIndex(null)
              setSelectedConversation(null)
            }
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [conversations, selectedIndex, currentPage, totalPages])

  return (
    <div ref={containerRef} className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex-none z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">OmniChat</h1>
              <p className="text-xs text-gray-500">
                {isLoading ? "Loading..." : `${totalConversations} conversations`}
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            <p>↑↓ Navigate • Ctrl+←→ Change Page • Esc Deselect</p>
          </div>
        </div>
      </div>

      {/* Split Pane Container */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Conversations List */}
        <div
          className="flex flex-col bg-white border-r"
          style={{ width: leftPanelWidth, minWidth: MIN_LEFT_WIDTH, maxWidth: MAX_LEFT_WIDTH }}
        >
          {/* Search & Filter Header */}
          <div className="px-3 py-2 border-b bg-gray-50 space-y-2">
            {/* Search Input */}
            <div className="flex gap-1">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplySearch()}
                  className="pl-8 pr-8 h-8 text-sm"
                />
                {searchInput && (
                  <button
                    onClick={() => { setSearchInput(""); if (appliedSearch) handleClearFilters(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleApplySearch}
                disabled={isLoading}
                className="h-8 px-3"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
              </Button>
            </div>

            {/* Channel Filter Buttons */}
            <div className="flex gap-1 flex-wrap">
              <Button
                variant={channelFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => handleChannelChange("all")}
                className="h-7 text-xs"
              >
                All
              </Button>
              <Button
                variant={channelFilter === "email" ? "default" : "outline"}
                size="sm"
                onClick={() => handleChannelChange("email")}
                className="h-7 text-xs"
              >
                <Mail className="h-3 w-3 mr-1" />
                Email
              </Button>
              <Button
                variant={channelFilter === "sms" ? "default" : "outline"}
                size="sm"
                onClick={() => handleChannelChange("sms")}
                className="h-7 text-xs"
              >
                <Smartphone className="h-3 w-3 mr-1" />
                SMS
              </Button>
              <Button
                variant={channelFilter === "whatsapp" ? "default" : "outline"}
                size="sm"
                onClick={() => handleChannelChange("whatsapp")}
                className="h-7 text-xs text-green-600"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                WA
              </Button>
              <Button
                variant={channelFilter === "linkedin" ? "default" : "outline"}
                size="sm"
                onClick={() => handleChannelChange("linkedin")}
                className="h-7 text-xs text-[#0A66C2]"
              >
                <Linkedin className="h-3 w-3 mr-1" />
                LinkedIn
              </Button>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {totalConversations} conversations
                {(appliedSearch || channelFilter !== "all") && " (filtered)"}
              </p>
              {(appliedSearch || channelFilter !== "all") && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="text-center">
                  <Loader2 className="animate-spin h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Loading...</p>
                </div>
              </div>
            ) : isError ? (
              <div className="p-4 text-center">
                <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">{error instanceof Error ? error.message : "Error loading"}</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center">
                <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No conversations</p>
              </div>
            ) : (
              <div>
                {conversations.map((conversation, index) => (
                  <ConversationCard
                    key={`${conversation.lead_id}-${conversation.channel}-${conversation.id}`}
                    conversation={conversation}
                    isSelected={selectedIndex === index}
                    onSelect={() => handleSelectConversation(conversation, index)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalConversations > 0 && (
            <div className="border-t bg-gray-50 px-3 py-2 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1))
                  setSelectedIndex(null)
                  setSelectedConversation(null)
                }}
                disabled={currentPage === 1 || isLoading}
                className="text-xs h-7"
              >
                Prev
              </Button>
              <span className="text-xs text-gray-500">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentPage((p) => p + 1)
                  setSelectedIndex(null)
                  setSelectedConversation(null)
                }}
                disabled={currentPage >= totalPages || isLoading}
                className="text-xs h-7"
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Resizable Divider */}
        <ResizableDivider onResize={handleResize} />

        {/* Right Panel - Conversation View */}
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
          {selectedConversation ? (
            <OmniChatInbox
              key={`${selectedConversation.lead_id}-${selectedConversation.channel}`}
              leadId={selectedConversation.lead_id}
              channel={selectedConversation.channel}
              leadName={selectedConversation.lead_name}
              leadProfilePictureUrl={selectedConversation.lead_profile_picture_url ?? undefined}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">Select a conversation</h3>
                <p className="text-sm text-gray-500">
                  Choose a conversation from the list to view the full thread
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
