"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Edit,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Home,
  Building2,
  Briefcase,
  Landmark,
  PiggyBank,
  MessageSquareText,
  Activity,
  FileText,
  Upload,
  Target,
  MessageSquare,
  ClipboardList,
  AlertCircle,
  Clock3,
  CheckCircle2,
  Info,
  FileCheck,
  FileX,
  FileSearch,
  PhoneCall,
  Users,
  MessageCircle,
  Check,
  X,
  Plus,
  Linkedin
} from "lucide-react"
import Link from "next/link"
import { leadService } from "@/lib/database"
import type { Lead as BaseLead, LeadSituation } from "@/lib/supabase"
import { formatPhoneNumber } from "@/lib/phone-utils"
import { LeadProgressDashboard } from "@/components/lead-progress-dashboard"
import { LeadPipelineTracker } from "@/components/lead-pipeline-tracker"
import { LeadPipelineStageUpdate } from "@/components/lead-pipeline-stage-update"
import { LeadCommunicationPanel } from "@/components/lead-communication-panel"
import { VAPICallSection } from "@/components/vapi-call-section"
import { CharlotteCallSummaryDialog } from "@/components/charlotte-call-summary-dialog"
import { LeadNavigation } from "@/components/lead-navigation"
import { shouldTriggerWebhook, triggerMeetingWebhook, getAdvisorIdForMeeting } from "@/lib/webhooks"
import { LeadConversationPanel } from "@/components/lead-conversation-panel"
import { OmniChatInbox } from "@/components/omnichat-inbox"
import { LeadIHTAnswers } from "@/components/lead-iht-answers"
import { MeetingDialog } from "@/components/meeting-dialog"
import { NotesDialog } from "@/components/notes-dialog"
import { LeadSurveySection } from "@/components/lead-survey-section"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Lead } from '@/lib/supabase'

// Extend the base Lead type with additional properties for the meeting dialog
interface ExtendedLead extends Omit<Lead, "name"> {
  name: string;
}
import { supabase } from "@/lib/supabase"
import { createClient } from "@/lib/supabase/client"
import { useAuth, useIsAdvisor } from "@/contexts/auth-context"
import { useTrainingStatus } from "@/hooks/use-training-status"
import { TrainingNotificationBanner } from "@/components/training-notification-banner"
import { NotificationManager } from "@/components/notification-manager"
import { toast } from "sonner"

// Helper function to format date string preserving local time (no timezone conversion)
// This ensures the time entered by the user is stored exactly as entered
const formatDateForStorage = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  // Format as ISO string but with local time values (treat as UTC to avoid conversion)
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
};

// Helper functions for notes JSON handling
// Updated to support notes with advisor info: {"datetime1":{"note":"note1","advisor":"advisor_name"},"datetime2":"note2"}
const parseNotesJson = (notesString: string, lastUpdate?: string): Array<{ datetime: string, note: string, advisor?: string }> => {
  if (!notesString) return [];
  try {
    // Handle the JSON format: {"datetime1":"note1","datetime2":"note2"} or {"datetime1":{"note":"note1","advisor":"name"},"datetime2":"note2"}
    const parsed = JSON.parse(notesString);
    return Object.entries(parsed).map(([datetime, value]) => {
      // Handle both old format (string) and new format (object with note and advisor)
      if (typeof value === 'string') {
        return { datetime, note: value };
      } else if (typeof value === 'object' && value !== null) {
        return {
          datetime,
          note: (value as any).note || '',
          advisor: (value as any).advisor
        };
      }
      return { datetime, note: String(value) };
    }).sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
  } catch {
    // Handle legacy format - convert to new format using last_update as date
    const fallbackDate = lastUpdate || new Date().toISOString();
    return notesString ? [{
      datetime: fallbackDate,
      note: notesString
    }] : [];
  }
};

const getLatestNote = (notesString: string, lastUpdate?: string): string => {
  const notes = parseNotesJson(notesString, lastUpdate);
  return notes.length > 0 ? notes[0].note : "";
};

// Helper function to format currency
const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return "N/A"
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

