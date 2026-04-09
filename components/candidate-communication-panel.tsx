"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Check,
  Loader2,
  Maximize2,
  Minimize2,
  Send,
  Eye
} from "lucide-react";
import { CandidateMessageSender, canSendWhatsAppMessage, CombinedMessage } from "./candidate-message-sender";
import { CandidateCallSummaryDialog } from "./candidate-call-summary-dialog";
import { cn } from "@/lib/utils";

interface CommunicationItem {
  id: string;
  type: 'email' | 'sms' | 'whatsapp' | 'call';
  timestamp: string;
  content: string;
  subject?: string;
  direction: 'inbound' | 'outbound';
  status?: string;
  open_count?: number;
  clicks_count?: number;
  marked_as_spam?: boolean;
  unsubscribed?: boolean;
  response_time_seconds?: number;
  duration?: number;
  call_ended_reason?: string;
  call_details?: {
    summary?: string | null;
    analysis?: string | null;
    transcript?: string | null;
    call_score?: number | null;
    advisor_name?: string | null;
    feedback_agreement?: string | null;
    feedback_score?: number | null;
    terry_feedback?: string | null;
    candidate_sentiment?: string | null;
    candidate_interest_level?: string | null;
    candidate_engagement_style?: string | null;
    ai_comfort_level?: string | null;
    qualification_strength?: string | null;
    sales_readiness?: string | null;
    earnings_expectation_alignment?: string | null;
    communication_quality?: string | null;
    recommended_next_action?: string | null;
    risk_flags?: string[] | null;
    motivation_drivers?: string[] | null;
  };
}

