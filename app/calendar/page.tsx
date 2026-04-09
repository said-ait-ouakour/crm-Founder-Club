"use client";

import { useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { MeetingDialog } from "@/components/meeting-dialog";
import { MeetingEditDialog } from "@/components/meeting-edit";
import { useAuth, useIsAdvisor, useIsRecruiter, useIsAdmin } from "@/contexts/auth-context";
import { supabase, Lead } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { OutlookConnectionStatus } from "@/components/outlook-connection-status";
import { OutlookConnectButton } from "@/components/outlook-connect-button";
import { OutlookCalendarSelector } from "@/components/outlook-calendar-selector";
import { useOutlookConnection } from "@/hooks/use-outlook-connection";
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Mail, Loader2, ExternalLink, Calendar as CalendarIcon, Tag, Video, MessageCircle, Clock, MapPin, User, FileText, CheckCircle2, ChevronDown, Maximize2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { shouldTriggerWebhook, triggerMeetingWebhook, getAdvisorIdForMeeting } from "@/lib/webhooks";
import type { OutlookEvent } from "@/lib/outlook";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  fullname?: string;
  email?: string;
}

interface Meeting {
  id: number;
  lead_id: string;
  meeting_date: string;
  meeting_note: string | null;
  advisor_id: number | null;
  leads?: { business_name: string | null; contact_first_name: string | null; contact_last_name: string | null } | null;
  users?: { fullname: string | null } | null;
}

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

// Helper function to format meeting time for display
// Since we store the time as-is (local time treated as UTC), we extract UTC components
const formatMeetingTime = (dateString: string): string => {
  const date = new Date(dateString);
  // Extract UTC hours and minutes (these represent the original local time)
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  const hours12 = utcHours % 12 || 12;
  const ampm = utcHours >= 12 ? 'PM' : 'AM';
  return `${hours12}:${String(utcMinutes).padStart(2, '0')} ${ampm}`;
};

// Extend the base Lead type with additional properties
interface ExtendedLead extends Omit<Lead, "name"> {
  name: string;
}


