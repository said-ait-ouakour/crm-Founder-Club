"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, MessageSquare, Phone, Send, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Template {
  id: string;
  title: string;
  content: string;
}

interface CandidateMessageSenderProps {
  candidateId: number;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  onMessageSent?: () => void;
}

export interface CombinedMessage {
  id: string;
  channel: "email" | "sms" | "whatsapp";
  isIncoming: boolean;
  timestamp: string;
  author?: string;
  sender?: string;
}

// Helper to check if WhatsApp messaging is allowed (24-hour policy)
export function canSendWhatsAppMessage(messages: CombinedMessage[]): { allowed: boolean; lastCandidateMessage?: Date; reason?: string } {
  if (messages.length === 0) {
    return { allowed: false, reason: "No previous conversation exists" };
  }

  // Find the last candidate-initiated WhatsApp message
  const candidateWhatsAppMessages = messages
    .filter(msg => 
      msg.channel === "whatsapp" && 
      msg.isIncoming && // Candidate messages are incoming (from candidate to us)
      msg.author !== "system" &&
      msg.author !== "whatsapp:+447307208994" &&
      msg.author !== "whatsapp:+447367835651" &&
      msg.author !== "whatsapp:+447360543337" &&
      msg.author !== "+447367835651" &&
      msg.author !== "+447360543337"
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (candidateWhatsAppMessages.length === 0) {
    return { allowed: false, reason: "No previous conversation exists" };
  }

  const lastCandidateMessage = new Date(candidateWhatsAppMessages[0].timestamp);
  const now = new Date();
  const hoursSinceLastMessage = (now.getTime() - lastCandidateMessage.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLastMessage > 24) {
    return { 
      allowed: false, 
      lastCandidateMessage,
      reason: `Last candidate message was ${Math.floor(hoursSinceLastMessage)} hours ago` 
    };
  }

  return { allowed: true, lastCandidateMessage };
}

export function CandidateMessageSender({ 
  candidateId, 
  candidateName, 
  candidateEmail, 
  candidatePhone,
  onMessageSent 
}: CandidateMessageSenderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [channel, setChannel] = useState<string>("");
  const [message, setMessage] = useState("");
  const [originalTemplateContent, setOriginalTemplateContent] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [recipientName, setRecipientName] = useState(candidateName);
  const [senderName, setSenderName] = useState("");
  const [messages, setMessages] = useState<CombinedMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  // Variables for numbered placeholders ({{1}}, {{2}}, {{3}})
  const [interviewTime, setInterviewTime] = useState("");
  const [recruiterName, setRecruiterName] = useState("");
  // Generic variables for dynamic templates
  const [variable2, setVariable2] = useState("");
  const [variable3, setVariable3] = useState("");
  const [variable4, setVariable4] = useState("");
  const [roleName, setRoleName] = useState("");
  
  // Date and time selection for reschedule template
  const [date1, setDate1] = useState<string>("");
  const [time1, setTime1] = useState<string>("");
  const [date2, setDate2] = useState<string>("");
  const [time2, setTime2] = useState<string>("");

  // Generate time slots based on selected date (8 AM - 6 PM, 30-minute intervals)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const ampm = hour >= 12 ? 'pm' : 'am';
        const timeStr = `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')}${ampm}`;
        slots.push(timeStr);
      }
    }
    return slots;
  }, []);

  // Format date + time into readable string (e.g., "Monday, January 15th at 2:00pm")
  const formatDateTime = (dateStr: string, timeStr: string): string => {
    if (!dateStr || !timeStr) return "";
    const date = new Date(dateStr);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = dayNames[date.getDay()];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    
    // Convert 24-hour format (HH:MM) to 12-hour format with am/pm
    const [hours, minutes] = timeStr.split(':').map(Number);
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = hours >= 12 ? 'pm' : 'am';
    const formattedTime = `${hour12}:${String(minutes).padStart(2, '0')}${ampm}`;
    
    return `${dayName}, ${month} ${day}${suffix} at ${formattedTime}`;
  };

  // Update variable2 when date1 or time1 changes
  useEffect(() => {
    if (date1 && time1) {
      setVariable2(formatDateTime(date1, time1));
    } else {
      setVariable2("");
    }
  }, [date1, time1]);

  // Update variable3 when date2 or time2 changes
  useEffect(() => {
    if (date2 && time2) {
      setVariable3(formatDateTime(date2, time2));
    } else {
      setVariable3("");
    }
  }, [date2, time2]);

  // Check if template uses numbered placeholders
  const hasNumberedPlaceholders = (content: string) => {
    return /\{\{\s*\d+\s*\}\}/.test(content);
  };

  // Detect which numbered placeholders are in the template
  const getNumberedPlaceholders = (content: string): number[] => {
    const matches = content.match(/\{\{\s*(\d+)\s*\}\}/g);
    if (!matches) return [];
    const numbers = matches.map(m => parseInt(m.replace(/\{\{|\}\}/g, '').trim()));
    return [...new Set(numbers)].sort((a, b) => a - b);
  };

  // Compute preview message with variables resolved in real-time
  const previewMessage = useMemo(() => {
    if (!templateId || !originalTemplateContent) {
      // Not using a template, show message as-is
      return message;
    }

    let preview = originalTemplateContent;

    // Check if template uses numbered placeholders
    if (hasNumberedPlaceholders(originalTemplateContent)) {
      const placeholders = getNumberedPlaceholders(originalTemplateContent);
      const isRescheduleTemplate = originalTemplateContent.includes('reschedule') && originalTemplateContent.includes('would') && originalTemplateContent.includes('or');
      const isInterviewReminderOld = originalTemplateContent.includes('remind') && originalTemplateContent.includes('interview') && !placeholders.includes(4);
      const isInterviewReminderNew = originalTemplateContent.includes('remind') && originalTemplateContent.includes('interview') && originalTemplateContent.includes('for the') && placeholders.includes(4);
      const isFollowUpTemplate = originalTemplateContent.includes('following up');

      // Replace {{1}} with candidate name
      if (placeholders.includes(1)) {
        preview = preview.replace(/\{\{\s*1\s*\}\}/g, candidateName || '{{1}}');
      }

      // Replace {{2}} based on template type
      if (placeholders.includes(2)) {
        let var2Value = '';
        if (isInterviewReminderNew) {
          // New template: {{2}} is role name
          var2Value = roleName.trim() || variable2.trim();
        } else if (isInterviewReminderOld) {
          // Old template: {{2}} is time
          const timeValue = interviewTime.trim();
          if (timeValue && timeValue.includes(':')) {
            const [hours, minutes] = timeValue.split(':');
            const hour24 = parseInt(hours, 10);
            if (!isNaN(hour24)) {
              const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
              const amPm = hour24 >= 12 ? 'PM' : 'AM';
              var2Value = `${hour12}:${minutes} ${amPm}`;
            }
          }
        } else if (isFollowUpTemplate) {
          var2Value = recruiterName.trim() || variable2.trim();
        } else {
          var2Value = variable2.trim();
        }
        preview = preview.replace(/\{\{\s*2\s*\}\}/g, var2Value || '{{2}}');
      }

      // Replace {{3}} based on template type
      if (placeholders.includes(3)) {
        let var3Value = '';
        if (isRescheduleTemplate) {
          var3Value = variable3.trim();
        } else if (isInterviewReminderNew) {
          // New template: {{3}} is time
          const timeValue = interviewTime.trim();
          if (timeValue && timeValue.includes(':')) {
            const [hours, minutes] = timeValue.split(':');
            const hour24 = parseInt(hours, 10);
            if (!isNaN(hour24)) {
              const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
              const amPm = hour24 >= 12 ? 'PM' : 'AM';
              var3Value = `${hour12}:${minutes} ${amPm}`;
            }
          }
        } else {
          var3Value = recruiterName.trim();
        }
        preview = preview.replace(/\{\{\s*3\s*\}\}/g, var3Value || '{{3}}');
      }

      // Replace {{4}} with recruiter name (for new interview reminder template)
      if (placeholders.includes(4)) {
        const var4Value = recruiterName.trim() || variable4.trim();
        preview = preview.replace(/\{\{\s*4\s*\}\}/g, var4Value || '{{4}}');
      }
    } else {
      // Named placeholders ({{name}}, {{my_name}})
      preview = preview.replace(/\{\{\s*name\s*\}\}/gi, candidateName || '{{name}}');
      preview = preview.replace(/\{\{\s*my_name\s*\}\}/gi, senderName.trim() || '{{my_name}}');
    }

    return preview;
  }, [templateId, originalTemplateContent, message, candidateName, senderName, interviewTime, recruiterName, variable2, variable3, variable4, roleName]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all form fields when dialog closes
      setMessage("");
      setOriginalTemplateContent("");
      setSubject("");
      setTemplateId("");
      setChannel("");
      setRecipientName(candidateName);
      setSenderName("");
      setInterviewTime("");
      setRecruiterName("");
      setVariable2("");
      setVariable3("");
      setDate1("");
      setTime1("");
      setDate2("");
      setTime2("");
    }
  }, [isOpen, candidateName]);

  // Load templates when component mounts
  useEffect(() => {
    async function loadTemplates() {
      setLoadingTemplates(true);
      try {
        const response = await fetch('/api/templates');
        const result = await response.json();
        
        if (response.ok) {
          setTemplates(result.data);
        } else {
          console.error("Error loading templates:", result.error);
        }
      } catch (error) {
        console.error("Error loading templates:", error);
      } finally {
        setLoadingTemplates(false);
      }
    }

    loadTemplates();
  }, []);

  // Load messages when dialog opens to check WhatsApp policy
  useEffect(() => {
    async function loadMessages() {
      if (!isOpen) return;
      
      setLoadingMessages(true);
      try {
        const response = await fetch(`/api/candidates/${candidateId}/communications`);
        const result = await response.json();
        
        if (response.ok) {
          // Convert communication items to CombinedMessage format
          // Only include WhatsApp messages for policy checking
          const combinedMessages: CombinedMessage[] = result.data
            .filter((item: any) => item.type === 'whatsapp') // Only WhatsApp messages
            .map((item: any) => ({
              id: item.id,
              channel: 'whatsapp' as const,
              isIncoming: item.direction === 'inbound', // Inbound = from candidate
              timestamp: item.timestamp,
              author: item.direction === 'inbound' ? 'candidate' : 'system',
              sender: item.direction === 'inbound' ? candidateName : 'You'
            }));
          setMessages(combinedMessages);
        } else {
          console.error("Error loading messages:", result.error);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        setLoadingMessages(false);
      }
    }

    loadMessages();
  }, [isOpen, candidateId, candidateName]);

  // Check WhatsApp policy compliance
  const whatsappPolicy = useMemo(() => {
    return canSendWhatsAppMessage(messages);
  }, [messages]);

  // Detect template type based on content to show appropriate labels
  const getPlaceholderLabels = (content: string): { var2?: string; var3?: string; var4?: string } => {
    const placeholders = getNumberedPlaceholders(content);
    const hasVar2 = placeholders.includes(2);
    const hasVar3 = placeholders.includes(3);
    const hasVar4 = placeholders.includes(4);
    
    // Check for specific template patterns
    const isRescheduleTemplate = content.includes('reschedule') && content.includes('would') && content.includes('or') && hasVar2 && hasVar3;
    const isFollowUpTemplate = content.includes('following up') && hasVar2 && !hasVar3;
    const isInterviewReminderOld = content.includes('remind') && content.includes('interview') && hasVar2 && hasVar3 && !hasVar4;
    const isInterviewReminderNew = content.includes('remind') && content.includes('interview') && content.includes('for the') && hasVar2 && hasVar3 && hasVar4;
    
    if (isRescheduleTemplate) {
      return { var2: "First Time Option (e.g., Monday 2pm)", var3: "Second Time Option (e.g., Tuesday 3pm)" };
    } else if (isFollowUpTemplate) {
      return { var2: "Recruiter Name" };
    } else if (isInterviewReminderNew) {
      return { var2: "Role Name", var3: "Interview Time", var4: "Recruiter Name" };
    } else if (isInterviewReminderOld) {
      return { var2: "Interview Time", var3: "Recruiter Name" };
    }
    
    // Default labels
    return {
      var2: hasVar2 ? "Variable 2" : undefined,
      var3: hasVar3 ? "Variable 3" : undefined,
      var4: hasVar4 ? "Variable 4" : undefined,
    };
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setTemplateId(templateId);
      setOriginalTemplateContent(template.content); // Store original template for preview
      
      // Check if template uses numbered placeholders
      if (hasNumberedPlaceholders(template.content)) {
        // For numbered placeholders, show the template as-is and let user fill variables
        setMessage(template.content);
        setRecipientName(candidateName);
        // Reset numbered placeholder fields
        setInterviewTime("");
        setRecruiterName("");
        setVariable2("");
        setVariable3("");
        setVariable4("");
        setRoleName("");
        // Reset date and time fields for reschedule template
        setDate1("");
        setTime1("");
        setDate2("");
        setTime2("");
      } else {
        // For named placeholders ({{name}}, {{my_name}}), use existing logic
        let personalizedMessage = template.content.replace(/\{\{name\}\}/g, candidateName);
        if (senderName.trim()) {
          personalizedMessage = personalizedMessage.replace(/\{\{my_name\}\}/g, senderName.trim());
        }
        setMessage(personalizedMessage);
        setRecipientName(candidateName);
      }
    }
  };

  const handleSend = async () => {
    if (!channel || !message.trim()) {
      toast({
        title: "Error",
        description: "Please select a channel and enter a message",
        variant: "destructive",
      });
      return;
    }

    // Check WhatsApp policy before sending - only block normal messages, allow templates
    // Templates can be sent even when WhatsApp is restricted (business-initiated messages)
    if (channel === "whatsapp" && !whatsappPolicy.allowed && !templateId) {
      toast({
        title: "WhatsApp Policy Violation",
        description: `Cannot send WhatsApp message: ${whatsappPolicy.reason}. Use a template to send business-initiated messages, or use email or SMS instead.`,
        variant: "destructive",
      });
      return;
    }

    // Validate recipient availability
    if (channel === "email" && !candidateEmail) {
      toast({
        title: "Error",
        description: "Candidate has no email address",
        variant: "destructive",
      });
      return;
    }

    if ((channel === "sms" || channel === "whatsapp") && !candidatePhone) {
      toast({
        title: "Error",
        description: "Candidate has no phone number",
        variant: "destructive",
      });
      return;
    }

    // If using a template for SMS/WhatsApp, require recipient name confirmation
    if ((channel === "sms" || channel === "whatsapp") && templateId && !recipientName.trim()) {
      toast({
        title: "Missing name",
        description: "Please verify or enter the recipient name before sending.",
        variant: "destructive",
      });
      return;
    }

    // If template contains {{my_name}} and channel is SMS/WhatsApp, require senderName
    if ((channel === "sms" || channel === "whatsapp") && templateId && /\{\{my_name\}\}/.test(message) && !senderName.trim()) {
      toast({
        title: "Missing your name",
        description: "Please enter your name to personalize the template.",
        variant: "destructive",
      });
      return;
    }

    // Validate numbered placeholders for templates ({{1}}, {{2}}, {{3}})
    if (templateId && hasNumberedPlaceholders(message)) {
      const placeholders = getNumberedPlaceholders(message);
      const labels = getPlaceholderLabels(message);
      
      // Check if {{2}} is required
      if (placeholders.includes(2)) {
        // Determine which variable to check based on template type
        const isRescheduleTemplate = message.includes('reschedule') && message.includes('would') && message.includes('or');
        const isInterviewReminderOld = message.includes('remind') && message.includes('interview') && !placeholders.includes(4);
        const isInterviewReminderNew = message.includes('remind') && message.includes('interview') && message.includes('for the') && placeholders.includes(4);
        const isFollowUpTemplate = message.includes('following up');
        
        let var2Value = "";
        if (isInterviewReminderNew) {
          // New template: {{2}} is role name
          var2Value = roleName.trim() || variable2.trim();
        } else if (isInterviewReminderOld) {
          // Old template: {{2}} is time
          var2Value = interviewTime.trim();
        } else if (isFollowUpTemplate) {
          // Follow-up template uses recruiterName for {{2}}
          var2Value = recruiterName.trim() || variable2.trim();
        } else {
          // Reschedule template or other - use variable2
          var2Value = variable2.trim();
        }
        
        if (!var2Value) {
          toast({
            title: "Missing value",
            description: `Please enter ${labels.var2 || 'variable 2'}.`,
            variant: "destructive",
          });
          return;
        }
      }
      
      // Check if {{3}} is required
      if (placeholders.includes(3)) {
        // Determine which variable to check based on template type
        const isRescheduleTemplate = message.includes('reschedule') && message.includes('would') && message.includes('or');
        const isInterviewReminderNew = message.includes('remind') && message.includes('interview') && message.includes('for the') && placeholders.includes(4);
        
        let var3Value = "";
        if (isInterviewReminderNew) {
          // New template: {{3}} is time
          var3Value = interviewTime.trim();
        } else if (isRescheduleTemplate) {
          var3Value = variable3.trim();
        } else {
          var3Value = recruiterName.trim();
        }
        
        if (!var3Value) {
          toast({
            title: "Missing value",
            description: `Please enter ${labels.var3 || 'variable 3'}.`,
            variant: "destructive",
          });
          return;
        }
      }
      
      // Check if {{4}} is required
      if (placeholders.includes(4)) {
        const var4Value = recruiterName.trim() || variable4.trim();
        if (!var4Value) {
          toast({
            title: "Missing value",
            description: `Please enter ${labels.var4 || 'variable 4'}.`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    setSending(true);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          channel === 'email'
            ? {
                channel,
                template_id: null,
                message: (templateId && originalTemplateContent ? previewMessage : message).trim(),
                subject: subject.trim() || null,
              }
            : {
                channel,
                template_id: templateId || null,
                message: message.trim(),
                variables: templateId 
                  ? hasNumberedPlaceholders(message)
                    ? (() => {
                        const vars: Record<string, string> = {};
                        const placeholders = getNumberedPlaceholders(message);
                        const isRescheduleTemplate = message.includes('reschedule') && message.includes('would') && message.includes('or');
                        const isInterviewReminderOld = message.includes('remind') && message.includes('interview') && !placeholders.includes(4);
                        const isInterviewReminderNew = message.includes('remind') && message.includes('interview') && message.includes('for the') && placeholders.includes(4);
                        const isFollowUpTemplate = message.includes('following up');
                        
                        vars["1"] = candidateName;
                        
                        // Handle {{2}} based on template type
                        if (placeholders.includes(2)) {
                          if (isInterviewReminderNew) {
                            // New template: {{2}} is role name
                            vars["2"] = roleName.trim() || variable2.trim();
                          } else if (isInterviewReminderOld) {
                            // Old template: {{2}} is time
                            const timeValue = interviewTime.trim();
                            let formattedTime = timeValue;
                            if (timeValue && timeValue.includes(':')) {
                              const [hours, minutes] = timeValue.split(':');
                              const hour24 = parseInt(hours, 10);
                              if (!isNaN(hour24)) {
                                const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                                const amPm = hour24 >= 12 ? 'PM' : 'AM';
                                formattedTime = `${hour12}:${minutes} ${amPm}`;
                              }
                            }
                            vars["2"] = formattedTime;
                          } else if (isFollowUpTemplate) {
                            vars["2"] = recruiterName.trim() || variable2.trim();
                          } else {
                            // Reschedule template or other - use variable2
                            vars["2"] = variable2.trim();
                          }
                        }
                        
                        // Handle {{3}} based on template type
                        if (placeholders.includes(3)) {
                          if (isRescheduleTemplate) {
                            vars["3"] = variable3.trim();
                          } else if (isInterviewReminderNew) {
                            // New template: {{3}} is time
                            const timeValue = interviewTime.trim();
                            let formattedTime = timeValue;
                            if (timeValue && timeValue.includes(':')) {
                              const [hours, minutes] = timeValue.split(':');
                              const hour24 = parseInt(hours, 10);
                              if (!isNaN(hour24)) {
                                const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                                const amPm = hour24 >= 12 ? 'PM' : 'AM';
                                formattedTime = `${hour12}:${minutes} ${amPm}`;
                              }
                            }
                            vars["3"] = formattedTime;
                          } else {
                            // Old interview reminder or other - use recruiter name
                            vars["3"] = recruiterName.trim();
                          }
                        }
                        
                        // Handle {{4}} with recruiter name (for new interview reminder template)
                        if (placeholders.includes(4)) {
                          vars["4"] = recruiterName.trim() || variable4.trim();
                        }
                        
                        return vars;
                      })()
                    : { name: recipientName.trim(), my_name: senderName.trim() || undefined }
                  : undefined,
              }
        ),
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Message queued for sending",
        });
        setIsOpen(false);
        setMessage("");
        setOriginalTemplateContent("");
        setSubject("");
        setTemplateId("");
        setChannel("");
        setRecipientName(candidateName);
        setSenderName("");
        setInterviewTime("");
        setRecruiterName("");
        setVariable2("");
        setVariable3("");
        setVariable4("");
        setRoleName("");
        // Reset date and time fields for reschedule template
        setDate1("");
        setTime1("");
        setDate2("");
        setTime2("");
        onMessageSent?.();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to send message",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Send className="h-4 w-4" />;
    }
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'email':
        return 'Email';
      case 'sms':
        return 'SMS';
      case 'whatsapp':
        return 'WhatsApp';
      default:
        return 'Message';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Send className="h-4 w-4 mr-2" />
          Send Message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Send Message to {candidateName}</DialogTitle>
          <DialogDescription>
            Send an email, SMS, or WhatsApp message to this candidate
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
          {/* Channel Selection */}
          <div>
            <Label htmlFor="channel">Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger>
                <SelectValue placeholder="Select communication channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email" disabled={!candidateEmail}>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email {!candidateEmail && "(No email available)"}
                  </div>
                </SelectItem>
                <SelectItem value="sms" disabled={!candidatePhone}>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    SMS {!candidatePhone && "(No phone available)"}
                  </div>
                </SelectItem>
                <SelectItem value="whatsapp" disabled={!candidatePhone}>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp {!candidatePhone ? "(No phone available)" : !whatsappPolicy.allowed && !templateId ? " (Restricted - Use Template)" : ""}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template Selection */}
          <div>
            <Label htmlFor="template">Template (Optional)</Label>
            <Select value={templateId} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template or write custom message" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Custom Message</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recipient Name (required when using template for SMS/WhatsApp) */}
          {(templateId && (channel === 'sms' || channel === 'whatsapp')) && (
            <div>
              <Label htmlFor="recipient_name">Recipient name</Label>
              <Input
                id="recipient_name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Verify recipient name to personalize the template"
              />
            </div>
          )}

          {/* Sender Name (required when template contains {{my_name}} for SMS/WhatsApp) */}
          {(templateId && (channel === 'sms' || channel === 'whatsapp') && !hasNumberedPlaceholders(message)) && (
            <div>
              <Label htmlFor="sender_name">Your name</Label>
              <Input
                id="sender_name"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Enter your name (used for {{my_name}})"
              />
            </div>
          )}

          {/* Numbered Placeholder Fields (for templates with {{1}}, {{2}}, {{3}}) */}
          {(templateId && (channel === 'sms' || channel === 'whatsapp') && hasNumberedPlaceholders(message)) && (() => {
            const placeholders = getNumberedPlaceholders(message);
            const labels = getPlaceholderLabels(message);
            const isRescheduleTemplate = message.includes('reschedule') && message.includes('would') && message.includes('or');
            const isInterviewReminderOld = message.includes('remind') && message.includes('interview') && !placeholders.includes(4);
            const isInterviewReminderNew = message.includes('remind') && message.includes('interview') && message.includes('for the') && placeholders.includes(4);
            const isFollowUpTemplate = message.includes('following up');
            
            return (
              <>
                {/* {{2}} Field */}
                {placeholders.includes(2) && (
                  <div>
                    {isInterviewReminderNew ? (
                      <>
                        <Label htmlFor="role_name">{labels.var2 || "Role Name"}</Label>
                        <Input
                          id="role_name"
                          value={roleName}
                          onChange={(e) => setRoleName(e.target.value)}
                          placeholder="e.g., Account Manager"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter the role name</p>
                      </>
                    ) : isInterviewReminderOld ? (
                      <>
                        <Label htmlFor="interview_time">{labels.var2 || "Interview Time"}</Label>
                        <Input
                          id="interview_time"
                          type="time"
                          value={interviewTime}
                          onChange={(e) => setInterviewTime(e.target.value)}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter or select the interview time</p>
                      </>
                    ) : isFollowUpTemplate ? (
                      <>
                        <Label htmlFor="recruiter_name_var2">{labels.var2 || "Recruiter Name"}</Label>
                        <Input
                          id="recruiter_name_var2"
                          value={recruiterName}
                          onChange={(e) => setRecruiterName(e.target.value)}
                          placeholder="e.g., Karla"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter the recruiter's name</p>
                      </>
                    ) : isRescheduleTemplate ? (
                      <>
                        <Label htmlFor="date1">First Option - Date</Label>
                        <Input
                          id="date1"
                          type="date"
                          value={date1}
                          onChange={(e) => {
                            setDate1(e.target.value);
                            setTime1(""); // Reset time when date changes
                          }}
                          className="w-full"
                        />
                        {date1 && (
                          <>
                            <Label htmlFor="time1" className="mt-2">First Option - Time</Label>
                            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                              {timeSlots.map((slot) => {
                                // Convert slot format (e.g., "02:00pm") to HH:MM format for comparison
                                const slotMatch = slot.match(/(\d{1,2}):(\d{2})(am|pm)/);
                                let slot24Hour = "";
                                if (slotMatch) {
                                  let hour = parseInt(slotMatch[1]);
                                  const minute = slotMatch[2];
                                  const ampm = slotMatch[3];
                                  if (ampm === 'pm' && hour !== 12) hour += 12;
                                  if (ampm === 'am' && hour === 12) hour = 0;
                                  slot24Hour = `${String(hour).padStart(2, '0')}:${minute}`;
                                }
                                return (
                                  <Button
                                    key={slot}
                                    type="button"
                                    variant={time1 === slot24Hour ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setTime1(slot24Hour)}
                                    className="text-xs"
                                  >
                                    {slot}
                                  </Button>
                                );
                              })}
                            </div>
                          </>
                        )}
                        <p className="text-xs text-gray-500 mt-1">Select date and time for the first option</p>
                      </>
                    ) : (
                      <>
                        <Label htmlFor="variable2">{labels.var2 || "Variable 2"}</Label>
                        <Input
                          id="variable2"
                          value={variable2}
                          onChange={(e) => setVariable2(e.target.value)}
                          placeholder={labels.var2 || "Enter value for {{2}}"}
                        />
                        <p className="text-xs text-gray-500 mt-1">{labels.var2 || "Enter the value for variable 2"}</p>
                      </>
                    )}
                  </div>
                )}
                
                {/* {{3}} Field */}
                {placeholders.includes(3) && (
                  <div>
                    {isInterviewReminderNew ? (
                      <>
                        <Label htmlFor="interview_time">{labels.var3 || "Interview Time"}</Label>
                        <Input
                          id="interview_time"
                          type="time"
                          value={interviewTime}
                          onChange={(e) => setInterviewTime(e.target.value)}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter or select the interview time</p>
                      </>
                    ) : isRescheduleTemplate ? (
                      <>
                        <Label htmlFor="date2">Second Option - Date</Label>
                        <Input
                          id="date2"
                          type="date"
                          value={date2}
                          onChange={(e) => {
                            setDate2(e.target.value);
                            setTime2(""); // Reset time when date changes
                          }}
                          className="w-full"
                        />
                        {date2 && (
                          <>
                            <Label htmlFor="time2" className="mt-2">Second Option - Time</Label>
                            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                              {timeSlots.map((slot) => {
                                // Convert slot format (e.g., "02:00pm") to HH:MM format for comparison
                                const slotMatch = slot.match(/(\d{1,2}):(\d{2})(am|pm)/);
                                let slot24Hour = "";
                                if (slotMatch) {
                                  let hour = parseInt(slotMatch[1]);
                                  const minute = slotMatch[2];
                                  const ampm = slotMatch[3];
                                  if (ampm === 'pm' && hour !== 12) hour += 12;
                                  if (ampm === 'am' && hour === 12) hour = 0;
                                  slot24Hour = `${String(hour).padStart(2, '0')}:${minute}`;
                                }
                                return (
                                  <Button
                                    key={`${slot}-var3`}
                                    type="button"
                                    variant={time2 === slot24Hour ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setTime2(slot24Hour)}
                                    className="text-xs"
                                  >
                                    {slot}
                                  </Button>
                                );
                              })}
                            </div>
                          </>
                        )}
                        <p className="text-xs text-gray-500 mt-1">Select date and time for the second option</p>
                      </>
                    ) : (
                      <>
                        <Label htmlFor="recruiter_name">{labels.var3 || "Recruiter Name"}</Label>
                        <Input
                          id="recruiter_name"
                          value={recruiterName}
                          onChange={(e) => setRecruiterName(e.target.value)}
                          placeholder="e.g., Karla"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter the recruiter's name</p>
                      </>
                    )}
                  </div>
                )}
                
                {/* {{4}} Field */}
                {placeholders.includes(4) && (
                  <div>
                    <Label htmlFor="recruiter_name_var4">{labels.var4 || "Recruiter Name"}</Label>
                    <Input
                      id="recruiter_name_var4"
                      value={recruiterName}
                      onChange={(e) => setRecruiterName(e.target.value)}
                      placeholder="e.g., Karla"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter the recruiter's name</p>
                  </div>
                )}
              </>
            );
          })()}

          {/* Subject (Email only) */}
          {channel === "email" && (
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject"
              />
            </div>
          )}

          {/* WhatsApp Policy Warning - Only show for normal messages, not templates */}
          {channel === "whatsapp" && !whatsappPolicy.allowed && !templateId && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800 mb-1">
                    WhatsApp Business API Policy Restriction
                  </h3>
                  <p className="text-sm text-red-700 mb-2">
                    {whatsappPolicy.reason}
                  </p>
                  <div className="text-xs text-red-600 space-y-1">
                    <p><strong>Policy:</strong> You can only send WhatsApp messages within 24 hours of receiving a message from the candidate.</p>
                    <p><strong>Solution:</strong> Use a template to send business-initiated messages (works outside 24-hour window), or switch to Email or SMS channel.</p>
                    <p><strong>Note:</strong> Templates can be sent anytime as business-initiated messages, but normal messages require the 24-hour window.</p>
                  </div>
                  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs font-semibold text-blue-800 mb-1">WhatsApp Business Policy Guidelines:</p>
                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                      <li>24-Hour Customer Service Window (for normal messages)</li>
                      <li>Business-initiated templates can be sent anytime</li>
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
              </div>
            </div>
          )}

          {/* WhatsApp Template Info - Show when using template with restricted WhatsApp */}
          {channel === "whatsapp" && !whatsappPolicy.allowed && templateId && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-green-800 mb-1">
                    ✅ Business-Initiated Template
                  </h3>
                  <p className="text-sm text-green-700 mb-2">
                    You're using a template, which can be sent even when WhatsApp is restricted. Templates are business-initiated messages that work outside the 24-hour window.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Message Content */}
          <div>
            <Label htmlFor="message">
              Message
              {templateId && originalTemplateContent && (
                <span className="ml-2 text-xs text-gray-500 font-normal">(Preview - variables are filled in real-time)</span>
              )}
            </Label>
            <Textarea
              id="message"
              value={templateId && originalTemplateContent ? previewMessage : message}
              onChange={(e) => {
                // Only allow editing if not using a template
                if (!templateId || !originalTemplateContent) {
                  setMessage(e.target.value);
                }
              }}
              placeholder={`Enter your ${getChannelLabel(channel).toLowerCase()} message...`}
              className={`min-h-[120px] resize-none ${(templateId && originalTemplateContent) ? 'cursor-default bg-white' : ''}`}
              readOnly={!!(templateId && originalTemplateContent)}
              disabled={sending || (channel === "whatsapp" && !whatsappPolicy.allowed && !templateId)}
            />
            {templateId && originalTemplateContent && (
              <p className="text-xs text-gray-500 mt-1">
                💡 This preview shows exactly what the candidate will receive. Fill in the variables above to see the final message.
              </p>
            )}
          </div>

          {/* Recipient Info */}
          {channel && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Recipient:</strong> {
                channel === "email" 
                  ? candidateEmail 
                  : candidatePhone
              }
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSend}
            disabled={sending || !channel || !message.trim() || (channel === "whatsapp" && !whatsappPolicy.allowed && !templateId)}
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                {getChannelIcon(channel)}
                <span className="ml-2">Send {getChannelLabel(channel)}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