// Helper function to format call ended reason
const formatCallEndedReason = (reason?: string | null) => {
  if (!reason) return "No Call"

  // Format the reason to be more readable
  return reason
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Helper function to get call status color
const getCallStatusColor = (reason?: string | null) => {
  if (!reason) return 'text-gray-500'

  const successReasons = ['customer-ended-call', 'assistant-ended-call']
  const failureReasons = ['customer-busy', 'customer-did-not-answer', 'voicemail', 'silence-timed-out', 'vonage-failed-to-connect-call', 'vonage-rejected']

  if (successReasons.includes(reason)) return 'text-green-600'
  if (failureReasons.includes(reason)) return 'text-red-600'
  return 'text-gray-500'
}

// Progress options for lead status (must match leads list filter / DB current_progress values)
const LEAD_PROGRESS_OPTIONS: { value: string; label: string }[] = [
  { value: "new", label: "New" },
  { value: "Contacting", label: "Contacting" },
  { value: "Busy wants a call back", label: "Busy wants a call back" },
  { value: "Wants to book", label: "Wants to book" },
  { value: "Voicemail", label: "Voicemail" },
  { value: "Needs to be rescheduled", label: "Needs to be rescheduled" },
  { value: "Connected", label: "Connected" },
  { value: "Qualified for Demo", label: "Qualified for Demo" },
  { value: "Demo Booked", label: "Demo Booked" },
  { value: "No Demo", label: "No Demo" },
  { value: "Future Demo", label: "Future Demo" },
  { value: "Dead", label: "Dead" },
]

// Define engagement data interface
interface EngagementData {
  sms_answered: boolean | null
  whatsapp_answered: boolean | null
  email_opened: boolean | null
  call_ended_reason: string | null
  engaged: boolean
}

export default function LeadDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const isAdvisor = useIsAdvisor() // Independent Account Manager
  const { systemLookedUp, loading: trainingLoading } = useTrainingStatus()
  const [lead, setLead] = useState<Lead | null>(null)
  const [pipelineStage, setPipelineStage] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false)
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string, fullname: string, email: string, role: string }>>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [engagementData, setEngagementData] = useState<EngagementData>({
    sms_answered: null,
    whatsapp_answered: null,
    email_opened: null,
    call_ended_reason: null,
    engaged: false
  })

  // State for navigation parameters
  const [navigationParams, setNavigationParams] = useState({
    searchTerm: "",
    filters: {},
    sortConfig: { key: 'created_on', direction: 'desc' as 'asc' | 'desc' }
  })

  // Right panel channel: "all" (email/sms/whatsapp) or "linkedin"
  const channelParam = searchParams?.get("channel")
  const conversationChannel = channelParam === "linkedin" ? "linkedin" : "all"

  // LinkedIn connection status for this lead (for status card)
  const [linkedinConnection, setLinkedinConnection] = useState<{
    canSendMessage: boolean
    connectionStatus: "not_connected" | "user_not_linked" | "no_chat" | "connected"
    userLinkedInConnected: boolean
    leadHasChat: boolean
    linkedinAccountId: string | null
    leadConnectedWithUser: boolean | null
    networkDistance: string | null
    leadProfilePictureUrl: string | null
    userUnipileAccountId: string | null
  } | null>(null)
  const [linkedinConnectionLoading, setLinkedinConnectionLoading] = useState(false)

  // State for notes management
  const [showNotesDialog, setShowNotesDialog] = useState(false)
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false)
  const [newNoteText, setNewNoteText] = useState("")
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [selectedNoteForEdit, setSelectedNoteForEdit] = useState<string>("")
  const [isEditingNote, setIsEditingNote] = useState(false)

  // State for updating lead progress from the lead page
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false)

  // State for editing a note on the same page (no redirect to edit page)
  const [editingNote, setEditingNote] = useState<{ datetime: string; note: string } | null>(null)
  const [editingNoteText, setEditingNoteText] = useState("")
  const [isSavingEditNote, setIsSavingEditNote] = useState(false)

  // Memoized combined notes including CF initial call note (next_steps)
  const allNotes = useMemo(() => {
    const advisorNotesStr = lead?.lead_situation?.[0]?.advisor_notes || "";
    const notes = parseNotesJson(advisorNotesStr);

    // Inject CF Data if next_steps exists
    const nextSteps = lead?.lead_situation?.[0]?.next_steps;
    if (nextSteps && nextSteps.trim() !== "" && nextSteps !== "No next steps identified.") {
      const cfNote = {
        datetime: lead?.lead_situation?.[0]?.created_at || new Date().toISOString(),
        note: nextSteps,
        advisor: 'Charlotte Fox',
        isInitialCall: true // Flag to identify this special note
      };
      // Prepend to the notes array so it appears at the top
      return [cfNote, ...notes];
    }

    return notes;
  }, [lead?.lead_situation]);

  // Advisor name helper
  const assignedAdviserName = useMemo(() => {
    return (lead as any)?.users_leads?.[0]?.users?.fullname || 'Unassigned';
  }, [lead]);

  const fetchLeadBundle = useCallback(async (leadId: string) => {
    const rpcRes = await supabase
      .rpc("get_lead_detail_fast", {
        p_lead_id: String(leadId),
        p_viewer_user_id: user?.id ?? null,
        p_viewer_is_advisor: Boolean(isAdvisor),
      })
      .single();
    const data = rpcRes.data as any;
    const error = rpcRes.error as any;

    if (error) throw error;
    if (!data?.lead) throw new Error("Lead not found");

    const leadRow = data.lead as any;
    const situation = data.lead_situation ? [data.lead_situation as any] : [];
    
    // Explicitly fetch assignments if the RPC doesn't provide them (common in crm-PM)
    let usersLeads = data.users_leads as any[];
    if (!usersLeads) {
      const { data: fetchedLeads, error: uError } = await supabase
        .from('users_leads')
        .select(`
          id,
          user_id,
          users!fk_users_leads_users(id, fullname, email)
        `)
        .eq('lead_id', leadId);
        
      if (!uError && fetchedLeads) {
        usersLeads = fetchedLeads;
      }
    }

    const leadWithSituation: Lead = {
      ...leadRow,
      lead_situation: situation,
      users_leads: usersLeads,
    } as Lead;

    const engagement = (data.engagement ?? {}) as any;
    setLead(leadWithSituation);
    setPipelineStage(leadRow.pipeline_stage ?? 0);
    setEngagementData({
      sms_answered: engagement.sms_answered ?? null,
      whatsapp_answered: engagement.whatsapp_answered ?? null,
      email_opened: engagement.email_opened ?? null,
      call_ended_reason: engagement.call_ended_reason ?? null,
      engaged: Boolean(leadWithSituation.engaged),
    });
  }, [isAdvisor, user?.id]);

  // Load navigation parameters from session storage
  useEffect(() => {
    const loadNavigationParams = () => {
      try {
        const stored = sessionStorage.getItem('leads-page-filters')
        console.log('🔍 Raw session storage data:', stored)

        if (stored) {
          const filterData = JSON.parse(stored)
          console.log('🔍 Parsed filter data:', filterData)

          // Check if stored data is not too old (e.g., 24 hours)
          const maxAge = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
          const age = Date.now() - filterData.timestamp
          console.log('🔍 Filter data age:', age, 'ms (max age:', maxAge, 'ms)')

          if (age < maxAge) {
            const sc = filterData.sortConfig
            setNavigationParams({
              searchTerm: filterData.searchTerm || "",
              filters: filterData.filters || {},
              sortConfig:
                sc?.key && sc?.direction
                  ? { key: String(sc.key), direction: sc.direction as 'asc' | 'desc' }
                  : { key: 'created_on', direction: 'desc' as 'asc' | 'desc' }
            })
            console.log('🔍 Loaded navigation params from session:', {
              searchTerm: filterData.searchTerm,
              filters: filterData.filters,
              timestamp: filterData.timestamp,
              age: age,
              hasFilters: Object.keys(filterData.filters || {}).length > 0
            })
          } else {
            console.log('🔍 Filter data too old, using defaults')
          }
        } else {
          console.log('🔍 No session storage data found, using defaults')
        }
      } catch (error) {
        console.error('Failed to load navigation params from session storage:', error)
      }
    }

    loadNavigationParams()
  }, [])

  // Load users only when opening the meeting dialog (keeps lead navigation fast)
  useEffect(() => {
    if (!isMeetingDialogOpen) return;
    if (users.length > 0) return;
    let cancelled = false;

    async function loadUsers() {
      try {
        setIsLoadingUsers(true);
        const { data: usersData, error } = await supabase
          .from("users")
          .select("id, fullname, email, role")
          .in("role", ["advisor", "manager"]);

        if (error) throw error;
        if (cancelled) return;

        const mappedUsers = (usersData || []).map((u) => ({
          id: String((u as any).id),
          fullname: String((u as any).fullname ?? ""),
          email: String((u as any).email ?? ""),
          role: String((u as any).role ?? "advisor"),
        }));

        setUsers(mappedUsers);
      } catch (error) {
        console.error("Error loading users:", error);
      } finally {
        if (!cancelled) setIsLoadingUsers(false);
      }
    }

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [isMeetingDialogOpen, users.length]);

  useEffect(() => {
    async function loadLead() {
      try {
        setLoading(true)
        await fetchLeadBundle(params?.id as string)
      } catch (error) {
        console.error("Error loading lead:", error)
        window.location.href = "/leads"
      } finally {
        setLoading(false)
      }
    }

    if (params?.id) {
      loadLead()
    }
  }, [params?.id, fetchLeadBundle])

  // Fetch LinkedIn connection status when lead is loaded
  useEffect(() => {
    if (!lead?.id) {
      setLinkedinConnection(null)
      return
    }
    let cancelled = false
    const supabaseClient = createClient()
    setLinkedinConnectionLoading(true)
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      const token = session?.access_token;
      const isMockLead = String(lead.id).startsWith("a1000000");

      if (!token || isMockLead) {
        setLinkedinConnection(null);
        setLinkedinConnectionLoading(false);
        return;
      }

      if (linkedinConnection) return;
      fetch(`/api/leads/${lead.id}/linkedin/connection`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) {
            if (res.status === 404) {
              console.warn("User profile not found for LinkedIn connection check");
            }
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (cancelled || !data) {
            setLinkedinConnection(null)
            return
          }
          setLinkedinConnection({
            canSendMessage: data.canSendMessage ?? false,
            connectionStatus: data.connectionStatus ?? "not_connected",
            userLinkedInConnected: data.userLinkedInConnected ?? false,
            leadHasChat: data.leadHasChat ?? false,
            linkedinAccountId: data.lead?.linkedinAccountId ?? null,
            leadConnectedWithUser: data.leadConnectedWithUser ?? null,
            networkDistance: data.networkDistance ?? null,
            leadProfilePictureUrl: data.lead?.profilePictureUrl ?? null,
            userUnipileAccountId: data.userUnipileAccountId ?? null,
          })
        })
        .catch(() => setLinkedinConnection(null))
        .finally(() => {
          if (!cancelled) setLinkedinConnectionLoading(false)
        })
    })
    return () => {
      cancelled = true
    }
  }, [lead?.id])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-blue-100 text-blue-800"
      case "Qualified":
        return "bg-green-100 text-green-800"
      case "Disqualified":
        return "bg-red-100 text-red-800"
      case "Converted":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getProgressColor = (progress: string) => {
    switch (progress) {
      case "Needs Analysis":
        return "bg-yellow-100 text-yellow-800"
      case "Call":
        return "bg-blue-100 text-blue-800"
      case "Convince":
        return "bg-purple-100 text-purple-800"
      case "Qualify":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Search leads function for the meeting dialog
  const searchLeads = async (searchTerm: string): Promise<ExtendedLead[]> => {
    if (!searchTerm.trim()) return []

    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .or(
          `contact_first_name.ilike.%${searchTerm}%,contact_last_name.ilike.%${searchTerm}%,contact_email.ilike.%${searchTerm}%,business_telephone.ilike.%${searchTerm}%,business_name.ilike.%${searchTerm}%`
        )
        .limit(10)

      if (error) throw error

      // Map the data to include name field and ensure proper typing
      return (data || []).map((lead: any) => {
        const businessName = lead.business_name?.trim();
        const contactFirstName = lead.contact_first_name?.trim();
        const contactLastName = lead.contact_last_name?.trim();
        const contactName = `${contactFirstName || ''} ${contactLastName || ''}`.trim();

        let name = 'Unnamed Lead';
        if (businessName && contactName) {
          name = `${businessName} (${contactName})`;
        } else if (businessName) {
          name = businessName;
        } else if (contactName) {
          name = contactName;
        }

        return {
          ...lead,
          name,
          current_status: lead.current_status || "new",
          created_on: lead.created_on || new Date().toISOString(),
        };
      }) as ExtendedLead[]
    } catch (error) {
      console.error("Error searching leads:", error)
      return []
    }
  }

  // Handle adding a new meeting
  const handleAddMeeting = async (newMeeting: any) => {
    try {
      // Format date preserving the local time (no timezone conversion)
      const dateString = formatDateForStorage(newMeeting.meeting_date);

      // For webhook trigger users, get the advisor UUID and look up the integer ID
      let advisorId = newMeeting.advisor_id;

      if (shouldTriggerWebhook(user?.id)) {
        // Get the UUID for webhook trigger users
        const webhookAdvisorUserId = getAdvisorIdForMeeting(user?.id, newMeeting.advisor_id) as string;

        // Fetch the integer ID from users table based on user_id (UUID)
        const { data: advisorData, error: advisorError } = await supabase
          .from("users")
          .select("id")
          .eq("user_id", webhookAdvisorUserId)
          .single();

        if (advisorError || !advisorData) {
          console.error("Error fetching advisor ID:", advisorError);
          throw new Error("Could not find advisor");
        }

        advisorId = advisorData.id; // Use the integer ID for database insert
      }

      const { data, error } = await supabase
        .from("meetings")
        .insert({
          advisor_id: advisorId,
          lead_id: newMeeting.lead_id,
          meeting_date: dateString,
          meeting_note: newMeeting.meeting_note,
          created_by: user?.id,
        })
        .select(`
          id,
          lead_id,
          meeting_date,
          meeting_note,
          advisor_id,
          leads (business_name, contact_first_name, contact_last_name, contact_email),
          users (fullname, email)
        `)

      if (error) throw error

      // Show success message
      if (data && data.length > 0) {
        const createdMeeting = data[0];
        console.log("Meeting scheduled successfully:", createdMeeting);

        // Trigger webhook if user is in the trigger list
        if (shouldTriggerWebhook(user?.id)) {
          try {
            // Get lead and advisor data from raw data
            const lead = Array.isArray(createdMeeting.leads)
              ? createdMeeting.leads[0]
              : createdMeeting.leads;
            const advisor = Array.isArray(createdMeeting.users)
              ? createdMeeting.users[0]
              : createdMeeting.users;

            if (lead && advisor) {
              const leadName = `${lead.contact_first_name || ''} ${lead.contact_last_name || ''}`.trim() || 'Unknown';
              const leadEmail = lead.contact_email || '';
              const advisorName = advisor.fullname || 'Unknown';
              const advisorEmail = advisor.email || '';

              // Format meeting date as ISO string with timezone
              const meetingDate = new Date(createdMeeting.meeting_date);

              await triggerMeetingWebhook({
                meeting_id: createdMeeting.id,
                lead_id: createdMeeting.lead_id,
                meeting: {
                  date: meetingDate.toISOString(),
                },
                lead: {
                  name: leadName,
                  email: leadEmail,
                },
                name: leadName,
                email: leadEmail,
                advisor: {
                  name: advisorName,
                  email: advisorEmail,
                },
              });

              console.log('[Webhook] Meeting webhook triggered successfully');
            }
          } catch (webhookError) {
            // Log webhook errors for debugging but don't break the meeting creation
            console.error('[Webhook] Meeting webhook failed:', webhookError);
          }
        }

        // Show success toast
        toast.success("Meeting scheduled successfully");
      }
    } catch (error) {
      console.error("Error adding meeting:", error)
      toast.error("Failed to schedule meeting");
      throw error // Re-throw to handle in the dialog
    }
  }

  // Handle notes operations
  const handleAddNote = () => {
    setNewNoteText("")
    setShowAddNoteDialog(true)
  }

  const handleSaveNote = async () => {
    if (!newNoteText.trim()) {
      toast.error("Note cannot be empty");
      return;
    }

    if (!lead) {
      toast.error("Lead not found");
      return;
    }

    setIsSavingNote(true);
    try {
      const currentDateTime = new Date().toISOString();

      // Get existing notes (maybeSingle = 0 or 1 row, no PGRST116 when 0 rows)
      const { data: situationData, error: fetchError } = await supabase
        .from("lead_situation")
        .select("advisor_notes")
        .eq("lead_id", lead.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      // Parse existing notes
      const advisorNotes = situationData?.advisor_notes;
      const existingNotes = parseNotesJson(typeof advisorNotes === 'string' ? advisorNotes : "");

      // Add new note to existing notes
      const updatedNotes = [
        { datetime: currentDateTime, note: newNoteText.trim() },
        ...existingNotes
      ];

      const updatedNotesJson = JSON.stringify(
        updatedNotes.reduce((acc, { datetime, note }) => {
          acc[datetime] = note;
          return acc;
        }, {} as Record<string, string>)
      );

      // Check if lead_situation record exists
      if (situationData) {
        // Update existing record
        const { error: updateError } = await supabase
          .from("lead_situation")
          .update({
            advisor_notes: updatedNotesJson,
            last_update: new Date().toISOString(),
          })
          .eq("lead_id", lead.id);

        if (updateError) throw updateError;
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from("lead_situation")
          .insert({
            lead_id: lead.id,
            advisor_notes: updatedNotesJson,
            last_update: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;
      }

      toast.success("Note saved");
      setNewNoteText("");
      setShowAddNoteDialog(false);

      // Update local state so the new note appears without reload (reuse updatedNotesJson from above)
      setLead((prev) => {
        if (!prev) return null;
        const situation = prev.lead_situation?.[0] as Record<string, unknown> | undefined;
        const newSituation = situation
          ? { ...situation, advisor_notes: updatedNotesJson }
          : { advisor_notes: updatedNotesJson, lead_id: prev.id };
        return {
          ...prev,
          lead_situation: [newSituation as LeadSituation],
        };
      });
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Note not saved");
    } finally {
      setIsSavingNote(false);
    }
  }

  const handleEditNote = (noteItem: { datetime: string; note: string }) => {
    setEditingNote(noteItem)
    setEditingNoteText(noteItem.note)
  }

  const handleCancelEditNote = () => {
    setEditingNote(null)
    setEditingNoteText("")
  }

  const handleSaveEditedNote = async () => {
    if (!editingNote || !lead?.id || !editingNoteText.trim()) return
    setIsSavingEditNote(true)
    try {
      const { data: situationData, error: fetchError } = await supabase
        .from("lead_situation")
        .select("advisor_notes")
        .eq("lead_id", lead.id)
        .maybeSingle()

      if (fetchError) throw fetchError

      const existingNotes = parseNotesJson(
        typeof situationData?.advisor_notes === "string" ? situationData.advisor_notes : ""
      )
      const updatedNotes = existingNotes.map((item) =>
        item.datetime === editingNote.datetime ? { ...item, note: editingNoteText.trim() } : item
      )
      const updatedNotesJson = JSON.stringify(
        updatedNotes.reduce(
          (acc, { datetime, note }) => {
            acc[datetime] = note
            return acc
          },
          {} as Record<string, string>
        )
      )

      if (situationData) {
        const { error: updateError } = await supabase
          .from("lead_situation")
          .update({
            advisor_notes: updatedNotesJson,
            last_update: new Date().toISOString(),
          })
          .eq("lead_id", lead.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from("lead_situation")
          .insert({
            lead_id: lead.id,
            advisor_notes: updatedNotesJson,
            last_update: new Date().toISOString(),
            created_at: new Date().toISOString(),
          })
        if (insertError) throw insertError
      }

      setLead((prev) => {
        if (!prev) return null
        const situation = prev.lead_situation?.[0] as Record<string, unknown> | undefined
        const newSituation = situation
          ? { ...situation, advisor_notes: updatedNotesJson }
          : { advisor_notes: updatedNotesJson, lead_id: prev.id }
        return { ...prev, lead_situation: [newSituation as LeadSituation] }
      })
      toast.success("Note updated")
      handleCancelEditNote()
    } catch (error) {
      console.error("Error updating note:", error)
      toast.error("Note not updated")
    } finally {
      setIsSavingEditNote(false)
    }
  }

  const handleNotesUpdated = async () => {
    // Refresh lead data to show updated notes
    if (params?.id) {
      const [leadData, situationData] = await Promise.all([
        leadService.getById(params.id as string),
        leadService.getLeadSituation(params.id as string)
      ])

      const leadWithSituation: Lead = {
        ...leadData,
        lead_situation: situationData ? [situationData as unknown as LeadSituation] : []
      } as Lead

      setLead(leadWithSituation)
    }
  }

  const handleProgressChange = async (value: string) => {
    if (!lead?.id) return
    setIsUpdatingProgress(true)
    try {
      const progressValue = value === "new" ? "" : value
      const { error } = await supabase
        .from("leads")
        .update({ current_progress: progressValue })
        .eq("id", lead.id)
      if (error) throw error
      setLead((prev) => (prev ? { ...prev, current_progress: progressValue || "new" } : null))
      toast.success("Progress updated")
    } catch (err) {
      console.error("Failed to update progress:", err)
      toast.error("Failed to update progress")
    } finally {
      setIsUpdatingProgress(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading lead details...</p>
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


  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      {/* WebSocket Notification Manager for this specific lead */}
      <NotificationManager leadId={lead.id} maxNotifications={2} autoCloseDelay={10000} />

      <div className="container mx-auto px-2 py-4 space-y-4 h-full flex flex-col">
        {/* Training Notification Banner */}
        {isAdvisor && !trainingLoading && !systemLookedUp && ( // Independent Account Manager
          <TrainingNotificationBanner />
        )}

        {/* Assigned Advisor Section */}
        <div className="flex items-center gap-2 px-1 py-1">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${
            assignedAdviserName === 'Unassigned' 
              ? 'bg-gray-50 border-gray-200 text-gray-500' 
              : 'bg-blue-50 border-blue-100 text-blue-700'
          }`}>
            <User className={`h-4 w-4 ${assignedAdviserName === 'Unassigned' ? 'text-gray-400' : 'text-blue-500'}`} />
            <span className="text-xs font-semibold uppercase tracking-wider">Assigned Adviser:</span>
            <span className="text-sm font-bold">{assignedAdviserName}</span>
          </div>
        </div>

        {/* Header with back button and actions */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => window.location.href = "/leads"}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {lead.contact_first_name} {lead.contact_last_name}
                </h1>
                {lead.business_name && (
                  <p className="text-sm text-gray-600 mt-1">
                    {lead.business_name}
                  </p>
                )}
              </div>
              <Select
                value={lead.current_progress || "new"}
                onValueChange={handleProgressChange}
                disabled={isUpdatingProgress}
              >
                <SelectTrigger className="w-[200px] h-9 font-medium bg-background border-input">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_PROGRESS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(lead.current_status)}>
                  {lead.current_status}
                </Badge>
                {lead.lead_source && (
                  <Badge variant="outline">
                    {lead.lead_source}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LeadNavigation
              currentLeadId={lead.id}
              searchParams={navigationParams}
              sortConfig={navigationParams.sortConfig}
              variant="compact"
            />
            <div className="flex gap-2">
              <Button
                variant={conversationChannel === "linkedin" ? "secondary" : "outline"}
                size="sm"
                onClick={() => router.push(`/leads/${lead.id}${conversationChannel === "linkedin" ? "" : "?channel=linkedin"}`)}
              >
                <Linkedin className="h-4 w-4 mr-2" />
                LinkedIn
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMeetingDialogOpen(true)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-blue-500 bg-blue-200 text-blue-600 hover:bg-blue-700 hover:text-white"
                onClick={() => window.location.href = `/leads/${lead.id}/edit`}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Lead
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Dashboard - Commented out for B2B */}
        {/* <div className="flex items-center justify-between flex-shrink-0">
          <LeadProgressDashboard lead={lead} />
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setIsCallDialogOpen(true)}
            disabled={isAdvisor && !systemLookedUp}
            title={isAdvisor && !systemLookedUp ? "User is locked - cannot view call history" : ""} // Independent Account Manager
          >
            <PhoneCall className="h-4 w-4" />
            View Call History
          </Button>
        </div> */}

        {/* Omniflow Pipeline Tracker — stack above the row above so stage tooltips are not covered */}
        <div className="relative z-[100] flex flex-col gap-2 flex-shrink-0">
          <LeadPipelineTracker currentStage={pipelineStage} />
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-medium text-muted-foreground">Advance stage:</span>
            <LeadPipelineStageUpdate
              leadId={lead.id}
              currentStage={pipelineStage}
              onStageUpdated={(s) => setPipelineStage(s)}
            />
          </div>
        </div>

        {/* B2B Call History Button */}
        <div className="flex items-center justify-end flex-shrink-0">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setIsCallDialogOpen(true)}
            disabled={isAdvisor && !systemLookedUp}
            title={isAdvisor && !systemLookedUp ? "User is locked - cannot view call history" : ""} // Independent Account Manager
          >
            <PhoneCall className="h-4 w-4" />
            View Call History
          </Button>
        </div>
        <CharlotteCallSummaryDialog
          open={isCallDialogOpen}
          onOpenChange={setIsCallDialogOpen}
          leadId={lead.id}
        />

        {/* Meeting Dialog */}
        {lead && (
          <MeetingDialog
            open={isMeetingDialogOpen}
            onOpenChange={setIsMeetingDialogOpen}
            onSave={handleAddMeeting}
            users={users}
            isLoadingUsers={isLoadingUsers}
            onSearchLeads={searchLeads}
            preselectedLead={{
              ...lead,
              name: `${lead.contact_first_name || ""} ${lead.contact_last_name || ""}`.trim() || "Unnamed Lead"
            }}
          />
        )}

        <div className="flex gap-3 flex-1 min-h-0">
          {/* Left Column - Lead Details */}
          <div className="w-1/2 space-y-3 overflow-y-auto pr-1">
            {/* Add new note - left section only, directly above IAM Notes */}
            <Card className="flex-shrink-0">
              <CardContent className="py-3 px-4">
                <div className="flex gap-2 items-end">
                  <Textarea
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Add a note…"
                    className="min-h-[72px] resize-none flex-1"
                    disabled={isSavingNote}
                  />
                  <Button
                    onClick={handleSaveNote}
                    disabled={isSavingNote || !newNoteText.trim()}
                    className="flex-shrink-0"
                  >
                    {isSavingNote ? "Saving…" : "Save note"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* IAM Notes list */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    IAM Notes ({allNotes.length})
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allNotes.length > 0 ? (
                  <div className="space-y-4 max-h-[320px] overflow-y-auto">
                    {allNotes.map((noteItem: any, index) => (
                      <div key={index} className={`border rounded p-4 ${noteItem.isInitialCall ? 'bg-indigo-50/50 border-indigo-100 border-l-4 border-l-indigo-500' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div className="text-sm font-medium text-gray-700">
                            {new Date(noteItem.datetime).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}{" "}
                            at{" "}
                            {new Date(noteItem.datetime).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {noteItem.advisor && (
                              <span className="text-xs text-gray-500 ml-2 inline-flex items-center gap-1">
                                {noteItem.isInitialCall && <PhoneCall className="h-3 w-3" />}
                                by {noteItem.advisor}
                              </span>
                            )}
                            {noteItem.isInitialCall && (
                              <Badge variant="outline" className="ml-2 bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-100">Manager/Initial Note</Badge>
                            )}
                          </div>
                          {!noteItem.isInitialCall && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditNote(noteItem)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{noteItem.note}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No notes yet. Use the box above to add one.</p>
                )}
              </CardContent>
            </Card>

            <LeadCommunicationPanel lead={lead} trainingCompleted={systemLookedUp} />

            {/* Business Information - Replaced IHT Assessment for B2B */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  {lead.business_name && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Business Name</label>
                      <p className="font-medium">{lead.business_name}</p>
                    </div>
                  )}

                  {lead.industry && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Industry</label>
                      <p className="font-medium">{lead.industry}</p>
                    </div>
                  )}

                  {lead.company_size && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Company Size</label>
                      <p className="font-medium">{lead.company_size}</p>
                    </div>
                  )}

                  {lead.annual_revenue && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Annual Revenue</label>
                      <p className="font-medium">{formatCurrency(lead.annual_revenue)}</p>
                    </div>
                  )}

                  {lead.website && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Website</label>
                      <p className="font-medium">
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {lead.website}
                        </a>
                      </p>
                    </div>
                  )}

                  {lead.sic_07_code && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">SIC Code</label>
                      <p className="font-medium">{lead.sic_07_code} - {lead.sic_07_description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Survey Information */}
            <LeadSurveySection
              leadId={lead.id}
            />

            {/* Contact Person Information - Updated for B2B */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Contact Person Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Full Name</label>
                    <p className="font-medium">
                      {lead.contact_title} {lead.contact_first_name} {lead.contact_last_name}
                    </p>
                  </div>

                  {lead.contact_position && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Position</label>
                      <p className="font-medium">{lead.contact_position}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {lead.contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{lead.contact_email}</span>
                        {lead.verified_email && (
                          <Badge variant="outline" className="text-xs">
                            Verified
                          </Badge>
                        )}
                      </div>
                    )}

                    {lead.business_telephone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{formatPhoneNumber(lead.business_telephone)}</span>
                        {lead.verified_phone && (
                          <Badge variant="outline" className="text-xs">
                            Verified
                          </Badge>
                        )}
                      </div>
                    )}

                    {lead.mobile_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{formatPhoneNumber(lead.mobile_phone)} (Mobile)</span>
                      </div>
                    )}

                    {lead.other_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{formatPhoneNumber(lead.other_phone)} (Other)</span>
                      </div>
                    )}

                    {lead.date_of_birth && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">DOB: {new Date(lead.date_of_birth).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* LinkedIn status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                  LinkedIn
                </CardTitle>
                <CardDescription className="text-xs">
                  Account and connection status for messaging
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {linkedinConnectionLoading ? (
                  <p className="text-sm text-muted-foreground">Checking…</p>
                ) : (
                  <>
                    {linkedinConnection?.leadProfilePictureUrl && (
                      <div className="flex items-center gap-3 pb-2 border-b">
                        {linkedinConnection.leadProfilePictureUrl.startsWith("https://media.licdn.com") ? (
                          <div className="relative h-12 w-12 flex-shrink-0 rounded-full overflow-hidden bg-[#0A66C2]/10">
                            <Image
                              src={linkedinConnection.leadProfilePictureUrl}
                              alt="LinkedIn profile"
                              fill
                              className="object-cover"
                              sizes="48px"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={linkedinConnection.leadProfilePictureUrl} alt="LinkedIn profile" className="object-cover" referrerPolicy="no-referrer" />
                            <AvatarFallback className="bg-[#0A66C2]/10 text-[#0A66C2]">
                              <Linkedin className="h-6 w-6" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span className="text-xs text-muted-foreground">Profile photo from LinkedIn</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Account in database</span>
                      <Badge variant={(lead as any)?.linkedin_account_id || linkedinConnection?.linkedinAccountId ? "default" : "secondary"}>
                        {(lead as any)?.linkedin_account_id || linkedinConnection?.linkedinAccountId ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Connected with your LinkedIn</span>
                      {linkedinConnection ? (
                        linkedinConnection.leadConnectedWithUser === true ? (
                          <Badge className="bg-green-100 text-green-800">
                            Yes (1st degree)
                          </Badge>
                        ) : linkedinConnection.leadConnectedWithUser === false ? (
                          <div className="text-right">
                            <Badge variant="secondary">No</Badge>
                            {linkedinConnection.userLinkedInConnected &&
                              linkedinConnection.linkedinAccountId && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Invitation may be pending
                                </p>
                              )}
                          </div>
                        ) : !linkedinConnection.userLinkedInConnected || !linkedinConnection.linkedinAccountId ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <Badge variant="secondary">Unknown</Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Can send messages</span>
                      {linkedinConnection ? (
                        linkedinConnection.canSendMessage ? (
                          <Badge className="bg-green-100 text-green-800">Yes</Badge>
                        ) : !linkedinConnection.userLinkedInConnected ? (
                          <Badge variant="secondary">You: not connected</Badge>
                        ) : !linkedinConnection.linkedinAccountId ? (
                          <Badge variant="secondary">Lead: no account</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    {!linkedinConnection?.userLinkedInConnected && (
                      <p className="text-xs text-amber-600">
                        Connect your LinkedIn in Profile to send messages.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Business Address Information - Replaced Property Information for B2B */}
            {(lead.business_address_1 || lead.business_town || lead.business_post_code) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    Business Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {lead.business_address_1 && (
                    <div>
                      <span className="text-sm text-gray-500">Address Line 1</span>
                      <p className="font-medium text-sm">{lead.business_address_1}</p>
                    </div>
                  )}
                  {lead.business_address_2 && (
                    <div>
                      <span className="text-sm text-gray-500">Address Line 2</span>
                      <p className="font-medium text-sm">{lead.business_address_2}</p>
                    </div>
                  )}
                  {lead.business_locality && (
                    <div>
                      <span className="text-sm text-gray-500">Locality</span>
                      <p className="font-medium text-sm">{lead.business_locality}</p>
                    </div>
                  )}
                  {lead.business_town && (
                    <div>
                      <span className="text-sm text-gray-500">Town</span>
                      <p className="font-medium text-sm">{lead.business_town}</p>
                    </div>
                  )}
                  {lead.business_county && (
                    <div>
                      <span className="text-sm text-gray-500">County</span>
                      <p className="font-medium text-sm">{lead.business_county}</p>
                    </div>
                  )}
                  {lead.business_post_code && (
                    <div>
                      <span className="text-sm text-gray-500">Post Code</span>
                      <p className="font-medium text-sm">{lead.business_post_code}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* B2B Goals & Budget Information - Replaced Financial Information */}
            {(lead.goals || lead.budget || lead.budget_frequency || lead.goal_term) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4" />
                    Goals & Budget
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {lead.goals && (
                    <div>
                      <span className="text-sm text-gray-500">Goals</span>
                      <p className="font-medium text-sm">{lead.goals}</p>
                    </div>
                  )}
                  {lead.budget !== undefined && lead.budget !== null && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Budget</span>
                      <span className="font-medium text-sm">{formatCurrency(lead.budget)}</span>
                    </div>
                  )}
                  {lead.budget_frequency && (
                    <div>
                      <span className="text-sm text-gray-500">Budget Frequency</span>
                      <p className="font-medium text-sm">{lead.budget_frequency}</p>
                    </div>
                  )}
                  {lead.goal_term && (
                    <div>
                      <span className="text-sm text-gray-500">Goal Term</span>
                      <p className="font-medium text-sm">{lead.goal_term}</p>
                    </div>
                  )}
                  {lead.goal_year && (
                    <div>
                      <span className="text-sm text-gray-500">Goal Year</span>
                      <p className="font-medium text-sm">{lead.goal_year}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* B2B Compliance & Communication Preferences */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4" />
                  Compliance & Communication Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Compliance</h4>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">TPS Checked</span>
                        <Badge variant={lead.tps_checked ? "default" : "secondary"}>
                          {lead.tps_checked ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">CTPS Checked</span>
                        <Badge variant={lead.ctps_checked ? "default" : "secondary"}>
                          {lead.ctps_checked ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Communication</h4>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Allow Email</span>
                        <Badge variant={lead.allow_email ? "default" : "secondary"}>
                          {lead.allow_email ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Allow Phone</span>
                        <Badge variant={lead.allow_phone ? "default" : "secondary"}>
                          {lead.allow_phone ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Allow Mail</span>
                        <Badge variant={lead.allow_mail ? "default" : "secondary"}>
                          {lead.allow_mail ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {lead.preferred_contact_method && (
                  <div className="pt-2 border-t">
                    <span className="text-sm text-gray-500">Preferred Contact Method</span>
                    <p className="font-medium text-sm">{lead.preferred_contact_method}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Overview Cards */}
            <div className="grid gap-3 md:grid-cols-2">
              {/* Engagement Card */}
              <Card className={`${engagementData.engaged ? 'border-green-500 bg-green-50' : ''}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className={`text-sm font-medium ${engagementData.engaged ? 'text-green-800' : ''}`}>
                    Engagement
                  </CardTitle>
                  {engagementData.engaged ? (
                    <Users className="h-4 w-4 text-green-500" />
                  ) : (
                    <Users className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className={`text-xl font-bold ${engagementData.engaged ? 'text-green-700' : 'text-gray-700'}`}>
                    {engagementData.engaged ? 'Active' : 'Inactive'}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>SMS</span>
                      <span className={`font-medium ${engagementData.sms_answered === true
                          ? 'text-green-600'
                          : engagementData.sms_answered === false
                            ? 'text-red-600'
                            : 'text-gray-500'
                        }`}>
                        {engagementData.sms_answered === true
                          ? 'Answered'
                          : engagementData.sms_answered === false
                            ? 'Not Answered'
                            : 'No Data'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>WhatsApp</span>
                      <span className={`font-medium ${engagementData.whatsapp_answered === true
                          ? 'text-green-600'
                          : engagementData.whatsapp_answered === false
                            ? 'text-red-600'
                            : 'text-gray-500'
                        }`}>
                        {engagementData.whatsapp_answered === true
                          ? 'Answered'
                          : engagementData.whatsapp_answered === false
                            ? 'Not Answered'
                            : 'No Data'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Email</span>
                      <span className={`font-medium ${engagementData.email_opened === true
                          ? 'text-green-600'
                          : engagementData.email_opened === false
                            ? 'text-red-600'
                            : 'text-gray-500'
                        }`}>
                        {engagementData.email_opened === true
                          ? 'Opened'
                          : engagementData.email_opened === false
                            ? 'Not Opened'
                            : 'No Data'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Call</span>
                      <span className={`font-medium ${getCallStatusColor(engagementData.call_ended_reason)}`}>
                        {formatCallEndedReason(engagementData.call_ended_reason)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lead Status Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lead Status</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">Progress: {LEAD_PROGRESS_OPTIONS.find(o => o.value === (lead.current_progress || "new"))?.label ?? lead.current_progress ?? "New"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Status: {lead.current_status || "—"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Sentiment Analysis Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sentiment</CardTitle>
                {lead.lead_situation?.[0]?.sentiment_analysis === 'positive' ? (
                  <div className="h-4 w-4 rounded-full bg-green-500" />
                ) : lead.lead_situation?.[0]?.sentiment_analysis === 'negative' ? (
                  <div className="h-4 w-4 rounded-full bg-red-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full bg-yellow-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold capitalize">
                  {lead.lead_situation?.[0]?.sentiment_analysis || 'Neutral'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {lead.lead_situation?.[0]?.engagement_score !== undefined && lead.lead_situation?.[0]?.engagement_score !== null
                    ? `Engagement: ${lead.lead_situation[0].engagement_score}/100`
                    : 'No engagement data'}
                </p>
              </CardContent>
            </Card>

          </div>

          {/* Right Column - Conversations (All channels + LinkedIn) */}
          <div className="w-1/2 h-full min-h-0 flex flex-col">
            <Tabs value={conversationChannel} className="flex-1 flex flex-col min-h-0">
              <TabsList className="flex-shrink-0 w-full justify-start gap-1 mb-2">
                <TabsTrigger
                  value="all"
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <MessageCircle className="h-4 w-4 mr-1.5" />
                  All channels
                </TabsTrigger>
                <TabsTrigger
                  value="linkedin"
                  onClick={() => router.push(`/leads/${lead.id}?channel=linkedin`)}
                >
                  <Linkedin className="h-4 w-4 mr-1.5 text-[#0A66C2]" />
                  LinkedIn
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="flex-1 min-h-0 mt-0">
                <LeadConversationPanel leadId={lead.id} />
              </TabsContent>
              <TabsContent value="linkedin" className="flex-1 min-h-0 mt-0">
                <OmniChatInbox
                  leadId={lead.id}
                  channel="linkedin"
                  leadName={`${lead.contact_first_name || ""} ${lead.contact_last_name || ""}`.trim() || lead.contact_email || lead.business_name || "Lead"}
                  userLinkedInConnected={linkedinConnection?.userLinkedInConnected}
                  linkedinLeadHasChat={linkedinConnection?.leadHasChat}
                  leadProfilePictureUrl={linkedinConnection?.leadProfilePictureUrl}
                  userUnipileAccountId={linkedinConnection?.userUnipileAccountId}
                  leadLinkedinAccountId={linkedinConnection?.linkedinAccountId}
                  sourceLeadCompany={lead.business_name ?? undefined}
                  linkedinInviteAccepted={
                    (lead as any)?.linkedin_invite_accepted === true ||
                    linkedinConnection?.leadConnectedWithUser === true
                  }
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Notes Dialog */}
        <NotesDialog
          isOpen={showNotesDialog}
          onClose={() => setShowNotesDialog(false)}
          leadId={lead.id}
          leadName={`${lead.contact_first_name} ${lead.contact_last_name}`}
          currentNotes={selectedNoteForEdit}
          isNewNote={!isEditingNote}
          onNotesUpdated={handleNotesUpdated}
        />

        {/* Add Note Dialog */}
        <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Note</DialogTitle>
              <DialogDescription>
                Add a new note for {lead.contact_first_name} {lead.contact_last_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Enter your note here..."
                className="min-h-[120px] resize-none"
                disabled={isSavingNote}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAddNoteDialog(false)}
                disabled={isSavingNote}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveNote}
                disabled={isSavingNote || !newNoteText.trim()}
              >
                {isSavingNote ? "Saving..." : "Save Note"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Note Dialog - edit on same page, no redirect to edit page */}
        <Dialog open={editingNote !== null} onOpenChange={(open) => !open && handleCancelEditNote()}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Note</DialogTitle>
              <DialogDescription>
                {editingNote
                  ? new Date(editingNote.datetime).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                value={editingNoteText}
                onChange={(e) => setEditingNoteText(e.target.value)}
                placeholder="Edit your note..."
                className="min-h-[120px] resize-none"
                disabled={isSavingEditNote}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelEditNote} disabled={isSavingEditNote}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveEditedNote}
                disabled={isSavingEditNote || !editingNoteText.trim()}
              >
                {isSavingEditNote ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}
