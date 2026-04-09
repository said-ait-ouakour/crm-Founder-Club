"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import React from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Smartphone,
  Send,
  ArrowLeft,
  Bold,
  Italic,
  List,
  ListOrdered,
  Archive,
  MoreHorizontal,
  User,
  Check,
  RotateCcw,
  FileIcon,
  ImageIcon,
  FileText,
  File,
  Download,
  Video,
  Headphones,
  BookOpen,
  XCircle
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp"
import { cn } from "@/lib/utils"
import { leadService } from "@/lib/database"
import { createClient } from "@/lib/supabase/client"
import { LeadNavigation } from "@/components/lead-navigation"
import Link from "next/link"

// MediaDisplay component to handle different media types
const MediaDisplay = ({ media, messageSid, conversationSid }: { media: any, messageSid: string, conversationSid: string }) => {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getMediaIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4 mr-2" />
    } else if (contentType.startsWith('video/')) {
      return <Video className="h-4 w-4 mr-2" />
    } else if (contentType.startsWith('audio/')) {
      return <Headphones className="h-4 w-4 mr-2" />
    } else if (contentType === 'application/pdf') {
      return <FileText className="h-4 w-4 mr-2" />
    }
    return <File className="h-4 w-4 mr-2" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Fetch the media URL and return it
  const fetchMediaUrl = useCallback(async () => {
    if (!media?.sid) return null;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/twilio/media/${media.sid}?messageSid=${encodeURIComponent(messageSid)}&conversationSid=${encodeURIComponent(conversationSid)}`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load media');
      }
      setMediaUrl(data.media.url);
      return data.media.url as string;
    } catch (err) {
      console.error('Error fetching media:', err);
      setError('Failed to load media');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [media?.sid]);

  // Download handler: always fetches URL first if not present, then downloads
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    let url = mediaUrl;
    if (!url) {
      url = await fetchMediaUrl();
      if (!url) return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = media.filename || `media-${media.sid}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Preview handler: always fetches URL first if not present, then previews
  const handlePreview = async (e: React.MouseEvent) => {
    e.stopPropagation();
    let url = mediaUrl;
    if (!url) {
      url = await fetchMediaUrl();
      if (!url) return;
    }
    window.open(url, '_blank');
  };

  if (!media) return null

  return (
    <div className="mt-2 border rounded-md p-2 bg-gray-50 dark:bg-gray-800">
      <div className="flex items-center">
        {getMediaIcon(media.content_type || 'application/octet-stream')}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {media.filename || `media-${media.sid?.substring(0, 8)}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {media.content_type} • {formatFileSize(media.size || 0)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { handleDownload(e); }}
          disabled={isLoading}
          className="ml-2"
          title="Download"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
        {(media.content_type?.startsWith('image/') || media.content_type === 'application/pdf') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { handlePreview(e); }}
            disabled={isLoading}
            className="ml-2 text-xs text-black"
            title="Preview"
          >
            Preview
          </Button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}

      {/* Preview for images */}
      {mediaUrl && media.content_type?.startsWith('image/') && (
        <div className="mt-2">
          <img
            src={mediaUrl}
            alt={media.filename || 'Image attachment'}
            className="max-w-full h-auto rounded-md border"
            loading="lazy"
          />
        </div>
      )}

      {/* Preview for PDFs */}
      {mediaUrl && media.content_type === 'application/pdf' && (
        <div className="mt-2">
          <iframe
            src={mediaUrl}
            className="w-full h-64 border rounded-md"
            title={media.filename || 'PDF document'}
          />
        </div>
      )}
    </div>
  )
}

// Example templates (replace with real templates or fetch from API)
const EMAIL_TEMPLATES = [
  {
    id: "welcome",
    name: "Welcome Template",
    subject: "Welcome to Our Service",
    body: "<h2>Welcome, {{name}}!</h2><p>Thank you for joining us.</p>",
  },
  {
    id: "followup",
    name: "Follow Up",
    subject: "Following up on our conversation",
    body: "<p>Hi {{name}},<br/>Just checking in as discussed.</p>",
  },
]

// Twilio WhatsApp templates
const TWILIO_TEMPLATES = [
  {
    id: "pock_clients_5",
    name: "IHT Results Check",
    sid: "HX607ae0eff855b6b33529f61484e9fe09",
    content: "Hi [First Name], I was looking over your IHT results and wanted to check one thing. Can I?",
    language: "en_GB",
    type: "text",
    channels: ["whatsapp", "sms"]
  },
  {
    id: "pock_clients_4", 
    name: "IHT Summary Offer",
    sid: "HX3b562b34f09d0bd95e4a964aac9b9a64",
    content: "Hi [First Name], quick thought: would you like me to summarise your IHT result in plain English?",
    language: "en_GB",
    type: "text",
    channels: ["whatsapp", "sms"]
  },
  {
    id: "pock_clients_3",
    name: "Quick Question",
    sid: "HX773c64fae404830505687ced83cb5eb9",
    content: "Hi [First Name], can I ask you something quick? No rush—reply whenever works for you.",
    language: "en_GB", 
    type: "text",
    channels: ["whatsapp", "sms"]
  },
  {
    id: "pock_clients_2",
    name: "Simple Question",
    sid: "HX9026d984961c83ccd1043784bd5f42ac",
    content: "Hi [First Name], I know life's full on—could I ask you just one simple question when you get a moment?",
    language: "en_GB",
    type: "text", 
    channels: ["whatsapp", "sms"]
  },
  {
    id: "pock_clients_1",
    name: "Short Promise",
    sid: "HX2b7eb04b270206b318c394aea043e15f",
    content: "Hey [First Name], I promise I'll keep this short—mind if I ask you a quick one?",
    language: "en_GB",
    type: "text",
    channels: ["whatsapp", "sms"]
  },
  {
    id: "interview_reminder",
    name: "Interview Reminder - Account Manager",
    sid: "HX6c60bbad60a7d3c7e5afcf61c93dc6f3",
    content: "Dear {{1}} We would like to remind you about your interview for the Account Manager role today at  {{2}}.  Please join using the Teams link invite sent previously by email. Kind regards, {{3}}, Recruitment Team",
    language: "en_GB",
    type: "text",
    channels: ["whatsapp", "sms"]
  }
]

// Guide types available for sending
const GUIDE_TYPES = [
  "Trusts",
  "Wills", 
  "Independent Financial Advice (IFA)",
  "Inheritance Tax (IHT)",
  "Long-Term Care",
  "Lasting Power of Attorney (LPA)"
]

const supabase = createClient()

type Lead = {
  id: string
  first_name?: string
  last_name?: string
  contact_first_name?: string
  contact_last_name?: string
  email?: string
  phone_number?: string
  mobile_phone?: string
  current_status?: string
  // add any other fields you use from the lead
}

interface MediaItem {
  sid: string
  content_type: string
  filename?: string
  size?: number
  category?: string
}

interface Message {
  id: string | number
  sender: string
  message: string
  subject?: string
  timestamp: string
  isIncoming: boolean
  status?:
    | "sent"
    | "processed"
    | "error"
    | "delivered"
    | "open"
    | "not_delivered"
    | "bounce"
  channelType?: "sms" | "whatsapp"
  /** Not stored on public.email_messages (PM); optional for legacy rows */
  event_name?: "delivered" | "processed" | "bounce"
  open_count?: number
  click_count?: number
  delivery?: {
    read?: "all" | "some" | "none"
    delivered?: "all" | "some" | "none"
  }
  read?: "all" | "some" | "none"
  delivered?: "all" | "some" | "none"
  author?: string
  channel: Channel
  media?: MediaItem[]
}

type Channel = "email" | "sms" | "whatsapp"

type CombinedMessage = Message

// Call interface based on the calls table schema
interface Call {
  id: number
  created_at: string
  lead_first_name?: string
  lead_phone?: string
  advisor_name?: string
  summary?: string
  analysis?: string
  lead_last_name?: string
  call_score?: number
  lead_id?: string
  advisor_id?: string
  transcript?: string
  call_status?: string
  call_ended_reason?: string
}

const getChannelIcon = (channel: Channel) => {
  switch (channel) {
    case "email":
      return <Mail className="h-4 w-4" />
    case "whatsapp":
      return <svg className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="none"><g><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.67.15-.198.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.571-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.363.71.306 1.263.489 1.695.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347z" /><path fill="currentColor" d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.462 3.479 1.338 4.995L2.003 22l5.13-1.342c1.47.805 3.13 1.245 4.87 1.245 5.514 0 9.997-4.483 9.997-9.997 0-2.666-1.04-5.17-2.929-7.06C17.174 3.043 14.67 2.003 12.004 2.003zm0 17.995c-1.57 0-3.104-.418-4.44-1.21l-.318-.188-3.045.797.812-2.97-.206-.306c-.82-1.22-1.25-2.64-1.25-4.108 0-4.135 3.364-7.5 7.5-7.5 2.003 0 3.89.78 5.304 2.195 1.414 1.414 2.196 3.3 2.196 5.304 0 4.135-3.365 7.5-7.5 7.5z" /></g></svg>
    case "sms":
      return <Smartphone className="h-4 w-4 text-blue-600" />
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
    default:
      return "bg-gray-100 text-gray-700"
  }
}

// Helper to format message timestamps
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
    return date.toLocaleDateString([], { year: "numeric", month: "long", day: "2-digit" }) + " at " + time
  }
}

// Helper to check if name should be hidden
function shouldHideName(Name: string ): boolean {
  const hiddenValues = ['unknown', 'n/a', 'na', 'none', ''];
  const normalizedName = Name?.toLowerCase().trim();
  
  return hiddenValues.includes(normalizedName);
}

// Helper to get display name
function getDisplayName(firstName: string, lastName: string): string {
  if (shouldHideName(firstName) && shouldHideName(lastName)) {
    return '';
  }else if (shouldHideName(firstName)) {
    return `${lastName}`;
  }else if (shouldHideName(lastName)) {
    return `${firstName}`;
  }
  return `${firstName} ${lastName}`.trim();
}

// Move the clientAvatar and userAvatar definitions outside the component to ensure they are only generated once
const allowedEyes = [
  "cute", "closed", "closed2", "plain", "stars"
];
const allowedMouths = [
  "cute", "lilSmile", "smileLol", "smileTeeth", "wideSmile"
];
const allowedBackgroundColors = [
  "transparent", "b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"
];

// Function to generate a random choice from an array
const getRandomChoice = (array: string[]): string => array[Math.floor(Math.random() * array.length)];

// Define client and user avatars once at the top of the component
const clientAvatar = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent("Client")}&backgroundColor=${getRandomChoice(allowedBackgroundColors)}&eyes=${getRandomChoice(allowedEyes)}&mouth=${getRandomChoice(allowedMouths)}`;
const userAvatar = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=You&backgroundColor=${getRandomChoice(allowedBackgroundColors)}&eyes=${getRandomChoice(allowedEyes)}&mouth=${getRandomChoice(allowedMouths)}`;

// Call Display Component
const CallDisplay = ({ call }: { call: Call }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <div className="flex gap-3 w-full justify-start">
      <Avatar className="h-8 w-8">
        <AvatarImage
          src={clientAvatar}
          alt="Call"
        />
        <AvatarFallback className="bg-blue-500 text-white font-semibold">
          <Phone className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col max-w-[70%] items-start text-left">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">Call</span>
          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
            <Phone className="h-3 w-3 mr-1" />
            Call
          </Badge>
        </div>
        <div className="flex flex-col items-start w-full">
          <Card className="p-3 w-full overflow-hidden bg-blue-50 border-blue-200 rounded-bl-none border">
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium text-gray-700">Advisor:</span>
                <span className="ml-2 text-gray-600">{call.advisor_name || 'Not specified'}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-700">End Reason:</span>
                <span className="ml-2 text-gray-600">{call.call_ended_reason || 'Not specified'}</span>
              </div>
              {call.summary && (
                <div className="mt-2">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Call Summary:</span>
                  </div>
                  <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {call.summary}
                    </div>
                  </div>
                </div>
              )}
              {call.transcript && (
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-blue-600 hover:text-blue-800 p-0 h-auto text-xs"
                  >
                    {isExpanded ? 'Hide' : 'Show'} Transcript
                  </Button>
                  {isExpanded && (
                    <div className="mt-2 p-3 bg-white border rounded-md">
                      <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-60 overflow-y-auto">
                        {call.transcript}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
          <span className="text-xs text-muted-foreground mt-1">{formatMessageTimestamp(call.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

// Helper to check if WhatsApp messaging is allowed (24-hour policy)
function canSendWhatsAppMessage(messages: CombinedMessage[]): { allowed: boolean; lastClientMessage?: Date; reason?: string } {
  if (messages.length === 0) {
    return { allowed: false, reason: "No previous conversation exists" };
  }

  // Find the last client-initiated WhatsApp message
  const clientWhatsAppMessages = messages
    .filter(msg => 
      msg.channel === "whatsapp" && 
      msg.isIncoming && // Client messages are incoming (from client to us)
      msg.author !== "system" &&
      msg.author !== "whatsapp:+447307208994" &&
      msg.author !== "whatsapp:+447367835651" &&
      msg.author !== "whatsapp:+447360543337" &&
      msg.author !== "+447367835651" &&
      msg.author !== "+447360543337"
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (clientWhatsAppMessages.length === 0) {
    return { allowed: false, reason: "No client-initiated WhatsApp messages found" };
  }

  const lastClientMessage = new Date(clientWhatsAppMessages[0].timestamp);
  const now = new Date();
  const hoursSinceLastMessage = (now.getTime() - lastClientMessage.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLastMessage > 24) {
    return { 
      allowed: false, 
      lastClientMessage,
      reason: `Last client message was ${Math.floor(hoursSinceLastMessage)} hours ago` 
    };
  }

  return { allowed: true, lastClientMessage };
}

export default function LeadInboxPage() {
  const params = useParams()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeChannel, setActiveChannel] = useState<Channel>("email")
  const [message, setMessage] = useState("")
  const [subject, setSubject] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [composeMode, setComposeMode] = useState<"template" | "text">("text")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [showComposeDialog, setShowComposeDialog] = useState(false)
  const [thread, setThread] = useState<CombinedMessage[]>([])
  const [lastUsedChannel, setLastUsedChannel] = useState<Channel>("email")
  const [activeConversation, setActiveConversation] = useState<any>(null)
  const [selectedConversation, setSelectedConversation] = useState<number | null>(1) // Auto-select for single lead view
  const [searchQuery, setSearchQuery] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [showGuideDialog, setShowGuideDialog] = useState(false)
  const [selectedGuideType, setSelectedGuideType] = useState<string>("")
  const [isSendingGuide, setIsSendingGuide] = useState(false)
  const [selectedTwilioTemplateId, setSelectedTwilioTemplateId] = useState<string>("")
  const [showTwilioTemplateDialog, setShowTwilioTemplateDialog] = useState(false)
  const [guideChannel, setGuideChannel] = useState<"email" | "whatsapp">("email")
  const [calls, setCalls] = useState<Call[]>([])
  const [combinedTimeline, setCombinedTimeline] = useState<Array<{ type: 'message' | 'call', data: any, timestamp: string }>>([])
  const [navigationParams, setNavigationParams] = useState({
    searchTerm: "",
    filters: {} as Record<string, unknown>,
    sortConfig: { key: "created_on", direction: "desc" as const },
  })

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("leads-page-filters")
      if (!stored) return
      const filterData = JSON.parse(stored)
      const maxAge = 24 * 60 * 60 * 1000
      if (Date.now() - filterData.timestamp >= maxAge) return
      const sc = filterData.sortConfig
      setNavigationParams({
        searchTerm: filterData.searchTerm || "",
        filters: filterData.filters || {},
        sortConfig:
          sc?.key && sc?.direction
            ? { key: String(sc.key), direction: sc.direction as "asc" | "desc" }
            : { key: "created_on", direction: "desc" },
      })
    } catch {
      // ignore
    }
  }, [])

  // Get selected template objects
  const selectedTemplate = EMAIL_TEMPLATES.find((t) => t.id === selectedTemplateId)
  const selectedTwilioTemplate = TWILIO_TEMPLATES.find((t) => t.id === selectedTwilioTemplateId)

  // Check WhatsApp policy compliance - recalculate when thread changes
  const whatsappPolicy = useMemo(() => {
    return canSendWhatsAppMessage(thread)
  }, [thread])

  // Only for email channel for now
  const selectMessage = (msg: Message) => {
    if (activeChannel === "email") {
      setSelectedMessage(msg)
    }
  }

  // Function to send guide via webhook
  const handleSendGuide = async () => {
    if (!selectedGuideType || !lead?.id) {
      toast({
        title: "Missing information",
        description: "Please select a guide type and ensure lead information is available.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingGuide(true);
    try {
      const response = await fetch("https://n8n.aipersonalassistants.ai/webhook/3978e128-5afc-429b-ad09-0fcb084cf2b5", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead_id: lead.id,
          guide_type: selectedGuideType,
          channel: guideChannel,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Guide sent successfully",
        description: `${selectedGuideType} guide has been sent via ${guideChannel}.`,
      });

      setShowGuideDialog(false);
      setSelectedGuideType("");
      setGuideChannel("email"); // Reset to default
    } catch (error) {
      console.error("Error sending guide:", error);
      toast({
        title: "Failed to send guide",
        description: error instanceof Error ? error.message : "An error occurred while sending the guide",
        variant: "destructive",
      });
    } finally {
      setIsSendingGuide(false);
    }
  };

  // Function to send Twilio template
  const handleSendTwilioTemplate = async () => {
    if (!selectedTwilioTemplate || !lead?.id) {
      toast({
        title: "Missing information",
        description: "Please select a template and ensure lead information is available.",
        variant: "destructive",
      });
      return;
    }

    // Disable WhatsApp templates as they are not validated
    if (selectedTwilioTemplate.channels.includes("whatsapp")) {
      toast({
        title: "WhatsApp Templates Disabled",
        description: "WhatsApp templates are not validated and cannot be sent. Please use SMS templates instead.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      // Only use SMS for templates (WhatsApp disabled)
      const templateChannel = "sms";
      
      // Determine the correct 'to' number (SMS only)
      let to = "";
      if (lead) {
        to = lead.mobile_phone || lead.phone_number || "";
      }

      // For business-initiated templates, we don't need a conversation ID
      // We can send directly using the template SID (SMS only)
      let conversationId = activeConversation?.twilio_conv_id;

      // Replace [First Name] with actual first name
      const personalizedContent = selectedTwilioTemplate.content.replace(
        /\[First Name\]/g, 
        lead.first_name || "there"
      );

      // If no conversation ID, we'll send directly via Twilio Messages API
      const apiUrl = conversationId 
        ? `/api/twilio/conversation/${conversationId}/send`
        : `/api/twilio/send-template`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: personalizedContent,
          channel: templateChannel,
          contactId: lead?.id || "",
          to,
          templateSid: selectedTwilioTemplate.sid,
          conversationId: conversationId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to send ${templateChannel} template`);
      }

      // Add the message to the thread immediately
      const newMessage: CombinedMessage = {
        id: `temp-${Date.now()}`,
        sender: "You",
        message: personalizedContent,
        subject: "",
        timestamp: new Date().toISOString(),
        isIncoming: false,
        channel: templateChannel,
        delivery: { delivered: "none", read: "none" },
      };
      setThread((prev) => [...prev, newMessage]);

      toast({ 
        title: "Template sent successfully", 
        description: `${selectedTwilioTemplate.name} has been sent via ${templateChannel}.` 
      });

      setShowTwilioTemplateDialog(false);
      setSelectedTwilioTemplateId("");
    } catch (error) {
      console.error("Error sending Twilio template:", error);
      toast({
        title: "Failed to send template",
        description: error instanceof Error ? error.message : "An error occurred while sending the template",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    async function loadLead() {
      try {
        const leadData = await leadService.getById(params?.id as string)
        setLead(leadData)
        const leadId = leadData.id
        if (!leadId) {
          setThread([])
          setLoading(false)
          return
        }
        const { data: conversations, error: convErr } = await supabase
          .from("email_conversation")
          .select("*")
          .eq("lead_id", leadId)
          .order("created_at", { ascending: false })
          .limit(1)
        if (convErr) {
          console.error("Error loading email conversation:", convErr)
          // Continue even if there's an error - we can still load WhatsApp/SMS messages
        }
        const conversation = conversations?.[0]
        if (conversation) {
          setActiveConversation(conversation)
        }

        // Fetch calls data for this lead
        const { data: callsData, error: callsErr } = await supabase
          .from("calls")
          .select("*")
          .eq("lead_id", leadId)
          .order("created_at", { ascending: false })
        if (callsErr) {
          console.error("Error loading calls:", callsErr)
        } else {
          console.log("Calls data loaded:", callsData)
          setCalls((callsData as unknown as Call[]) || [])
        }

        // Email messages (only if conversation exists)
        let emailMessages: CombinedMessage[] = []
        if (conversation) {
          const { data: emailMsgs, error: emailErr } = await supabase
            .from("email_messages")
            .select("*")
            .eq("conversation_id", String((conversation as any).id))
            .order("last_update", { ascending: true })
          if (emailErr) {
            console.error("Error loading email messages:", emailErr)
          } else {
            emailMessages = (emailMsgs || [])
              .sort(
                (a: any, b: any) =>
                  new Date(String(a.created_at || a.last_update)).getTime() - new Date(String(b.last_update || b.created_at)).getTime(),
              )
              .map((msg: any) => ({
                id: msg.id,
                sender: msg.direction === "Inbound" ? getDisplayName(leadData.contact_first_name || "", leadData.contact_last_name || "") : "You",
                message: msg.content || msg.body || "",
                subject: msg.subject || "",
                timestamp: msg.last_update || msg.created_at || "",
                isIncoming: msg.direction !== "Outbound",
                event_name: msg.event_name as "delivered" | "processed" | "bounce" | undefined,
                channel: "email" as const,
                author: msg.direction === "Inbound" ? getDisplayName(leadData.contact_first_name || "", leadData.contact_last_name || "") : "You",
                status:
                  msg.status != null
                    ? (String(msg.status).toLowerCase() as Message["status"])
                    : undefined,
                open_count: Number(msg.open_count ?? 0),
                click_count: Number(msg.clicks_count ?? msg.click_count ?? 0),
              }))
          }
        }

        // Twilio messages
        let twilioMessages: CombinedMessage[] = []
        try {
          // Load SMS messages
          if (conversation?.twilio_conv_id) {
            try {
              const res = await fetch(`/api/twilio/conversation/${conversation.twilio_conv_id}`)
              const data = await res.json()
              const smsMessages = (data.messages || []).map((msg: any) => ({
                id: msg.id,
                sender: msg.author === "system" ? "system" : (msg.author || getDisplayName(leadData.contact_first_name || "", leadData.contact_last_name || "")),
                message: msg.body,
                subject: "",
                timestamp: msg.dateCreated,
                isIncoming: msg.author !== "system" && msg.author !== "whatsapp:+447307208994" && msg.author !== "whatsapp:+447367835651" && msg.author !== "whatsapp:+447360543337" && msg.author !== "+447367835651" && msg.author !== "+447360543337",
                event_name: undefined,
                channelType: "sms",
                delivered: msg.delivered,
                seen: msg.seen,
                channel: "sms" as Channel,
                author: msg.author,
                delivery: {
                  read: msg.delivery?.read || "none",
                  delivered: msg.delivery?.delivered || "none",
                },
                media: msg.media,
              }));
              twilioMessages = [...twilioMessages, ...smsMessages];
            } catch (err) {
              console.error("Error loading SMS messages:", err);
            }
          }

          // WhatsApp messages are now loaded from database (see below)
          // Removed Twilio API call for WhatsApp - using database instead

          // Load WhatsApp and SMS messages directly from database
          try {
            console.log("🔍 Fetching messages from database for lead_id:", leadId);
            
            // Query database using lead_id (uuid)
            const { data: dbMessages, error: dbErr } = await supabase
              .from("leads_sms_whatsapp_conversations")
              .select("*")
              .eq("lead_id", leadId)
              .order("sent_at", { ascending: true });

            if (dbErr) {
              console.error("❌ Error loading messages from database:", dbErr);
              console.error("Lead ID used:", leadId);
            } else if (dbMessages && dbMessages.length > 0) {
              console.log("✅ Loaded messages from database:", dbMessages.length);
              console.log("Sample message:", dbMessages[0]);
              
              const dbWhatsAppSmsMessages: CombinedMessage[] = dbMessages.map((msg: any) => {
                // Determine if message is incoming (from lead) or outgoing (from us)
                const isInbound = msg.is_inbound === true;
                const messageType = (msg.message_type || "").trim();
                const channel = messageType.toLowerCase() === "whatsapp" ? "whatsapp" : "sms" as Channel;
                
                // Determine sender/author
                const ourNumbers = {
                  whatsapp: "whatsapp:+447307208994",
                  whatsappOld: "whatsapp:+447367835651",
                  sms: "+447367835651",
                  system: "system"
                };
                
                let sender = "";
                let author = "";
                
                if (isInbound) {
                  // Incoming message from lead
                  sender = getDisplayName(leadData.contact_first_name || "", leadData.contact_last_name || "") || "Lead";
                  // For inbound messages, we don't have from_number in the table, so use a generic identifier
                  author = `lead-${leadId}`;
                } else {
                  // Outgoing message from us
                  sender = "You";
                  author = channel === "whatsapp" ? ourNumbers.whatsapp : ourNumbers.sms;
                }

                return {
                  id: msg.id || `db-${msg.sent_at || Date.now()}-${Math.random()}`,
                  sender: sender,
                  message: msg.message_text || "", // Use message_text from table
                  subject: "",
                  timestamp: msg.sent_at || msg.created_at || new Date().toISOString(), // Use sent_at from table
                  isIncoming: isInbound,
                  event_name: undefined,
                  channelType: channel === "whatsapp" ? "whatsapp" : "sms",
                  channel: channel,
                  author: author,
                  delivery: {
                    read: (msg.message_status === "read" || msg.message_status === "delivered") ? "all" : "none",
                    delivered: (msg.message_status === "delivered" || msg.message_status === "sent") ? "all" : "none",
                  },
                  media: undefined, // Table doesn't have media column
                };
              });

              // Add database messages to twilioMessages
              twilioMessages = [...twilioMessages, ...dbWhatsAppSmsMessages];
              console.log("✅ Total messages after adding DB messages:", twilioMessages.length);
            } else {
              console.log("⚠️ No messages found in database for lead_id:", leadId);
            }
          } catch (dbErr) {
            console.error("❌ Error fetching messages from database:", dbErr);
          }
        } catch (err) {
          console.error("Error in message loading:", err);
          twilioMessages = [];
        }
        console.log("Twilio messages:", twilioMessages)

        // Combine messages, remove duplicates, and sort
        const messageMap = new Map<string | number, CombinedMessage>();
        
        // Add email messages to the map
        emailMessages.forEach(msg => {
          messageMap.set(msg.id, msg);
        });
        
        // Add Twilio messages to the map (will overwrite if same ID exists, which is fine)
        twilioMessages.forEach(msg => {
          messageMap.set(msg.id, msg);
        });
        
        // Convert back to array and sort by timestamp
        const allMessages = Array.from(messageMap.values()).sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        // Create combined timeline with messages and calls
        const callsArray = (callsData as unknown as Call[]) || [];
        const combinedTimeline = [
          ...allMessages.map(msg => ({ type: 'message' as const, data: msg, timestamp: msg.timestamp })),
          ...callsArray.map(call => ({ type: 'call' as const, data: call, timestamp: call.created_at }))
        ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        console.log("Combined timeline created:", combinedTimeline.length, "items (messages:", allMessages.length, "calls:", callsArray.length, ")")
        
        setThread(allMessages);
        setCombinedTimeline(combinedTimeline);

        // Set last used channel (by me or lead)
        if (allMessages.length > 0 && lead) {
          const lastMsg = [...allMessages].reverse().find((m) => m.channel)
          if (lead && lastMsg) {
            setLastUsedChannel(lastMsg.channel || "email")
          }
        }
      } catch (error) {
        console.error("Error loading lead or messages:", error)
        window.location.href = "/leads"
      } finally {
        setLoading(false)
      }
    }
    if (params?.id) {
      loadLead()
    }
  }, [params?.id, router])

  const handleSendMessage = async () => {
    setIsSending(true);
    
    // Check WhatsApp policy before sending
    if (lastUsedChannel === "whatsapp" && !whatsappPolicy.allowed) {
      toast({
        title: "WhatsApp Policy Violation",
        description: `Cannot send WhatsApp message: ${whatsappPolicy.reason}. Please use email or SMS instead.`,
        variant: "destructive",
      });
      setIsSending(false);
      return;
    }

    if (lastUsedChannel === "email") {
      let emailSubject = subject.trim();
      let emailContent = message;
      if (composeMode === "template") {
        if (!selectedTemplate) {
          toast({
            title: "Select a template",
            description: "Please choose an email template.",
            variant: "destructive",
          });
          setIsSending(false);
          return;
        }
        emailSubject = selectedTemplate.subject;
        emailContent = selectedTemplate.body.replace(/{{name}}/g, getDisplayName(lead?.first_name || "", lead?.last_name || ""));
      }
      if (!emailContent.trim() || !emailSubject || !lead?.email || !params?.id) {
        toast({
          title: "Missing required fields",
          description: "Please fill in subject and message or select a template.",
          variant: "destructive",
        });
        setIsSending(false);
        return;
      }
      const newMessage: CombinedMessage = {
        id: `temp-${Date.now()}`,
        sender: "You",
        message: emailContent,
        subject: emailSubject,
        timestamp: new Date().toISOString(),
        isIncoming: false,
        channel: "email",
      };
      setThread((prev) => [...prev, newMessage]);
      try {
        const response = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: lead.email,
            subject: emailSubject,
            content: emailContent,
            leadId: params.id,
            conversationId: activeConversation?.id,
            templateId: composeMode === "template" ? selectedTemplate?.id : undefined,
          }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to send email");
        }
        const { message: savedMessage, conversationId } = await response.json();
        if (!activeConversation?.id && conversationId) {
          setActiveConversation({ id: conversationId });
        }
        setMessage("");
        setSubject("");
        setSelectedTemplateId("");
        if (textareaRef.current) textareaRef.current.value = "";
        if (savedMessage) {
          setThread((prev) =>
            prev.map((msg) =>
              msg.id === newMessage.id
                ? {
                  ...savedMessage,
                  status: "sent" as const,
                  message: savedMessage.content || savedMessage.message,
                  subject: savedMessage.subject || "No subject",
                  timestamp: savedMessage.last_update || savedMessage.timestamp,
                  channel: "email" as Channel,
                }
                : msg,
            ),
          );
        } else {
          setThread((prev) =>
            prev.map((msg) =>
              msg.id === newMessage.id
                ? { ...msg, status: "sent" as const }
                : msg,
            ),
          );
        }
        toast({ title: "Email sent", description: "Your message has been sent successfully." });
      } catch (error) {
        console.error("Error sending message:", error);
        setThread((prev) => prev.map((msg) => (msg.id === newMessage.id ? { ...msg, status: "error" as const } : msg)));
        toast({
          title: "Failed to send email",
          description: error instanceof Error ? error.message : "An error occurred while sending the email",
          variant: "destructive",
        });
      } finally {
        setIsSending(false);
      }
    } else if ((lastUsedChannel === "whatsapp" || lastUsedChannel === "sms") && (activeConversation?.twilio_conv_id || activeConversation?.whatsapp_twilio_conv_id)) {
      if (!message.trim()) {
        toast({
          title: "Message required",
          description: `Please enter a ${lastUsedChannel} message to send.`,
          variant: "destructive",
        });
        setIsSending(false);
        return;
      }
      const tempId = `temp-${Date.now()}`;
      const newMessage: CombinedMessage = {
        id: tempId,
        sender: "You",
        message: message,
        subject: "",
        timestamp: new Date().toISOString(),
        isIncoming: false,
        channel: lastUsedChannel,
        delivery: { delivered: "none", read: "none" },
      };
      setThread((prev) => [...prev, newMessage]);
      try {
        // Determine the correct 'to' number for SMS/WhatsApp
        let to = "";
        if (lead) {
          if (lastUsedChannel === "sms") {
            to = lead.mobile_phone || lead.phone_number || "";
          } else if (lastUsedChannel === "whatsapp") {
            const raw = lead.mobile_phone || lead.phone_number || "";
            to = raw.startsWith("whatsapp:") ? raw : `whatsapp:${raw}`;
          }
        }
        // Determine the correct conversation ID based on channel
        const conversationId = lastUsedChannel === "whatsapp"
          ? activeConversation.whatsapp_twilio_conv_id
          : activeConversation.twilio_conv_id;

        if (!conversationId) {
          throw new Error(`No conversation ID found for ${lastUsedChannel}`);
        }

        const response = await fetch(`/api/twilio/conversation/${conversationId}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: message,
            channel: lastUsedChannel,
            leadId: lead?.id || "",
            to,
          }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Failed to send ${lastUsedChannel} message`);
        }
        // Optionally, you can fetch the latest thread or update the message status
        setMessage("");
        if (textareaRef.current) textareaRef.current.value = "";
        toast({ title: `${lastUsedChannel.charAt(0).toUpperCase() + lastUsedChannel.slice(1)} sent`, description: `Your ${lastUsedChannel} message has been sent.` });
      } catch (error) {
        console.error(`Error sending ${lastUsedChannel} message:`, error);
        setThread((prev) => prev.map((msg) => (msg.id === tempId ? { ...msg, status: "error" as const } : msg)));
        toast({
          title: `Failed to send ${lastUsedChannel}`,
          description: error instanceof Error ? error.message : `An error occurred while sending the ${lastUsedChannel} message`,
          variant: "destructive",
        });
      } finally {
        setIsSending(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading conversation...</p>
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Lead not found</h2>
          <p className="text-gray-600 mt-2">The lead you're looking for doesn't exist.</p>
          <Button 
            className="mt-4" 
            onClick={() => window.location.href = "/leads"}
          >
            Back to Leads
          </Button>
        </div>
      </div>
    )
  }

  // Mock conversation data for sidebar (single lead)
  const conversations = [
    {
      id: 1,
      contact: getDisplayName(lead.contact_first_name || "", lead.contact_last_name || ""),
      avatar: "/placeholder.svg?height=40&width=40",
      lastMessage: combinedTimeline.length > 0 ? 
        (combinedTimeline[combinedTimeline.length - 1].type === 'call' ? 'Call' : combinedTimeline[combinedTimeline.length - 1].data.message) : 
        "No messages yet",
      timestamp: combinedTimeline.length > 0 ? formatMessageTimestamp(combinedTimeline[combinedTimeline.length - 1].timestamp) : "Now",
      channel: lastUsedChannel,
      unread: false,
      isAutomated: false,
      subject: combinedTimeline.length > 0 ? 
        (combinedTimeline[combinedTimeline.length - 1].type === 'call' ? 'Call' : combinedTimeline[combinedTimeline.length - 1].data.subject || "Conversation") : 
        "New Conversation",
    },
  ]

  // Mock client profile data
  const clientProfile = {
    name: getDisplayName(lead.contact_first_name || "", lead.contact_last_name || ""),
    company: "Company Name", // You can add this to your lead model
    role: "Lead", // You can add this to your lead model
    avatar: "/placeholder.svg?height=120&width=120",
    phone: lead.mobile_phone || "Not provided",
    email: lead.email || "Not provided",
    currentSituation: "Lead information and conversation history available.",
    todaysNotes: "Active conversation thread with multiple channels available.",
    nextSteps: ["Continue conversation", "Follow up as needed", "Update lead information"],
    tags: ["Active", "Lead"],
    lastActivity: combinedTimeline.length > 0 ? formatMessageTimestamp(combinedTimeline[combinedTimeline.length - 1].timestamp) : "No activity",
    dealValue: "N/A",
    probability: "N/A",
  }

  if (selectedConversation) {
    const conversation = conversations.find((c) => c.id === selectedConversation)
    console.log(lead?.current_status)
    // Theme colors for inbox based on lead status
    const inboxTheme = (lead?.current_status === 'Qualified')
      ? {
          pageBg: 'bg-green-50',
          headerBg: 'bg-green-100',
          sidebarBg: 'bg-green-50',
          gradient: 'from-green-50 to-green-100',
          bannerBadge: 'bg-green-200 text-green-900 border border-green-300',
          bannerText: 'text-green-900',
        }
      : {
          pageBg: 'bg-gray-50',
          headerBg: 'bg-white',
          sidebarBg: 'bg-white',
          gradient: 'from-blue-50 to-indigo-50',
          bannerBadge: 'bg-gray-100 text-gray-800 border border-gray-200',
          bannerText: 'text-gray-600',
        }

    return (
      <div className={`flex fixed inset-0 h-screen w-screen ${inboxTheme.pageBg}`}>
        {/* Side panel for selected message */}
        {selectedMessage && (
          <div className="fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"
              onClick={() => setSelectedMessage(null)}
            />
            <div className="relative ml-auto w-full max-w-md bg-white shadow-xl h-full z-50 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  {selectedMessage.channel === "email" ? (
                    <h2 className="text-lg font-bold">{selectedMessage.subject || "No Subject"}</h2>
                  ) : (
                    <h2 className="text-lg font-bold capitalize">{selectedMessage.channel}</h2>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    From: <span className="font-medium">{selectedMessage.sender}</span>
                  </p>
                  <p className="text-xs text-gray-500">{formatMessageTimestamp(selectedMessage.timestamp)}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedMessage(null)} aria-label="Close">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <div className="prose max-w-none">
                  {selectedMessage.channel === 'email' ? (
                    <div
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedMessage.message }}
                    />
                  ) : (
                    <p className="whitespace-pre-line">{selectedMessage.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col h-full min-h-0">
          {/* Conversation Header */}
          <div className={`border-b px-3 py-2 md:px-6 md:py-4 flex items-center gap-4 relative ${inboxTheme.headerBg}`}>
            {lead?.current_status === 'Qualified' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${inboxTheme.bannerBadge}`}>
                    This contact is qualified
                  </div>
                  <p className={`text-xs mt-1 ${inboxTheme.bannerText}`}>This contact only for informations</p>
                </div>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={() => window.location.href = "/leads"}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Avatar className="h-8 w-8 md:h-10 md:w-10">
              <AvatarImage
                src={clientAvatar}
                alt={conversation?.contact}
              />
              <AvatarFallback className="bg-blue-500 text-white font-semibold">
                {conversation?.contact
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg truncate">{conversation?.contact}</h2>
              <p className="text-sm text-muted-foreground hidden md:block truncate">{conversation?.subject}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getChannelColor(conversation?.channel || "email")}>
                {getChannelIcon(conversation?.channel || "email")}
                <span className="ml-1 capitalize">{conversation?.channel}</span>
              </Badge>
              <LeadNavigation 
                currentLeadId={params?.id as string}
                searchParams={navigationParams}
                sortConfig={navigationParams.sortConfig}
                variant="compact"
                mode="inbox"
              />
              <Button variant="ghost" size="icon">
                <Archive className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Client Profile & Conversation Layout */}
          <div className="flex-1 flex min-h-0">
            {/* WhatsApp Policy Banner */}
            {lastUsedChannel === "whatsapp" && !whatsappPolicy.allowed && (
              <div className="absolute top-16 left-0 right-0 z-10 bg-red-50 border-b border-red-200 px-4 py-2">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium text-red-800">
                    WhatsApp Policy Restriction: {whatsappPolicy.reason}
                  </span>
                  <span className="text-red-600">
                    • Use Email or SMS to continue communication
                  </span>
                </div>
              </div>
            )}

            {/* Client Profile Sidebar */}
      <div className={`hidden md:flex w-80 border-r flex flex-col h-full min-h-0 ${inboxTheme.sidebarBg}`}>
              <ScrollArea className="flex-1 h-full min-h-0">
                {/* Large Profile Section */}
        <div className={`p-4 md:p-6 border-b bg-gradient-to-br ${inboxTheme.gradient}`}>
                  <div className="text-center">
                    {(() => {
                      // Pick a random eye style from the list
                      const eyeStyles = [
                        "cute",
                        "drip",
                        "faceMask",
                        "smileLol",
                        "smileTeeth",
                        "tongueOut",
                        "wideSmile",
                      ];
                      const randomEye = eyeStyles[Math.floor(Math.random() * eyeStyles.length)];
                      // Use lead name as seed for avatar
                      const avatarSeed = encodeURIComponent(clientProfile?.name || "User");
                      return (
                        <Avatar className="h-20 w-20 md:h-24 md:w-24 mx-auto mb-4 ring-4 ring-white shadow-lg">
                          <AvatarImage
                            src={clientAvatar}
                            alt={clientProfile?.name}
                          />
                          <AvatarFallback className="text-2xl font-semibold bg-blue-500 text-white">
                            {clientProfile?.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                      );
                    })()}
                    <h2 className="text-xl font-bold text-gray-900">{clientProfile?.name}</h2>
                    <p className="text-sm text-gray-600">{clientProfile?.role}</p>
                    <p className="text-sm font-medium text-gray-800">{clientProfile?.company}</p>

                    <div className="flex justify-center gap-2 mt-3">
                      {clientProfile?.tags.map((tag, index) => (
                        <Badge key={index} variant={tag === "Active" ? "default" : "secondary"} className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{clientProfile?.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="truncate">{clientProfile?.email}</span>
                    </div>
                  </div>

                  {/* Deal Info */}
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Deal Value</p>
                      <p className="font-semibold text-green-600">{clientProfile?.dealValue}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Activity</p>
                      <p className="font-semibold">{clientProfile?.lastActivity}</p>
                    </div>
                  </div>
                </div>

                {/* Current Situation */}
                <div className="p-3 md:p-4 border-b">
                  <h3 className="font-semibold text-sm text-gray-900 mb-2">Current Situation</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{clientProfile?.currentSituation}</p>
                </div>

                {/* Today's Notes */}
                <div className="p-3 md:p-4 border-b">
                  <h3 className="font-semibold text-sm text-gray-900 mb-2">Today's Notes</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{clientProfile?.todaysNotes}</p>
                  <Button variant="outline" size="sm" className="mt-2 w-full bg-transparent">
                    Add Note
                  </Button>
                </div>

                {/* WhatsApp Policy Status */}
                <div className="p-3 md:p-4 border-b">
                  <h3 className="font-semibold text-sm text-gray-900 mb-2">WhatsApp Policy Status</h3>
                  {whatsappPolicy.allowed ? (
                    <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-green-800">Available</span>
                      </div>
                      <p className="text-xs text-green-700 mt-1">
                        WhatsApp messaging is allowed within 24-hour window
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-red-800">Restricted</span>
                      </div>
                      <p className="text-xs text-red-700 mt-1">
                        {whatsappPolicy.reason}
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        Use Email or SMS instead
                      </p>
                    </div>
                  )}
                  
                  {/* Policy Guidelines */}
                  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs font-semibold text-blue-800 mb-1">WhatsApp Business Policy Guidelines:</p>
                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                      <li>24-Hour Customer Service Window</li>
                      <li>User consent and opt-in required</li>
                      <li>Respect opt-out requests</li>
                      <li>No offensive content</li>
                      <li>Maintain data privacy</li>
                    </ul>
                    <a 
                      href="https://business.whatsapp.com/policy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                    >
                      📋 View Full Policy →
                    </a>
                  </div>
                </div>

                {/* Next Steps */}
                <div className="p-3 md:p-4 flex-1">
                  <h3 className="font-semibold text-sm text-gray-900 mb-3">Next Steps</h3>
                  <div className="space-y-2">
                    {clientProfile?.nextSteps.map((step, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200"
                      >
                        <div className="w-2 h-2 bg-amber-400 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-amber-800">{step}</p>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="mt-3 w-full bg-transparent">
                    Add Next Step
                  </Button>
                </div>
              </ScrollArea>
            </div>

            {/* Conversation Thread */}
            <div className="flex-1 flex flex-col h-full min-h-0">
              <ScrollArea className="flex-1 p-4 md:p-6 h-full min-h-0 max-h-full overflow-y-auto">
                <div className="space-y-4">
                  {/* WhatsApp Policy Notice in Thread */}
                  {lastUsedChannel === "whatsapp" && !whatsappPolicy.allowed && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h3 className="text-sm font-medium text-red-800 mb-1">
                            WhatsApp Business API Policy Restriction
                          </h3>
                          <p className="text-sm text-red-700 mb-2">
                            {whatsappPolicy.reason}
                          </p>
                          <div className="text-xs text-red-600 space-y-1">
                            <p><strong>Policy:</strong> You can only send WhatsApp messages within 24 hours of receiving a message from the client.</p>
                            <p><strong>Solution:</strong> Switch to Email or SMS channel to continue the conversation.</p>
                            <p><strong>Note:</strong> This is a WhatsApp Business API requirement to prevent spam and ensure quality messaging.</p>
                          </div>
                          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-xs font-semibold text-blue-800 mb-1">WhatsApp Business Policy Compliance:</p>
                            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                              <li>24-Hour Customer Service Window for responses</li>
                              <li>User consent and opt-in permission required</li>
                              <li>Respect user preferences and opt-out requests</li>
                              <li>No offensive or prohibited content</li>
                              <li>Maintain data privacy and consent management</li>
                            </ul>
                            <a 
                              href="https://business.whatsapp.com/policy" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                            >
                              📋 View Official Policy →
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {combinedTimeline.length > 0 ? (
                    combinedTimeline.map((item, index) => {
                      if (item.type === 'call') {
                        console.log("Rendering call:", item.data)
                        return <CallDisplay key={`call-${item.data.id}`} call={item.data} />
                      }
                      
                      const msg = item.data;
      // Define our known numbers
      const ourNumbers = {
        whatsapp: "whatsapp:+447307208994", // New WhatsApp number
        whatsappOld: "whatsapp:+447367835651", // Old suspended number (for message history)
        sms: "+447367835651",
        system: "system"
      };

                      // Determine if the message is from us (right) or lead (left)
                      let isMine = false;
                      if (msg.channel === "email") {
                        isMine = !msg.isIncoming;
                      } else if (msg.channel === "sms" || msg.channel === "whatsapp") {
                        // For Twilio, check if sender is our number or system
                        const normalizedSender = (msg.sender || '').toLowerCase();
                        const normalizedAuthor = (msg.author || '').toLowerCase();
                        isMine = (
                          normalizedSender === ourNumbers.system ||
                          normalizedSender === ourNumbers.whatsapp.toLowerCase() ||
                          normalizedSender === ourNumbers.whatsappOld.toLowerCase() ||
                          normalizedSender === ourNumbers.sms.toLowerCase() ||
                          normalizedSender === 'you' ||
                          msg.author === ourNumbers.system ||
                          normalizedAuthor === 'whatsapp:+447307208994' ||
                          normalizedAuthor === 'whatsapp:+447367835651' ||
                          normalizedAuthor === 'whatsapp:+447360543337' ||
                          normalizedAuthor === '+447367835651' ||
                          normalizedAuthor === '+447360543337'
                        );
                      }
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-3 w-full",
                            isMine ? "justify-end" : "justify-start"
                          )}
                          onClick={() => selectMessage(msg)}
                        >
                          {!isMine && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={clientAvatar}
                                alt={conversation?.contact}
                              />
                              <AvatarFallback className="bg-blue-500 text-white font-semibold">
                                {conversation?.contact
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              "flex flex-col max-w-[70%] cursor-pointer",
                              isMine ? "items-end text-right" : "items-start text-left"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">{msg.sender}</span>
                              <Badge variant="outline" className={cn("text-xs", getChannelColor(msg.channel))}>
                                {getChannelIcon(msg.channel)}
                              </Badge>
                              {msg.sender?.toLowerCase() === 'system' ? (
                                <Badge variant="outline" className="text-xs bg-gray-800 text-white">
                                  System
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                  {msg.author === 'whatsapp:+447307208994' ||
                                    msg.author === 'whatsapp:+447367835651' ||
                                    msg.author === 'whatsapp:+447360543337' ||
                                    msg.author === '+447367835651' ||
                                    msg.author === '+447360543337' ? 'Our Team' : 'Lead'}
                                </Badge>
                              )}
                              {/* Email delivery status (from email_messages.status) */}
                              {msg.channel === "email" && msg.status && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs capitalize",
                                    msg.status === "delivered" && "bg-green-100 text-green-800",
                                    msg.status === "open" && "bg-blue-100 text-blue-800",
                                    msg.status === "processed" && "bg-yellow-100 text-yellow-800",
                                    msg.status === "sent" && "bg-gray-100 text-gray-800",
                                    (msg.status === "bounce" || msg.status === "not_delivered" || msg.status === "error") &&
                                      "bg-red-100 text-red-800",
                                  )}
                                >
                                  {msg.status === "not_delivered"
                                    ? "not delivered"
                                    : msg.status}
                                </Badge>
                              )}
                            </div>
                            <div className={cn("flex flex-col items-end w-full")}>
                              <Card
                                className={cn(
                                  "p-3 w-full overflow-hidden",
                                  isMine
                                    ? "bg-blue-500 text-white rounded-br-none"
                                    : "bg-white rounded-bl-none border"
                                )}
                              >
                                {msg.channel === "email" && msg.subject && (
                                  <div className="font-semibold text-xs mb-1">Subject: {msg.subject}</div>
                                )}
                                {msg.channel === "email" ? (
                                  <div
                                    className="prose prose-sm max-w-none overflow-hidden"
                                    dangerouslySetInnerHTML={{ __html: msg.message }}
                                    style={{
                                      maxHeight: '200px',
                                      WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
                                      maskImage: 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
                                      cursor: 'pointer'
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedMessage(msg);
                                    }}
                                  />
                                ) : (
                                  <div className="space-y-2">
                                    {msg.message && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}
                                    {msg.media && msg.media.length > 0 && (
                                      <div className="space-y-2">
                                        {msg.media.map((mediaItem: any, idx: number) => (
                                          <MediaDisplay key={mediaItem.sid || `media-${idx}`} media={mediaItem} messageSid={String(msg.id)} conversationSid={String(activeConversation?.twilio_conv_id)} />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Card>
                              {isMine && msg.channel === "email" && (
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 pr-1 justify-end">
                                  <span className="text-xs text-muted-foreground">
                                    {formatMessageTimestamp(msg.timestamp)}
                                  </span>
                                  {msg.status === "not_delivered" ? (
                                    <span className="text-xs text-red-500 flex items-center gap-0.5">
                                      <XCircle className="w-3 h-3" /> Not delivered
                                    </span>
                                  ) : msg.status === "bounce" || msg.event_name === "bounce" ? (
                                    <span className="text-xs text-red-500 flex items-center gap-0.5">
                                      <XCircle className="w-3 h-3" /> Bounced
                                    </span>
                                  ) : msg.status === "delivered" ? (
                                    <span className="text-xs text-green-600 flex items-center gap-0.5">
                                      <Check className="w-3 h-3" /> Delivered
                                    </span>
                                  ) : msg.status === "open" ? (
                                    <span className="text-xs text-blue-600 flex items-center gap-0.5">
                                      <Check className="w-3 h-3" /> Opened
                                    </span>
                                  ) : msg.status === "error" ? (
                                    <span className="text-xs text-red-500 flex items-center gap-0.5">
                                      <XCircle className="w-3 h-3" /> Failed
                                    </span>
                                  ) : msg.status === "processed" ? (
                                    <span className="text-xs text-amber-700 flex items-center gap-0.5">
                                      <Check className="w-3 h-3" /> Processing
                                    </span>
                                  ) : msg.status === "sent" ? (
                                    <span className="text-xs text-gray-600 flex items-center gap-0.5">
                                      <Check className="w-3 h-3" /> Sent
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-500 flex items-center gap-0.5">
                                      <Check className="w-3 h-3 text-gray-400" /> Pending
                                    </span>
                                  )}
                                  {typeof msg.open_count === "number" && msg.open_count > 0 && (
                                    <span className="text-xs text-green-600">
                                      Opened {msg.open_count} time{msg.open_count > 1 ? "s" : ""}
                                    </span>
                                  )}
                                  {typeof msg.click_count === "number" && msg.click_count > 0 && (
                                    <span className="text-xs text-blue-600">
                                      Clicked {msg.click_count} time{msg.click_count > 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>
                              )}
                              {/* Message status for WhatsApp/SMS */}
                              {isMine && (msg.channel === "whatsapp" || msg.channel === "sms") && (
                                <div className="flex items-center gap-1 mt-1 pr-1">
                                  <span className="text-xs text-muted-foreground">{formatMessageTimestamp(msg.timestamp)}</span>
                                  {(msg.delivery?.read === "all" || msg.delivery?.read === "some") ? (
                                    <>
                                      <Check className="w-5 h-5 text-blue-600 font-bold -mr-2" strokeWidth={3} />
                                      <Check className="w-5 h-5 text-blue-600 font-bold" strokeWidth={3} />
                                    </>
                                  ) : (msg.delivery?.delivered === "all" || msg.delivery?.delivered === "some") ? (
                                    <>
                                      <Check className="w-5 h-5 text-gray-400 font-bold -mr-2" strokeWidth={3} />
                                      <Check className="w-5 h-5 text-gray-400 font-bold" strokeWidth={3} />
                                    </>
                                  ) : (
                                    <>
                                      <>
                                        <Check className="w-4 h-4 text-gray-400 font-bold" />
                                      </>
                                    </>
                                  )}
                                </div>
                              )}
                              {!isMine && (
                                <span className="text-xs text-muted-foreground mt-1">{formatMessageTimestamp(msg.timestamp)}</span>
                              )}
                            </div>
                          </div>
                          {isMine && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={userAvatar}
                                alt="You"
                              />
                              <AvatarFallback className="bg-blue-500 text-white font-semibold">You</AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Message Input - Redesigned */}
        <div className="bg-gradient-to-t from-gray-100 to-white border-t p-4 md:p-6">
                <div className="max-w-2xl mx-auto">
                  {/* WhatsApp Policy Warning */}
                  {lastUsedChannel === "whatsapp" && !whatsappPolicy.allowed && (
                    <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-amber-800">
                            WhatsApp Business API Policy Restriction
                          </h3>
                          <div className="mt-1 text-sm text-amber-700">
                            <p className="mb-2">
                              <strong>Policy:</strong> You can only send WhatsApp messages within 24 hours of receiving a message from the client.
                            </p>
                            <p className="mb-2">
                              <strong>Current Status:</strong> {whatsappPolicy.reason}
                            </p>
                            {whatsappPolicy.lastClientMessage && (
                              <p className="mb-2">
                                <strong>Last Client Message:</strong> {formatMessageTimestamp(whatsappPolicy.lastClientMessage.toISOString())}
                              </p>
                            )}
                            <p className="text-xs">
                              <strong>Alternative:</strong> Use Email or SMS to continue the conversation until the client sends a new WhatsApp message.
                            </p>
                            <div className="mt-3 p-2 bg-amber-100 rounded text-xs">
                              <p className="font-semibold mb-1">WhatsApp Business API Policy Details:</p>
                              <ul className="list-disc list-inside space-y-1">
                                <li>You can only send messages within 24 hours of the last client message</li>
                                <li>This is a WhatsApp Business API requirement to prevent spam</li>
                                <li>After 24 hours, you must wait for the client to initiate a new conversation</li>
                                <li>Use Email or SMS as alternatives for ongoing communication</li>
                              </ul>
                            </div>
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                              <p className="font-semibold mb-1 text-blue-800">Official WhatsApp Business Policy Guidelines:</p>
                              <ul className="list-disc list-inside space-y-1 text-blue-700">
                                <li><strong>24-Hour Window:</strong> Respond to user messages within 24 hours without templates</li>
                                <li><strong>User Consent:</strong> Must have explicit opt-in permission from clients</li>
                                <li><strong>Respect Preferences:</strong> Honor all opt-out and block requests immediately</li>
                                <li><strong>No Offensive Content:</strong> Avoid sexually explicit materials or nudity</li>
                                <li><strong>Regulated Services:</strong> No promotion of firearms, alcohol, tobacco, drugs, or adult products</li>
                                <li><strong>Data Privacy:</strong> Maintain proper privacy policies and consent management</li>
                              </ul>
                              <div className="mt-2 pt-2 border-t border-blue-200">
                                <a 
                                  href="https://business.whatsapp.com/policy" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline text-xs"
                                >
                                  📋 View Full WhatsApp Business Policy →
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* WhatsApp Policy Info (when allowed) */}
                  {lastUsedChannel === "whatsapp" && whatsappPolicy.allowed && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-green-800">
                            WhatsApp Messaging Available
                          </h3>
                          <div className="mt-1 text-sm text-green-700">
                            <p>
                              You can send WhatsApp messages within the 24-hour window. 
                              {whatsappPolicy.lastClientMessage && (
                                <span> Last client message: {formatMessageTimestamp(whatsappPolicy.lastClientMessage.toISOString())}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

          <div className="rounded-xl shadow-md bg-white border flex flex-col md:flex-row items-center gap-3 px-3 md:px-4 py-3">
                    <div className="flex items-center gap-2 w-full md:w-auto mb-2 md:mb-0">
                      <span className="font-semibold text-gray-700">Send as</span>
                      <div className="relative">
                        <select
                          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-gray-50"
                          value={lastUsedChannel}
                          onChange={(e) => setLastUsedChannel(e.target.value as Channel)}
                          title={lastUsedChannel === "whatsapp" && !whatsappPolicy.allowed ? 
                            `WhatsApp Policy: ${whatsappPolicy.reason}. Use Email or SMS instead.` : 
                            "Select communication channel"
                          }
                        >
                          <option value="email">Email</option>
                          <option value="whatsapp" disabled={!whatsappPolicy.allowed}>
                            WhatsApp {!whatsappPolicy.allowed ? '(Restricted)' : ''}
                          </option>
                          <option value="sms">SMS</option>
                        </select>
                        {lastUsedChannel === "whatsapp" && !whatsappPolicy.allowed && (
                          <div className="absolute -top-1 -right-1">
                            <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1" />
                    <Button
                      variant="outline"
                      className="w-full md:w-auto flex-shrink-0 px-4 py-2 rounded-lg border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold shadow"
                      onClick={() => setShowGuideDialog(true)}
                      disabled={lastUsedChannel === "whatsapp" && !whatsappPolicy.allowed}
                    >
                      <BookOpen className="mr-2 h-4 w-4" /> Send Guide
                    </Button>
                    {/* <Button
                      variant="outline"
                      className="w-full md:w-auto flex-shrink-0 px-4 py-2 rounded-lg border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold shadow disabled:opacity-50 disabled:cursor-not-allowed"
                      // onClick={() => setShowTwilioTemplateDialog(true)}
                      title="Send business-initiated template (SMS only - WhatsApp templates not validated)"
                      disabled={lastUsedChannel === "whatsapp"}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" /> Send Template
                    </Button> */}
                    <Button
                      className="w-full md:w-auto flex-shrink-0 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow"
                      onClick={() => setShowComposeDialog(true)}
                      disabled={lastUsedChannel === "whatsapp" && !whatsappPolicy.allowed}
                    >
                      <Send className="mr-2 h-4 w-4" /> Reply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compose dialog, channel-aware */}
        <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
          <DialogContent className="max-w-lg w-full">
            <DialogHeader>
              <DialogTitle>
                Compose New {lastUsedChannel.charAt(0).toUpperCase() + lastUsedChannel.slice(1)}
              </DialogTitle>
            </DialogHeader>
            
            {/* WhatsApp Policy Warning in Compose Dialog */}
            {lastUsedChannel === "whatsapp" && !whatsappPolicy.allowed && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-red-800">
                      WhatsApp Policy Violation
                    </h3>
                    <p className="mt-1 text-sm text-red-700">
                      Cannot send WhatsApp message: {whatsappPolicy.reason}
                    </p>
                    <p className="mt-2 text-xs text-red-600">
                      <strong>Solution:</strong> Switch to Email or SMS channel, or wait for the client to send a new WhatsApp message.
                    </p>
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-xs font-semibold text-blue-800 mb-1">WhatsApp Business Policy Compliance:</p>
                      <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                        <li>24-Hour Customer Service Window for responses</li>
                        <li>User consent and opt-in permission required</li>
                        <li>Respect user preferences and opt-out requests</li>
                        <li>No offensive or prohibited content</li>
                        <li>Maintain data privacy and consent management</li>
                      </ul>
                      <a 
                        href="https://business.whatsapp.com/policy" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                      >
                        📋 View Official Policy →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Email: template/text toggle, subject, message */}
            {lastUsedChannel === "email" ? (
              <>
                <div className="flex gap-4 mb-2">
                  <Label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="composeMode"
                      value="text"
                      checked={composeMode === "text"}
                      onChange={() => setComposeMode("text")}
                    />
                    Write Text
                  </Label>
                  <Label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="composeMode"
                      value="template"
                      checked={composeMode === "template"}
                      onChange={() => setComposeMode("template")}
                    />
                    Use Template
                  </Label>
                </div>
                {composeMode === "template" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="template">Select Template</Label>
                      <select
                        id="template"
                        className="w-full border rounded px-2 py-2"
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                      >
                        <option value="">-- Choose a template --</option>
                        {EMAIL_TEMPLATES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedTemplate && (
                      <div className="mt-4 border rounded bg-gray-50 p-4">
                        <div className="mb-2">
                          <span className="font-semibold">Subject:</span> {selectedTemplate.subject}
                        </div>
                        <div
                          className="prose max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: selectedTemplate.body.replace(/{{name}}/g, lead?.first_name || ""),
                          }}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Message</Label>
                      <div className="border rounded-md overflow-hidden bg-white">
                        <div className="border-b p-1 flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const textarea = textareaRef.current
                              if (textarea) {
                                const start = textarea.selectionStart
                                const end = textarea.selectionEnd
                                const selectedText = message.substring(start, end)
                                const newText =
                                  message.substring(0, start) + `**${selectedText}**` + message.substring(end)
                                setMessage(newText)
                              }
                            }}
                            className="h-8 w-8"
                            title="Bold"
                          >
                            <Bold className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const textarea = textareaRef.current
                              if (textarea) {
                                const start = textarea.selectionStart
                                const end = textarea.selectionEnd
                                const selectedText = message.substring(start, end)
                                const newText =
                                  message.substring(0, start) + `*${selectedText}*` + message.substring(end)
                                setMessage(newText)
                              }
                            }}
                            className="h-8 w-8"
                            title="Italic"
                          >
                            <Italic className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const textarea = textareaRef.current
                              if (textarea) {
                                const start = textarea.selectionStart
                                const end = textarea.selectionEnd
                                const selectedText = message.substring(start, end)
                                const newText =
                                  message.substring(0, start) + `\n- ${selectedText}\n` + message.substring(end)
                                setMessage(newText)
                              }
                            }}
                            className="h-8 w-8"
                            title="Bullet List"
                          >
                            <List className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const textarea = textareaRef.current
                              if (textarea) {
                                const start = textarea.selectionStart
                                const end = textarea.selectionEnd
                                const selectedText = message.substring(start, end)
                                const newText =
                                  message.substring(0, start) + `\n1. ${selectedText}\n` + message.substring(end)
                                setMessage(newText)
                              }
                            }}
                            className="h-8 w-8"
                            title="Numbered List"
                          >
                            <ListOrdered className="h-4 w-4" />
                          </Button>
                        </div>
                        <Textarea
                          ref={textareaRef}
                          placeholder="Type your message here..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          className="min-h-[200px] border-0 focus-visible:ring-0 font-mono text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Tab") {
                              e.preventDefault()
                              const start = e.currentTarget.selectionStart
                              const end = e.currentTarget.selectionEnd
                              const newMessage = message.substring(0, start) + "    " + message.substring(end)
                              setMessage(newMessage)
                              setTimeout(() => {
                                if (textareaRef.current) {
                                  textareaRef.current.selectionStart = start + 4
                                  textareaRef.current.selectionEnd = start + 4
                                }
                              }, 0)
                            }
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}
                <div className="flex justify-end mt-4 gap-2">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    onClick={async () => {
                      await handleSendMessage()
                      setShowComposeDialog(false)
                    }}
                    disabled={
                      isSending || (composeMode === "text" ? !message.trim() || !subject.trim() : !selectedTemplateId)
                    }
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              // WhatsApp/SMS: just message input
              <>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    ref={textareaRef}
                    placeholder={`Type your ${lastUsedChannel} message here...`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[120px] border"
                  />
                </div>
                <div className="flex justify-end mt-4 gap-2">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    onClick={async () => {
                      await handleSendMessage();
                      setShowComposeDialog(false);
                    }}
                    disabled={isSending || !message.trim()}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" /> Send
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Guide Selection Dialog */}
        <Dialog open={showGuideDialog} onOpenChange={setShowGuideDialog}>
          <DialogContent className="max-w-md w-full">
            <DialogHeader>
              <DialogTitle>Send Guide</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="guide-type">Select Guide Type</Label>
                <select
                  id="guide-type"
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={selectedGuideType}
                  onChange={(e) => setSelectedGuideType(e.target.value)}
                >
                  <option value="">-- Choose a guide --</option>
                  {GUIDE_TYPES.map((guideType) => (
                    <option key={guideType} value={guideType}>
                      {guideType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="guide-channel">Select Channel</Label>
                <select
                  id="guide-channel"
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={guideChannel}
                  onChange={(e) => setGuideChannel(e.target.value as "email" | "whatsapp")}
                >
                  <option value="email">📧 Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <div className="flex items-start gap-2">
                  {guideChannel === "whatsapp" ? (
                    <WhatsAppIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <svg className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  <div>
                    <p className="text-sm text-green-800">
                      <strong>Channel:</strong> {guideChannel.charAt(0).toUpperCase() + guideChannel.slice(1)}
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      The guide will be sent via {guideChannel} to {getDisplayName(lead?.first_name || "", lead?.last_name || "")}.
                    </p>
                    {guideChannel === "whatsapp" && (
                      <p className="text-xs text-green-600 mt-1">
                        ✅ WhatsApp guides can be sent anytime (no 24-hour restriction)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6 gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleSendGuide}
                disabled={isSendingGuide || !selectedGuideType}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSendingGuide ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Send Guide
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Twilio Template Selection Dialog */}
        <Dialog open={showTwilioTemplateDialog} onOpenChange={setShowTwilioTemplateDialog}>
          <DialogContent className="max-w-lg w-full">
            <DialogHeader>
              <DialogTitle>Send Template Message</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                These are business-initiated templates that can be sent outside the 24-hour window.
              </p>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-type">Select Template</Label>
                <select
                  id="template-type"
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  value={selectedTwilioTemplateId}
                  onChange={(e) => setSelectedTwilioTemplateId(e.target.value)}
                >
                  <option value="">-- Choose a template --</option>
                  {TWILIO_TEMPLATES.filter(template => template.channels.includes("sms")).map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} (SMS Only)
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedTwilioTemplate && (
                <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">Preview:</h4>
                  <div className="bg-white border rounded-md p-3 text-sm">
                    <p className="text-gray-800">
                      {selectedTwilioTemplate.content.replace(
                        /\[First Name\]/g, 
                        lead?.first_name || "there"
                      )}
                    </p>
                  </div>
                  <div className="mt-2 text-xs text-purple-600">
                    <p><strong>Template ID:</strong> {selectedTwilioTemplate.sid}</p>
                    <p><strong>Channels:</strong> {selectedTwilioTemplate.channels.join(", ")}</p>
                  </div>
                </div>
              )}
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Channel:</strong> SMS Only
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  The template will be sent via SMS to {getDisplayName(lead?.first_name || "", lead?.last_name || "")}.
                </p>
                <p className="text-sm text-green-700 mt-2 font-medium">
                  ✅ Business-initiated template - works outside 24-hour window
                </p>
                <p className="text-xs text-green-600 mt-1">
                  No existing conversation required - sends directly via template
                </p>
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  ⚠️ WhatsApp templates are disabled (not validated)
                </p>
              </div>
            </div>
            
            <div className="flex justify-end mt-6 gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleSendTwilioTemplate}
                disabled={isSending || !selectedTwilioTemplateId}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Send Template
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Loading conversation</h2>
          <p className="text-muted-foreground">Please wait while we load the conversation thread</p>
        </div>
      </div>
    </div>
  )
}