// @todo: refactor code organization
// @todo: refactor unknown types
export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdvisor = useIsAdvisor();
  const isRecruiter = useIsRecruiter();
  const isAdmin = useIsAdmin();
  const {
    status: outlookStatus,
    loading: outlookLoading,
    initialized: outlookInitialized,
    error: outlookError,
    refresh: refreshOutlookStatus,
    connect: connectOutlook,
    disconnect: disconnectOutlook,
    loadCalendars: loadOutlookCalendars,
    selectCalendar: selectOutlookCalendar,
  } = useOutlookConnection();
  const { toast } = useToast()
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [users, setUsers] = useState<User[]  >([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSearchingLeads, setIsSearchingLeads] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [outlookEvents, setOutlookEvents] = useState<any[]>([]);
  const [loadingOutlookEvents, setLoadingOutlookEvents] = useState(false);
  const [isAddingToOutlook, setIsAddingToOutlook] = useState(false);
  const [visibleDateRange, setVisibleDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const prevDateRangeRef = useRef<string | null>(null);
  const [selectedOutlookEvent, setSelectedOutlookEvent] = useState<OutlookEvent | null>(null);
  const [outlookCategories, setOutlookCategories] = useState<Array<{ id: string; displayName: string; color: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isUpdatingCategories, setIsUpdatingCategories] = useState(false);
  const [associatedLead, setAssociatedLead] = useState<{ id: string; name: string } | null>(null);
  const [loadingAssociatedLead, setLoadingAssociatedLead] = useState(false);
  
  // Admin advisor selection
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null>(null);
  const [advisorOptions, setAdvisorOptions] = useState<Array<{ user_id: string; fullname: string | null; email: string | null }>>([]);
  const [loadingAdvisors, setLoadingAdvisors] = useState(false);
  const [advisorCalendarNotConnected, setAdvisorCalendarNotConnected] = useState(false);
  const [eventsRefreshTrigger, setEventsRefreshTrigger] = useState(0);

  // Load users for the meeting dialog
  // @todo: optimize by caching users in context or global state
  // @todo: check re-rendering  
  useEffect(() => {
    async function loadUsers() {
      try {
        setIsLoadingUsers(true);
        // @todo: refactor to repository pattern
        const { data: usersData, error } = await supabase
          .from("users")
          .select("id, fullname, email")
          .in("role", ["advisor", "manager"]);

        if (error) throw error;
        setUsers(usersData || []);
        console.log("Loaded users:", usersData);
      } catch (error) {
        console.error("Error loading users:", error);
      } finally {
        setIsLoadingUsers(false);
      }
    }

    loadUsers();
  }, []);

  // Load advisors for admin dropdown
  useEffect(() => {
    if (!isAdmin) return;

    async function loadAdvisors() {
      try {
        setLoadingAdvisors(true);
        const { data: advisorsData, error } = await supabase
          .from("users")
          .select("user_id, fullname, email")
          .eq("role", "advisor")
          .order("fullname");

        if (error) throw error;
        
        const advisorList = (advisorsData || []).map((advisor) => ({
          user_id: advisor.user_id,
          fullname: advisor.fullname,
          email: advisor.email,
        }));
        
        setAdvisorOptions(advisorList);
        console.log("Loaded advisors for dropdown:", advisorList);
      } catch (error) {
        console.error("Error loading advisors:", error);
      } finally {
        setLoadingAdvisors(false);
      }
    }

    loadAdvisors();
  }, [isAdmin]);


  // Helper: Chunk array into batches to avoid URL length limits
  const chunkArrayForQuery = <T,>(items: T[], chunkSize: number = 100): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
  };

  // Search leads by name or email (with advisor batching support)
  const searchLeads = async (searchTerm: string): Promise<ExtendedLead[]> => {
    if (!searchTerm.trim()) return [];

    try {
      const trimmedSearch = searchTerm.trim();
      const ADVISOR_BATCHING_THRESHOLD = 100; // Same threshold as leads page
      
      // Step 1: Get advisor's assigned lead IDs if user is an advisor
      let assignedLeadIds: string[] = [];
      let useAdvisorBatching = false;
      
      if (isAdvisor && user?.id) {
        try {
          // Get the internal user ID from the user_id (UUID)
          const { data: userRecord, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("user_id", user.id)
            .single();

          if (userError) {
            console.error("Error fetching advisor user record:", userError);
            return [];
          }

          if (userRecord) {
            const internalUserId = userRecord.id;
            
            // Get all leads assigned to this advisor
            const { data: advisorLeads, error: advisorLeadsError } = await supabase
              .from("users_leads")
              .select("lead_id")
              .eq("user_id", internalUserId)
              .limit(5000); // Prevent overfetching

            if (advisorLeadsError) {
              console.error("Error fetching advisor leads:", advisorLeadsError);
              return [];
            }

            if (advisorLeads && advisorLeads.length > 0) {
              assignedLeadIds = advisorLeads
                .map(ul => ul.lead_id)
                .filter((id): id is string => id !== null && id !== undefined);
              
              useAdvisorBatching = assignedLeadIds.length > ADVISOR_BATCHING_THRESHOLD;
              
              // If advisor has no assigned leads, return empty results
              if (assignedLeadIds.length === 0) {
                return [];
              }
            } else {
              // Advisor has no assigned leads
              return [];
            }
          }
        } catch (error) {
          console.error("Error in advisor filter:", error);
          return [];
        }
      }

      // Step 2: Apply search with appropriate batching strategy
      let allMatchingLeads: any[] = [];
      
      if (useAdvisorBatching && assignedLeadIds.length > 0) {
        // PATH: BATCHING (Advisor with many assigned leads)
        console.log(`🔍 Using batching approach for search: ${assignedLeadIds.length} assigned leads`);
        
        // First, filter assigned leads by search term in batches
        const idBatches = chunkArrayForQuery(assignedLeadIds, 100);
        let filteredLeadIds: string[] = [];
        
        for (const batch of idBatches) {
          const { data: batchData, error: batchError } = await supabase
            .from("leads")
            .select("id")
            .in("id", batch)
            .or(
              `business_name.ilike.%${trimmedSearch}%,contact_first_name.ilike.%${trimmedSearch}%,contact_last_name.ilike.%${trimmedSearch}%,contact_email.ilike.%${trimmedSearch}%,company_email.ilike.%${trimmedSearch}%,business_telephone.ilike.%${trimmedSearch}%,mobile_phone.ilike.%${trimmedSearch}%`
            )
            .limit(10); // Limit per batch to keep total results manageable
          
          if (batchError) {
            console.error("Error searching batch:", batchError);
            continue;
          }
          
          if (batchData) {
            filteredLeadIds.push(...batchData.map(l => l.id));
          }
        }
        
        // Limit total results to 10
        filteredLeadIds = filteredLeadIds.slice(0, 10);
        
        if (filteredLeadIds.length === 0) {
          return [];
        }
        
        // Fetch full lead data for matching IDs
        const leadBatches = chunkArrayForQuery(filteredLeadIds, 50);
        for (const batch of leadBatches) {
          const { data: batchData, error: batchError } = await supabase
            .from("leads")
            .select("*")
            .in("id", batch);
          
          if (batchError) {
            console.error("Error fetching batch leads:", batchError);
            continue;
          }
          
          if (batchData) {
            allMatchingLeads.push(...batchData);
          }
        }
      } else if (isAdvisor && assignedLeadIds.length > 0 && assignedLeadIds.length <= ADVISOR_BATCHING_THRESHOLD) {
        // PATH: DIRECT QUERY (Advisor with few assigned leads)
        console.log(`🔍 Using direct query approach for search: ${assignedLeadIds.length} assigned leads`);
        
      const { data, error } = await supabase
        .from("leads")
        .select("*")
          .in("id", assignedLeadIds)
        .or(
            `business_name.ilike.%${trimmedSearch}%,contact_first_name.ilike.%${trimmedSearch}%,contact_last_name.ilike.%${trimmedSearch}%,contact_email.ilike.%${trimmedSearch}%,company_email.ilike.%${trimmedSearch}%,business_telephone.ilike.%${trimmedSearch}%,mobile_phone.ilike.%${trimmedSearch}%`
        )
        .limit(10);

        if (error) {
          console.error("Error searching leads:", error);
          throw error;
        }

        allMatchingLeads = data || [];
      } else {
        // PATH: DIRECT QUERY (Non-advisor or no assigned leads)
        console.log(`🔍 Using direct query approach for search (non-advisor)`);
        
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .or(
            `business_name.ilike.%${trimmedSearch}%,contact_first_name.ilike.%${trimmedSearch}%,contact_last_name.ilike.%${trimmedSearch}%,contact_email.ilike.%${trimmedSearch}%,company_email.ilike.%${trimmedSearch}%,business_telephone.ilike.%${trimmedSearch}%,mobile_phone.ilike.%${trimmedSearch}%`
          )
          .limit(10);

        if (error) {
          console.error("Error searching leads:", error);
          throw error;
        }

        allMatchingLeads = data || [];
      }

      console.log("Search results:", allMatchingLeads.length, "leads found for:", searchTerm);

      // Map the data to the ExtendedLead type
      return allMatchingLeads.map((lead) => {
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
      });
    } catch (error) {
      console.error("Error searching leads:", error);
      return [];
    }
  };

  // Fix the type issues in the meetings data
  // @todo: implement proper typing for meetings
  // @todo: check for re-rendering issues
  useEffect(() => {
    async function loadMeetingsData() {
      try {
        setLoading(true);
        
        // Determine which advisor's meetings to load
        // IMPORTANT: Each advisor has their own separate calendar
        let targetAdvisorUserId: string | undefined;
        if (isAdmin && selectedAdvisorId) {
          // Admin viewing specific advisor's calendar - show ONLY this advisor's meetings
          targetAdvisorUserId = selectedAdvisorId;
        } else if (isAdvisor && user?.id) {
          // Advisor viewing their own calendar - show ONLY their own meetings
          targetAdvisorUserId = user.id;
        }
        // If admin/recruiter and no advisor selected, show all meetings from all advisors
        
        let query = supabase
          .from("meetings")
          .select(
            `
          id,
          lead_id,
          meeting_date,
          meeting_note,
          advisor_id,
          leads (business_name, contact_first_name, contact_last_name),
          users (fullname)
        `
          )
          .order("meeting_date", { ascending: true });

        // Only filter by advisor if a specific advisor is selected
        // This ensures we show ONLY that advisor's calendar (not merged with others)
        if (targetAdvisorUserId) {
          // Fetch the actual advisor ID from the users table based on the auth user ID
          const { data: advisorData, error: advisorError } = await supabase
            .from("users")
            .select("id")
            .eq("user_id", targetAdvisorUserId)
            .single();

          if (advisorError) {
            console.error("Error fetching advisor ID:", advisorError);
            setMeetings([]);
            setLoading(false);
            return;
          }

          const realAdvisorId = advisorData ? advisorData.id : null;

          if (realAdvisorId) {
            // Filter meetings to show ONLY this advisor's calendar
            query = query.eq("advisor_id", realAdvisorId);
            console.log('Filtering meetings for advisor ID:', realAdvisorId, 'user_id:', targetAdvisorUserId);
          } else {
            // If no advisor ID is found, show no meetings
            console.log('No advisor ID found for user_id:', targetAdvisorUserId);
            setMeetings([]);
            setLoading(false);
            return;
          }
        } else {
          // No advisor filter - show all meetings (admin viewing "All Advisors")
          console.log('Loading all meetings (no advisor filter)');
        }

        const { data: meetingsData, error } = await query;

        if (error) throw error;

        // Map the data to handle nested relations correctly
        const mappedMeetings = (meetingsData || []).map((meeting: any) => ({
          ...meeting,
          leads: Array.isArray(meeting.leads) ? meeting.leads[0] : meeting.leads,
          users: Array.isArray(meeting.users) ? meeting.users[0] : meeting.users,
        }));

        setMeetings(mappedMeetings);
      } catch (error) {
        console.error("Error loading meetings:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMeetingsData();
  }, [isAdvisor, isAdmin, isRecruiter, user?.id, selectedAdvisorId]);

  // Fetch Outlook calendar events based on visible date range
  useEffect(() => {
    async function loadOutlookEvents() {
      // Determine which user's Outlook events to fetch
      // IMPORTANT: Each advisor has their own calendar, so we only fetch events for ONE advisor at a time
      // - If admin has selected a specific advisor: fetch ONLY that advisor's events
      // - If admin has NOT selected any advisor (viewing all): don't show Outlook events (each advisor has separate calendar)
      // - If advisor: fetch their own events
      
      let targetUserId: string | undefined;
      
      if (isRecruiter && user?.id) {
        // Unified demo calendar - getOutlookConnection returns same calendar for everyone
        targetUserId = user.id;
      } else if (isAdmin) {
        // For managers: fetch selected advisor's calendar when an advisor is picked, otherwise fetch manager's own calendar
        if (selectedAdvisorId) {
          targetUserId = selectedAdvisorId;
        } else {
          // No advisor selected - show manager's own connected calendar
          targetUserId = user?.id;
        }
      } else if (isAdvisor && user?.id) {
        // Advisor viewing their own calendar
        targetUserId = user.id;
      } else {
        // Non-admin, non-advisor users
        targetUserId = user?.id;
      }
      
      if (!targetUserId) {
        setOutlookEvents([]);
        return;
      }
      
      // For advisors and managers (viewing own calendar), only load if their Outlook is connected
      // Unified demo: getOutlookConnection returns same calendar for all users
      // For managers viewing an advisor's calendar, the API will handle the connection check
      const viewingOwnCalendar = isAdvisor || (isAdmin && !selectedAdvisorId)
      if (viewingOwnCalendar && (!outlookStatus?.connected || !outlookStatus?.primaryCalendarId)) {
        setOutlookEvents([]);
        return;
      }
      // Unified demo: we fetch the shared calendar via getOutlookConnection

      // If no visible date range is set yet, use current month as default
      if (!visibleDateRange) {
        return;
      }

      try {
        setLoadingOutlookEvents(true);
        // Use the visible date range from the calendar
        const startDate = new Date(visibleDateRange.start);
        const endDate = new Date(visibleDateRange.end);
        
        // Set start date to beginning of day in UTC to avoid timezone issues
        startDate.setUTCHours(0, 0, 0, 0);
        // Set end date to end of day in UTC
        endDate.setUTCHours(23, 59, 59, 999);
        
        // Add a buffer day before and after to ensure we catch all events
        const bufferStart = new Date(startDate);
        bufferStart.setUTCDate(bufferStart.getUTCDate() - 1);
        const bufferEnd = new Date(endDate);
        bufferEnd.setUTCDate(bufferEnd.getUTCDate() + 1);
        
        console.log('📅 Fetching Outlook events for advisor:', {
          start: bufferStart.toISOString(),
          end: bufferEnd.toISOString(),
          originalStart: startDate.toISOString(),
          originalEnd: endDate.toISOString(),
          targetUserId: targetUserId,
          isAdmin: isAdmin,
          selectedAdvisorId: selectedAdvisorId,
          advisorName: selectedAdvisorId ? advisorOptions.find(a => a.user_id === selectedAdvisorId)?.fullname : 'none'
        });
        
        // Build URL with advisorUserId parameter to fetch ONLY the selected advisor's calendar
        // This ensures each advisor's calendar is separate and not merged
        let eventsUrl = `/api/outlook/events?start=${bufferStart.toISOString()}&end=${bufferEnd.toISOString()}`;
        if (isAdmin && selectedAdvisorId) {
          // Admin viewing specific advisor's calendar - fetch ONLY that advisor's events
          eventsUrl += `&advisorUserId=${selectedAdvisorId}`;
          console.log('🔗 API URL with advisorUserId:', eventsUrl);
        } else {
          console.log('🔗 API URL (own calendar):', eventsUrl);
        }
        // For advisors, the API uses the logged-in user's ID automatically
        
        console.log('🌐 Making API request to:', eventsUrl);
        
        const response = await fetch(
          eventsUrl,
          { 
            credentials: 'include',
            cache: 'no-store', // Prevent caching to ensure we get fresh data for each advisor
            headers: {
              'Cache-Control': 'no-cache',
            }
          }
        );
        
        console.log('📥 API response status:', response.status, response.statusText);

        // Handle case where advisor's calendar is not connected
        if (response.status === 404) {
          const errorData = await response.json();
          if (errorData.connected === false) {
            console.log('📭 Advisor calendar not connected:', targetUserId);
            setAdvisorCalendarNotConnected(true);
            setOutlookEvents([]);
            return;
          }
        }

        if (!response.ok) {
          throw new Error('Failed to fetch Outlook events');
        }
        
        // Calendar is connected, reset the flag
        setAdvisorCalendarNotConnected(false);

        const data = await response.json();
        const fetchedEvents = data.events || [];
        
        // Log debug info from server to diagnose connection issues
        if (data.debug) {
          console.log('🔍 SERVER DEBUG INFO:', data.debug);
          
          // Alert if connection might be wrong
          if (data.debug.eventsWithAdvisorAsOrganizer === 0 && fetchedEvents.length > 0) {
            console.warn('⚠️ WARNING: No events have this advisor as organizer!');
            console.warn('This might mean the Outlook connection is pointing to a different account.');
            console.warn('Expected advisor email:', data.debug.advisorEmail);
            console.warn('All organizers are someone else (possibly wrong Outlook account connected)');
          }
        }
        
        console.log('✅ Fetched Outlook events:', {
          count: fetchedEvents.length,
          targetUserId: targetUserId,
          selectedAdvisorId: selectedAdvisorId,
          sampleOrganizers: fetchedEvents.slice(0, 3).map((e: any) => ({
            subject: e.subject,
            organizer: e.organizer?.emailAddress?.address || 'none',
            organizerName: e.organizer?.emailAddress?.name || 'none'
          }))
        });
        
        // Filter events to only include those within the visible date range
        const filteredEvents = fetchedEvents.filter((event: OutlookEvent) => {
          const eventStart = new Date(event.start.dateTime);
          const eventEnd = new Date(event.end.dateTime);
          return (
            (eventStart >= startDate && eventStart <= endDate) ||
            (eventEnd >= startDate && eventEnd <= endDate) ||
            (eventStart <= startDate && eventEnd >= endDate)
          );
        });
        
        console.log('Filtered events for visible range:', filteredEvents.length);
        setOutlookEvents(filteredEvents);
      } catch (error) {
        console.error('Error loading Outlook events:', error);
        setOutlookEvents([]);
      } finally {
        setLoadingOutlookEvents(false);
      }
    }

    // Load events when visible date range is set
    // The API will handle fetching the correct user's events based on advisorUserId parameter
    // IMPORTANT: This effect should re-run when selectedAdvisorId changes to fetch different advisor's calendar
    // Unified demo: getOutlookConnection returns same calendar for everyone
    if (visibleDateRange) {
      loadOutlookEvents();
    } else {
      setOutlookEvents([]);
    }
  }, [visibleDateRange, isAdmin, isAdvisor, isRecruiter, selectedAdvisorId, user?.id, outlookStatus, eventsRefreshTrigger]);

  // Fetch Outlook categories
  useEffect(() => {
    async function loadCategories() {
      if (!outlookStatus?.connected) {
        setOutlookCategories([]);
        return;
      }

      try {
        setLoadingCategories(true);
        const response = await fetch('/api/outlook/categories', { credentials: 'include' });

        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }

        const data = await response.json();
        setOutlookCategories(data.categories || []);
      } catch (error) {
        console.error('Error loading categories:', error);
        setOutlookCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    }

    if (outlookStatus?.connected) {
      loadCategories();
    }
  }, [outlookStatus?.connected]);

  // Map category names to colors (Outlook standard colors)
  const getCategoryColor = (categoryName: string): { bg: string; border: string; text: string } => {
    const categoryMap: Record<string, { bg: string; border: string; text: string }> = {
      'Red category': { bg: '#dc2626', border: '#991b1b', text: '#ffffff' },
      'Orange category': { bg: '#ea580c', border: '#c2410c', text: '#ffffff' },
      'Yellow category': { bg: '#ca8a04', border: '#a16207', text: '#ffffff' },
      'Green category': { bg: '#16a34a', border: '#15803d', text: '#ffffff' },
      'Teal category': { bg: '#0d9488', border: '#0f766e', text: '#ffffff' },
      'Blue category': { bg: '#2563eb', border: '#1d4ed8', text: '#ffffff' },
      'Purple category': { bg: '#9333ea', border: '#7e22ce', text: '#ffffff' },
      'Pink category': { bg: '#db2777', border: '#be185d', text: '#ffffff' },
    };

    // Try to find exact match first
    if (categoryMap[categoryName]) {
      return categoryMap[categoryName];
    }

    // Try to find by color name in category
    const category = outlookCategories.find(cat => cat.displayName === categoryName);
    if (category && category.color) {
      // Map Outlook color names to hex
      const colorMap: Record<string, string> = {
        'preset0': '#dc2626', // Red
        'preset1': '#ea580c', // Orange
        'preset2': '#ca8a04', // Yellow
        'preset3': '#16a34a', // Green
        'preset4': '#0d9488', // Teal
        'preset5': '#2563eb', // Blue
        'preset6': '#9333ea', // Purple
        'preset7': '#db2777', // Pink
      };
      const hexColor = colorMap[category.color] || '#2563eb';
      return { bg: hexColor, border: hexColor, text: '#ffffff' };
    }

    // Default blue
    return { bg: '#2563eb', border: '#1d4ed8', text: '#ffffff' };
  };

  // Get event color based on categories
  // Helper function to lighten a hex color for background (fully opaque)
  const lightenColor = (hex: string, percent: number = 85): string => {
    // Remove # if present
    const color = hex.replace('#', '');
    // Convert to RGB
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    // Lighten by blending with white
    const newR = Math.round(r + (255 - r) * (percent / 100));
    const newG = Math.round(g + (255 - g) * (percent / 100));
    const newB = Math.round(b + (255 - b) * (percent / 100));
    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  const getEventColor = (event: OutlookEvent): { bg: string; border: string; text: string } => {
    if (event.categories && event.categories.length > 0) {
      // Use the first category for color
      return getCategoryColor(event.categories[0]);
    }
    // Default blue for Outlook events
    return { bg: '#2563eb', border: '#1d4ed8', text: '#ffffff' };
  };

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
        `);

      if (error) throw error;

      if (data && data.length > 0) {
        const createdMeeting = data[0];
        const rawLeads = Array.isArray(createdMeeting.leads) ? createdMeeting.leads[0] : createdMeeting.leads;
        const rawUsers = Array.isArray(createdMeeting.users) ? createdMeeting.users[0] : createdMeeting.users;

        // Trigger webhook and wait for 200 before considering success (async, as in Make pipeline)
        const lead = rawLeads;
        const advisor = rawUsers;

        if (lead && advisor) {
          const leadName = `${lead.contact_first_name || ''} ${lead.contact_last_name || ''}`.trim() || 'Unknown';
          const leadEmail = lead.contact_email || '';
          const advisorName = advisor.fullname || 'Unknown';
          const advisorEmail = advisor.email || '';

          const meetingDate = new Date(createdMeeting.meeting_date);

          try {
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
          } catch (webhookErr) {
            // Rollback: remove meeting from DB if webhook did not respond 200
            await supabase.from("meetings").delete().eq("id", createdMeeting.id);
            throw webhookErr;
          }
        }

        // Only add to local state after webhook responded with 200
        const transformedMeeting: Meeting = {
          id: createdMeeting.id,
          lead_id: createdMeeting.lead_id,
          meeting_date: createdMeeting.meeting_date,
          meeting_note: createdMeeting.meeting_note,
          advisor_id: createdMeeting.advisor_id,
          leads: rawLeads ? {
            business_name: rawLeads.business_name || null,
            contact_first_name: rawLeads.contact_first_name || null,
            contact_last_name: rawLeads.contact_last_name || null,
          } : null,
          users: rawUsers ? {
            fullname: rawUsers.fullname || null,
          } : null,
        };
        setMeetings((prev) => [...prev, transformedMeeting as Meeting]);
        // Refresh Outlook/calendar events so new event from pipeline appears
        setEventsRefreshTrigger((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error adding meeting:", error);
      throw error; // Re-throw to handle in the dialog
    }
  };

  // Add a function to handle editing meetings
  const handleEditMeeting = async (updatedMeeting: any) => {
    try {
      // Find the current meeting to preserve lead_id
      const currentMeeting = selectedMeeting || meetings.find(m => m.id === updatedMeeting.id);
      
      // Format date preserving the local time (no timezone conversion)
      const dateString = formatDateForStorage(updatedMeeting.meeting_date);
      
      const { data, error } = await supabase
        .from("meetings")
        .update({
          advisor_id: updatedMeeting.advisor_id,
          lead_id: currentMeeting?.lead_id, // Preserve the existing lead_id
          meeting_date: dateString,
          meeting_note: updatedMeeting.meeting_note,
        })
        .eq("id", updatedMeeting.id)
        .select(`
          id,
          lead_id,
          meeting_date,
          meeting_note,
          advisor_id,
          leads (business_name, contact_first_name, contact_last_name),
          users (fullname)
        `);

      if (error) throw error;

      if (data && data.length > 0) {
        // Transform the updated meeting data to match the Meeting interface
        const updatedMeetingData = {
          ...data[0],
          leads: Array.isArray(data[0].leads) ? data[0].leads[0] : data[0].leads,
          users: Array.isArray(data[0].users) ? data[0].users[0] : data[0].users,
        };
        
        setMeetings((prev) =>
          prev.map((meeting) =>
            meeting.id === updatedMeeting.id ? updatedMeetingData : meeting
          )
        );
      }
    } catch (error) {
      console.error("Error editing meeting:", error);
      throw error; // Re-throw to handle in the dialog
    }
  };

  // Handle delete meeting - called from MeetingDetails or MeetingEditDialog
  const handleDeleteMeeting = async () => {
    if (!selectedMeeting) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from("meetings")
        .delete()
        .eq("id", selectedMeeting.id);

      if (error) throw error;

      // Remove the meeting from the local state
      setMeetings((prev) => prev.filter((meeting) => meeting.id !== selectedMeeting.id));
      
      // Close dialogs
      setIsDeleteDialogOpen(false);
      setSelectedMeeting(null);
      
      toast({
        title: "Meeting deleted",
        description: "The meeting has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting meeting:", error);
      toast({
        title: "Error",
        description: "Failed to delete the meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  // Filter and sort meetings by visible date range
  const filteredMeetings = visibleDateRange
    ? meetings.filter((meeting) => {
        const meetingDate = new Date(meeting.meeting_date);
        return meetingDate >= visibleDateRange.start && meetingDate <= visibleDateRange.end;
      })
    : meetings;

  // Sort meetings by date
  const sortedMeetings = [
    ...filteredMeetings.sort(
      (a, b) =>
        new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime()
    ),
  ];

  // Get upcoming Outlook events (future events, sorted by date)
  const now = new Date();
  const upcomingOutlookEvents = outlookEvents
    .filter((event) => {
      const eventStart = new Date(event.start.dateTime);
      return eventStart >= now && !event.isCancelled;
    })
    .sort((a, b) => {
      const dateA = new Date(a.start.dateTime);
      const dateB = new Date(b.start.dateTime);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 20); // Limit to next 20 upcoming events

  // Filter Outlook events by visible date range
  const filteredOutlookEvents = visibleDateRange
    ? outlookEvents.filter((event) => {
        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);
        return (
          (eventStart >= visibleDateRange.start && eventStart <= visibleDateRange.end) ||
          (eventEnd >= visibleDateRange.start && eventEnd <= visibleDateRange.end) ||
          (eventStart <= visibleDateRange.start && eventEnd >= visibleDateRange.end)
        );
      })
    : outlookEvents;

  // Show loading state until Outlook status is initialized
  if (!outlookInitialized || outlookLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-full px-2 py-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Meetings Calendar
        </h1>

        <div className="mb-6 grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            {/* Admin Advisor Selection Dropdown */}
            {isAdmin && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <Label htmlFor="advisor-select" className="text-sm font-medium text-gray-700 mb-2 block">
                  View Calendar For:
                </Label>
                <Select
                  value={selectedAdvisorId || "all"}
                  onValueChange={(value) => {
                    const newAdvisorId = value === "all" ? null : value;
                    console.log('IAM selection changed:', {
                      previousAdvisorId: selectedAdvisorId,
                      newAdvisorId: newAdvisorId,
                      value: value,
                      advisorName: newAdvisorId ? advisorOptions.find(a => a.user_id === newAdvisorId)?.fullname : 'All IAMs'
                    });
                    setSelectedAdvisorId(newAdvisorId);
                    // Reset Outlook events and connection status when switching advisors
                    setOutlookEvents([]);
                    setAdvisorCalendarNotConnected(false);
                    // Force reload by clearing visible date range temporarily to trigger refetch
                    const currentRange = visibleDateRange;
                    if (currentRange) {
                      setVisibleDateRange(null);
                      setTimeout(() => {
                        setVisibleDateRange(currentRange);
                      }, 100);
                    }
                  }}
                >
                  <SelectTrigger id="advisor-select" className="w-full">
                    <SelectValue placeholder={loadingAdvisors ? "Loading IAMs..." : "Select an IAM"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All IAMs (Meetings Only)</SelectItem>
                    {advisorOptions
                      .filter(advisor => advisor.user_id && advisor.user_id.trim() !== '')
                      .map((advisor) => (
                        <SelectItem key={advisor.user_id} value={advisor.user_id}>
                          {advisor.fullname || advisor.email || advisor.user_id}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {!selectedAdvisorId && (
                  <p className="text-xs text-gray-500 mt-2">
                    Showing all meetings. Select an IAM to view their individual calendar (meetings + Outlook events).
                  </p>
                )}
                {selectedAdvisorId && advisorCalendarNotConnected && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
                      <span>⚠️</span>
                      This IAM's calendar is not yet connected to CRM
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      {advisorOptions.find(a => a.user_id === selectedAdvisorId)?.fullname || 'This IAM'} needs to connect their Outlook account in Settings to display calendar events.
                    </p>
                  </div>
                )}
                {selectedAdvisorId && !advisorCalendarNotConnected && (
                  <p className="text-xs text-blue-600 mt-2">
                    Viewing calendar for: {advisorOptions.find(a => a.user_id === selectedAdvisorId)?.fullname || selectedAdvisorId}
                  </p>
                )}
              </div>
            )}
            <OutlookConnectionStatus
              status={outlookStatus}
              loading={outlookLoading}
              error={outlookError}
              onRetry={refreshOutlookStatus}
            />
            <OutlookCalendarSelector
              status={outlookStatus}
              loadCalendars={loadOutlookCalendars}
              onSelect={selectOutlookCalendar}
              disabled={outlookLoading || (!!outlookError && !outlookStatus?.connected)}
            />
          </div>
          <div className="flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div>
              <p className="font-semibold leading-tight">Outlook account</p>
              <p className="mt-1 text-sm text-gray-600">
                Connect your Outlook calendar to keep meetings in sync.
              </p>
            </div>
            <OutlookConnectButton
              status={outlookStatus}
              onConnect={connectOutlook}
              onDisconnect={disconnectOutlook}
              loading={outlookLoading}
              className="mt-4"
              disabled={!!outlookError && !outlookStatus?.connected}
            />
            {outlookError && !outlookStatus?.connected && (
              <p className="mt-3 text-xs text-amber-600">{outlookError}</p>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-lg shadow-md text-black relative">
          {/* Loading overlay for Outlook events */}
          {loadingOutlookEvents && selectedAdvisorId && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <p className="text-sm font-medium text-gray-700">
                  Loading {advisorOptions.find(a => a.user_id === selectedAdvisorId)?.fullname || 'IAM'}'s calendar...
                </p>
              </div>
            </div>
          )}
          {/* Legend */}
          <div className="flex items-center gap-4 p-4 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-600 border border-blue-800 relative">
                <svg
                  className="absolute inset-0 w-full h-full p-0.5"
                  viewBox="0 0 24 24"
                  fill="white"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="#0078D4"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <span>Microsoft 365 Outlook Events</span>
                {loadingOutlookEvents && (
                  <span className="ml-2 inline-flex items-center">
                    <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                )}
              </span>
            </div>
          </div>
          <style jsx global>{`
            /* Custom styling for FullCalendar view buttons */
            .fc-button-group {
              display: flex;
              gap: 0.25rem;
              border-radius: 0.5rem;
              overflow: hidden;
              border: 1px solid #e5e7eb;
              background: white;
            }
            
            .fc-button {
              background: white !important;
              border: none !important;
              color: #374151 !important;
              font-weight: 500 !important;
              font-size: 0.875rem !important;
              padding: 0.5rem 1rem !important;
              transition: all 0.2s ease !important;
              margin: 0 !important;
              border-radius: 0 !important;
            }
            
            .fc-button:hover {
              background: #f3f4f6 !important;
              color: #111827 !important;
            }
            
            .fc-button-active {
              background: #2563eb !important;
              color: white !important;
              font-weight: 600 !important;
            }
            
            .fc-button-active:hover {
              background: #1d4ed8 !important;
              color: white !important;
            }
            
            .fc-button:focus {
              box-shadow: none !important;
              outline: none !important;
            }
            
            /* Navigation buttons */
            .fc-prev-button,
            .fc-next-button {
              background: white !important;
              border: 1px solid #e5e7eb !important;
              color: #374151 !important;
              border-radius: 0.375rem !important;
              padding: 0.5rem 0.75rem !important;
              transition: all 0.2s ease !important;
            }
            
            .fc-prev-button:hover,
            .fc-next-button:hover {
              background: #f9fafb !important;
              border-color: #d1d5db !important;
            }
            
            .fc-today-button {
              background: white !important;
              border: 1px solid #e5e7eb !important;
              color: #374151 !important;
              border-radius: 0.375rem !important;
              padding: 0.5rem 1rem !important;
              font-weight: 500 !important;
              transition: all 0.2s ease !important;
            }
            
            .fc-today-button:hover {
              background: #f9fafb !important;
              border-color: #d1d5db !important;
            }
            
            .fc-toolbar-chunk {
              display: flex;
              gap: 0.5rem;
              align-items: center;
            }

            /* Outlook-style event cards */
            .fc-event {
              border: none !important;
              background: transparent !important;
              padding: 0 !important;
              margin: 1px 2px !important;
              cursor: pointer !important;
            }

            .fc-event-main {
              padding: 0 !important;
              cursor: pointer !important;
            }

            .fc-event-main-frame {
              height: 100% !important;
              cursor: pointer !important;
            }
            
            .fc-event:hover {
              z-index: 10 !important;
            }

            /* Time grid styling for better Outlook-like appearance */
            .fc-timegrid-slot {
              border-top: 1px solid #e5e7eb !important;
            }

            .fc-timegrid-slot-label {
              border-right: 1px solid #e5e7eb !important;
            }

            .fc-timegrid-col-events {
              margin: 0 4px !important;
            }

            /* Allow horizontal side-by-side display of concurrent events */
            .fc-timegrid-event-harness {
              position: absolute !important;
            }

            /* Ensure concurrent events are displayed side by side with proper spacing */
            .fc-timegrid-col-events .fc-event {
              margin: 2px 4px !important;
            }

            /* For day view - make columns wider to accommodate side-by-side events */
            .fc-timeGridDay-view .fc-timegrid-col {
              min-width: 100% !important;
            }

            .fc-timeGridDay-view .fc-timegrid-col-events {
              margin: 0 8px !important;
            }

            /* For week view - ensure columns are wide enough */
            .fc-timeGridWeek-view .fc-timegrid-col-events {
              margin: 0 6px !important;
            }

            /* Ensure events have proper spacing when side by side */
            .fc-timegrid-event {
              margin: 2px !important;
            }

            /* Day grid styling */
            .fc-daygrid-event {
              margin: 2px 4px !important;
            }

            /* Make weekly view wider with more space to accommodate side-by-side events */
            .fc-timeGridWeek-view .fc-timegrid-col {
              min-width: 300px !important;
              width: 300px !important;
            }

            .fc-timeGridWeek-view .fc-timegrid-col-frame {
              padding: 0 12px !important;
            }

            .fc-timeGridWeek-view .fc-scrollgrid-sync-table {
              min-width: 1800px !important;
            }

            /* More spacing between events in week view */
            .fc-timeGridWeek-view .fc-event {
              margin: 4px 6px !important;
            }

            /* Wider day columns in week view */
            .fc-timeGridWeek-view .fc-col-header-cell {
              min-width: 300px !important;
              width: 300px !important;
            }

            /* Ensure events have enough space */
            .fc-timeGridWeek-view .fc-event-main-frame {
              padding: 0 !important;
            }

            /* Make the scroll container wider for week view */
            .fc-timeGridWeek-view .fc-scroller {
              overflow-x: auto !important;
            }

            /* Better spacing in week view */
            .fc-timeGridWeek-view .fc-timegrid-col-events {
              margin: 0 6px !important;
            }

            /* Hide Sunday column completely */
            .fc-timeGridWeek-view .fc-day-sun,
            .fc-dayGridWeek-view .fc-day-sun {
              display: none !important;
            }

            /* Ensure events don't have default FullCalendar styling */
            .fc-event-title-container {
              padding: 0 !important;
            }

            .fc-event-title {
              padding: 0 !important;
            }
          `}</style>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            weekends={false}
            height="auto"
            aspectRatio={1.8}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridDay timeGridWeek dayGridMonth'
            }}
            buttonText={{
              today: 'Today',
              month: 'Month',
              week: 'Week',
              day: 'Day'
            }}
            dayMaxEvents={false}
            moreLinkClick="popover"
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            slotDuration="00:30:00"
            slotLabelInterval="01:00:00"
            allDaySlot={false}
            hiddenDays={[0]}
            firstDay={1}
            slotEventOverlap={true}
            datesSet={(dateInfo) => {
              // Update visible date range when calendar navigates
              // FullCalendar provides dates in the user's local timezone
              const start = new Date(dateInfo.start);
              const end = new Date(dateInfo.end);
              
              // Ensure we capture the full range
              start.setHours(0, 0, 0, 0);
              end.setHours(23, 59, 59, 999);
              
              // Create a unique key for this date range to prevent unnecessary updates
              const dateRangeKey = `${start.toISOString()}-${end.toISOString()}`;
              
              // Only update if the date range has actually changed
              if (prevDateRangeRef.current === dateRangeKey) {
                return; // Skip update if date range hasn't changed
              }
              
              prevDateRangeRef.current = dateRangeKey;
              
              console.log('Calendar datesSet:', {
                view: dateInfo.view.type,
                start: start.toISOString(),
                end: end.toISOString(),
                startStr: dateInfo.startStr,
                endStr: dateInfo.endStr,
              });
              
              setVisibleDateRange({
                start,
                end,
              });
            }}
            events={[
              // Outlook Events (filtered by visible date range)
              ...filteredOutlookEvents.map((event) => {
                const startTime = new Date(event.start.dateTime);
                const endTime = new Date(event.end.dateTime);
                const timeStr = `${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
                const eventColor = getEventColor(event);
                
                return {
                  id: `outlook-${event.id}`,
                  title: `${timeStr} - ${event.subject || 'No Subject'}`,
                  start: event.start.dateTime,
                  end: event.end.dateTime,
                  backgroundColor: eventColor.bg,
                  borderColor: eventColor.border,
                  textColor: eventColor.text,
                  classNames: ['outlook-event'],
                  extendedProps: {
                    source: 'outlook',
                    location: event.location?.displayName,
                    organizer: event.organizer?.emailAddress?.name,
                    webLink: event.webLink,
                    subject: event.subject,
                    categories: event.categories || [],
                    attendees: event.attendees || [],
                    onlineMeeting: event.onlineMeeting,
                    isOnlineMeeting: event.isOnlineMeeting,
                    isCancelled: event.isCancelled,
                    event: event, // Store full event for details
                  },
                };
              }),
            ]}
            dateClick={(info) => {
              // setSelectedDate(new Date(info.dateStr));
              // setIsDialogOpen(true);
            }}
            eventClick={async (info) => {
              info.jsEvent.stopPropagation();
              const eventId = info.event.id;
              
                // Handle Outlook event click - show preview dialog
              if (eventId.startsWith('outlook-')) {
                // Use the full event from extendedProps if available, otherwise find it
                const fullEvent = info.event.extendedProps?.event;
                let outlookEvent: OutlookEvent | null = null;
                
                if (fullEvent) {
                  outlookEvent = fullEvent;
                  setSelectedOutlookEvent(fullEvent);
                } else {
                  const outlookEventId = eventId.replace('outlook-', '');
                  const foundEvent = filteredOutlookEvents.find((e) => e.id === outlookEventId);
                  if (foundEvent) {
                    outlookEvent = foundEvent;
                    setSelectedOutlookEvent(foundEvent);
                  }
                }
                
                // Search for associated lead by email from attendees
                if (outlookEvent) {
                  setLoadingAssociatedLead(true);
                  setAssociatedLead(null);
                  
                  try {
                    // Get all email addresses from attendees
                    const attendeeEmails = outlookEvent.attendees
                      ?.map(attendee => attendee.emailAddress?.address)
                      .filter((email): email is string => !!email && email.trim() !== '') || [];
                    
                    // Also check organizer email
                    if (outlookEvent.organizer?.emailAddress?.address && outlookEvent.organizer.emailAddress.address.trim() !== '') {
                      attendeeEmails.push(outlookEvent.organizer.emailAddress.address);
                    }
                    
                    if (attendeeEmails.length > 0) {
                      // Search for leads matching any of these emails
                      const emailQueries = attendeeEmails.map(email => 
                        `contact_email.ilike.%${email}%,company_email.ilike.%${email}%`
                      ).join(',');
                      
                      const { data: leadsData, error: leadsError } = await supabase
                        .from("leads")
                        .select("id, business_name, contact_first_name, contact_last_name, contact_email, company_email")
                        .or(emailQueries)
                        .limit(1);
                      
                      if (!leadsError && leadsData && leadsData.length > 0) {
                        const lead = leadsData[0];
                        const businessName = lead.business_name?.trim();
                        const contactFirstName = lead.contact_first_name?.trim();
                        const contactLastName = lead.contact_last_name?.trim();
                        const contactName = `${contactFirstName || ''} ${contactLastName || ''}`.trim();
                        
                        let leadName = 'Unknown Lead';
                        if (businessName && contactName) {
                          leadName = `${businessName} (${contactName})`;
                        } else if (businessName) {
                          leadName = businessName;
                        } else if (contactName) {
                          leadName = contactName;
                        }
                        
                        setAssociatedLead({
                          id: lead.id,
                          name: leadName
                        });
                      }
                    }
                  } catch (error) {
                    console.error('Error searching for associated lead:', error);
                  } finally {
                    setLoadingAssociatedLead(false);
                  }
                }
              }
            }}
            eventContent={(eventInfo) => {
              const isOutlook = eventInfo.event.extendedProps?.source === 'outlook';
              
              // Get event details
              const event = eventInfo.event.extendedProps?.event || null;
              const subject = event?.subject || eventInfo.event.extendedProps?.subject || '';
              const location = event?.location?.displayName || eventInfo.event.extendedProps?.location || '';
              const categories = event?.categories || eventInfo.event.extendedProps?.categories || [];
              const isOnlineMeeting = event?.isOnlineMeeting || eventInfo.event.extendedProps?.isOnlineMeeting || false;
              const attendees = event?.attendees || eventInfo.event.extendedProps?.attendees || [];
              
              // Format time - handle both Date objects and ISO strings
              const startTime = eventInfo.event.start instanceof Date 
                ? eventInfo.event.start 
                : new Date(eventInfo.event.start || '');
              const endTime = eventInfo.event.end instanceof Date
                ? eventInfo.event.end
                : new Date(eventInfo.event.end || '');
              const timeStr = `${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
              
              // Get category color for border
              const eventColor = isOutlook && event 
                ? getEventColor(event as OutlookEvent) 
                : { bg: '#2563eb', border: '#1d4ed8', text: '#ffffff' };
              
              // For Outlook events, use subject if available, otherwise extract from title
              let displayTitle = subject;
              if (isOutlook) {
                if (subject) {
                  displayTitle = subject;
                } else {
              const title = eventInfo.event.title || '';
                  // Remove time prefix if present (format: "10:00 AM - Subject")
              const titleParts = title.split(' - ');
                  displayTitle = titleParts.length > 1 ? titleParts.slice(1).join(' - ') : title;
                }
              } else if (!displayTitle) {
                // Fallback to event title if no subject
                displayTitle = eventInfo.event.title || 'No Subject';
              }
              
              // Create a lighter, fully opaque version of the border color for background
              const lightBgColor = lightenColor(eventColor.bg, 90);
              
              return (
                <div 
                  className="border-l-4 rounded-sm shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col overflow-hidden"
                  style={{ 
                    borderLeftColor: eventColor.bg,
                    borderLeftWidth: '4px',
                    backgroundColor: lightBgColor, // Fully opaque lighter shade of border color
                  }}
                >
                  <div className="px-2 py-1.5 flex-1 min-h-0 flex flex-col">
                    {/* Time */}
                    <div className="text-[11px] font-semibold text-gray-700 mb-0.5 leading-tight">
                      {timeStr}
                    </div>
                    
                    {/* Title/Subject */}
                    <div className="text-[13px] font-medium text-gray-900 leading-tight mb-1 line-clamp-2 flex-shrink-0">
                      {displayTitle || 'No Subject'}
                    </div>
                    
                    {/* Location or Participants */}
                    {location && location !== 'Microsoft Teams Meeting' && (
                      <div className="text-[11px] text-gray-600 mt-0.5 truncate flex items-center gap-1">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                        <span className="truncate">{location}</span>
                      </div>
                    )}
                    
                    {/* Participants (for Outlook events) */}
                    {isOutlook && attendees.length > 0 && !location && (
                      <div className="text-[11px] text-gray-600 mt-0.5 truncate">
                        {attendees.slice(0, 2).map((attendee: any, idx: number) => (
                          <span key={idx}>
                            {attendee.emailAddress?.name || attendee.emailAddress?.address}
                            {idx < Math.min(attendees.length, 2) - 1 ? ', ' : ''}
                          </span>
                        ))}
                        {attendees.length > 2 && <span> +{attendees.length - 2}</span>}
                  </div>
                    )}
                    
                    {/* Teams Meeting Indicator */}
                    {isOnlineMeeting && (
                      <div className="flex items-center gap-1 mt-1">
                        <svg className="w-3.5 h-3.5 text-[#6264A7]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                        </svg>
                        <span className="text-[10px] text-[#6264A7] font-medium">Teams</span>
              </div>
            )}
                    
                    {/* Category Indicators */}
                    {categories.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {categories.slice(0, 2).map((cat: string, idx: number) => {
                          const catColor = getCategoryColor(cat);
                          return (
                            <div
                              key={idx}
                              className="h-2 w-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: catColor.bg }}
                              title={cat}
                            />
                          );
                        })}
                        {categories.length > 2 && (
                          <span className="text-[9px] text-gray-500">+{categories.length - 2}</span>
                        )}
                    </div>
                  )}
                  </div>
                </div>
              );
            }}
          />
        </div>
        {selectedMeeting && !isEditDialogOpen && !isDeleteDialogOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="fixed inset-0 bg-black opacity-50"></div>
            <div className="relative bg-white rounded-lg shadow-xl p-8 mx-auto z-50 transform transition-all duration-300 scale-100 w-[500px]">
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                Meeting Details
              </h3>
              <div className="mb-2">
                <span className="font-semibold">IAM:</span>{" "}
                {selectedMeeting.users?.fullname || "Unknown"}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Lead:</span>{" "}
                {selectedMeeting.leads?.business_name || `${selectedMeeting.leads?.contact_first_name || "Unknown"} ${selectedMeeting.leads?.contact_last_name || ""}`.trim()}
                {selectedMeeting.leads?.business_name && selectedMeeting.leads?.contact_first_name && (
                  <span className="text-gray-600"> ({selectedMeeting.leads.contact_first_name} {selectedMeeting.leads.contact_last_name})</span>
                )}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Date:</span>{" "}
                {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Time:</span>{" "}
                {formatMeetingTime(selectedMeeting.meeting_date)}
              </div>
              <div className="mb-4">
                <span className="font-semibold">Note:</span>{" "}
                {selectedMeeting.meeting_note || "No note"}
              </div>
              <div className="flex justify-end gap-2 flex-wrap">
                <Button onClick={() => setSelectedMeeting(null)}>Close</Button>
                {outlookStatus?.connected && outlookStatus?.primaryCalendarId && (
                  <Button
                    onClick={async () => {
                      if (!selectedMeeting) return;
                      
                      try {
                        setIsAddingToOutlook(true);
                        const meetingDate = new Date(selectedMeeting.meeting_date);
                        // Default to 1 hour duration if no end time specified
                        const endDate = new Date(meetingDate.getTime() + 60 * 60 * 1000);
                        
                        const businessName = selectedMeeting.leads?.business_name;
                        const contactFirstName = selectedMeeting.leads?.contact_first_name;
                        const contactLastName = selectedMeeting.leads?.contact_last_name;
                        const contactName = `${contactFirstName || ''} ${contactLastName || ''}`.trim();
                        
                        let leadDisplay = 'Unknown Lead';
                        if (businessName && contactName) {
                          leadDisplay = `${businessName} (${contactName})`;
                        } else if (businessName) {
                          leadDisplay = businessName;
                        } else if (contactName) {
                          leadDisplay = contactName;
                        }
                        
                        const subject = `Meeting: ${leadDisplay}`;
                        const body = `
                          <p><strong>IAM:</strong> ${selectedMeeting.users?.fullname || "Unknown"}</p>
                          <p><strong>Lead:</strong> ${leadDisplay}</p>
                          ${selectedMeeting.meeting_note ? `<p><strong>Note:</strong> ${selectedMeeting.meeting_note}</p>` : ''}
                          <p><em>Created from CRM</em></p>
                        `;
                        
                        const response = await fetch('/api/outlook/events/create', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          credentials: 'include',
                          body: JSON.stringify({
                            subject,
                            start: meetingDate.toISOString(),
                            end: endDate.toISOString(),
                            body,
                          }),
                        });
                        
                        if (!response.ok) {
                          const error = await response.json();
                          throw new Error(error.error || 'Failed to add to Outlook');
                        }
                        
                        toast({
                          title: 'Added to Outlook',
                          description: 'The meeting has been successfully added to your Outlook calendar.',
                        });
                        
                        // Refresh Outlook events to show the new event
                        if (outlookStatus?.connected && outlookStatus?.primaryCalendarId && visibleDateRange) {
                          const startDate = new Date(visibleDateRange.start);
                          const endDate = new Date(visibleDateRange.end);
                          endDate.setHours(23, 59, 59, 999);
                          
                          const eventsResponse = await fetch(
                            `/api/outlook/events?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
                            { credentials: 'include' }
                          );
                          
                          if (eventsResponse.ok) {
                            const data = await eventsResponse.json();
                            setOutlookEvents(data.events || []);
                          }
                        }
                      } catch (error) {
                        console.error('Error adding to Outlook:', error);
                        toast({
                          title: 'Error',
                          description: error instanceof Error ? error.message : 'Failed to add meeting to Outlook',
                          variant: 'destructive',
                        });
                      } finally {
                        setIsAddingToOutlook(false);
                      }
                    }}
                    disabled={isAddingToOutlook}
                    className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                  >
                    {isAddingToOutlook ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Add to Outlook
                      </>
                    )}
                  </Button>
                )}
                {!isAdvisor && (
                  <>
                    <Button
                      onClick={() => {
                        setIsEditDialogOpen(true);
                      }}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Edit Meeting
                    </Button>
                    <Button
                      onClick={() => {
                        setIsDeleteDialogOpen(true);
                      }}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <Button
          className="mt-4 w-full bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => setIsDialogOpen(true)}
        >
          Schedule Meeting
        </Button>
        <MeetingDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSave={handleAddMeeting}
          users={users.filter((u): u is User & { fullname: string; email: string } =>
            !!u.fullname && !!u.email
          ).map(u => ({ id: u.id, fullname: u.fullname!, email: u.email! }))}
          isLoadingUsers={isLoadingUsers}
          onSearchLeads={searchLeads}
          onError={(message) => {
            toast({
              title: "Meeting save failed",
              description: message,
              variant: "destructive",
            });
          }}
        />
        <MeetingEditDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            // Close Meeting Details when Edit Dialog closes
            if (!open) {
              setSelectedMeeting(null);
            }
          }}
          onEdit={handleEditMeeting}
          onDelete={selectedMeeting ? async (meetingId: number) => {
            if (meetingId === selectedMeeting.id) {
              await handleDeleteMeeting();
            }
          } : undefined}
          users={users.filter((u): u is User & { fullname: string; email: string } => 
            !!u.fullname && !!u.email
          ).map(u => ({ id: u.id, fullname: u.fullname!, email: u.email! }))}
          meeting={
            selectedMeeting
              ? {
                  id: selectedMeeting.id,
                  advisor_id: String(selectedMeeting.advisor_id || ""), // Ensure advisor_id is a string
                  meeting_date: new Date(selectedMeeting.meeting_date), // Pass the correct date
                  meeting_note: selectedMeeting.meeting_note || "",
                  leads: selectedMeeting.leads,
                }
              : {
                  id: 0, // Default values to prevent errors
                  advisor_id: "",
                  meeting_date: new Date(),
                  meeting_note: "",
                  leads: null,
                }
          }
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this meeting? This action cannot be undone.
                {selectedMeeting && (
                  <div className="mt-2 p-2 bg-gray-50 rounded">
                    <p className="font-semibold">
                      {selectedMeeting.leads?.business_name || 
                        `${selectedMeeting.leads?.contact_first_name || "Unknown"} ${selectedMeeting.leads?.contact_last_name || ""}`.trim()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(selectedMeeting.meeting_date).toLocaleDateString()} at{" "}
                      {formatMeetingTime(selectedMeeting.meeting_date)}
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteMeeting}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Outlook Event Details Dialog */}
        {selectedOutlookEvent && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ padding: "0 2vw" }} onClick={() => {
            setSelectedOutlookEvent(null);
            setAssociatedLead(null);
          }}>
            <div className="fixed inset-0 bg-black opacity-50"></div>
            <div 
              className="relative bg-white rounded-lg shadow-2xl mx-auto z-50 transform transition-all duration-300 scale-100 w-[900px] max-w-[98vw] max-h-[95vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedOutlookEvent.subject || 'No Subject'}
                </h3>
                <button
                  onClick={() => {
                    setSelectedOutlookEvent(null);
                    setAssociatedLead(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" aria-label="Close" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <line x1="6" y1="6" x2="14" y2="14" stroke="currentColor" strokeLinecap="round" />
                    <line x1="14" y1="6" x2="6" y2="14" stroke="currentColor" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {selectedOutlookEvent.isOnlineMeeting && selectedOutlookEvent.onlineMeeting?.joinUrl && (
                    <>
                      <Button
                        onClick={() => window.open(selectedOutlookEvent.onlineMeeting?.joinUrl, '_blank')}
                        className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 rounded-md px-4 py-2"
                      >
                        <Video className="h-4 w-4" />
                        Join
                      </Button>
                    </>
                  )}
                  {/* <Button
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-md px-4 py-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chat
                  </Button> */}
                </div>
                
                {/* Date & Time */}
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-900">
                    {new Date(selectedOutlookEvent.start.dateTime).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })} {new Date(selectedOutlookEvent.start.dateTime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: false
                    })} - {new Date(selectedOutlookEvent.end.dateTime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </div>
                </div>
                
                {/* Location/Link */}
                {(selectedOutlookEvent.location?.displayName || selectedOutlookEvent.onlineMeeting?.joinUrl) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      {selectedOutlookEvent.onlineMeeting?.joinUrl ? (
                        <a
                          href={selectedOutlookEvent.onlineMeeting.joinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate block max-w-md"
                        >
                          {selectedOutlookEvent.location?.displayName || selectedOutlookEvent.onlineMeeting.joinUrl}
                        </a>
                      ) : (
                        <span className="text-gray-900">{selectedOutlookEvent.location?.displayName}</span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Organizer/Inviter */}
                {selectedOutlookEvent.organizer && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-700 font-semibold text-xs">
                        {selectedOutlookEvent.organizer.emailAddress.name?.charAt(0) || selectedOutlookEvent.organizer.emailAddress.address?.charAt(0) || 'O'}
                      </span>
                  </div>
                    <div className="text-sm text-gray-900">
                      <span className="font-medium">{selectedOutlookEvent.organizer.emailAddress.name || selectedOutlookEvent.organizer.emailAddress.address}</span>
                      {selectedOutlookEvent.attendees?.find(a => a.emailAddress.address === user?.email) && (
                        <span className="text-gray-600"> invited you. You accepted.</span>
                )}
              </div>
                  </div>
                )}

                {/* Associated Lead */}
                {loadingAssociatedLead ? (
                  <div className="flex items-start gap-3">
                    <Loader2 className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0 animate-spin" />
                    <div className="text-sm text-gray-600">Searching for associated lead...</div>
                  </div>
                ) : associatedLead ? (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-900">
                      <span className="font-medium">Associated Lead: </span>
                      <a
                        href={`/leads/${associatedLead.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        {associatedLead.name}
                      </a>
                      <ExternalLink className="inline-block h-3 w-3 ml-1 text-blue-600" />
                    </div>
                  </div>
                ) : null}

                {/* Description */}
                {selectedOutlookEvent.body?.content && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-900 whitespace-pre-wrap">
                      {selectedOutlookEvent.bodyPreview || 'Event description'}
                    </div>
                  </div>
                )}

                {/* Response Status */}
                {selectedOutlookEvent.attendees?.find(a => a.emailAddress.address === user?.email) && (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-600 font-medium">Accepted</span>
                      <a href="#" className="text-sm text-green-600 hover:underline">Change</a>
                    </div>
                  </div>
                )}

                {/* Categories Section */}
                {outlookCategories.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Categories:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {outlookCategories.map((category) => {
                        const isSelected = selectedOutlookEvent.categories?.includes(category.displayName) || false;
                        const catColor = getCategoryColor(category.displayName);
                        return (
                          <div key={category.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`category-${category.id}`}
                              checked={isSelected}
                              onCheckedChange={async (checked) => {
                                const currentCategories = selectedOutlookEvent.categories || [];
                                let newCategories: string[];
                                
                                if (checked) {
                                  newCategories = [...currentCategories, category.displayName];
                                } else {
                                  newCategories = currentCategories.filter(cat => cat !== category.displayName);
                                }

                                try {
                                  setIsUpdatingCategories(true);
                                  const response = await fetch(
                                    `/api/outlook/events/${selectedOutlookEvent.id}/categories`,
                                    {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      credentials: 'include',
                                      body: JSON.stringify({ categories: newCategories }),
                                    }
                                  );

                                  if (!response.ok) {
                                    throw new Error('Failed to update categories');
                                  }

                                  setSelectedOutlookEvent({ ...selectedOutlookEvent, categories: newCategories });
                                  
                                  setOutlookEvents(prev => 
                                    prev.map(e => e.id === selectedOutlookEvent.id 
                                      ? { ...e, categories: newCategories }
                                      : e
                                    )
                                  );

                                  toast({
                                    title: 'Categories updated',
                                    description: 'Event categories have been updated successfully.',
                                  });
                                } catch (error) {
                                  console.error('Error updating categories:', error);
                                  toast({
                                    title: 'Error',
                                    description: 'Failed to update categories. Please try again.',
                                    variant: 'destructive',
                                  });
                                } finally {
                                  setIsUpdatingCategories(false);
                                }
                              }}
                              disabled={isUpdatingCategories}
                            />
                            <label
                              htmlFor={`category-${category.id}`}
                              className="flex items-center gap-2 cursor-pointer"
                  >
                              <div
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: catColor.bg }}
                              />
                              <span className="text-xs text-gray-700">{category.displayName.replace(' category', '')}</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Meetings Table */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Upcoming Meetings
          </h2>
          <div className="overflow-x-auto p-4">
            {upcomingOutlookEvents.length > 0 ? (
            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-md">
              <thead>
                <tr className="bg-gray-100">
                    <th className="py-2 px-4 border-b text-left">Subject</th>
                    <th className="py-2 px-4 border-b text-left">Date & Time</th>
                    <th className="py-2 px-4 border-b text-left">Location</th>
                    <th className="py-2 px-4 border-b text-left">Organizer</th>
                    <th className="py-2 px-4 border-b text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                  {upcomingOutlookEvents.map((event) => {
                    const startDate = new Date(event.start.dateTime);
                    const endDate = new Date(event.end.dateTime);
                    const eventColor = getEventColor(event);
                  
                  return (
                      <tr 
                        key={event.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedOutlookEvent(event)}
                      >
                        <td className="py-2 px-4 border-b">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: eventColor.bg }}
                            />
                            <span className="font-medium text-gray-900">
                              {event.subject || 'No Subject'}
                            </span>
                            {event.isOnlineMeeting && (
                              <Video className="h-4 w-4 text-[#6264A7]" />
                      )}
                          </div>
                        </td>
                      <td className="py-2 px-4 border-b">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {startDate.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-gray-600">
                              {startDate.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })} - {endDate.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </div>
                          </div>
                      </td>
                      <td className="py-2 px-4 border-b">
                          {event.location?.displayName ? (
                            <div className="flex items-center gap-1 text-sm text-gray-700">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate max-w-xs">
                                {event.location.displayName}
                              </span>
                            </div>
                          ) : event.isOnlineMeeting ? (
                            <span className="text-sm text-[#6264A7] flex items-center gap-1">
                              <Video className="h-3 w-3" />
                              Teams Meeting
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                      </td>
                      <td className="py-2 px-4 border-b">
                          <div className="text-sm text-gray-700">
                            {event.organizer?.emailAddress?.name || event.organizer?.emailAddress?.address || 'Unknown'}
                          </div>
                        </td>
                        <td className="py-2 px-4 border-b">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOutlookEvent(event);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View Details
                          </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg shadow-md p-8 text-center">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium mb-2">No upcoming meetings</p>
                <p className="text-gray-500 text-sm">
                  {outlookStatus?.connected 
                    ? "You don't have any upcoming Outlook calendar events."
                    : "Connect your Outlook calendar to see upcoming meetings."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

