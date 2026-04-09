'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { File, Download, Mail, MessageSquare, ChevronDown, ChevronUp, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface MessageAttachment {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
}

interface Message {
  id: string;
  subject: string | null;
  body: string | null;
  from_address: string;
  to_addresses: string[] | null;
  cc_addresses?: string[] | null;
  bcc_addresses?: string[] | null;
  sent_at: string | null;
  created_at: string;
  direction: 'inbound' | 'outbound';
  has_attachments: boolean;
  status?: string;
  attachments?: MessageAttachment[];
}

interface MessageHistoryProps {
  contactEmail: string;
  userId: string;
  className?: string;
}

export function MessageHistory({ contactEmail, userId, className }: MessageHistoryProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/messages/history?contactEmail=${encodeURIComponent(contactEmail)}&userId=${encodeURIComponent(userId)}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }

        const data = await response.json();
        setMessages(data.messages || []);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load message history');
      } finally {
        setLoading(false);
      }
    };

    if (contactEmail && userId) {
      fetchMessages();
      // Refresh messages every 30 seconds
      const interval = setInterval(fetchMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [contactEmail, userId]);

  const toggleMessageExpanded = (messageId: string) => {
    setExpandedMessages(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      sent: { label: 'Sent', variant: 'outline' },
      delivered: { label: 'Delivered', variant: 'default' },
      read: { label: 'Read', variant: 'secondary' },
      failed: { label: 'Failed', variant: 'destructive' },
      sending: { label: 'Sending', variant: 'outline' },
      bounce: { label: 'Bounced', variant: 'destructive' },
      not_delivered: { label: 'Not Delivered', variant: 'destructive' },
      open: { label: 'Opened', variant: 'secondary' },
    };

    const statusInfo = statusMap[status.toLowerCase()] || { label: status, variant: 'outline' as const };
    
    return (
      <Badge variant={statusInfo.variant} className="ml-2 text-xs">
        {statusInfo.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2 border-b pb-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        <p>{error}</p>
        <Button
          variant="outline"
          className="mt-2"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
        <p>No messages found</p>
        <p className="text-sm">Start a conversation with {contactEmail}</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-[calc(100vh-300px)]", className)}>
      <div className="space-y-4 p-4">
        {messages.map((message) => {
          const isExpanded = expandedMessages[message.id] || false;
          const isOutbound = message.direction === 'outbound';
          const messageDate = message.sent_at || message.created_at;
          const formattedDate = messageDate ? format(new Date(messageDate), 'MMM d, yyyy h:mm a') : '';
          const recipients = message.to_addresses?.join(', ') || '';
          const hasAttachments = message.has_attachments && message.attachments && message.attachments.length > 0;
          
          return (
            <div 
              key={message.id} 
              className={cn(
                "rounded-lg border p-4 transition-all",
                isOutbound ? "bg-muted/50" : "bg-background",
                isExpanded && "ring-2 ring-ring/20"
              )}
            >
              <div 
                className="flex items-start justify-between cursor-pointer"
                onClick={() => toggleMessageExpanded(message.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <div className={cn(
                      "flex items-center justify-center h-8 w-8 rounded-full mr-3 flex-shrink-0",
                      isOutbound ? "bg-primary/10 text-primary" : "bg-secondary/50 text-secondary-foreground"
                    )}>
                      {isOutbound ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center">
                        <h4 className="font-medium text-sm truncate">
                          {isOutbound ? `To: ${recipients}` : `From: ${message.from_address}`}
                        </h4>
                        {message.status && getStatusBadge(message.status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {message.subject || '(No subject)'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0 flex items-center">
                  <span className="text-xs text-muted-foreground">
                    {formattedDate}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMessageExpanded(message.id);
                    }}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 space-y-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {message.body ? (
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: message.body.replace(/\n/g, '<br>') 
                        }} 
                      />
                    ) : (
                      <p className="text-muted-foreground italic">No message content</p>
                    )}
                  </div>

                  {hasAttachments && (
                    <div className="mt-4 pt-4 border-t">
                      <h5 className="text-sm font-medium mb-2 flex items-center">
                        <Paperclip className="h-4 w-4 mr-2" />
                        Attachments ({message.attachments?.length})
                      </h5>
                      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                        {message.attachments?.map((attachment) => (
                          <div 
                            key={attachment.id} 
                            className="flex items-center p-2 border rounded-md hover:bg-muted/50"
                          >
                            <div className="flex items-center justify-center h-10 w-10 rounded-md bg-muted/50 mr-3">
                              <File className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {attachment.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(attachment.file_size)}
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              asChild
                            >
                              <a 
                                href={`/api/messages/attachments/${attachment.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={attachment.file_name}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 text-xs text-muted-foreground">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium">From:</span> {message.from_address}
                      </div>
                      <div>
                        <span className="font-medium">To:</span> {message.to_addresses?.join(', ')}
                      </div>
                      {message.cc_addresses && message.cc_addresses.length > 0 && (
                        <div className="col-span-2">
                          <span className="font-medium">CC:</span> {message.cc_addresses.join(', ')}
                        </div>
                      )}
                      {message.bcc_addresses && message.bcc_addresses.length > 0 && (
                        <div className="col-span-2">
                          <span className="font-medium">BCC:</span> {message.bcc_addresses.join(', ')}
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="font-medium">Date:</span> {formattedDate}
                      </div>
                      {message.status && (
                        <div>
                          <span className="font-medium">Status:</span> {message.status}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}