interface CandidateCommunicationPanelProps {
  candidateId: number;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function CandidateCommunicationPanel({ 
  candidateId, 
  candidateName, 
  candidateEmail, 
  candidatePhone,
  isExpanded = false,
  onToggleExpand
}: CandidateCommunicationPanelProps) {
  const [communications, setCommunications] = useState<CommunicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    emailCount: 0,
    smsCount: 0,
    whatsappCount: 0,
    callsCount: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [lastUsedChannel, setLastUsedChannel] = useState<"email" | "sms" | "whatsapp">("email");
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [expandedTranscripts, setExpandedTranscripts] = useState<Record<string, boolean>>({});
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadCommunications = useCallback(async () => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}/communications?t=${Date.now()}`);
      const result = await response.json();
      
      if (response.ok) {
        // Sort messages in ascending order (oldest first) for chat display
        const sortedData = [...(result.data || [])].sort((a: CommunicationItem, b: CommunicationItem) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        setCommunications(sortedData);
        setStats({
          emailCount: result.emailCount,
          smsCount: result.smsCount,
          whatsappCount: result.whatsappCount,
          callsCount: result.callsCount
        });
        
        // Determine last used channel (use the last message in sorted order)
        if (sortedData.length > 0) {
          const lastMsg = sortedData[sortedData.length - 1];
          if (lastMsg && lastMsg.type !== 'call') {
            const channel = lastMsg.type === 'whatsapp' ? 'whatsapp' : lastMsg.type === 'sms' ? 'sms' : 'email';
            setLastUsedChannel(channel);
          }
        }
        
        // Auto-scroll to bottom after messages load
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        }, 100);
      } else {
        console.error("Error loading communications:", result.error);
      }
    } catch (error) {
      console.error("Error loading communications:", error);
    }
  }, [candidateId]);

  useEffect(() => {
    async function initialLoad() {
      setLoading(true);
      await loadCommunications();
      setLoading(false);
    }
    initialLoad();
  }, [loadCommunications]);

  // Check WhatsApp policy - convert communications to CombinedMessage format
  const whatsappMessages: CombinedMessage[] = useMemo(() => {
    return communications
      .filter((item: CommunicationItem) => item.type === 'whatsapp')
      .map((item: CommunicationItem) => ({
        id: item.id,
        channel: 'whatsapp' as const,
        isIncoming: item.direction === 'inbound',
        timestamp: item.timestamp,
        author: item.direction === 'inbound' ? 'candidate' : 'system',
        sender: item.direction === 'inbound' ? candidateName : 'You'
      }));
  }, [communications, candidateName]);

  const whatsappPolicy = useMemo(() => {
    return canSendWhatsAppMessage(whatsappMessages);
  }, [whatsappMessages]);

  const handleMessageSent = async () => {
    setRefreshing(true);
    
    // Store the current message count to detect when a new message appears
    const initialCount = communications.length;
    const startTime = Date.now();
    const maxWaitTime = 30000; // Maximum 30 seconds of polling
    
    // Initial delay to allow webhook to process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Poll for new messages - continue until we find a new message or timeout
    // This accounts for webhook processing time which can be 2-10 seconds
    let attempts = 0;
    let delay = 1500; // Start with 1.5 seconds
    let success = false;
    
    while (Date.now() - startTime < maxWaitTime && !success) {
      try {
        const response = await fetch(`/api/candidates/${candidateId}/communications?t=${Date.now()}`);
        const result = await response.json();
        
        if (response.ok) {
          const newCount = result.data?.length || 0;
          
          // Sort messages in ascending order (oldest first) for chat display
          const sortedData = [...(result.data || [])].sort((a: CommunicationItem, b: CommunicationItem) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          // Always update the UI with latest data
          setCommunications(sortedData);
          setStats({
            emailCount: result.emailCount,
            smsCount: result.smsCount,
            whatsappCount: result.whatsappCount,
            callsCount: result.callsCount
          });
          
          // If we see a new message, we're done!
          if (newCount > initialCount) {
            console.log(`New message detected after ${attempts} attempts, refresh complete`);
            success = true;
            // Scroll to bottom when new message appears
            setTimeout(() => {
              if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
              }
            }, 100);
            break;
          }
          
          // If we've tried a few times and still no new message, continue polling
          // but with longer delays
          if (attempts >= 3) {
            delay = 2000; // Increase to 2 seconds after 3 attempts
          }
          if (attempts >= 6) {
            delay = 3000; // Increase to 3 seconds after 6 attempts
          }
        } else {
          console.error("Error loading communications:", result.error);
        }
      } catch (error) {
        console.error("Error loading communications:", error);
      }
      
      attempts++;
      
      // Wait before next attempt (except if we found the message or timed out)
      if (!success && Date.now() - startTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If we've exhausted all attempts, stop refreshing
    if (!success) {
      console.log(`Polling completed after ${attempts} attempts. Message may still be processing.`);
    }
    
    setRefreshing(false);
  }

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (communications.length > 0 && messagesEndRef.current) {
      const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer as HTMLElement;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
        
        // Always scroll to bottom on initial load or if user is near bottom
        if (isNearBottom || !loading) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }, 100);
        }
      } else {
        // Fallback: if scroll container not found yet, try again after a short delay
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        }, 200);
      }
    }
  }, [communications.length, loading]);

  const formatMessageTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) {
      return `Today at ${time}`;
    } else if (isYesterday) {
      return `Yesterday at ${time}`;
    } else {
      return date.toLocaleDateString([], { year: "numeric", month: "long", day: "2-digit" }) + " at " + time;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "whatsapp":
        return <svg className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="none"><g><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.67.15-.198.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.571-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.363.71.306 1.263.489 1.695.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347z" /><path fill="currentColor" d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.462 3.479 1.338 4.995L2.003 22l5.13-1.342c1.47.805 3.13 1.245 4.87 1.245 5.514 0 9.997-4.483 9.997-9.997 0-2.666-1.04-5.17-2.929-7.06C17.174 3.043 14.67 2.003 12.004 2.003zm0 17.995c-1.57 0-3.104-.418-4.44-1.21l-.318-.188-3.045.797.812-2.97-.206-.306c-.82-1.22-1.25-2.64-1.25-4.108 0-4.135 3.364-7.5 7.5-7.5 2.003 0 3.89.78 5.304 2.195 1.414 1.414 2.196 3.3 2.196 5.304 0 4.135-3.365 7.5-7.5 7.5z" /></g></svg>;
      case "sms":
        return <Phone className="h-4 w-4 text-blue-600" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case "email":
        return "bg-gray-100 text-gray-700";
      case "whatsapp":
        return "bg-green-100 text-green-700";
      case "sms":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Generate avatars
  const candidateAvatar = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(candidateName)}&backgroundColor=b6e3f4&eyes=cute&mouth=smileLol`;
  const userAvatar = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=You&backgroundColor=c0aede&eyes=plain&mouth=wideSmile`;

  const getStatusIcon = (status?: string, type?: string) => {
    if (!status) return null;
    
    switch (status.toLowerCase()) {
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return (
          <div className="flex items-center">
            <Check className="h-3 w-3 text-gray-400 -mr-1" />
            <Check className="h-3 w-3 text-gray-400" />
          </div>
        );
      case 'read':
        return (
          <div className="flex items-center">
            <Check className="h-3 w-3 text-blue-500 -mr-1" />
            <Check className="h-3 w-3 text-blue-500" />
          </div>
        );
      case 'completed':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-3 w-3 text-red-500" />;
      case 'pending':
      case 'sending':
        return <Clock className="h-3 w-3 text-yellow-500" />;
      default:
        return <AlertCircle className="h-3 w-3 text-gray-500" />;
    }
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'inbound' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };


  const getCallStatusColor = (reason?: string) => {
    if (!reason) return 'text-gray-500';
    
    const successReasons = ['customer-ended-call', 'assistant-ended-call'];
    const failureReasons = ['customer-busy', 'customer-did-not-answer', 'voicemail', 'silence-timed-out'];
    
    if (successReasons.includes(reason)) return 'text-green-600';
    if (failureReasons.includes(reason)) return 'text-red-600';
    return 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isExpanded ? 'h-screen' : 'h-full'} flex flex-col ${isExpanded ? 'border-0 rounded-none' : 'border border-gray-200 rounded-lg'} bg-white min-h-0`}>
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between bg-gray-50 flex-shrink-0 rounded-t-lg">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={candidateAvatar} alt={candidateName} />
            <AvatarFallback className="bg-blue-500 text-white font-semibold">
              {candidateName
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm">{candidateName}</h3>
            <p className="text-xs text-gray-500">Candidate Conversation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Call Button */}
          {candidatePhone && (
            <Button
              variant="default"
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              asChild
            >
              <a href={`tel:${candidatePhone}`}>
                <Phone className="h-4 w-4 mr-1" />
                <span className="text-xs">Call</span>
              </a>
            </Button>
          )}
          <Badge variant="outline" className={getChannelColor(lastUsedChannel)}>
            {getChannelIcon(lastUsedChannel)}
            <span className="ml-1 capitalize">{lastUsedChannel}</span>
          </Badge>
          {onToggleExpand && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleExpand}
              className="text-xs"
              title={isExpanded ? "Collapse inbox" : "Expand inbox"}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMessageSent}
            disabled={refreshing}
            className="h-8 flex-shrink-0"
            title="Refresh messages"
          >
            {refreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <ScrollArea ref={scrollAreaRef} className="h-full w-full">
          <div className="p-4 space-y-4 min-h-full">
            {communications.length > 0 ? (
              communications.map((item) => {
                const contentText = typeof item.content === 'string' ? item.content : '';
                const isMine = item.direction === 'outbound';

                // Special rendering for calls - match crm-TB style
                if (item.type === 'call') {
                  const isTranscriptExpanded = expandedTranscripts[item.id] || false;
                  
                  return (
                    <div key={item.id} className="flex gap-3 w-full max-w-full justify-start">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-blue-500 text-white font-semibold">
                          <Phone className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 max-w-[75%] items-start text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">Call</span>
                          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 flex-shrink-0">
                            <Phone className="h-3 w-3 mr-1" />
                            Call
                          </Badge>
                        </div>
                        <div className="flex flex-col items-start w-full">
                          <Card className="p-3 w-full overflow-hidden bg-blue-50 border-blue-200 rounded-bl-none border shadow-sm">
                            <div className="space-y-2">
                              {item.call_details?.advisor_name && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-700">Advisor:</span>
                                  <span className="ml-2 text-gray-600 truncate">{item.call_details.advisor_name}</span>
                                </div>
                              )}
                              {item.call_ended_reason && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-700">End Reason:</span>
                                  <span className="ml-2 text-gray-600 truncate">{item.call_ended_reason}</span>
                                </div>
                              )}
                              {item.call_details?.summary && (
                                <div className="mt-2">
                                  <div className="text-sm">
                                    <span className="font-medium text-gray-700">Call Summary:</span>
                                  </div>
                                  <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-md">
                                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                      {item.call_details.summary}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {item.call_details?.transcript && (
                                <div className="mt-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setExpandedTranscripts(prev => ({
                                      ...prev,
                                      [item.id]: !prev[item.id]
                                    }))}
                                    className="text-blue-600 hover:text-blue-800 p-0 h-auto text-xs"
                                  >
                                    {isTranscriptExpanded ? 'Hide' : 'Show'} Transcript
                                  </Button>
                                  {isTranscriptExpanded && (
                                    <div className="mt-2 p-3 bg-white border rounded-md">
                                      <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-60 overflow-y-auto">
                                        {item.call_details.transcript}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              {item.call_details && (
                                <div className="mt-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCall({
                                        ...item.call_details,
                                        id: item.id.replace('call-', ''),
                                        created_at: item.timestamp,
                                        call_status: item.status,
                                        call_ended_reason: item.call_ended_reason,
                                        candidateName,
                                        candidatePhone
                                      });
                                      setIsCallDialogOpen(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 p-0 h-auto text-xs"
                                  >
                                    View Full Details
                                  </Button>
                                </div>
                              )}
                            </div>
                          </Card>
                          <span className="text-xs text-muted-foreground mt-1">{formatMessageTimestamp(item.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex gap-3 w-full max-w-full",
                      isMine ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isMine && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={candidateAvatar} alt={candidateName} />
                        <AvatarFallback className="bg-blue-500 text-white font-semibold">
                          {candidateName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "flex flex-col min-w-0 max-w-[75%]",
                        isMine ? "items-end text-right" : "items-start text-left"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{isMine ? "You" : candidateName}</span>
                        <Badge variant="outline" className={cn("text-xs flex-shrink-0", getChannelColor(item.type))}>
                          {getChannelIcon(item.type)}
                        </Badge>
                      </div>
                      <div className={cn("flex flex-col w-full")}>
                        <Card
                          className={cn(
                            "p-3 w-full overflow-hidden break-words",
                            isMine
                              ? "bg-blue-500 text-white rounded-br-none"
                              : "bg-white rounded-bl-none border shadow-sm"
                          )}
                        >
                          {item.type === "email" && item.subject && (
                            <div className="font-semibold text-xs mb-2 truncate">Subject: {item.subject}</div>
                          )}
                          {item.type === "email" ? (
                            <div className="max-h-48 overflow-y-auto">
                              <div
                                className="text-sm leading-relaxed break-words"
                                dangerouslySetInnerHTML={{
                                  __html: contentText
                                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                                    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                                }}
                                style={{
                                  wordBreak: 'break-word',
                                  overflowWrap: 'break-word',
                                  maxWidth: '100%',
                                  display: 'block',
                                  width: '100%'
                                }}
                              />
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {contentText}
                            </p>
                          )}
                        </Card>
                        {isMine && (item.type === 'sms' || item.type === 'whatsapp') && (
                          <div className="flex items-center gap-1 mt-1 pr-1">
                            <span className="text-xs text-muted-foreground">{formatMessageTimestamp(item.timestamp)}</span>
                            {(item.status === 'read' || item.status === 'Read') ? (
                              <>
                                <Check className="w-4 h-4 text-blue-600 font-bold -mr-1" strokeWidth={3} />
                                <Check className="w-4 h-4 text-blue-600 font-bold" strokeWidth={3} />
                              </>
                            ) : (item.status === 'delivered' || item.status === 'Delivered') ? (
                              <>
                                <Check className="w-4 h-4 text-gray-400 font-bold -mr-1" strokeWidth={3} />
                                <Check className="w-4 h-4 text-gray-400 font-bold" strokeWidth={3} />
                              </>
                            ) : (
                              <Check className="w-3 h-3 text-gray-400 font-bold" />
                            )}
                          </div>
                        )}
                        {!isMine && (
                          <span className="text-xs text-muted-foreground mt-1">{formatMessageTimestamp(item.timestamp)}</span>
                        )}
                      </div>
                    </div>
                    {isMine && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={userAvatar} alt="You" />
                        <AvatarFallback className="bg-blue-500 text-white font-semibold">You</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">No messages yet. Start the conversation!</p>
                </div>
              </div>
            )}
            {/* Invisible element at the end for auto-scroll */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Message Input */}
      <div className="border-t p-4 bg-gray-50 flex-shrink-0 rounded-b-lg">
        {/* WhatsApp Policy Warning - Always visible when restricted */}
        {!whatsappPolicy.allowed && (
          <div className="mb-4 space-y-3">
            {/* WhatsApp Policy Status - Red Section */}
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    WhatsApp Policy Restriction
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    {whatsappPolicy.reason}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Use Email or SMS to continue the conversation
                  </p>
                </div>
              </div>
            </div>

            {/* WhatsApp Business Policy Guidelines - Blue Section */}
            <div className="p-2 bg-blue-50 border border-blue-200 rounded">
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
        )}

        <div className="flex gap-2 mb-3">
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
            value={lastUsedChannel}
            onChange={(e) => setLastUsedChannel(e.target.value as "email" | "sms" | "whatsapp")}
            title={lastUsedChannel === "whatsapp" && !whatsappPolicy.allowed ?
              `WhatsApp Policy: ${whatsappPolicy.reason}. Use a template to send business-initiated messages, or use Email or SMS instead.` :
              "Select communication channel"
            }
          >
            <option value="email">Email</option>
            <option value="whatsapp">
              WhatsApp {!whatsappPolicy.allowed ? '(Use Template)' : ''}
            </option>
            <option value="sms">SMS</option>
          </select>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <CandidateMessageSender
              candidateId={candidateId}
              candidateName={candidateName}
              candidateEmail={candidateEmail}
              candidatePhone={candidatePhone}
              onMessageSent={handleMessageSent}
            />
          </div>
        </div>
      </div>

      {/* Call Summary Dialog */}
      <CandidateCallSummaryDialog
        open={isCallDialogOpen}
        onOpenChange={setIsCallDialogOpen}
        call={selectedCall}
        candidateName={selectedCall?.candidateName || candidateName}
        candidatePhone={selectedCall?.candidatePhone || candidatePhone}
      />
    </div>
  );
}
