"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowRight,
  Clock,
  Inbox,
  Linkedin,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  User,
  Users,
  Building2,
  Mail,
  AlertCircle,
} from "lucide-react"

import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface LinkedInConversation {
  id: string
  contact_first_name: string | null
  contact_last_name: string | null
  contact_email: string | null
  business_name: string | null
  current_status: string | null
  linkedin_account_id: string | null
  lastMessage: {
    message: string
    created_at: string
    is_inbound: boolean
  } | null
  messageCount: number
  unreadCount: number
}

function formatRelativeTime(dateString: string | null) {
  if (!dateString) return "No messages"
  
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)
}

function getInitials(firstName: string | null, lastName: string | null, email: string | null) {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }
  if (firstName) {
    return firstName.substring(0, 2).toUpperCase()
  }
  if (email) {
    return email.substring(0, 2).toUpperCase()
  }
  return "LI"
}

function truncateMessage(message: string, maxLength: number = 80) {
  if (message.length <= maxLength) return message
  return message.substring(0, maxLength) + "..."
}

export default function LinkedInPage() {
  const router = useRouter()
  const { user, profile, isAdmin } = useAuth()

  const [conversations, setConversations] = useState<LinkedInConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [refreshing, setRefreshing] = useState(false)

  const fetchConversations = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setError("Authentication required. Please log in again.")
        return
      }

      const response = await fetch("/api/linkedin/conversations", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch conversations")
      }

      const data = await response.json()
      setConversations(data.conversations || [])
    } catch (err: any) {
      console.error("[LinkedInPage] Error fetching conversations:", err)
      setError(err.message || "Failed to load LinkedIn conversations")
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchConversations()
    setRefreshing(false)
    toast.success("Conversations refreshed")
  }

  const filteredConversations = useMemo(() => {
    let result = conversations

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase()
      result = result.filter((conv) => {
        const fullName = `${conv.contact_first_name || ""} ${conv.contact_last_name || ""}`.toLowerCase()
        const email = (conv.contact_email || "").toLowerCase()
        const business = (conv.business_name || "").toLowerCase()
        const message = (conv.lastMessage?.message || "").toLowerCase()

        return (
          fullName.includes(query) ||
          email.includes(query) ||
          business.includes(query) ||
          message.includes(query)
        )
      })
    }

    if (statusFilter !== "all") {
      result = result.filter((conv) => conv.current_status === statusFilter)
    }

    return result
  }, [conversations, searchTerm, statusFilter])

  const conversationStats = useMemo(() => {
    const total = conversations.length
    const withResponses = conversations.filter((c) => c.unreadCount > 0).length
    const awaiting = conversations.filter(
      (c) => c.lastMessage && !c.lastMessage.is_inbound
    ).length

    return { total, withResponses, awaiting }
  }, [conversations])

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>()
    conversations.forEach((conv) => {
      if (conv.current_status) {
        statuses.add(conv.current_status)
      }
    })
    return Array.from(statuses).sort()
  }, [conversations])

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Linkedin className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">LinkedIn Messages</h1>
              <p className="text-sm text-gray-600">
                {isAdmin 
                  ? "View all LinkedIn conversations across leads"
                  : "View LinkedIn conversations for your assigned leads"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{conversationStats.total}</p>
                  <p className="text-sm text-gray-500">Total Conversations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Inbox className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{conversationStats.withResponses}</p>
                  <p className="text-sm text-gray-500">Lead Responses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{conversationStats.awaiting}</p>
                  <p className="text-sm text-gray-500">Awaiting Response</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Conversations</CardTitle>
                <CardDescription>
                  LinkedIn message threads with leads, sorted by most recent activity
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {uniqueStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="mt-3 text-gray-600">Loading conversations...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <p className="mt-3 text-gray-900 font-medium">Failed to load conversations</p>
                <p className="text-sm text-gray-500 mt-1">{error}</p>
                <Button variant="outline" onClick={handleRefresh} className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Linkedin className="h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No conversations found</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {searchTerm || statusFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : isAdmin
                      ? "No LinkedIn messages have been exchanged with any leads yet"
                      : "No LinkedIn messages found for your assigned leads"}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {filteredConversations.map((conversation) => (
                    <Link
                      key={conversation.id}
                      href={`/leads/${conversation.id}/linkedin`}
                      className="block"
                    >
                      <div className="flex items-center gap-4 p-4 rounded-lg border bg-white hover:bg-gray-50 hover:border-blue-200 transition-colors cursor-pointer">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                            {getInitials(
                              conversation.contact_first_name,
                              conversation.contact_last_name,
                              conversation.contact_email
                            )}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">
                              {conversation.contact_first_name || conversation.contact_last_name
                                ? `${conversation.contact_first_name || ""} ${conversation.contact_last_name || ""}`.trim()
                                : conversation.contact_email || "Unknown Contact"}
                            </p>
                            {conversation.current_status && (
                              <Badge variant="secondary" className="text-xs">
                                {conversation.current_status}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                            {conversation.business_name && (
                              <>
                                <Building2 className="h-3 w-3" />
                                <span className="truncate">{conversation.business_name}</span>
                                <span>•</span>
                              </>
                            )}
                            <MessageSquare className="h-3 w-3" />
                            <span>{conversation.messageCount} messages</span>
                          </div>

                          {conversation.lastMessage && (
                            <p className="text-sm text-gray-600 mt-1 truncate">
                              {conversation.lastMessage.is_inbound ? (
                                <span className="text-green-600 font-medium">Lead: </span>
                              ) : (
                                <span className="text-blue-600 font-medium">You: </span>
                              )}
                              {truncateMessage(conversation.lastMessage.message)}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(conversation.lastMessage?.created_at || null)}
                          </span>
                          {conversation.unreadCount > 0 && (
                            <Badge className="bg-green-500 hover:bg-green-600">
                              {conversation.unreadCount} new
                            </Badge>
                          )}
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
