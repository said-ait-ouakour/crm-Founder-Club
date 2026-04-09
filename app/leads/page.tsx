"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useIsAdmin, useIsAdvisor } from "@/contexts/auth-context";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Eye,
  Edit,
  ArrowRight,
  ChevronDown,
  X,
  Calendar as CalendarIcon,
  ListFilter,
  Columns,
  Phone,
  Mail,
  MessageSquare,
  PhoneCall,
  Clock3,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { leadService, advisorService } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
import type { Lead, Advisor } from "@/lib/supabase";
import { formatPhoneNumber } from "@/lib/phone-utils";
import { LeadDetailsDialog } from "@/components/lead-details-dialog";
import { CallSummaryDialog } from "@/components/call-summary-dialog";
import { NotesDialog } from "@/components/notes-dialog";
import { CreateLeadCard } from "@/components/create-lead-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
// import { Mail, MessageSquare, Phone } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AssignAdvisorButton } from "@/components/assign-advisor-button";
import { Badge } from "@/components/ui/badge";
import { QueryPerformanceProvider, QueryPerformanceMonitor } from "@/components/query-performance-monitor";
import { shareLeadWithUser, unshareLeadFromUser } from "@/lib/lead-shares";

// Session storage utilities for filter persistence
const FILTER_STORAGE_KEY = 'leads-page-filters';
const NAVIGATION_STORAGE_KEY = 'lead-navigation-list';

// Helper functions for notes JSON handling
const parseNotesJson = (notesString: string, lastUpdate?: string): Array<{datetime: string, note: string}> => {
  if (!notesString) return [];
  try {
    // Handle the JSON format: {"datetime1":"note1","datetime2":"note2"}
    const parsed = JSON.parse(notesString);
    return Object.entries(parsed).map(([datetime, note]) => ({
      datetime,
      note: note as string
    })).sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
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

const chunkArray = <T,>(items: T[], chunkSize: number): T[][] => {
  if (chunkSize <= 0) {
    throw new Error("chunkSize must be greater than 0");
  }

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
};

const CALL_STATUS_BATCH_SIZE = 20;
const ADVISOR_BATCHING_THRESHOLD = 100; // Use batching if advisor has >100 assignments
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
const MAX_CACHE_ENTRIES = 30;

// Runtime validation for lead data structure (same as crm-TB)
const validateLeadWithRelations = (data: any): boolean => {
  if (!data || typeof data !== 'object') {
    return false;
  }
  if (!data.id || (typeof data.id !== 'string' && typeof data.id !== 'number')) {
    return false;
  }
  if (data.business_name !== null && data.business_name !== undefined && typeof data.business_name !== 'string') {
    return false;
  }
  if (data.contact_first_name !== null && data.contact_first_name !== undefined && typeof data.contact_first_name !== 'string') {
    return false;
  }
  if (data.contact_last_name !== null && data.contact_last_name !== undefined && typeof data.contact_last_name !== 'string') {
    return false;
  }

  // REMOVED: Email requirement - many B2B leads may not have email initially
  // if (!data.contact_email && !data.company_email) return false;

  // Check created_on - allow null/undefined as some leads may not have this
  if (data.created_on !== null && data.created_on !== undefined && typeof data.created_on !== 'string') {
    return false;
  }

  // Validate optional arrays - allow null/undefined
  if (data.calls !== null && data.calls !== undefined && !Array.isArray(data.calls)) {
    return false;
  }
  if (data.lead_situation !== null && data.lead_situation !== undefined && !Array.isArray(data.lead_situation)) {
    return false;
  }
  if (data.email_conversation !== null && data.email_conversation !== undefined && !Array.isArray(data.email_conversation)) {
    return false;
  }
  if (data.meetings !== null && data.meetings !== undefined && !Array.isArray(data.meetings)) {
    return false;
  }

  return true;
};

// Helper: Check if any filters are active (non-default values)
const areFiltersActive = (filters: any, searchTerm: string): boolean => {
  if (searchTerm && searchTerm.trim() !== '') return true;
  
  // Check all filter fields for non-default values
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined || value === '') continue;
    
    // Check if it's a default range value
    if (key === 'annual_revenue_range' && Array.isArray(value) && value[0] === 0 && value[1] === 10000000) continue;
    if (key === 'budget_range' && Array.isArray(value) && value[0] === 0 && value[1] === 10000000) continue;
    if (key === 'household_income_range' && Array.isArray(value) && value[0] === 0 && value[1] === 10000000) continue;
    if (key === 'active_duration_days_range' && Array.isArray(value) && value[0] === 0 && value[1] === 365) continue;
    if (key === 'called_by' && Array.isArray(value) && value.length === 0) continue;
    
    // Check if it's an empty date object
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const dateObj = value as { from?: Date; to?: Date };
      if (Object.keys(value).length === 0 || (dateObj.from === undefined && dateObj.to === undefined)) continue;
    }
    
    return true; // Found an active filter
  }
  
  return false;
};

// Stable stringify to ensure consistent cache keys
const stableStringify = (value: any): string => {
  const sortKeys = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortKeys);
    return Object.keys(obj)
      .sort()
      .reduce((acc: any, key: string) => {
        acc[key] = sortKeys(obj[key]);
        return acc;
      }, {} as any);
  };
  try {
    return JSON.stringify(sortKeys(value));
  } catch {
    return '';
  }
};

// Helper: Generate cache key from search parameters
const getCacheKey = (params: {
  searchParams: any;
  sortKey: string;
  sortDirection: 'asc' | 'desc';
  page: number;
  pageSize: number;
  userId?: string | null;
  isAdvisor?: boolean;
  showFavoritesOnly?: boolean;
}): string => {
      // Include guide_sent and favorites in cache key to prevent cached results when filter changes
      const cacheParams = {
        ...params,
        guide_sent_filter: params.searchParams?.filters?.guide_sent || null,
        show_favorites_only: params.showFavoritesOnly || false
      };
      return stableStringify(cacheParams);
};

// Helper: Get cached data if valid
const getCachedData = (cacheKey: string): any | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = sessionStorage.getItem(`leads-cache-${cacheKey}`);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(`leads-cache-${cacheKey}`);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
};

// Helper: Set cached data
const setCachedData = (cacheKey: string, data: any): void => {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(`leads-cache-${cacheKey}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));

    // Prune old cache entries to avoid storage bloat
    const cacheKeys: Array<{ key: string; timestamp: number }> = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('leads-cache-')) {
        try {
          const value = sessionStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            cacheKeys.push({ key, timestamp: parsed?.timestamp ?? 0 });
          }
        } catch {
          cacheKeys.push({ key, timestamp: 0 });
        }
      }
    }
    if (cacheKeys.length > MAX_CACHE_ENTRIES) {
      cacheKeys.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = cacheKeys.slice(0, cacheKeys.length - MAX_CACHE_ENTRIES);
      toRemove.forEach(({ key }) => sessionStorage.removeItem(key));
    }
  } catch {
    // ignore
  }
};

// Helper: Clear all leads cache
const clearCache = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear all leads cache entries
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('leads-cache-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch {
    // ignore
  }
};

// Helper: Chunk array into batches to avoid URL length limits
const chunkArrayForQuery = <T,>(items: T[], chunkSize: number = 100): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

const saveFiltersToSession = (
  searchTerm: string,
  filters: any,
  currentPage: number = 1,
  sortConfig?: { key: string; direction: "asc" | "desc" }
) => {
  if (typeof window !== 'undefined') {
    try {
      const filterData = {
        searchTerm,
        filters,
        currentPage,
        sortConfig: sortConfig ?? null,
        timestamp: Date.now()
      };
      sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filterData));
    } catch {
      // ignore
    }
  }
};

const loadFiltersFromSession = () => {
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(FILTER_STORAGE_KEY);
      if (stored) {
        const filterData = JSON.parse(stored);
        // Optional: Check if stored data is not too old (e.g., 24 hours)
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        if (Date.now() - filterData.timestamp < maxAge) {
          return {
            searchTerm: filterData.searchTerm || '',
            filters: filterData.filters || {},
            currentPage: filterData.currentPage || 1,
            sortConfig: filterData.sortConfig || null,
          };
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
};

const clearFiltersFromSession = () => {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(FILTER_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
};

// Helper to save the full list of IDs for the detail page navigation
const saveNavigationContext = (ids: string[]) => {
  if (typeof window !== 'undefined') {
    try {
      // Limit to 5000 IDs to prevent storage quota errors
      const idsToSave = ids.slice(0, 5000); 
      sessionStorage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify(idsToSave));
    } catch {
      // ignore
    }
  }
};

// Import types
import type { AIChatProps } from "@/components/ai-chat";
import { ESLINT_DEFAULT_DIRS } from "next/dist/lib/constants";

// Import the AIChat component with SSR disabled
const AIChat = dynamic<AIChatProps>(
  () => import("@/components/ai-chat").then((mod) => mod.AIChat),
  {
    ssr: false,
    loading: () => (
      <div className="fixed bottom-8 right-48 bg-blue-600 text-white p-4 rounded-full shadow-lg">
        Loading AI Assistant...
      </div>
    ),
  }
);

const MeetingAnalysisChat = dynamic(
  () => import("@/components/meeting-analysis-chat").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="fixed bottom-8 right-8 bg-gradient-to-br from-purple-600 to-orange-400 text-white p-4 rounded-full shadow-lg">
        Loading Meeting Analysis...
      </div>
    ),
  }
);

export default function LeadsPage() {
 const renderCount = useRef(0);
  renderCount.current = renderCount.current + 1;
  const requestIdRef = useRef(0);

  const router = useRouter();
  const { user, profile } = useAuth();
  const isAdmin = useIsAdmin();
  const isAdvisor = useIsAdvisor();

  // Check if user has access to leads page (only managers and Independent Account Managers)
  const hasAccess = isAdmin || isAdvisor;

  // State for data and loading
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false); // Add search loading state
  const [assignedLeads, setAssignedLeads] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [hasData, setHasData] = useState(false);
  const showLoadingState = isLoading || !hasData;
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [searchParams, setSearchParams] = useState({
    searchTerm: "",
    filters: {
      // Lead Management
      current_status: "",
      current_progress: "",
      lead_source: "",
      type_of_lead: "",
      customer_type: "",
      engaged: null as boolean | null,
      owner: "",
      
      // Business Information
      business_name: "",
      company_email: "",
      business_telephone: "",
      website: "",
      linkedin_company_url: "",
      industry: "",
      company_size: "",
      annual_revenue_range: [0, 10000000] as [number, number],
      sic_07_code: "",
      sic_07_description: "",
      major_sector_desc: "",
      contact_urn: "",
      
      // Business Address
      business_address_1: "",
      business_address_2: "",
      business_locality: "",
      business_town: "",
      business_county: "",
      business_post_code: "",
      
      // Contact Person
      contact_title: "",
      contact_first_name: "",
      contact_last_name: "",
      contact_position: "",
      contact_email: "",
      mobile_phone: "",
      other_phone: "",
      
      // Employee & Turnover Bands
      employees_band_desc: "",
      national_employees_band_desc: "",
      modeled_turnover_band_desc: "",
      
      // Compliance
      tps_checked: null as boolean | null,
      ctps_checked: null as boolean | null,
      verified_phone: null as boolean | null,
      verified_email: null as boolean | null,
      
      // Personal Information
      salutation: "",
      date_of_birth: { from: undefined as Date | undefined, to: undefined as Date | undefined },
      
      // Goals & Budget
      goals: "",
      budget_range: [0, 10000000] as [number, number],
      budget_frequency: "",
      goal_term: "",
      goal_year: "",
      household_income_range: [0, 10000000] as [number, number],
      
      // Communication Preferences
      preferred_contact_method: "",
      allow_email: null as boolean | null,
      allow_phone: null as boolean | null,
      allow_fax: null as boolean | null,
      allow_mail: null as boolean | null,
      allow_bulk_email: null as boolean | null,
      
      // Marketing
      marketing_materials_sent: null as boolean | null,
      added_to_marketing_list: null as boolean | null,
      campaign_name: "",
      last_campaign_date: { from: undefined as Date | undefined, to: undefined as Date | undefined },
      
      // System Fields
      created_on: { from: undefined as Date | undefined, to: undefined as Date | undefined },
      form_submitted: { from: undefined as Date | undefined, to: undefined as Date | undefined },
      active_duration_days_range: [0, 365] as [number, number],
      easy_id: "",
      easy_description: "",
      
      // Independent Account Manager Assignment
      advisor_id: "",
      visibility_scope: "all" as "all" | "assigned_to_me" | "shared_with_me" | "shared_by_me",
      share_status: "any" as "any" | "shared" | "not_shared",
      
      // Communication Status (from related tables)
      email_opened: null as boolean | null,
      sms_answered: null as boolean | null,
      whatsapp_answered: null as boolean | null,
      inbound_email: null as string | null, // "has_messages" | "has_outbound" | "no_messages" | null
      inbound_whatsapp: null as string | null, // "has_messages" | "has_outbound" | "no_messages" | null
      vapi_score: null as string | null,
      followed_up: null as boolean | null,
      not_called_yet: null as boolean | null,
      booked: null as boolean | null,
      last_called: null as boolean | null,
      has_call: null as boolean | null,
      has_notes: null as boolean | null,
      sentiment_analysis: null as string | null,
      
      // Brochure/Guide Filters
      guide_sent: "",

      // Called By Filter
      called_by: [] as string[],

      // Omniflow Pipeline Stage
      pipeline_stage: [] as number[],
    },
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalLeads, setTotalLeads] = useState(0);
  const goToPageInputRef = useRef<HTMLInputElement>(null);
  const [isFilteredByAI, setIsFilteredByAI] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // State for call summary
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [leadCalls, setLeadCalls] = useState<Record<string, any[]>>({});

  // State for qualification verification
  const [qualifyDialogOpen, setQualifyDialogOpen] = useState(false);
  const [leadToQualify, setLeadToQualify] = useState<Lead | null>(null);



  // State for unqualification dialog
  const [unqualifyDialogOpen, setUnqualifyDialogOpen] = useState(false);
  const [leadToUnqualify, setLeadToUnqualify] = useState<Lead | null>(null);

  // State for notes dialog
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [selectedNotesLead, setSelectedNotesLead] = useState<Lead | null>(null);

  // State for create lead dialog
  const [showCreateLeadDialog, setShowCreateLeadDialog] = useState(false);

  // State for Independent Account Manager filter (admin only)
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [advisorNameMap, setAdvisorNameMap] = useState<Map<string, string>>(new Map());
  const fetchedAdvisorIdsRef = useRef<Set<string>>(new Set());

  // State for favorites feature
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteConfirmOpen, setFavoriteConfirmOpen] = useState(false);
  const [leadToFavorite, setLeadToFavorite] = useState<{id: string, isFavorite: boolean} | null>(null);
  const [shareTargetAuthUserId, setShareTargetAuthUserId] = useState<string>("");
  const [isSharingLeads, setIsSharingLeads] = useState(false);

  // Define sort config type ("assigned_advisors" is from users_leads join, not a Lead column)
  type SortConfig = {
    key: keyof Lead | "assigned_advisors";
    direction: "asc" | "desc";
  };

  // Initialize sortConfig with default values
  const defaultSortConfig: SortConfig = {
    key: "created_on",
    direction: "desc",
  };

  // list of ended reasons
  const purpleReasons = [
    "customer-busy",
    "customer-did-not-answer",
    "voicemail",
    "silence-timed-out",
    "vonage-failed-to-connect-call",
    "vonage-rejected",
  ];

  // list of ended reasons that are not purple
  // State for sorting and pagination
  const [sortConfig, setSortConfig] = useState<SortConfig>(defaultSortConfig);
  const [totalPages, setTotalPages] = useState(1);
  


  // Column visibility - B2B Focus (Only existing fields)
  // Note: "advisor_note" column is rendered separately right after "Actions"
  const [visibleColumns, setVisibleColumns] = useState<Array<keyof Lead | "notes" | "advisor_note" | "assigned_advisors">>([
    "assigned_advisors",
    "lead_source",
    "business_name",
    "contact_first_name",
    "contact_last_name",
    "company_email",
    "business_telephone",
    "industry",
    "company_size",
    "annual_revenue",
    "contact_position",
    "contact_email",
    "business_post_code",
    "employees_band_desc",
    "sic_07_code",
    "major_sector_desc",
    "current_status",
    "current_progress",
    "engaged",
    "notes",
    "created_on",
    "owner",
  ]);

  // Filter states (Only existing fields)
  const [filters, setFilters] = useState({
    // Lead Management
    current_status: "",
    current_progress: "",
    lead_source: "",
    type_of_lead: "",
    customer_type: "",
    engaged: null as boolean | null,
    owner: "",
    
    // Business Information
    business_name: "",
    company_email: "",
    business_telephone: "",
    website: "",
    linkedin_company_url: "",
    industry: "",
    company_size: "",
    annual_revenue_range: [0, 10000000] as [number, number],
    sic_07_code: "",
    sic_07_description: "",
    major_sector_desc: "",
    contact_urn: "",
    
    // Business Address
    business_address_1: "",
    business_address_2: "",
    business_locality: "",
    business_town: "",
    business_county: "",
    business_post_code: "",
    
    // Contact Person
    contact_title: "",
    contact_first_name: "",
    contact_last_name: "",
    contact_position: "",
    contact_email: "",
    mobile_phone: "",
    other_phone: "",
    
    // Employee & Turnover Bands
    employees_band_desc: "",
    national_employees_band_desc: "",
    modeled_turnover_band_desc: "",
    
    // Compliance
    tps_checked: null as boolean | null,
    ctps_checked: null as boolean | null,
    verified_phone: null as boolean | null,
    verified_email: null as boolean | null,
    
    // Personal Information
    salutation: "",
    date_of_birth: { from: undefined as Date | undefined, to: undefined as Date | undefined },
    
    // Goals & Budget
    goals: "",
    budget_range: [0, 10000000] as [number, number],
    budget_frequency: "",
    goal_term: "",
    goal_year: "",
    household_income_range: [0, 10000000] as [number, number],
    
    // Communication Preferences
    preferred_contact_method: "",
    allow_email: null as boolean | null,
    allow_phone: null as boolean | null,
    allow_fax: null as boolean | null,
    allow_mail: null as boolean | null,
    allow_bulk_email: null as boolean | null,
    
    // Marketing
    marketing_materials_sent: null as boolean | null,
    added_to_marketing_list: null as boolean | null,
    campaign_name: "",
    last_campaign_date: { from: undefined as Date | undefined, to: undefined as Date | undefined },
    
    // System Fields
    created_on: { from: undefined as Date | undefined, to: undefined as Date | undefined },
    form_submitted: { from: undefined as Date | undefined, to: undefined as Date | undefined },
    active_duration_days_range: [0, 365] as [number, number],
    easy_id: "",
    easy_description: "",
    
    // Advisor Assignment
    advisor_id: "",
    visibility_scope: "all" as "all" | "assigned_to_me" | "shared_with_me" | "shared_by_me",
    share_status: "any" as "any" | "shared" | "not_shared",
    
      // Communication Status (from related tables)
      email_opened: null as boolean | null,
      sms_answered: null as boolean | null,
      whatsapp_answered: null as boolean | null,
      inbound_email: null as string | null, // "has_messages" | "has_outbound" | "no_messages" | null
      inbound_whatsapp: null as string | null, // "has_messages" | "has_outbound" | "no_messages" | null
      vapi_score: null as string | null,
    followed_up: null as boolean | null,
    not_called_yet: null as boolean | null,
    booked: null as boolean | null,
    last_called: null as boolean | null,
    has_call: null as boolean | null,
    has_notes: null as boolean | null,
    sentiment_analysis: null as string | null,
    
    // Brochure/Guide Filters
    guide_sent: "",
    called_by: [] as string[],

    // Omniflow Pipeline Stage
    pipeline_stage: [] as number[],
  });

  // Available options for filters
  const statusOptions = [
    "New",
    "Contacted",
    "Qualified",
    "Disqualified",
    "Converted",
    "vapi_called",
  ];
  const callStatusOptions = [
    { value: "called", label: "Called" },
    { value: "not_called", label: "Not Called" },
  ];
  const progressOptions = ["email", "whatsapp", "sms", "call", "not_called_yet"];

  // Status (leads.status column) options for filter and fast-edit - values must match DB
  const CURRENT_PROGRESS_OPTIONS: { value: string; label: string; description: string }[] = [
    { value: "new", label: "New", description: "Just entered the system. No action taken." },
    { value: "Contacting", label: "Contacting", description: "Outbound attempts happening. No conversation yet." },
    { value: "Busy wants a call back", label: "Busy wants a call back", description: "Lead was busy and requested a callback." },
    { value: "Wants to book", label: "Wants to book", description: "Lead wants to book a meeting or demo." },
    { value: "Voicemail", label: "Voicemail", description: "Left or received voicemail." },
    { value: "Needs to be rescheduled", label: "Needs to be rescheduled", description: "Meeting or call needs to be rescheduled." },
    { value: "Connected", label: "Connected", description: "You have spoken. Basic interest confirmed. Not yet qualified." },
    { value: "Qualified for Demo", label: "Qualified for Demo", description: "Decision maker or strong influencer. Real problem identified. Demo agreed in principle but not booked." },
    { value: "Demo Booked", label: "Demo Booked", description: "Calendar slot locked in." },
    { value: "No Demo", label: "No Demo", description: "Spoke, but not suitable or no need." },
    { value: "Future Demo", label: "Future Demo", description: "Interested but timing later. Has a specific follow up date." },
    { value: "Dead", label: "Dead", description: "No response after structured attempts, or clear rejection." },
  ];

  // Filter "Contacting" = leads.current_progress in these exact DB values (column is current_progress, not status)
  const CONTACTING_STATUS_VALUES = [
    "Contacting",
    "Busy wants a call back",
    "Wants to book",
    "Voicemail",
    "Needs to be rescheduled",
  ];
  const PROGRESS_COLUMN = "current_progress";
  const applyProgressFilter = (query: any, progressFilter: string) => {
    if (!progressFilter || progressFilter.trim() === "") return query;
    if (progressFilter === "contacting") {
      return query.in(PROGRESS_COLUMN, CONTACTING_STATUS_VALUES);
    }
    // "new" filter: skip progress filter to avoid 400 (no null check on current_progress)
    if (progressFilter === "new") return query;
    return query.eq(PROGRESS_COLUMN, progressFilter);
  };

  const leadSourceOptions = [
    "Website",
    "Referral",
    "Social Media",
    "Email",
    "Phone",
    "Typeform",
    "dynamics",
    "Manual Entry",
    "Other",
  ];
  const maritalStatusOptions = [
    "Single",
    "Married or in a Civil Partnership",
    "Divorced",
    "Widowed",
    "Separated",
  ];

  // B2B Filter Options - Based on actual database data
  const industryOptions = [
    "Services", "Retail"
  ];

  const companySizeOptions = [
    { value: "startup", label: "Startup (1-10 employees)" },
    { value: "small", label: "Small (11-50 employees)" },
    { value: "medium", label: "Medium (51-200 employees)" },
    { value: "large", label: "Large (201-1000 employees)" },
    { value: "enterprise", label: "Enterprise (1000+ employees)" }
  ];

  // Employee Band Options - Based on actual database data
  const employeeBandOptions = [
    { value: "A", label: "A: 1 to 4 employees" },
    { value: "B", label: "B: 5 to 9 employees" },
    { value: "C", label: "C: 10 to 19 employees" },
    { value: "D", label: "D: 20 to 49 employees" },
    { value: "E", label: "E: 50 to 99 employees" },
    { value: "F", label: "F: 100 to 199 employees" },
    { value: "G", label: "G: 200 to 499 employees" },
    { value: "H", label: "H: 500 to 999 employees" },
    { value: "I", label: "I: More than 1000 employees" }
  ];

  // Turnover Band Options - Based on actual database data
  const turnoverBandOptions = [
    { value: "L: £5m to £7,499,999", label: "L: £5m to £7,499,999" },
    { value: "M: £7.5m to £9,999,999", label: "M: £7.5m to £9,999,999" },
    { value: "N: £10m to £24,999,999", label: "N: £10m to £24,999,999" },
    { value: "O: £25m to £49,999,999", label: "O: £25m to £49,999,999" },
    { value: "P: £50m to £74,999,999", label: "P: £50m to £74,999,999" },
    { value: "Q: £75m to £99,999,999", label: "Q: £75m to £99,999,999" },
    { value: "R: £100m to £249,999,999", label: "R: £100m to £249,999,999" },
    { value: "S: £250m to £499,999,999", label: "S: £250m to £499,999,999" },
    { value: "T: £500m to £749,999,999", label: "T: £500m to £749,999,999" },
    { value: "U: £750m to £999,999,999", label: "U: £750m to £999,999,999" },
    { value: "V: More than £1bn", label: "V: More than £1bn" }
  ];

  // SIC Code Options - Based on actual database data
  const sicCodeOptions = [
    { value: "78100", label: "78100 - Activities of employment placement agencies (877)" },
    { value: "55100", label: "55100 - Hotels and similar accommodation (776)" },
    { value: "56101", label: "56101 - Licenced restaurants (261)" },
    { value: "93290", label: "93290 - Other amusement and recreation activities n.e.c. (104)" },
    { value: "92000", label: "92000 - Gambling and betting activities (103)" },
    { value: "86102", label: "86102 - Medical nursing home activities (79)" },
    { value: "62020", label: "62020 - Information technology consultancy activities (54)" },
    { value: "47410", label: "47410 - Retail sale of computers; peripheral units and software in specialised stores (43)" },
    { value: "82200", label: "82200 - Activities of call centres (14)" },
    { value: "61900", label: "61900 - Other telecommunications activities (14)" },
    { value: "61300", label: "61300 - Satellite telecommunications activities (12)" },
    { value: "78300", label: "78300 - Human resources provision and management of human resources functions (11)" }
  ];

  const leadTypeOptions = [
    { value: "B2B", label: "B2B" },
    { value: "B2C", label: "B2C" }
  ];
  const booleanOptions = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "", label: "Any" },
  ];

  // handle Qualifying Leads
  const handleQualify = useCallback(async (leadId: string) => {
    try {
      
      setIsLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .update({ current_status: "Qualified" })
        .eq("id", leadId);
      if (error) throw error;
      toast.success("Lead qualified successfully");
      
      // Update the local state immediately to reflect the change
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId 
            ? { ...lead, current_status: "Qualified" }
            : lead
        )
      );
      setFilteredLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId 
            ? { ...lead, current_status: "Qualified" }
            : lead
        )
      );
    } catch (error) {
      toast.error("Failed to qualify lead");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle unqualifying leads (revert to previous status like vapi_called)
  const handleUnqualify = useCallback(async (leadId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .update({ current_status: "vapi_called" })
        .eq("id", leadId);
      if (error) throw error;
      toast.success("Lead status reverted to previous stage");
      
      // Update the local state immediately to reflect the change
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId 
            ? { ...lead, current_status: "vapi_called" }
            : lead
        )
      );
      setFilteredLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId 
            ? { ...lead, current_status: "vapi_called" }
            : lead
        )
      );
    } catch (error) {
      toast.error("Failed to revert lead status");
    } finally {
      setIsLoading(false);
    }
  }, []);



  // Handle qualification verification
  const handleQualifyClick = useCallback((lead: Lead) => {
    if (lead.current_status === "Qualified") {
      // If already qualified, show unqualify dialog
      setLeadToUnqualify(lead);
      setUnqualifyDialogOpen(true);
      return;
    }

    // If not qualified, show verification dialog
    setLeadToQualify(lead);
    setQualifyDialogOpen(true);
  }, []);



  // Handle confirmation of qualification
  const handleConfirmQualify = useCallback(async () => {
    if (!leadToQualify) return;

    await handleQualify(leadToQualify.id);
    setQualifyDialogOpen(false);
    setLeadToQualify(null);
  }, [leadToQualify, handleQualify]);



  // Handle confirmation of unqualification
  const handleConfirmUnqualify = useCallback(async () => {
    if (!leadToUnqualify) return;

    await handleUnqualify(leadToUnqualify.id);
    setUnqualifyDialogOpen(false);
    setLeadToUnqualify(null);
  }, [leadToUnqualify]);

  // Handle viewing a single lead by fetching from the database
  const handleViewLead = useCallback(async (leadId: string) => {
    try {
      setIsLoading(true);
      const lead = await leadService.getById(leadId);
      if (lead) {
        setSelectedLead(lead);
        setIsLeadDialogOpen(true);
      }
    } catch (error) {
      // You might want to show an error toast or message to the user here
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle leads data from AI chat
  const handleViewLeads = useCallback((leadsData: any[]) => {
    // Convert the data to match the Lead type if needed
    const formattedLeads = leadsData.map(
      (lead) =>
        ({
          id: lead.id || lead.ID || lead.Id || "",
          business_name: lead.business_name || lead.BusinessName || lead.businessName || "",
          contact_first_name: lead.contact_first_name || lead.ContactFirstName || lead.contactFirstName || "",
          contact_last_name: lead.contact_last_name || lead.ContactLastName || lead.contactLastName || "",
          contact_email: lead.contact_email || lead.ContactEmail || lead.contactEmail || "",
          company_email: lead.company_email || lead.CompanyEmail || lead.companyEmail || "",
          business_telephone: lead.business_telephone || lead.BusinessTelephone || lead.businessTelephone || "",
          current_status: lead.current_status || lead.status || lead.Status || "new",
          lead_source: lead.lead_source || lead.source || lead.Source || "",
          created_on: lead.created_on || lead.CreatedOn || new Date().toISOString(),
          industry: lead.industry || lead.Industry || "",
          company_size: lead.company_size || lead.CompanySize || lead.companySize || "",
          annual_revenue: lead.annual_revenue || lead.AnnualRevenue || lead.annualRevenue || 0,
          website: lead.website || lead.Website || "",
          linkedin_company_url: lead.linkedin_company_url || lead.LinkedinCompanyUrl || lead.linkedinCompanyUrl || "",
          current_progress: lead.current_progress || lead.progress || "new",
          notes: lead.notes || "",
          owner: lead.owner || "",
          // Add any other required fields from your Lead type
        } as Lead)
    );

    setFilteredLeads(formattedLeads);
    setTotalLeads(formattedLeads.length);
    setCurrentPage(1);
    setIsFilteredByAI(true);
  }, []);

  // Fetch calls for a specific lead
  const fetchLeadCalls = useCallback(async (leadId: string) => {
    try {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setLeadCalls((prev) => ({
        ...prev,
        [leadId]: data || [],
      }));

      return data || [];
    } catch (error) {
      return [];
    }
  }, []);

  // Handle viewing call summary
  const handleViewCallSummary = useCallback(
    async (leadId: string) => {
      try {
        let calls = leadCalls[leadId];

        if (!calls) {
          calls = await fetchLeadCalls(leadId);
        }

        if (calls && calls.length > 0) {
          setSelectedCall(calls[0]);
          setIsCallDialogOpen(true);
        } else {
          toast.info("No call history found for this lead");
        }
      } catch (error) {
        toast.error("Failed to load call details");
      }
    },
    [leadCalls, fetchLeadCalls]
  );

  // Fetch a single call by ID
  const fetchCallById = useCallback(async (callId: string) => {
    try {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .eq("id", callId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      toast.error("Failed to fetch call details");
      return null;
    }
  }, []);

  // Handle AI command to view call summary
  const handleAIAction = useCallback(
    async (action: string) => {
      const viewCallMatch = action.match(
        /\{\{ViewCallSummary id="([^"]+)"\}\}/
      );
      if (viewCallMatch) {
        const callId = viewCallMatch[1];
        try {
          setIsLoading(true);
          // First try to find in existing calls
          const existingCall = Object.values(leadCalls)
            .flat()
            .find((c) => c.id === parseInt(callId));

          if (existingCall) {
            setSelectedCall(existingCall);
          } else {
            // If not found in existing calls, fetch it
            const call = await fetchCallById(callId);
            if (call) {
              setSelectedCall(call);
            }
          }
          setIsCallDialogOpen(true);
        } catch (error) {
          toast.error("Failed to load call details");
        } finally {
          setIsLoading(false);
        }
      }
    },
    [leadCalls, fetchCallById]
  );

  // Handle opening notes dialog
  const handleOpenNotes = useCallback((lead: Lead) => {
    setSelectedNotesLead(lead);
    setShowNotesDialog(true);
  }, []);

  // Handle search submission
  const handleSearch = async () => {
    setIsSearching(true);
    setCurrentPage(1); // Reset to first page on new search
    
    try {
      const newSearchParams = {
        searchTerm,
        filters: {
          ...filters,
        },
      };
      
      setSearchParams(newSearchParams);
      
      // Save filters to session storage (cleaned) - reset to page 1 on new search
      const cleanedFilters = cleanFilters(filters);
      saveFiltersToSession(searchTerm, cleanedFilters, 1, sortConfig);
      
      // Trigger the actual search with a new abort controller
      const controller = new AbortController();
      await fetchLeads(controller.signal);

      // Collapse advanced filters after search
      setShowAdvancedFilters(false);
    } catch (error) {
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Helper: Apply simple text filters to a query
  const applySimpleFilters = (query: any, filters: any, searchTerm: string) => {
    // Specific field text filters
    if (filters.business_name) query = query.ilike("business_name", `%${filters.business_name}%`);
    if (filters.contact_first_name) query = query.ilike("contact_first_name", `%${filters.contact_first_name}%`);
    if (filters.contact_last_name) query = query.ilike("contact_last_name", `%${filters.contact_last_name}%`);
    if (filters.contact_email) query = query.ilike("contact_email", `%${filters.contact_email}%`);
    if (filters.company_email) query = query.ilike("company_email", `%${filters.company_email}%`);
    if (filters.business_telephone) query = query.ilike("business_telephone", `%${filters.business_telephone}%`);

    // Simple equality filters
    if (filters.current_status) query = query.eq("current_status", filters.current_status);
    if (filters.current_progress) query = applyProgressFilter(query, filters.current_progress);
    if (filters.lead_source) query = query.eq("lead_source", filters.lead_source);
    if (filters.industry) query = query.eq("industry", filters.industry);
    if (filters.sic_07_code) query = query.eq("sic_07_code", filters.sic_07_code);
    if (filters.employees_band_desc) query = query.eq("employees_band_desc", filters.employees_band_desc);
    if (filters.modeled_turnover_band_desc) query = query.eq("modeled_turnover_band_desc", filters.modeled_turnover_band_desc);
    if (filters.engaged !== null && filters.engaged !== undefined) query = query.eq("engaged", filters.engaged);

    // Verification filters
    if (filters.verified_phone !== null && filters.verified_phone !== undefined) {
      query = query.eq("verified_phone", filters.verified_phone);
    }
    if (filters.verified_email !== null && filters.verified_email !== undefined) {
      query = query.eq("verified_email", filters.verified_email);
    }

    // Brochure/Guide filter
    if (filters.guide_sent) {
      query = query.eq(filters.guide_sent, true);
    }


    // Date range filters
    if (filters.created_on?.from) {
      query = query.gte("created_on", filters.created_on.from.toISOString());
    }
    if (filters.created_on?.to) {
      const endOfDay = new Date(filters.created_on.to);
      endOfDay.setDate(endOfDay.getDate() + 1);
      query = query.lt("created_on", endOfDay.toISOString());
    }

    // Text search across multiple fields (after filters to avoid PostgREST 400)
    if (searchTerm && searchTerm.trim() !== '') {
      query = query.or(
        `business_name.ilike.%${searchTerm}%,contact_first_name.ilike.%${searchTerm}%,contact_last_name.ilike.%${searchTerm}%,contact_email.ilike.%${searchTerm}%,company_email.ilike.%${searchTerm}%,business_telephone.ilike.%${searchTerm}%`
      );
    }

    return query;
  };

  // Helper: Apply favorite filter at database level
  const applyFavoriteFilter = (query: any, showFavoritesOnly: boolean) => {
    if (showFavoritesOnly) {
      query = query.eq("favored", true);
    }
    return query;
  };

  // Helper: Fetch lead IDs sorted by a column (for PATH 1 & 2 so pagination respects sort order)
  // "assigned_advisors" is not a leads column - it comes from users_leads join; handled separately
  const fetchSortedLeadIds = async (
    leadIds: string[],
    sortKey: keyof Lead | "assigned_advisors",
    direction: "asc" | "desc",
    abortSignal?: AbortSignal
  ): Promise<string[]> => {
    if (leadIds.length === 0) return [];
    const applyAbort = (query: any) => (abortSignal ? query.abortSignal(abortSignal) : query);

    // Assigned IAMs: sort by first advisor fullname (from users_leads -> users)
    if (sortKey === "assigned_advisors") {
      const batches = chunkArrayForQuery(leadIds, 100);
      const leadIdToName: Map<string, string> = new Map();
      for (const batch of batches) {
        const { data, error } = await applyAbort(
          supabase
            .from("users_leads")
            .select("lead_id, users(fullname)")
            .in("lead_id", batch)
        );
        if (error) throw error;
        if (data) {
          for (const row of data) {
            const lid = String((row as { lead_id: string }).lead_id);
            const users = (row as { users?: { fullname?: string | null } | { fullname?: string | null }[] }).users;
            const fullname = Array.isArray(users) ? (users[0]?.fullname ?? "") : (users?.fullname ?? "");
            if (!leadIdToName.has(lid) || (fullname && fullname < (leadIdToName.get(lid) ?? "zzz"))) {
              leadIdToName.set(lid, fullname || "");
            }
          }
        }
      }
      const asc = direction === "asc";
      const sorted = [...leadIds].sort((a, b) => {
        const aName = leadIdToName.get(String(a)) ?? "";
        const bName = leadIdToName.get(String(b)) ?? "";
        return asc
          ? aName.localeCompare(bName, undefined, { sensitivity: "base" })
          : bName.localeCompare(aName, undefined, { sensitivity: "base" });
      });
      return sorted;
    }

    const batches = chunkArrayForQuery(leadIds, 100);
    const rows: { id: string; value: unknown }[] = [];
    const sortKeyStr = String(sortKey);
    for (const batch of batches) {
      const selectCols = "id," + sortKeyStr;
      const { data, error } = await applyAbort(
        supabase
          .from("leads")
          .select(selectCols)
          .in("id", batch)
      );
      if (error) throw error;
      if (data) {
        for (const row of data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rec = row as any;
          rows.push({ id: String(rec.id), value: rec[sortKeyStr] });
        }
      }
    }
    const asc = direction === "asc";
    rows.sort((a, b) => {
      const aVal = a.value;
      const bVal = b.value;
      const aNull = aVal === null || aVal === undefined;
      const bNull = bVal === null || bVal === undefined;
      if (aNull && bNull) return 0;
      if (aNull) return asc ? -1 : 1;
      if (bNull) return asc ? 1 : -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return asc
          ? aVal.localeCompare(bVal, undefined, { sensitivity: "base" })
          : bVal.localeCompare(aVal, undefined, { sensitivity: "base" });
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return asc ? (aVal - bVal) : (bVal - aVal);
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return asc ? aStr.localeCompare(bStr, undefined, { sensitivity: "base" }) : bStr.localeCompare(aStr, undefined, { sensitivity: "base" });
    });
    return rows.map((r) => r.id);
  };

  // Helper: Fetch complex filter lead IDs (VAPI score, sentiment, notes, advisor)
  const fetchComplexFilterLeadIds = async (
    filters: any,
    assignedLeadIds: string[] = [],
    abortSignal?: AbortSignal
  ): Promise<string[] | null> => {
    const applyAbort = (query: any) => (abortSignal ? query.abortSignal(abortSignal) : query);
    let filteredIds: string[] | null = null; // null means no filtering applied

    // Advisor filter - filter leads assigned to a specific advisor or unassigned
    if (filters.advisor_id && filters.advisor_id.trim() !== '') {
      try {
        // Handle unassigned leads filter
        if (filters.advisor_id.trim() === '__unassigned__') {
          // Get all lead IDs that exist
          const { data: allLeads, error: allLeadsError } = await applyAbort(
            supabase
              .from("leads")
              .select("id")
              .limit(10000) // Reasonable limit
          );

          if (allLeadsError) {
            return [];
          }

          const leadIds = (allLeads || [])
            .map(l => String(l.id))
            .filter((id: any): id is string => id !== null && id !== undefined && id !== 'null' && id !== 'undefined');

          // Get assigned lead IDs for just these leads (batched, no hard limit)
          const assignedLeadIdsSet = new Set<string>();
          const leadIdBatches = chunkArrayForQuery(leadIds, 100);
          for (const batch of leadIdBatches) {
            const { data: assignedBatch, error: assignedError } = await applyAbort(
              supabase
                .from("users_leads")
                .select("lead_id")
                .in("lead_id", batch)
            );
            if (assignedError) {
              return [];
            }
            (assignedBatch || []).forEach((ul) => {
              const id = String(ul.lead_id);
              if (id && id !== 'null' && id !== 'undefined') {
                assignedLeadIdsSet.add(id);
              }
            });
          }

          // Filter to only unassigned leads
          const unassignedLeadIds: string[] = leadIds
            .filter((id: any): id is string => id !== null && id !== undefined && id !== 'null' && id !== 'undefined' && !assignedLeadIdsSet.has(id));

          if (filteredIds === null) {
            filteredIds = unassignedLeadIds;
          } else {
            const currentIds: string[] = filteredIds;
            filteredIds = currentIds.filter((id: string) => unassignedLeadIds.includes(id));
          }

          if ((filteredIds !== null) && filteredIds.length === 0) return []; // Early exit if no matches
        } else {
          // Handle specific advisor filter
          // First, get the internal user ID from the user_id (UUID)
          const { data: userRecord, error: userError } = await applyAbort(
            supabase
              .from("users")
              .select("id")
              .eq("user_id", filters.advisor_id.trim())
              .single()
          );

          if (userError || !userRecord) {
            // Return empty array to indicate no leads match (advisor not found)
            return [];
          }

          const internalUserId = userRecord.id;
          
          // Get all leads assigned to this advisor
          const { data: advisorLeads, error: advisorLeadsError } = await applyAbort(
            supabase
              .from("users_leads")
              .select("lead_id")
              .eq("user_id", internalUserId)
              .limit(5000) // Prevent overfetching
          );

          if (advisorLeadsError) {
            // Return empty array to indicate no leads match (error fetching)
            return [];
          }

          if (advisorLeads && advisorLeads.length > 0) {
            const advisorLeadIds: string[] = advisorLeads
              .map(ul => ul.lead_id)
              .filter((id: any): id is string => id !== null && id !== undefined);

            if (filteredIds === null) {
              filteredIds = advisorLeadIds;
            } else {
              const currentIds: string[] = filteredIds;
              filteredIds = currentIds.filter((id: string) => advisorLeadIds.includes(id));
            }

            if ((filteredIds !== null) && filteredIds.length === 0) return []; // Early exit if no matches
          } else {
            // Advisor has no assigned leads
            return [];
          }
        }
      } catch (error) {
        // Return empty array on error to prevent hanging
        return [];
      }
    }

    // VAPI call score filter
    if (filters.vapi_score) {
      let callScoreQuery = supabase
        .from("calls")
        .select("lead_id")
        .not("lead_id", "is", null)
        .eq("advisor_name", "Charlotte Fox Vapi")
        .limit(5000); // Prevent overfetching

      if (filters.vapi_score === "0-4") {
        callScoreQuery = callScoreQuery.gte("call_score", 0).lt("call_score", 4);
      } else if (filters.vapi_score === "4-7") {
        callScoreQuery = callScoreQuery.gte("call_score", 4).lt("call_score", 7);
      } else if (filters.vapi_score === "7-10") {
        callScoreQuery = callScoreQuery.gte("call_score", 7).lte("call_score", 10);
      }

      const { data: callScoreLeads } = await applyAbort(callScoreQuery);
      const scoreIds: string[] = callScoreLeads?.map((call: any) => call.lead_id).filter((id: any): id is string => id !== null && id !== undefined) || [];
      
      if (filteredIds === null) {
        filteredIds = scoreIds;
      } else {
        const currentIds: string[] = filteredIds; // Type assertion
        filteredIds = currentIds.filter((id: string) => scoreIds.includes(id));
      }

      if ((filteredIds !== null) && filteredIds.length === 0) return []; // Early exit if no matches
    }

    // Sentiment analysis filter
    if (filters.sentiment_analysis) {
      let sentimentIds: string[] = [];

      if (assignedLeadIds.length > 0) {
        // Batch the query to avoid URL length limits
        const batches = chunkArrayForQuery(assignedLeadIds, 100);
        
        for (const batch of batches) {
          const { data } = await applyAbort(
            supabase
              .from("lead_situation")
              .select("lead_id")
              .eq("sentiment_analysis", filters.sentiment_analysis)
              .in("lead_id", batch)
              .limit(5000) // Prevent overfetching
          );
          
          if (data) {
            sentimentIds = sentimentIds.concat(data.map((item: any) => item.lead_id).filter((id: any): id is string => id !== null && id !== undefined));
          }
        }
      } else {
        const { data } = await applyAbort(
          supabase
            .from("lead_situation")
            .select("lead_id")
            .eq("sentiment_analysis", filters.sentiment_analysis)
            .limit(5000) // Prevent overfetching
        );
        
        sentimentIds = data?.map((item: any) => item.lead_id).filter((id: any): id is string => id !== null && id !== undefined) || [];
      }

      if (filteredIds === null) {
        filteredIds = sentimentIds;
      } else {
        const currentIds: string[] = filteredIds; // Type assertion
        filteredIds = currentIds.filter((id: string) => sentimentIds.includes(id));
      }

      if ((filteredIds !== null) && filteredIds.length === 0) return []; // Early exit
    }

    // Has notes filter
    if (filters.has_notes !== null) {
      let notesIds: string[] = [];

      if (assignedLeadIds.length > 0) {
        // Batch to avoid URL length limits
        const batches = chunkArrayForQuery(assignedLeadIds, 100);
        
        for (const batch of batches) {
          let batchQuery = supabase.from("lead_situation").select("lead_id").in("lead_id", batch).limit(5000); // Prevent overfetching
          
          if (filters.has_notes) {
            batchQuery = batchQuery.or("next_steps.not.is.null,next_steps.neq.'',advisor_notes.not.is.null,advisor_notes.neq.''");
          } else {
            batchQuery = batchQuery.or("next_steps.is.null,next_steps.eq.''").or("advisor_notes.is.null,advisor_notes.eq.''");
          }
          
          const { data } = await applyAbort(batchQuery);
          if (data) {
            notesIds = notesIds.concat(data.map((item: any) => item.lead_id).filter((id: any): id is string => id !== null && id !== undefined));
          }
        }
      } else {
        let notesQuery = supabase.from("lead_situation").select("lead_id").limit(5000); // Prevent overfetching
        
        if (filters.has_notes) {
          notesQuery = notesQuery.or("next_steps.not.is.null,next_steps.neq.'',advisor_notes.not.is.null,advisor_notes.neq.''");
        } else {
          notesQuery = notesQuery.or("next_steps.is.null,next_steps.eq.''").or("advisor_notes.is.null,advisor_notes.eq.''");
        }
        
        const { data } = await applyAbort(notesQuery);
        notesIds = data?.map((item: any) => item.lead_id).filter((id: any): id is string => id !== null && id !== undefined) || [];
      }

      if (filteredIds === null) {
        filteredIds = notesIds;
      } else {
        const currentIds: string[] = filteredIds; // Type assertion
        filteredIds = currentIds.filter((id: string) => notesIds.includes(id));
      }

      if ((filteredIds !== null) && filteredIds.length === 0) return []; // Early exit
    }

    // Email messages filter
    if (filters.inbound_email !== null) {
      let inboundEmailIds: string[] = [];
      let outboundEmailIds: string[] = [];
      let allEmailIds: string[] = [];

      if (filters.inbound_email === "has_messages") {
        // Get conversation IDs that have inbound messages only
        const { data: inboundEmailMessages } = await applyAbort(
          supabase
            .from("email_messages")
            .select("conversation_id")
            .eq("direction", "Inbound")
            .not("conversation_id", "is", null)
            .limit(5000) // Prevent overfetching
        );

        if (inboundEmailMessages && inboundEmailMessages.length > 0) {
          // Get unique conversation IDs
          const conversationIds = [...new Set(inboundEmailMessages.map((m: any) => m.conversation_id).filter((id: any): id is string => id !== null && id !== undefined))];

          // Get lead IDs from email_conversation table
          if (conversationIds.length > 0) {
            // Batch if needed
            if (conversationIds.length > 100) {
              const batches = chunkArrayForQuery(conversationIds, 100);
              for (const batch of batches) {
                const { data } = await applyAbort(
                  supabase
                    .from("email_conversation")
                    .select("lead_id")
                    .in("id", batch)
                    .not("lead_id", "is", null)
                    .limit(5000)
                );
              
                if (data) {
                  inboundEmailIds = inboundEmailIds.concat(data.map((c: any) => c.lead_id).filter((id: any): id is string => id !== null && id !== undefined));
                }
              }
            } else {
              const { data } = await applyAbort(
                supabase
                  .from("email_conversation")
                  .select("lead_id")
                  .in("id", conversationIds)
                  .not("lead_id", "is", null)
                  .limit(5000)
              );
            
              inboundEmailIds = data?.map((c: any) => c.lead_id).filter((id: any): id is string => id !== null && id !== undefined) || [];
            }
          }
        }
      } else if (filters.inbound_email === "no_messages") {
        // Get all conversation IDs that have any messages (both inbound and outbound) for exclusion
        const { data: emailMessages } = await applyAbort(
          supabase
            .from("email_messages")
            .select("conversation_id")
            .not("conversation_id", "is", null)
            .limit(5000) // Prevent overfetching
        );

        if (emailMessages && emailMessages.length > 0) {
          // Get unique conversation IDs
          const conversationIds = [...new Set(emailMessages.map((m: any) => m.conversation_id).filter((id: any): id is string => id !== null && id !== undefined))];

          // Get lead IDs from email_conversation table
          if (conversationIds.length > 0) {
            // Batch if needed
            if (conversationIds.length > 100) {
              const batches = chunkArrayForQuery(conversationIds, 100);
              for (const batch of batches) {
                const { data } = await applyAbort(
                  supabase
                    .from("email_conversation")
                    .select("lead_id")
                    .in("id", batch)
                    .not("lead_id", "is", null)
                    .limit(5000)
                );
              
                if (data) {
                  allEmailIds = allEmailIds.concat(data.map((c: any) => c.lead_id).filter((id: any): id is string => id !== null && id !== undefined));
                }
              }
            } else {
              const { data } = await applyAbort(
                supabase
                  .from("email_conversation")
                  .select("lead_id")
                  .in("id", conversationIds)
                  .not("lead_id", "is", null)
                  .limit(5000)
              );
            
              allEmailIds = data?.map((c: any) => c.lead_id).filter((id: any): id is string => id !== null && id !== undefined) || [];
            }
          }
        }
      } else if (filters.inbound_email === "has_outbound") {
        // Get conversation IDs that have outbound messages only
        const { data: outboundEmailMessages } = await applyAbort(
          supabase
            .from("email_messages")
            .select("conversation_id")
            .eq("direction", "Outbound")
            .not("conversation_id", "is", null)
            .limit(5000)
        );

        if (outboundEmailMessages && outboundEmailMessages.length > 0) {
          const conversationIds = [...new Set(outboundEmailMessages.map((m: any) => m.conversation_id).filter((id: any): id is string => id !== null && id !== undefined))];

          if (conversationIds.length > 0) {
            if (conversationIds.length > 100) {
              const batches = chunkArrayForQuery(conversationIds, 100);
              for (const batch of batches) {
                const { data } = await applyAbort(
                  supabase
                    .from("email_conversation")
                    .select("lead_id")
                    .in("id", batch)
                    .not("lead_id", "is", null)
                    .limit(5000)
                );
                
                if (data) {
                  outboundEmailIds = outboundEmailIds.concat(data.map((c: any) => c.lead_id).filter((id: any): id is string => id !== null && id !== undefined));
                }
              }
            } else {
              const { data } = await applyAbort(
                supabase
                  .from("email_conversation")
                  .select("lead_id")
                  .in("id", conversationIds)
                  .not("lead_id", "is", null)
                  .limit(5000)
              );
              
              outboundEmailIds = data?.map((c: any) => c.lead_id).filter((id: any): id is string => id !== null && id !== undefined) || [];
            }
          }
        }
      }

      // Apply filter based on selected option
      if (filters.inbound_email === "has_messages") {
        // Keep only leads with inbound email messages
        if (filteredIds === null) {
          filteredIds = inboundEmailIds;
        } else {
          const currentIds: string[] = filteredIds;
          filteredIds = currentIds.filter((id: string) => inboundEmailIds.includes(id));
        }
      } else if (filters.inbound_email === "has_outbound") {
        // Keep only leads with outbound email messages
        if (filteredIds === null) {
          filteredIds = outboundEmailIds;
        } else {
          const currentIds: string[] = filteredIds;
          filteredIds = currentIds.filter((id: string) => outboundEmailIds.includes(id));
        }
      } else if (filters.inbound_email === "no_messages") {
        // Exclude leads with email messages
        if (filteredIds === null) {
          // If no previous filters, we need to get all lead IDs first
          const { data: allLeads } = await applyAbort(
            supabase
              .from("leads")
              .select("id")
              .limit(5000)
          );
          
          const allLeadIds = allLeads?.map(l => l.id) || [];
          filteredIds = allLeadIds.filter((id: string) => !allEmailIds.includes(id));
        } else {
          const currentIds: string[] = filteredIds;
          filteredIds = currentIds.filter((id: string) => !allEmailIds.includes(id));
        }
      }

      if ((filteredIds !== null) && filteredIds.length === 0) return []; // Early exit
    }

    // WhatsApp messages filter
    if (filters.inbound_whatsapp !== null) {
      let inboundWhatsAppIds: string[] = [];
      let outboundWhatsAppIds: string[] = [];
      let allWhatsAppIds: string[] = [];

      if (filters.inbound_whatsapp === "has_messages") {
        // Get lead IDs that have inbound WhatsApp messages only
        const { data: inboundWhatsAppMessages } = await applyAbort(
          supabase
            .from("leads_sms_whatsapp_conversations")
            .select("lead_id")
            .eq("message_type", "WhatsApp")
            .eq("is_inbound", true)
            .not("lead_id", "is", null)
            .limit(5000) // Prevent overfetching
        );

        if (inboundWhatsAppMessages && inboundWhatsAppMessages.length > 0) {
          // Get unique lead IDs
          inboundWhatsAppIds = [...new Set(inboundWhatsAppMessages.map((m: any) => m.lead_id).filter((id: any): id is string => id !== null && id !== undefined))];
        }
      } else if (filters.inbound_whatsapp === "no_messages") {
        // Get all lead IDs that have any WhatsApp messages (both inbound and outbound) for exclusion
        const { data: whatsAppMessages } = await applyAbort(
          supabase
            .from("leads_sms_whatsapp_conversations")
            .select("lead_id")
            .eq("message_type", "WhatsApp")
            .not("lead_id", "is", null)
            .limit(5000) // Prevent overfetching
        );

        if (whatsAppMessages && whatsAppMessages.length > 0) {
          // Get unique lead IDs
          allWhatsAppIds = [...new Set(whatsAppMessages.map((m: any) => m.lead_id).filter((id: any): id is string => id !== null && id !== undefined))];
        }
      } else if (filters.inbound_whatsapp === "has_outbound") {
        // Get lead IDs that have outbound WhatsApp messages only
        const { data: outboundWhatsAppMessages } = await applyAbort(
          supabase
            .from("leads_sms_whatsapp_conversations")
            .select("lead_id")
            .eq("message_type", "WhatsApp")
            .eq("is_inbound", false)
            .not("lead_id", "is", null)
            .limit(5000)
        );

        if (outboundWhatsAppMessages && outboundWhatsAppMessages.length > 0) {
          // Get unique lead IDs
          outboundWhatsAppIds = [...new Set(outboundWhatsAppMessages.map((m: any) => m.lead_id).filter((id: any): id is string => id !== null && id !== undefined))];
        }
      }

      // Apply filter based on selected option
      if (filters.inbound_whatsapp === "has_messages") {
        // Keep only leads with inbound WhatsApp messages
        if (filteredIds === null) {
          filteredIds = inboundWhatsAppIds;
        } else {
          const currentIds: string[] = filteredIds;
          filteredIds = currentIds.filter((id: string) => inboundWhatsAppIds.includes(id));
        }
      } else if (filters.inbound_whatsapp === "has_outbound") {
        // Keep only leads with outbound WhatsApp messages
        if (filteredIds === null) {
          filteredIds = outboundWhatsAppIds;
        } else {
          const currentIds: string[] = filteredIds;
          filteredIds = currentIds.filter((id: string) => outboundWhatsAppIds.includes(id));
        }
      } else if (filters.inbound_whatsapp === "no_messages") {
        // Exclude leads with WhatsApp messages
        if (filteredIds === null) {
          // If no previous filters, we need to get all lead IDs first
          const { data: allLeads } = await applyAbort(
            supabase
              .from("leads")
              .select("id")
              .limit(5000)
          );
          
          const allLeadIds = allLeads?.map(l => l.id) || [];
          filteredIds = allLeadIds.filter((id: string) => !allWhatsAppIds.includes(id));
        } else {
          const currentIds: string[] = filteredIds;
          filteredIds = currentIds.filter((id: string) => !allWhatsAppIds.includes(id));
        }
      }

      if ((filteredIds !== null) && filteredIds.length === 0) return []; // Early exit
    }

    // Has call filter
    if (filters.has_call !== null && filters.has_call !== undefined) {
      let calledLeadIds: string[] = [];

      if (assignedLeadIds.length > 0) {
        const batches = chunkArrayForQuery(assignedLeadIds, 100);
        for (const batch of batches) {
          const { data } = await applyAbort(
            supabase
              .from("calls")
              .select("lead_id")
              .in("lead_id", batch)
              .not("lead_id", "is", null)
              .limit(5000)
          );
          if (data) {
            calledLeadIds = calledLeadIds.concat(
              data.map((c: any) => c.lead_id).filter((id: any): id is string => id !== null && id !== undefined)
            );
          }
        }
      } else {
        const { data } = await applyAbort(
          supabase
            .from("calls")
            .select("lead_id")
            .not("lead_id", "is", null)
            .limit(10000)
        );
        calledLeadIds = data?.map((c: any) => c.lead_id).filter((id: any): id is string => id !== null && id !== undefined) || [];
      }

      const uniqueCalledIds = [...new Set(calledLeadIds)];

      if (filters.has_call === true) {
        if (filteredIds === null) {
          filteredIds = uniqueCalledIds;
        } else {
          filteredIds = filteredIds.filter((id: string) => uniqueCalledIds.includes(id));
        }
      } else {
        if (filteredIds === null) {
          const { data: allLeads } = await applyAbort(
            supabase.from("leads").select("id").limit(10000)
          );
          const allLeadIds = allLeads?.map((l: any) => String(l.id)) || [];
          const calledSet = new Set(uniqueCalledIds.map(String));
          filteredIds = allLeadIds.filter((id: string) => !calledSet.has(String(id)));
        } else {
          const calledSet = new Set(uniqueCalledIds.map(String));
          filteredIds = filteredIds.filter((id: string) => !calledSet.has(String(id)));
        }
      }

      if (filteredIds !== null && filteredIds.length === 0) return [];
    }

    // Called By filter
    if (filters.called_by && filters.called_by.length > 0) {
      let callQuery = supabase
        .from("calls")
        .select("lead_id")
        .in("advisor_name", filters.called_by)
        .not("lead_id", "is", null)
        .limit(5000);

      const { data: callsData, error: callsError } = await applyAbort(callQuery);
      
      if (!callsError && callsData && callsData.length > 0) {
        const calledLeadIds = [...new Set(callsData.map((c: any) => String(c.lead_id)))];
        if (filteredIds === null) {
          filteredIds = calledLeadIds;
        } else {
          filteredIds = filteredIds.filter((id: string) => calledLeadIds.includes(id));
        }
      } else {
        filteredIds = []; // No match
      }
      
      if (filteredIds !== null && filteredIds.length === 0) return []; // Early exit
    }

    return filteredIds; // null means no complex filters applied
  };

  // Helper: Check lead called status in batches
  const checkLeadCalledStatus = async (leadIds: string[], abortSignal?: AbortSignal) => {
    if (leadIds.length === 0) {
      return new Set<string>();
    }
    const applyAbort = (query: any) => (abortSignal ? query.abortSignal(abortSignal) : query);

    const batches = chunkArray(leadIds, CALL_STATUS_BATCH_SIZE);
    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const { data, error } = await applyAbort(
          supabase
            .from("calls")
            .select("lead_id")
            .in("lead_id", batch)
        );

        if (error) throw error;
        return data || [];
      })
    );

    const combinedLeadIds = batchResults
      .flat()
      .map((call) => call.lead_id)
      .filter((id): id is string | number => id !== null && id !== undefined)
      .map((id) => id.toString());

    return new Set(combinedLeadIds);
  };

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters({
      // Lead Management
      current_status: "",
      current_progress: "",
      lead_source: "",
      type_of_lead: "",
      customer_type: "",
      engaged: null,
      owner: "",
      
      // Business Information
      business_name: "",
      company_email: "",
      business_telephone: "",
      website: "",
      linkedin_company_url: "",
      industry: "",
      company_size: "",
      annual_revenue_range: [0, 10000000] as [number, number],
      sic_07_code: "",
      sic_07_description: "",
      major_sector_desc: "",
      contact_urn: "",
      
      // Business Address
      business_address_1: "",
      business_address_2: "",
      business_locality: "",
      business_town: "",
      business_county: "",
      business_post_code: "",
      
      // Contact Person
      contact_title: "",
      contact_first_name: "",
      contact_last_name: "",
      contact_position: "",
      contact_email: "",
      mobile_phone: "",
      other_phone: "",
      
      // Employee & Turnover Bands
      employees_band_desc: "",
      national_employees_band_desc: "",
      modeled_turnover_band_desc: "",
      
      // Compliance
      tps_checked: null,
      ctps_checked: null,
      verified_phone: null,
      verified_email: null,
      
      // Personal Information
      salutation: "",
      date_of_birth: { from: undefined, to: undefined },
      
      // Goals & Budget
      goals: "",
      budget_range: [0, 10000000] as [number, number],
      budget_frequency: "",
      goal_term: "",
      goal_year: "",
      household_income_range: [0, 10000000] as [number, number],
      
      // Communication Preferences
      preferred_contact_method: "",
      allow_email: null,
      allow_phone: null,
      allow_fax: null,
      allow_mail: null,
      allow_bulk_email: null,
      
      // Marketing
      marketing_materials_sent: null,
      added_to_marketing_list: null,
      campaign_name: "",
      last_campaign_date: { from: undefined, to: undefined },
      
      // System Fields
      created_on: { from: undefined, to: undefined },
      form_submitted: { from: undefined, to: undefined },
      active_duration_days_range: [0, 365] as [number, number],
      easy_id: "",
      easy_description: "",
      
      // Independent Account Manager Assignment
      advisor_id: "",
      visibility_scope: "all" as "all" | "assigned_to_me" | "shared_with_me" | "shared_by_me",
      share_status: "any" as "any" | "shared" | "not_shared",

      // Communication Status (from related tables)
      email_opened: null,
      sms_answered: null,
      whatsapp_answered: null,
      inbound_email: null,
      inbound_whatsapp: null,
      vapi_score: null,
      followed_up: null,
      not_called_yet: null,
      booked: null,
      last_called: null,
      has_call: null,
      has_notes: null,
      sentiment_analysis: null,
      guide_sent: "",
      called_by: [] as string[],
      pipeline_stage: [] as number[],
    });
    setSearchTerm("");

    // Clear filters from session storage
    clearFiltersFromSession();

    window.location.reload(); // Simple way to reset everything
  }, []);

  // Fetch leads with filters and sorting
  const FETCH_LEADS_TIMEOUT_MS = 30000;
  // USE_LEADS_RPC enabled to use the master public.get_leads_filtered_v9 SQL function
  const USE_LEADS_RPC = true;

  const fetchLeads = useCallback(async (abortSignal?: AbortSignal) => {
    const requestId = ++requestIdRef.current;
    const isStale = () => requestId !== requestIdRef.current;
    const applyAbort = (query: any) => (abortSignal ? query.abortSignal(abortSignal) : query);
    const filtersActive = areFiltersActive(searchParams.filters, searchParams.searchTerm);
    const startTime = Date.now();
    setIsLoading(true);

    const timeoutId = setTimeout(() => {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
        setHasData(true);
        toast.error("Request timed out. Please try again.");
      }
    }, FETCH_LEADS_TIMEOUT_MS);
    
    try {
      // ========== STEP 1: Check Cache ==========
      const cacheKey = getCacheKey({
        searchParams,
        sortKey: String(sortConfig.key),
        sortDirection: sortConfig.direction,
        page: currentPage,
        pageSize,
        userId: user?.id ?? null,
        isAdvisor,
        showFavoritesOnly,
      });
      const cached = getCachedData(cacheKey);
      
      if (cached) {
        if (isStale()) return;
        setLeads(cached.leads);
        setFilteredLeads(cached.leads);
        setTotalLeads(cached.totalLeads);
        setTotalPages(cached.totalPages);
        setHasData(true);
        if (cached.assignedLeadsArray) {
          setAssignedLeads(new Set(cached.assignedLeadsArray));
        }
        setIsLoading(false);
        
        // Log performance for cache hit
        const queryTime = Date.now() - startTime;
        
        return;
      }
      
      // Check if request was aborted before continuing
      if (abortSignal?.aborted) {
        return;
      }
      if (isStale()) return;

      // ========== STEP 2: Fetch via RPC (single query) ==========
      if (USE_LEADS_RPC) {
        const filters = { ...searchParams.filters };
        const searchTerm = searchParams.searchTerm;

        // Map not_called_yet into has_call so both filter controls use the same query logic
        if (filters.not_called_yet !== null && filters.not_called_yet !== undefined && (filters.has_call === null || filters.has_call === undefined)) {
          filters.has_call = !filters.not_called_yet;
        }

        const isUnassigned =
          isAdmin && filters.advisor_id && filters.advisor_id.trim() === "__unassigned__";

        // Advisors must only see their own assigned leads by default.
        // Admins can optionally filter by a specific advisor or by unassigned.
        const advisorUserId =
          isAdvisor && user?.id
            ? user.id
            : (isAdmin && filters.advisor_id && filters.advisor_id.trim() !== "" && !isUnassigned
                ? filters.advisor_id.trim()
                : null);

        let createdTo: string | null = null;
        if (filters.created_on?.to) {
          const endOfDay = new Date(filters.created_on.to);
          endOfDay.setDate(endOfDay.getDate() + 1);
          createdTo = endOfDay.toISOString();
        }

        const sortKey = String(sortConfig.key);

          const { data: rpcRows, error: rpcError } = await applyAbort(
          supabase.rpc("get_leads_filtered_v9", {
            p_search: searchTerm && searchTerm.trim() !== "" ? searchTerm.trim() : null,
            p_lead_source: filters.lead_source || null,
            p_status: filters.current_status || null,
            p_progress: filters.current_progress || null,
            p_industry: filters.industry || null,
            p_sic: filters.sic_07_code || null,
            p_employees_band: filters.employees_band_desc || null,
            p_modeled_turnover_band: filters.modeled_turnover_band_desc || null,
            p_engaged: filters.engaged ?? null,
            p_guide_sent: filters.guide_sent || null,
            p_created_from: filters.created_on?.from ? filters.created_on.from.toISOString() : null,
            p_created_to: createdTo,
            p_advisor_user_id: advisorUserId,
            p_unassigned: isUnassigned ? true : null,
            p_visibility_scope:
              filters.visibility_scope && filters.visibility_scope !== "all"
                ? filters.visibility_scope
                : null,
            p_share_status:
              filters.share_status && filters.share_status !== "any"
                ? filters.share_status
                : null,
            p_sentiment: filters.sentiment_analysis || null,
            p_has_notes: filters.has_notes ?? null,
            p_has_call: filters.has_call ?? null,
            p_vapi_score: filters.vapi_score || null,
            p_followed_up: filters.followed_up ?? null,
            p_email_opened: filters.email_opened ?? null,
            p_sms_answered: filters.sms_answered ?? null,
            p_whatsapp_answered: filters.whatsapp_answered ?? null,
            p_inbound_email: filters.inbound_email ?? null,
            p_inbound_whatsapp: filters.inbound_whatsapp ?? null,
            p_page: currentPage,
            p_page_size: pageSize,
            p_sort_key: sortKey,
            p_sort_dir: sortConfig.direction || "desc",
            p_called_by: filters.called_by && filters.called_by.length > 0 ? filters.called_by : [],
            p_pipeline_stage: filters.pipeline_stage && filters.pipeline_stage.length > 0 ? filters.pipeline_stage : null,
          })
        );

        if (rpcError) {
          toast.error(`RPC Error: ${rpcError.message}`);
          throw rpcError;
        }
        if (isStale()) return;

        const rows = Array.isArray(rpcRows) ? rpcRows : [];
        const totalCount = rows.length > 0 ? Number(rows[0].total_count || 0) : 0;

        const leadsWithRelations = rows.map((row: any) => {
          const lead = (row.lead || {}) as any;
          const usersLeads = row.users_leads?.lead_id
            ? [
                {
                  lead_id: row.users_leads.lead_id,
                  user_id: row.users_leads.user_id,
                  users: {
                    fullname: row.users_leads.advisor_name ?? null,
                    email: row.users_leads.advisor_email ?? null,
                  },
                },
              ]
            : [];
          const leadSituation = row.lead_situation?.id
            ? [
                {
                  id: row.lead_situation.id,
                  sentiment_analysis: row.lead_situation.sentiment_analysis ?? null,
                  next_steps: row.lead_situation.next_steps ?? null,
                  advisor_notes: row.lead_situation.advisor_notes ?? null,
                  created_at: row.lead_situation.created_at ?? null,
                },
              ]
            : [];
          const calls = row.calls?.id
            ? [
                {
                  id: row.calls.id,
                  advisor_name: row.calls.advisor_name ?? null,
                  transcript: row.calls.transcript ?? null,
                  call_ended_reason: row.calls.call_ended_reason ?? null,
                  call_score: row.calls.call_score ?? null,
                  created_at: row.calls.created_at ?? null,
                },
              ]
            : [];
          const emailConversation = row.email_conversation?.id
            ? [
                {
                  id: row.email_conversation.id,
                  twilio_conv_id: row.email_conversation.twilio_conv_id ?? null,
                  whatsapp_twilio_conv_id: row.email_conversation.whatsapp_twilio_conv_id ?? null,
                  lead_id: row.email_conversation.lead_id ?? null,
                },
              ]
            : [];

          return {
            ...lead,
            users_leads: usersLeads,
            lead_situation: leadSituation,
            calls,
            email_conversation: emailConversation,
            is_assigned_to_viewer: !!lead.is_assigned_to_viewer,
            is_shared_with_viewer: !!lead.is_shared_with_viewer,
            is_shared_by_viewer: !!lead.is_shared_by_viewer,
            is_shared: !!lead.is_shared,
            hasCalled: calls.length > 0,
          };
        });

        setLeads(leadsWithRelations);
        setFilteredLeads(leadsWithRelations);
        setTotalLeads(totalCount);
        setTotalPages(Math.ceil(totalCount / pageSize));
        setHasData(true);
        setIsLoading(false);

        setCachedData(cacheKey, {
          leads: leadsWithRelations,
          totalLeads: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          timestamp: Date.now(),
          assignedLeadsArray: null,
        });

        return;
      }
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
        return;
      }
      if (requestId !== requestIdRef.current) return;
      toast.error(`Failed to fetch leads: ${error.message}`);
      setHasData(true);
    } finally {
      clearTimeout(timeoutId);
      if (requestId !== requestIdRef.current) return;
      setIsLoading(false);
      setHasData(true);
    }
  }, [
    pageSize,
    isAdvisor,
    user?.id,
    searchParams,
    sortConfig,
    currentPage,
    showFavoritesOnly
  ]);


  // Refresh leads after qualification
  useEffect(() => {
    if (qualifyDialogOpen === false && leadToQualify === null && hasInitialLoad) {
      const controller = new AbortController();
      fetchLeads(controller.signal);
      
      return () => controller.abort();
    }
  }, [qualifyDialogOpen, leadToQualify, hasInitialLoad, fetchLeads]);

  // Reset to show all leads
  const resetLeadsView = useCallback(async () => {
    resetFilters();
    // Reset searchParams as well
    setSearchParams({
      searchTerm: "",
      filters: {
        // Lead Management
        current_status: "",
        current_progress: "",
        lead_source: "",
        type_of_lead: "",
        customer_type: "",
        engaged: null,
        owner: "",
        
        // Business Information
        business_name: "",
        company_email: "",
        business_telephone: "",
        website: "",
        linkedin_company_url: "",
        industry: "",
        company_size: "",
        annual_revenue_range: [0, 10000000] as [number, number],
        sic_07_code: "",
        sic_07_description: "",
        major_sector_desc: "",
        contact_urn: "",
        
        // Business Address
        business_address_1: "",
        business_address_2: "",
        business_locality: "",
        business_town: "",
        business_county: "",
        business_post_code: "",
        
        // Contact Person
        contact_title: "",
        contact_first_name: "",
        contact_last_name: "",
        contact_position: "",
        contact_email: "",
        mobile_phone: "",
        other_phone: "",
        
        // Employee & Turnover Bands
        employees_band_desc: "",
        national_employees_band_desc: "",
        modeled_turnover_band_desc: "",
        
        // Compliance
        tps_checked: null,
        ctps_checked: null,
        verified_phone: null,
        verified_email: null,
        
        // Personal Information
        salutation: "",
        date_of_birth: { from: undefined, to: undefined },
        
        // Goals & Budget
        goals: "",
        budget_range: [0, 10000000] as [number, number],
        budget_frequency: "",
        goal_term: "",
        goal_year: "",
        household_income_range: [0, 10000000] as [number, number],
        
        // Communication Preferences
        preferred_contact_method: "",
        allow_email: null,
        allow_phone: null,
        allow_fax: null,
        allow_mail: null,
        allow_bulk_email: null,
        
        // Marketing
        marketing_materials_sent: null,
        added_to_marketing_list: null,
        campaign_name: "",
        last_campaign_date: { from: undefined, to: undefined },
        
        // System Fields
        created_on: { from: undefined, to: undefined },
        form_submitted: { from: undefined, to: undefined },
        active_duration_days_range: [0, 365] as [number, number],
        easy_id: "",
        easy_description: "",
        
        // Advisor Assignment
        advisor_id: "",
        visibility_scope: "all",
        share_status: "any",
        
        // Communication Status (from related tables)
        email_opened: null,
        sms_answered: null,
        whatsapp_answered: null,
        inbound_email: null,
        inbound_whatsapp: null,
        vapi_score: null,
        followed_up: null,
        not_called_yet: null,
        booked: null,
        last_called: null,
        has_call: null,
        has_notes: null,
        sentiment_analysis: null,
        guide_sent: "",
        called_by: [] as string[],
        pipeline_stage: [] as number[],
      },
    });
    // Reset to first page when filters are reset
    setCurrentPage(1);
    setIsFilteredByAI(false);
    // Clear session storage when resetting view
    clearFiltersFromSession();
    // The filters change will trigger applyFilters via the effect
  }, [resetFilters]);

  const [totalCount, setTotalCount] = useState(0);

  // All available columns with their display names - B2B CRM Focus (Only existing fields)
  const columnDefinitions = [
    // Business Information
    { key: "business_name", label: "Business Name" },
    { key: "company_email", label: "Company Email" },
    { key: "business_telephone", label: "Business Phone" },
    { key: "website", label: "Website" },
    { key: "linkedin_company_url", label: "LinkedIn" },
    { key: "industry", label: "Industry" },
    { key: "company_size", label: "Company Size" },
    { key: "annual_revenue", label: "Annual Revenue" },
    { key: "employees_band_desc", label: "Employee Count" },
    { key: "national_employees_band_desc", label: "National Employees" },
    { key: "modeled_turnover_band_desc", label: "Turnover Band" },
    { key: "sic_07_code", label: "SIC Code" },
    { key: "sic_07_description", label: "SIC Description" },
    { key: "major_sector_desc", label: "Sector" },
    { key: "contact_urn", label: "Contact URN" },

    // Business Address
    { key: "business_address_1", label: "Address Line 1" },
    { key: "business_address_2", label: "Address Line 2" },
    { key: "business_locality", label: "Locality" },
    { key: "business_town", label: "Town" },
    { key: "business_county", label: "County" },
    { key: "business_post_code", label: "Post Code" },

    // Contact Person Information
    { key: "contact_title", label: "Contact Title" },
    { key: "contact_first_name", label: "Contact First Name" },
    { key: "contact_last_name", label: "Contact Last Name" },
    { key: "contact_position", label: "Position" },
    { key: "contact_email", label: "Contact Email" },

    // Phone Numbers
    { key: "mobile_phone", label: "Mobile Phone" },
    { key: "other_phone", label: "Other Phone" },

    // Compliance & Verification
    { key: "tps_checked", label: "TPS Checked" },
    { key: "ctps_checked", label: "CTPS Checked" },
    { key: "verified_phone", label: "Phone Verified" },
    { key: "verified_email", label: "Email Verified" },

    // Lead Management
    { key: "current_status", label: "Status" },
    { key: "status_reason", label: "Status Reason" },
    { key: "current_progress", label: "Progress" },
    { key: "lead_source", label: "Lead Source" },
    { key: "type_of_lead", label: "Lead Type" },
    { key: "customer_type", label: "Customer Type" },
    { key: "engaged", label: "Engaged" },
    { key: "owner", label: "Owner" },

    // Communication & Marketing
    { key: "preferred_contact_method", label: "Preferred Contact" },
    { key: "allow_email", label: "Allow Email" },
    { key: "allow_phone", label: "Allow Phone" },
    { key: "allow_fax", label: "Allow Fax" },
    { key: "allow_mail", label: "Allow Mail" },
    { key: "allow_bulk_email", label: "Allow Bulk Email" },
    { key: "marketing_materials_sent", label: "Marketing Sent" },
    { key: "added_to_marketing_list", label: "In Marketing List" },
    { key: "campaign_name", label: "Campaign" },
    { key: "last_campaign_date", label: "Last Campaign" },

    // Personal Information
    { key: "salutation", label: "Salutation" },
    { key: "date_of_birth", label: "Date of Birth" },

    // Goals and Budget
    { key: "goals", label: "Goals" },
    { key: "budget", label: "Budget" },
    { key: "budget_frequency", label: "Budget Frequency" },
    { key: "goal_term", label: "Goal Term" },
    { key: "goal_year", label: "Goal Year" },
    { key: "household_income", label: "Household Income" },

    // Notes and Analysis
    { key: "notes", label: "Notes" },
    { key: "advisor_note", label: "IAM Note" },
    { key: "assigned_advisors", label: "Assigned IAMs" },
    { key: "sentiment_analysis", label: "Sentiment" },
    { key: "best_time_to_contact", label: "Best Contact Time" },

    // System Fields
    { key: "created_on", label: "Created On" },
    { key: "form_submitted", label: "Form Submitted" },
    { key: "active_duration_days", label: "Active Days" },
    { key: "easy_id", label: "Easy ID" },
    { key: "easy_description", label: "Easy Description" },
  ] as const;

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: keyof Lead) => {
    setVisibleColumns((prev) =>
      prev.includes(columnKey)
        ? prev.filter((col) => col !== columnKey)
        : [...prev, columnKey]
    );
  };

  // Handle sort request - triggers a new data fetch with updated sort
  const requestSort = (key: keyof Lead | "assigned_advisors") => {
    setCurrentPage(1); // Reset to first page when changing sort

    setSortConfig((prevConfig) => {
      // If clicking the same column, toggle direction
      if (prevConfig.key === key) {
        return {
          key,
          direction: prevConfig.direction === "asc" ? "desc" : "asc",
        };
      }
      // If clicking a new column, default to ascending
      return { key, direction: "asc" };
    });
  };

  // Use the leads directly from state (they're already sorted by the server)
  // Note: Favorite filter is now applied at database level, not client-side
  // This ensures all favorite leads are fetched, not just those on current page
  const sortedLeads = useCallback(() => {
    return filteredLeads;
  }, [filteredLeads]);

  // Fetch Independent Account Managers for admin filter
  useEffect(() => {
    if (isAdmin) {
      const fetchAdvisors = async () => {
        try {
          const data = await advisorService.getAll();
          setAdvisors(data);
          // Create a map of user_id to name for quick lookup
          const nameMap = new Map<string, string>();
          data.forEach((advisor: any) => {
            const userId = advisor.user_id || advisor.id;
            const name = advisor.fullname || advisor.fullName || advisor.email || '';
            if (userId && name) {
              nameMap.set(userId, name);
            }
          });
          setAdvisorNameMap(nameMap);
        } catch (error) {
        }
      };
      fetchAdvisors();
    }
  }, [isAdmin]);

  // Fetch advisor name when advisor filter is active (for non-admin users or when not in advisors list)
  useEffect(() => {
    const advisorId = searchParams.filters?.advisor_id;
    if (!advisorId) return;
    
    const trimmedId = advisorId.trim();
    if (trimmedId === '') return;
    
    // Check if we've already fetched this advisor ID
    if (fetchedAdvisorIdsRef.current.has(trimmedId)) return;
    
    if (trimmedId === '__unassigned__') {
      // Set the name for unassigned filter
      setAdvisorNameMap(prev => {
        if (prev.has('__unassigned__')) return prev;
        return new Map(prev).set('__unassigned__', 'Unassigned');
      });
      fetchedAdvisorIdsRef.current.add('__unassigned__');
      return;
    }
    
    // Check if advisor is already in the advisors list
    const advisorExists = advisors.some(a => (a.user_id || a.id) === trimmedId);
    if (advisorExists) {
      fetchedAdvisorIdsRef.current.add(trimmedId);
      return;
    }
    
    // Mark as being fetched to prevent duplicate requests
    fetchedAdvisorIdsRef.current.add(trimmedId);
    
    const fetchAdvisorName = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("user_id, fullname, email")
          .eq("user_id", trimmedId)
          .single();
        
        if (!error && data) {
          const name = data.fullname || data.email || '';
          if (name) {
            setAdvisorNameMap(prev => new Map(prev).set(trimmedId, name));
          }
        }
      } catch (error) {
        // Remove from ref on error so we can retry
        fetchedAdvisorIdsRef.current.delete(trimmedId);
      }
    };
    fetchAdvisorName();
  }, [searchParams.filters?.advisor_id, advisors]);

    // Initial load - only run once, after filters are initialized
  useEffect(() => {
    if (!hasInitialLoad && user && filtersInitialized) {
      // Clear any stale cache on fresh page load when no filters are active
      const filtersActive = areFiltersActive(searchParams.filters, searchParams.searchTerm);
      if (!filtersActive && currentPage === 1) {
        clearCache();
      }
      
      const controller = new AbortController();
      fetchLeads(controller.signal);
      setHasInitialLoad(true);
      
      return () => controller.abort();
    }
  }, [hasInitialLoad, user, filtersInitialized, fetchLeads, searchParams, currentPage]);

  // Reload leads when favorites toggle changes (after initial load)
  useEffect(() => {
    if (hasInitialLoad && user && filtersInitialized) {
      const controller = new AbortController();
      setIsLoading(true);
      setHasData(false);
      clearCache();
      fetchLeads(controller.signal);
      
      return () => controller.abort();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFavoritesOnly]); // Only trigger on showFavoritesOnly change, not on initial mount

  // Initialize filters from session storage
  useEffect(() => {
    if (!filtersInitialized) {
      const storedFilters = loadFiltersFromSession();
      
      if (storedFilters) {
        
        // Check if stored filters are actually empty (no active filters)
        const hasActiveStoredFilters = storedFilters.searchTerm?.trim() || 
          Object.keys(storedFilters.filters || {}).some(key => {
            const value = storedFilters.filters[key];
            if (key === "visibility_scope" && value === "all") return false;
            if (key === "share_status" && value === "any") return false;
            // Check if filter value is meaningful (not empty/null/undefined)
            if (value === null || value === undefined || value === '') return false;
            if (Array.isArray(value) && value.length === 0) return false;
            if (typeof value === 'object' && Object.keys(value).length === 0) return false;
            return true;
          });
        
        if (hasActiveStoredFilters) {
          setSearchTerm(storedFilters.searchTerm || '');
          setFilters(prevFilters => ({
            ...prevFilters,
            ...storedFilters.filters
          }));
          setSearchParams(prevParams => ({
            searchTerm: storedFilters.searchTerm || '',
            filters: {
              ...prevParams.filters,
              ...storedFilters.filters
            }
          }));
          // Restore the current page
          if (storedFilters.currentPage) {
            setCurrentPage(storedFilters.currentPage);
          }
          if (storedFilters.sortConfig?.key && storedFilters.sortConfig?.direction) {
            setSortConfig({
              key: storedFilters.sortConfig.key as SortConfig["key"],
              direction: storedFilters.sortConfig.direction,
            });
          }
        } else {
          // Ensure both searchParams and filters state are in sync with empty defaults
          setSearchTerm('');
          setSearchParams(prevParams => ({
            searchTerm: '',
            filters: {
              ...prevParams.filters,
              // Reset all filters to defaults
              current_status: "",
              current_progress: "",
              lead_source: "",
              advisor_id: "",
              visibility_scope: "all",
              share_status: "any",
              has_call: null,
              has_notes: null,
              followed_up: null,
              sentiment_analysis: null,
              vapi_score: null,
              guide_sent: "",
            }
          }));
          setCurrentPage(1);
        }
      } else {
        // Ensure both searchParams and filters state are in sync with empty defaults
        setSearchTerm('');
        setSearchParams(prevParams => ({
          searchTerm: '',
          filters: {
            ...prevParams.filters,
            // Reset all filters to defaults
            current_status: "",
            current_progress: "",
            lead_source: "",
            advisor_id: "",
            visibility_scope: "all",
            share_status: "any",
            has_call: null,
            has_notes: null,
            followed_up: null,
            sentiment_analysis: null,
            vapi_score: null,
            guide_sent: "",
          }
        }));
        setCurrentPage(1);
      }
      setFiltersInitialized(true);
    }
  }, [filtersInitialized]); // Removed searchParams.filters from dependencies - only run once when not initialized

  // Handle favorite toggle
  const handleFavoriteClick = (leadId: string, currentFavoriteStatus: boolean) => {
    setLeadToFavorite({ id: leadId, isFavorite: currentFavoriteStatus });
    setFavoriteConfirmOpen(true);
  };

  // Confirm favorite toggle
  const confirmFavoriteToggle = async () => {
    if (!leadToFavorite) return;
    
    try {
      const newFavoriteStatus = !leadToFavorite.isFavorite;
      
      // Update in database using 'favored' column
      const { error } = await supabase
        .from('leads')
        .update({ favored: newFavoriteStatus })
        .eq('id', leadToFavorite.id);
      
      if (error) throw error;
      
      // If we're showing favorites only and the lead was unfavorited, reload data
      if (showFavoritesOnly && !newFavoriteStatus) {
        setIsLoading(true);
        setHasData(false);
        // Clear cache to ensure fresh data
        clearCache();
        // Reload leads to remove unfavorited lead from favorites view
        setTimeout(() => {
          fetchLeads();
        }, 0);
      } else {
        // Update local state for immediate UI feedback
        setLeads(prevLeads => prevLeads.map(lead => 
          lead.id === leadToFavorite.id 
            ? { ...lead, favored: newFavoriteStatus } 
            : lead
        ));
        
        setFilteredLeads(prevLeads => prevLeads.map(lead => 
          lead.id === leadToFavorite.id 
            ? { ...lead, favored: newFavoriteStatus } 
            : lead
        ));
      }
      
      toast(
        newFavoriteStatus ? "Added to Favorites" : "Removed from Favorites",
        {
          description: newFavoriteStatus 
            ? "This lead has been marked as favorite" 
            : "This lead has been removed from favorites",
        }
      );
      
    } catch (error) {
      toast.error("Failed to update favorite status");
    } finally {
      setFavoriteConfirmOpen(false);
      setLeadToFavorite(null);
    }
  };

  const updateLeadProgress = useCallback(async (leadId: string, newProgress: string) => {
    try {
      const statusValue = !newProgress || newProgress === "_none_" || newProgress === "new" ? null : newProgress;
      const { error } = await supabase
        .from("leads")
        .update({ status: statusValue })
        .eq("id", leadId);
      if (error) throw error;
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: statusValue } : l)));
      setFilteredLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: statusValue } : l)));
      toast.success("Status updated");
    } catch (err) {
      toast.error("Failed to update status");
    }
  }, []);

  // Helper function to clean filters - only keep non-empty values
  const cleanFilters = (filters: any) => {
    const cleaned: any = {};
    
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      
      // Skip null, undefined, empty strings, and default values
      if (value === null || value === undefined || value === '') {
        return;
      }
      if (key === "visibility_scope" && value === "all") {
        return;
      }
      if (key === "share_status" && value === "any") {
        return;
      }
      
      // Skip default ranges
      if (key === 'annual_revenue_range' && Array.isArray(value) && value[0] === 0 && value[1] === 10000000) {
        return;
      }
      if (key === 'budget_range' && Array.isArray(value) && value[0] === 0 && value[1] === 10000000) {
        return;
      }
      if (key === 'household_income_range' && Array.isArray(value) && value[0] === 0 && value[1] === 10000000) {
        return;
      }
      if (key === 'active_duration_days_range' && Array.isArray(value) && value[0] === 0 && value[1] === 365) {
        return;
      }
      
      // Skip empty date objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (Object.keys(value).length === 0 || (value.from === undefined && value.to === undefined)) {
          return;
        }
      }
      
      // Skip empty arrays
      if (Array.isArray(value) && value.length === 0) {
        return;
      }
      
      cleaned[key] = value;
    });
    
    return cleaned;
  };

  // Save filters to session storage whenever they change
  useEffect(() => {
    if (filtersInitialized) {
      const cleanedFilters = cleanFilters(filters);
      saveFiltersToSession(searchTerm, cleanedFilters, currentPage, sortConfig);
    }
  }, [searchTerm, filters, currentPage, filtersInitialized, sortConfig]);

  // Listen for AI actions and keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to trigger search
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleSearch();
      }
    };

    const handleAIMessage = (event: MessageEvent) => {
      if (event.data?.type === "AI_ACTION") {
        handleAIAction(event.data.action);
      }
    };

    window.addEventListener("message", handleAIMessage);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("message", handleAIMessage);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleAIAction, handleSearch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New":
        return "bg-blue-100 text-blue-800";
      case "Contacted":
        return "bg-yellow-100 text-yellow-800";
      case "Qualified":
        return "bg-green-100 text-green-800";
      case "Disqualified":
        return "bg-red-100 text-red-800";
      case "Converted":
        return "bg-purple-100 text-purple-800";
      case "vapi_called":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getProgressColor = (progress: string) => {
    switch (progress) {
      case "email":
        return "bg-yellow-100 text-yellow-800";
      case "sms":
        return "bg-blue-100 text-blue-800";
      case "whatsapp":
        return "bg-purple-100 text-purple-800";
      case "call":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format call status: replace underscores with spaces and capitalize words
  const formatCallStatus = (status?: string | null) => {
    if (!status) return "Unknown";
    return String(status)
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join(" ");
  };

  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  const handleLeadSelection = (leadId: string) => {
    setSelectedLeads((prev) => {
      const updated = new Set(prev);
      if (updated.has(leadId)) {
        updated.delete(leadId);
      } else {
        updated.add(leadId);
      }
      return updated;
    });
  };

  const handleAssignLeads = () => {
    if (selectedLeads.size === 0) {
      alert("No leads selected.");
      return;
    }

    // Replace this with the actual assignment logic
    alert(`Assigned ${selectedLeads.size} lead(s) to the advisor.`);

    // Clear the selection after assignment
    setSelectedLeads(new Set());
  };

  const handleShareSelectedLeads = useCallback(async () => {
    if (!shareTargetAuthUserId || selectedLeadIds.size === 0 || !user?.id) return;
    try {
      setIsSharingLeads(true);
      const leadIds = Array.from(selectedLeadIds);
      await Promise.all(
        leadIds.map((leadId) =>
          shareLeadWithUser({
            leadId,
            userAuthId: shareTargetAuthUserId,
            sharedByAuthUserId: user.id,
            canEdit: false,
            accessLevel: "view",
          })
        )
      );
      toast.success(`Shared ${leadIds.length} lead(s) successfully`);
      setSelectedLeadIds(new Set());
      await fetchLeads();
    } catch (error) {
      console.error("Error sharing leads:", error);
      toast.error("Failed to share selected leads");
    } finally {
      setIsSharingLeads(false);
    }
  }, [fetchLeads, selectedLeadIds, shareTargetAuthUserId, user?.id]);

  const handleUnshareSelectedLeads = useCallback(async () => {
    if (!shareTargetAuthUserId || selectedLeadIds.size === 0) return;
    try {
      setIsSharingLeads(true);
      const leadIds = Array.from(selectedLeadIds);
      await Promise.all(leadIds.map((leadId) => unshareLeadFromUser(leadId, shareTargetAuthUserId)));
      toast.success(`Unshared ${leadIds.length} lead(s) successfully`);
      setSelectedLeadIds(new Set());
      await fetchLeads();
    } catch (error) {
      console.error("Error unsharing leads:", error);
      toast.error("Failed to unshare selected leads");
    } finally {
      setIsSharingLeads(false);
    }
  }, [fetchLeads, selectedLeadIds, shareTargetAuthUserId]);

  // Removed duplicate user effect - handled in initial load

  // Clear-single-filter: must be before any early return so hook count is stable
  const chipKeyToFilterKey: Record<string, string> = {
    source: "lead_source",
    sentiment: "sentiment_analysis",
  };
  const getEmptyValueForFilterKey = (filterKey: string): string | null | [number, number] | { from?: Date; to?: Date } | number[] => {
    const emptyValues: Record<string, string | null | [number, number] | { from?: Date; to?: Date } | number[]> = {
      lead_source: "", advisor_id: "", guide_sent: "", business_name: "", contact_first_name: "", contact_last_name: "",
      visibility_scope: "all", share_status: "any",
      contact_email: "", company_email: "", business_telephone: "", current_status: "", current_progress: "", industry: "",
      sic_07_code: "", employees_band_desc: "", modeled_turnover_band_desc: "", vapi_score: "", sentiment_analysis: "",
      inbound_email: null, inbound_whatsapp: null,
      has_call: null, engaged: null, email_opened: null, sms_answered: null, whatsapp_answered: null,
      verified_email: null, verified_phone: null, booked: null, followed_up: null, not_called_yet: null, last_called: null,
      annual_revenue_range: [0, 10000000], budget_range: [0, 10000000], household_income_range: [0, 10000000],
      created_on: { from: undefined, to: undefined },
      pipeline_stage: [] as number[],
    };
    return emptyValues[filterKey] ?? "";
  };
  const clearSingleFilter = useCallback((chipKey: string) => {
    const filterKey = chipKeyToFilterKey[chipKey] ?? chipKey;
    const emptyValue = getEmptyValueForFilterKey(filterKey);
    const newFilters = { ...searchParams.filters, [filterKey]: emptyValue };
    setSearchParams((prev) => ({ ...prev, filters: newFilters }));
    setFilters((prev) => ({ ...prev, [filterKey]: emptyValue }));
    setCurrentPage(1);
    saveFiltersToSession(searchParams.searchTerm, newFilters, 1, sortConfig);
  }, [searchParams.filters, searchParams.searchTerm, sortConfig]);

  // Gate access AFTER hooks are declared
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the leads page.
          </p>
          <p className="text-sm text-gray-500">
              Only managers and Independent Account Managers can access this page.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && !hasData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-6 text-lg font-semibold text-gray-700 animate-pulse">
            Gathering your lead data...
          </p>
          <p className="text-gray-500">
            This may take a moment. Thank you for your patience.
          </p>
        </div>
      </div>
    );
  }
 

  // Helpers to render active filter chips
  const activeFilterChips = () => {
    const chips: Array<{ key: string; label: string }> = [];
    const f = searchParams.filters;
    const add = (key: string, label: string | null | undefined) => {
      if (label && String(label).trim() !== "") chips.push({ key, label: String(label) });
    };

    add("business_name", f.business_name);
    add("contact_first_name", f.contact_first_name);
    add("contact_last_name", f.contact_last_name);
    add("contact_email", f.contact_email);
    add("company_email", f.company_email);
    add("business_telephone", f.business_telephone);
    add("current_status", f.current_status);
    if (f.current_progress) {
      const label = f.current_progress === "contacting" ? "Contacting" : f.current_progress === "new" ? "New" : (CURRENT_PROGRESS_OPTIONS.find((o) => o.value === f.current_progress)?.label ?? f.current_progress);
      add("current_progress", label);
    }
    add("source", f.lead_source);
    add("industry", f.industry);
    
    // SIC Code with descriptive label
    if (f.sic_07_code) {
      const sicOption = sicCodeOptions.find(option => option.value === f.sic_07_code);
      add("sic_07_code", sicOption ? sicOption.label : f.sic_07_code);
    }
    
    // Employee Band with descriptive label
    if (f.employees_band_desc) {
      const employeeOption = employeeBandOptions.find(option => option.value === f.employees_band_desc);
      add("employees_band_desc", employeeOption ? employeeOption.label : f.employees_band_desc);
    }
    
    // Turnover Band with descriptive label
    if (f.modeled_turnover_band_desc) {
      const turnoverOption = turnoverBandOptions.find(option => option.value === f.modeled_turnover_band_desc);
      add("modeled_turnover_band_desc", turnoverOption ? turnoverOption.label : f.modeled_turnover_band_desc);
    }
    if (f.has_call !== null) add("has_call", f.has_call ? "Has calls" : "No calls");
    if (f.engaged !== null) add("engaged", f.engaged ? "Engaged" : "Not engaged");
    if (f.email_opened !== null) add("email_opened", f.email_opened ? "Email opened" : "Email not opened");
    if (f.sms_answered !== null) add("sms_answered", f.sms_answered ? "SMS answered" : "SMS not answered");
    if (f.whatsapp_answered !== null) add("whatsapp_answered", f.whatsapp_answered ? "WhatsApp answered" : "WhatsApp not answered");
    if (f.inbound_email !== null) {
      if (f.inbound_email === "has_messages") add("inbound_email", "Has Inbound Email Messages");
      else if (f.inbound_email === "has_outbound") add("inbound_email", "Has Outbound Email Messages");
      else if (f.inbound_email === "no_messages") add("inbound_email", "No Email Messages");
    }
    if (f.inbound_whatsapp !== null) {
      if (f.inbound_whatsapp === "has_messages") add("inbound_whatsapp", "Has Inbound WhatsApp Messages");
      else if (f.inbound_whatsapp === "has_outbound") add("inbound_whatsapp", "Has Outbound WhatsApp Messages");
      else if (f.inbound_whatsapp === "no_messages") add("inbound_whatsapp", "No WhatsApp Messages");
    }
    if (f.verified_email !== null && f.verified_email !== undefined) add("verified_email", f.verified_email ? "Email verified" : "Email not verified");
    if (f.verified_phone !== null && f.verified_phone !== undefined) add("verified_phone", f.verified_phone ? "Phone verified" : "Phone not verified");
    if (f.vapi_score) add("vapi_score", `Charlotte score ${f.vapi_score}`);
    if (f.sentiment_analysis) add("sentiment", `Sentiment ${f.sentiment_analysis}`);
    if (f.booked !== null) add("booked", f.booked ? "Booked" : "Not booked");
    if (f.followed_up !== null) add("followed_up", f.followed_up ? "Follow-up sent" : "No follow-up");
    if (f.not_called_yet !== null) add("not_called_yet", f.not_called_yet ? "Not called yet" : "Called");
    if (f.last_called !== null) add("last_called", f.last_called ? "Sort by last called" : "");
    
    // Brochure/Guide filter
    if ((f as any).guide_sent) {
      const brochureTitles: { [key: string]: string } = {
        brochure1: "Guide: PEOPLEMANAGER TRAIN. TRACK. TRANSFORM.",
        brochure2: "Guide: PEOPLEMANAGER: The End of Inconsistency",
        brochure3: "Guide: PeopleManager: Verified Results & Case Studies",
      };
      add("guide_sent", brochureTitles[(f as any).guide_sent] || (f as any).guide_sent);
    }
    
    // Ranges
    if (Array.isArray(f.annual_revenue_range)) {
      const [min, max] = f.annual_revenue_range;
      if (min > 0 || max < 10000000) add("annual_revenue_range", `Revenue £${min.toLocaleString()} - £${max.toLocaleString()}`);
    }
    if (Array.isArray(f.budget_range)) {
      const [min, max] = f.budget_range;
      if (min > 0 || max < 10000000) add("budget_range", `Budget £${min.toLocaleString()} - £${max.toLocaleString()}`);
    }
    if (Array.isArray(f.household_income_range)) {
      const [min, max] = f.household_income_range;
      if (min > 0 || max < 10000000) add("household_income_range", `Income £${min.toLocaleString()} - £${max.toLocaleString()}`);
    }
    if (f.created_on?.from || f.created_on?.to) {
      const from = f.created_on.from ? new Date(f.created_on.from).toLocaleDateString() : null;
      const to = f.created_on.to ? new Date(f.created_on.to).toLocaleDateString() : null;
      add("created_on", from && to ? `${from} - ${to}` : from || to || "");
    }
    
    // IAM filter
    if (f.advisor_id && f.advisor_id.trim() !== '') {
      if (f.advisor_id.trim() === '__unassigned__') {
        add("advisor_id", `IAM: Unassigned`);
      } else {
        // Try to find advisor name from map first, then from advisors state
        const advisorName = advisorNameMap.get(f.advisor_id);
        if (advisorName) {
          add("advisor_id", `IAM: ${advisorName}`);
        } else {
          // Fallback to advisors state
          const advisor = advisors.find((a: any) => 
            (a.user_id === f.advisor_id) || (a.id === f.advisor_id)
          );
          if (advisor) {
            const name = (advisor as any).fullname || (advisor as any).fullName || (advisor as any).email || '';
            if (name) {
              add("advisor_id", `IAM: ${name}`);
            } else {
              add("advisor_id", `IAM`);
            }
          } else {
            // If not found, still show the filter chip
            add("advisor_id", `IAM`);
          }
        }
      }
    }
    if (f.visibility_scope && f.visibility_scope !== "all") {
      const visibilityLabels: Record<string, string> = {
        assigned_to_me: "Visibility: Assigned to me",
        shared_with_me: "Visibility: Shared with me",
        shared_by_me: "Visibility: Shared by me",
      };
      add("visibility_scope", visibilityLabels[f.visibility_scope] || String(f.visibility_scope));
    }
    if (f.share_status && f.share_status !== "any") {
      add("share_status", f.share_status === "shared" ? "Shared only" : "Not shared");
    }
    if ((f as any).pipeline_stage && Array.isArray((f as any).pipeline_stage) && (f as any).pipeline_stage.length > 0) {
      const stageNames = ["New","Introduced","Demo Arrange","Demo Held","Proposal","Letter Sent","Terms Agreed","Signed","Handover"];
      const labels = (f as any).pipeline_stage.map((s: number) => `${s}·${stageNames[s] ?? s}`).join(", ");
      add("pipeline_stage", `Stage: ${labels}`);
    }

    return chips;
  };

  return (
    <QueryPerformanceProvider isAdvisor={isAdvisor}>
      <QueryPerformanceMonitor onRefresh={() => {
        const controller = new AbortController();
        fetchLeads(controller.signal);
      }} />
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6">
          {/* Floating Chat Buttons Grouped in Bottom Right */}
          <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-4">
          {/* AI Assistant - visible for both managers and Independent Account Managers */}
          <AIChat
            onViewLeads={handleViewLeads}
            onViewLead={handleViewLead}
            onAction={handleAIAction}
          />
          {/* Meeting Analysis Chat - visible only for managers */}
          {isAdmin && <MeetingAnalysisChat />}
        </div>

        {/* Lead Details Dialog */}
        <LeadDetailsDialog
          open={isLeadDialogOpen}
          onOpenChange={setIsLeadDialogOpen}
          lead={selectedLead}
        />

        <CallSummaryDialog
          open={isCallDialogOpen}
          onOpenChange={setIsCallDialogOpen}
          call={selectedCall}
        />

        {/* Notes Dialog */}
        <NotesDialog
          isOpen={showNotesDialog}
          onClose={() => setShowNotesDialog(false)}
          leadId={selectedNotesLead?.id || ""}
          leadName={selectedNotesLead ? `${selectedNotesLead.contact_first_name} ${selectedNotesLead.contact_last_name}` : ""}
          onNotesUpdated={() => {
            // Refresh the leads data to show updated notes
            fetchLeads();
          }}
        />

        <AlertDialog
          open={qualifyDialogOpen}
          onOpenChange={setQualifyDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Lead Qualification</AlertDialogTitle>
              <AlertDialogDescription>
                Do you confirm this lead had a meeting with one of our Independent Account Managers?
                <p className="mt-2 text-sm text-gray-600">
                  This action will change the lead status to "Qualified" and
                  cannot be easily undone.
                </p>
                {leadToQualify && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <p className="font-medium">Lead Details:</p>
                    <p className="text-sm text-gray-600">
                      {leadToQualify.contact_first_name} {leadToQualify.contact_last_name} -{" "}
                      {leadToQualify.contact_email}
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmQualify}
                className="bg-green-600 hover:bg-green-700"
              >
                Qualify Lead
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>



        <AlertDialog
          open={unqualifyDialogOpen}
          onOpenChange={setUnqualifyDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Lead Status Revert</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to revert this lead's status back to the previous stage?
                <p className="mt-2 text-sm text-gray-600">
                  This action will change the lead status from "Qualified" back to "vapi_called".
                </p>
                {leadToUnqualify && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <p className="font-medium">Lead Details:</p>
                    <p className="text-sm text-gray-600">
                      {leadToUnqualify.contact_first_name} {leadToUnqualify.contact_last_name} -{" "}
                      {leadToUnqualify.contact_email}
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmUnqualify}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Revert Status
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {isFilteredByAI && (
          <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-md flex justify-between items-center">
            <span>Showing filtered results from AI query</span>
            <Button
              variant="outline"
              size="sm"
              onClick={resetLeadsView}
              className="ml-4"
            >
              Show All Leads
            </Button>
          </div>
        )}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Leads Management
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Manage and qualify new leads from various sources
              {totalLeads > 0 && (
                <span className="ml-2 text-blue-600">
                  • {totalLeads} lead{totalLeads !== 1 ? 's' : ''} found
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/leads/filter">
              <Button variant="outline" size="sm">Refine Search</Button>
            </Link>
              </div>
            </div>

        {/* Active filters summary */}
        {activeFilterChips().length > 0 && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
              {activeFilterChips().map((chip) => (
                <Badge key={chip.key} variant="secondary" className="bg-white text-gray-800 border pl-2 pr-1 py-1 gap-1 flex items-center">
                  {chip.label}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); clearSingleFilter(chip.key); }}
                    className="rounded-full hover:bg-gray-200 p-0.5"
                    aria-label={`Clear ${chip.label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
                  ))}
                </div>
            <div className="flex items-center gap-2 ml-4">
              <Link href="/leads/filter">
                <Button variant="outline" size="sm">Edit Filters</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Clear all
                    </Button>
                </div>
                    </div>
                  )}

        {/* Bulk Actions */}
        <div className="mb-4 flex items-center gap-2">
          <AssignAdvisorButton
            selectedLeadIds={Array.from(selectedLeadIds)}
            onSuccess={() => {
              setSelectedLeadIds(new Set());
              // Optionally refresh leads data
              fetchLeads();
            }}
          />
          {isAdmin && (
            <>
              <Select value={shareTargetAuthUserId || "none"} onValueChange={(v) => setShareTargetAuthUserId(v === "none" ? "" : v)}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Select user to share with" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select user to share with</SelectItem>
                  {advisors
                    .filter((u: any) => {
                      const userId = String((u.user_id || u.id || "")).trim();
                      return userId !== "";
                    })
                    .map((u: any) => {
                      const userId = String((u.user_id || u.id || "")).trim();
                      const label = u.fullname || u.email || userId;
                      return (
                        <SelectItem key={`share-user-${userId}`} value={userId}>
                          {label}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                disabled={isSharingLeads || selectedLeadIds.size === 0 || !shareTargetAuthUserId}
                onClick={handleShareSelectedLeads}
              >
                Share Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isSharingLeads || selectedLeadIds.size === 0 || !shareTargetAuthUserId}
                onClick={handleUnshareSelectedLeads}
              >
                Unshare Selected
              </Button>
            </>
          )}
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              onClick={() => {
                // Toggle favorites state - useEffect will handle the reload
                setShowFavoritesOnly(!showFavoritesOnly);
                // Reset to page 1 when toggling favorites to avoid 416 error
                setCurrentPage(1);
              }}
              className="flex items-center gap-2"
              disabled={isLoading} // Disable button while loading
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
                  Loading...
                </>
              ) : (
                <>
                  <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  {showFavoritesOnly ? 'Show All Leads' : 'Show Favorites'}
                </>
              )}
            </Button>
          {selectedLeadIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLeadIds(new Set())}
            >
              Clear Selection ({selectedLeadIds.size})
            </Button>
          )}
          {/* Pipeline Stage filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                <ListFilter className="h-4 w-4" />
                Pipeline Stage
                {filters.pipeline_stage.length > 0 && (
                  <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                    {filters.pipeline_stage.length}
                  </Badge>
                )}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">Filter by Pipeline Stage</p>
              {[
                { stage: 0, label: "0 · New Lead" },
                { stage: 1, label: "1 · Introduced" },
                { stage: 2, label: "2 · Arranging a Demo" },
                { stage: 3, label: "3 · Demo Held" },
                { stage: 4, label: "4 · Proposal Form" },
                { stage: 5, label: "5 · Proposal Letter" },
                { stage: 6, label: "6 · Terms Agreed" },
                { stage: 7, label: "7 · Signed" },
                { stage: 8, label: "8 · Handover" },
              ].map(({ stage, label }) => (
                <label key={stage} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer text-sm">
                  <Checkbox
                    checked={filters.pipeline_stage.includes(stage)}
                    onCheckedChange={(checked) => {
                      const next = checked
                        ? [...filters.pipeline_stage, stage]
                        : filters.pipeline_stage.filter((s) => s !== stage);
                      setFilters((prev) => ({ ...prev, pipeline_stage: next }));
                      setCurrentPage(1);
                    }}
                  />
                  {label}
                </label>
              ))}
              {filters.pipeline_stage.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-1 text-xs"
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, pipeline_stage: [] }));
                    setCurrentPage(1);
                  }}
                >
                  Clear
                </Button>
              )}
            </PopoverContent>
          </Popover>

          <Button
            variant="default"
            size="sm"
            onClick={() => setShowCreateLeadDialog(true)}
            className="ml-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Lead
          </Button>
        </div>

        {/* Leads Table */}
        <Card className="overflow-hidden">
          <CardContent>
            {showLoadingState ? (
              <div className="min-h-[240px] flex flex-col items-center justify-center gap-4 py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 text-sm font-medium">Loading leads...</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <p className="text-gray-600 mb-2">No leads found</p>
                  <p className="text-sm text-gray-500">
                    Try adjusting your filters or search criteria
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        id="select-all"
                        checked={
                          selectedLeadIds.size === filteredLeads.length &&
                          filteredLeads.length > 0
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedLeadIds(
                              new Set(filteredLeads.map((lead) => lead.id))
                            );
                          } else {
                            setSelectedLeadIds(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="w-24">Omni-Flow Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                    <TableHead className="max-w-[200px]">IAM Note</TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center gap-1 hover:text-primary"
                        onClick={() => requestSort("lead_source" as keyof Lead)}
                      >
                        Lead Source
                        {sortConfig?.key === "lead_source" && (
                          sortConfig.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="w-44">Share Status</TableHead>
                    <TableHead className="w-36">Pipeline Stage</TableHead>
                    {visibleColumns.map((column) => {
                      // Skip rendering if it's not a standard column (handled separately)
                      // Skip "advisor_note" column as it's rendered separately after Actions
                      // Skip "lead_source" column as it's rendered separately after IAM Note
                      if (!column || column === "advisor_note" || column === "lead_source") return null;

                      // Special handling for date and numeric fields

                      const isNumeric = [
                        "annual_revenue",
                        "budget",
                        "household_income",
                        "active_duration_days",
                      ].includes(column);

                      const isDate = [
                        "created_on",
                        "date_of_birth",
                        "survey_date",
                        "last_guide_sent",
                        "last_note_date",
                        "followup_letter_date",
                        "last_campaign_date",
                        "form_submitted",
                      ].includes(column);

                      const isBoolean = [
                        "survey_completed",
                        "verified_phone",
                        "verified_email",
                        "allow_email",
                        "allow_phone",
                        "allow_fax",
                        "allow_mail",
                        "allow_bulk_email",
                        "marketing_materials_sent",
                        "added_to_marketing_list",
                        "tps_checked",
                        "ctps_checked",
                        "engaged",
                        "unsubscribed",
                        "whatsapp_reengage_sent",
                        "blog_sent",
                        "followup_start",
                      ].includes(column);

                      const columnDef = columnDefinitions.find(
                        (cd) => cd.key === column
                      );
                      const label =
                        columnDef?.label ||
                        column
                          .split("_")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ");

                      return (
                        <TableHead
                          key={column}
                          className={`${isNumeric ? "text-right" : ""} ${
                            isDate ? "whitespace-nowrap" : ""
                          }`}
                        >
                          <button
                            className={`flex items-center gap-1 hover:text-primary ${
                              isNumeric ? "ml-auto" : ""
                            }`}
                            onClick={() => requestSort(column as keyof Lead)}
                          >
                            {label}
                            {sortConfig?.key === column && (
                              sortConfig.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                            )}
                          </button>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(isFilteredByAI ? sortedLeads() : sortedLeads()).map(
                    (lead) => (
                      <TableRow
                        key={lead.id}
                        onClick={(e) => {
                          // Only navigate if clicking directly on the row, not on buttons/links inside
                          if (e.target === e.currentTarget) {
                            window.location.href = `/leads/${lead.id}`;
                          }
                        }}
                        className={
                          lead.lead_situation?.[0]?.sentiment_analysis ===
                          "positive"
                            ? "bg-green-50 hover:bg-green-100 cursor-pointer"
                            : lead.lead_situation?.[0]?.sentiment_analysis ===
                              "negative"
                            ? "bg-red-50 hover:bg-red-100 cursor-pointer"
                            : lead.engaged
                            ? "bg-blue-50 hover:bg-blue-100 cursor-pointer"
                            : "cursor-pointer"
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedLeadIds.has(lead.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedLeadIds);
                              if (checked) {
                                newSelected.add(lead.id);
                              } else {
                                newSelected.delete(lead.id);
                              }
                              setSelectedLeadIds(newSelected);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell>
                          {/* Lead Progress Pipeline */}
                          <div className="flex gap-2 mt-2">
                            {/* Email Stage */}
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                                lead.email_conversation?.[0]?.id
                                  ? "bg-green-100 border-green-500 text-green-700"
                                  : "bg-gray-100 border-gray-300 text-gray-500"
                              }`}
                            >
                              <Mail className="w-4 h-4" />
                            </div>
                            {/* SMS Stage */}
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                                lead.email_conversation?.[0]?.twilio_conv_id
                                  ? "bg-green-100 border-green-500 text-green-700"
                                  : "bg-gray-100 border-gray-300 text-gray-500"
                              }`}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </div>
                            {/* WhatsApp Stage */}
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                                lead.email_conversation?.[0]
                                  ?.whatsapp_twilio_conv_id
                                  ? "bg-green-100 border-green-500 text-green-700"
                                  : "bg-gray-100 border-gray-300 text-gray-500"
                              }`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 448 512"
                                fill="currentColor"
                                className="w-4 h-4"
                              >
                                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zM223.9 439.6c-38.2 0-73.4-12.4-102.6-33.8L48 443.4l29.7-87.9C60.2 322.8 48 285.3 48 246.1c0-97.2 79.2-176 176-176s176 78.8 176 176c0 97.2-79.2 176-176 176zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                              </svg>
                            </div>
                            {/* Call Stage */}
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                                lead.calls?.[lead.calls.length - 1]
                                  ?.call_ended_reason &&
                                (lead.calls?.[lead.calls.length - 1]
                                  .call_ended_reason ===
                                  "customer-ended-call" ||
                                  lead.calls?.[lead.calls.length - 1]
                                    .call_ended_reason ===
                                    "assistant-ended-call")
                                  ? "bg-green-100 border-green-500 text-green-700"
                                  : "bg-gray-100 border-gray-300 text-gray-500"
                              }`}
                            >
                              <PhoneCall className="w-4 h-4" />
                            </div>
                            {/* <Link href={`/leads/${lead.id}/inbox`}>
                              <Button
                                variant="outline"
                                size="icon"
                                title="Open Inbox"
                              >
                                <ArrowRight className="w-4 h-4" />
                              </Button>
                            </Link> */}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link href={`/leads/${lead.id}`}>
                              <Button variant="outline" size="sm" title="View Lead">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/leads/${lead.id}/edit`}>
                              <Button variant="outline" size="sm" title="Edit Lead">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant={lead.hasCalled ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleViewCallSummary(lead.id)}
                              title={
                                lead.hasCalled
                                  ? "View call summary"
                                  : "Not called yet"
                              }
                              className={
                                lead.hasCalled &&
                                Array.isArray(lead.calls) &&
                                lead.calls.length > 0 &&
                                purpleReasons.includes(
                                  lead.calls?.[lead.calls.length - 1]
                                    ?.call_ended_reason ?? ""
                                )
                                  ? "bg-purple-300 text-purple-900 hover:bg-purple-400"
                                  : lead.hasCalled
                                  ? "bg-green-600 hover:bg-green-700 text-white"
                                  : ""
                              }
                            >
                              <Phone className="h-4 w-4 mr-1" />
                              {(() => {
                                const topCall =
                                  lead.hasCalled &&
                                  Array.isArray(lead.calls) &&
                                  lead.calls.length > 0
                                    ? lead.calls[lead.calls.length - 1]
                                    : null;
                                const reason =
                                  topCall?.call_ended_reason ?? null;

                                if (reason && purpleReasons.includes(reason)) {
                                  // Use the call_ended_reason when it matches a purple reason
                                  return formatCallStatus(reason);
                                }

                                return lead.hasCalled
                                  ? "View Call Summary"
                                  : "Not Called Yet";
                              })()}
                            </Button>
                            {/* Direct Call Button - Only show when not called yet */}
                            {!lead.hasCalled && (
                              <a 
                                href={`tel:${lead.business_telephone || lead.mobile_phone || ''}`}
                                onClick={(e) => {
                                  if (!lead.business_telephone && !lead.mobile_phone) {
                                    e.preventDefault();
                                    toast.error("No phone number available for this lead");
                                  }
                                }}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  title={`Call ${lead.business_telephone || lead.mobile_phone || 'No phone'}`}
                                  disabled={!lead.business_telephone && !lead.mobile_phone}
                                  className="flex items-center gap-1"
                                >
                                  <PhoneCall className="h-4 w-4" />
                                  Call
                                </Button>
                              </a>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenNotes(lead)}
                              title="Add/Edit Notes"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4 mr-1"
                              >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
                              </svg>
                              Notes
                            </Button>
                                                           {lead.current_status === "Qualified" ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleQualifyClick(lead)}
                                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Qualified
                                </Button>
                              ) : (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleQualifyClick(lead)}
                                  className="flex items-center gap-1"
                                >
                                  Qualify
                                </Button>
                              )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const isFavored = Boolean((lead as any).favored);
                                handleFavoriteClick(lead.id, isFavored);
                              }}
                              title={(lead as any).favored === true ? "Remove from Favorites" : "Add to Favorites"}
                              className="p-0 h-8 w-8"
                            >
                              <Star 
                                className={`h-5 w-5 ${(lead as any).favored === true ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
                              />
                            </Button>
                          </div>
                        </TableCell>
                        {/* IAM Note Column - Rendered separately right after Actions */}
                        <TableCell key="advisor_note" className="max-w-[200px] p-0">
                          {(() => {
                            const advisorNotes = lead.lead_situation?.[0]?.advisor_notes;
                            if (!advisorNotes)
                              return <div>-</div>;

                            // Parse the notes to get the latest note content
                            const latestNote = getLatestNote(advisorNotes);
                            if (!latestNote)
                              return <div>-</div>;

                            return (
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <div className="p-4 cursor-help">
                                    <div className="text-sm line-clamp-2">
                                      {latestNote}
                                    </div>
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80">
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-semibold">
                                      IAM Note
                                    </h4>
                                    <p className="text-sm whitespace-pre-wrap">
                                      {latestNote}
                                    </p>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            );
                          })()}
                        </TableCell>
                        {/* Lead Source Column - Rendered right after IAM Note */}
                        <TableCell key="lead_source">
                          {lead.lead_source ? (
                            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              {lead.lead_source}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell key="share_status">
                          <div className="flex flex-wrap gap-1">
                            {(lead as any).is_assigned_to_viewer && (
                              <Badge variant="outline" className="text-xs border-blue-200 bg-blue-50 text-blue-800">
                                Assigned to me
                              </Badge>
                            )}
                            {(lead as any).is_shared_with_viewer && (
                              <Badge variant="outline" className="text-xs border-amber-200 bg-amber-50 text-amber-800">
                                Shared with me
                              </Badge>
                            )}
                            {(lead as any).is_shared_by_viewer && (
                              <Badge variant="outline" className="text-xs border-violet-200 bg-violet-50 text-violet-800">
                                Shared by me
                              </Badge>
                            )}
                            {!(lead as any).is_shared && (
                              <Badge variant="outline" className="text-xs border-gray-200 bg-gray-50 text-gray-700">
                                Not shared
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell key="pipeline_stage">
                          {(() => {
                            const stage = (lead as any).pipeline_stage ?? 0;
                            const stageNames = ["New","Introduced","Demo Arrange","Demo Held","Proposal","Letter Sent","Terms Agreed","Signed","Handover"];
                            const stageColors = [
                              "bg-gray-100 text-gray-700 border-gray-200",
                              "bg-blue-100 text-blue-700 border-blue-200",
                              "bg-yellow-100 text-yellow-700 border-yellow-200",
                              "bg-orange-100 text-orange-700 border-orange-200",
                              "bg-purple-100 text-purple-700 border-purple-200",
                              "bg-indigo-100 text-indigo-700 border-indigo-200",
                              "bg-pink-100 text-pink-700 border-pink-200",
                              "bg-green-100 text-green-700 border-green-200",
                              "bg-emerald-100 text-emerald-700 border-emerald-200",
                            ];
                            return (
                              <Badge variant="outline" className={`text-xs ${stageColors[stage] ?? stageColors[0]}`}>
                                {stage} · {stageNames[stage] ?? "Unknown"}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        {visibleColumns.map((column) => {
                          // Skip "advisor_note" column as it's rendered separately after Actions
                          // Skip "lead_source" column as it's rendered separately after IAM Note
                          if (!column || column === "advisor_note" || column === "lead_source") return null;

                          const value = lead[column as keyof typeof lead];

                          // Skip rendering if value is an array (handled separately)
                          if (Array.isArray(value)) {
                            return <TableCell key={column}>-</TableCell>;
                          }

                          const isNumeric = [
                            "annual_revenue",
                            "budget",
                            "household_income",
                            "active_duration_days",
                          ].includes(column);

                          const isDate = [
                            "created_on",
                            "date_of_birth",
                            "survey_date",
                            "last_guide_sent",
                            "last_note_date",
                            "followup_letter_date",
                            "last_campaign_date",
                            "form_submitted",
                          ].includes(column);

                          const isBoolean = [
                            "survey_completed",
                            "verified_phone",
                            "verified_email",
                            "allow_email",
                            "allow_phone",
                            "allow_fax",
                            "allow_mail",
                            "allow_bulk_email",
                            "marketing_materials_sent",
                            "added_to_marketing_list",
                            "tps_checked",
                            "ctps_checked",
                            "engaged",
                            "unsubscribed",
                            "whatsapp_reengage_sent",
                            "blog_sent",
                            "followup_start",
                          ].includes(column);

                          let displayValue: React.ReactNode =
                            value !== null && value !== undefined
                              ? String(value)
                              : "N/A";

                          // Format dates
                          if (isDate && value) {
                            displayValue = new Date(
                              value as string
                            ).toLocaleDateString();
                          }

                          // Format currency values
                          if (
                            isNumeric &&
                            value !== null &&
                            value !== undefined
                          ) {
                            displayValue = `Â£${Number(value).toLocaleString()}`;
                          }

                          // Format boolean values
                          if (isBoolean) {
                            displayValue = value ? "Yes" : "No";
                          }

                          // Fast-edit: status (leads.status column) with dropdown
                          if (column === "current_progress") {
                            const statusVal = (lead as any).status ?? value;
                            const progressValue = (statusVal != null && String(statusVal).trim()) ? String(statusVal).trim() : "";
                            const option = CURRENT_PROGRESS_OPTIONS.find((o) => o.value === progressValue);
                            return (
                              <TableCell key={column} onClick={(e) => e.stopPropagation()}>
                                <Select
                                  value={progressValue || "_none_"}
                                  onValueChange={(v) => {
                                    if (v !== undefined) updateLeadProgress(lead.id, v === "_none_" ? "" : v);
                                  }}
                                >
                                  <SelectTrigger className="h-8 min-w-[140px] border-gray-200 bg-white text-xs">
                                    <SelectValue placeholder="Set progress">
                                      {option ? option.label : progressValue || "—"}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_none_">—</SelectItem>
                                    {CURRENT_PROGRESS_OPTIONS.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        <div className="flex flex-col py-0.5">
                                          <span>{opt.label}</span>
                                          <span className="text-xs text-muted-foreground font-normal">{opt.description}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            );
                          }

                          // Special handling for status
                          if (column === "current_status" && value) {
                            return (
                              <TableCell key={column}>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    value === "New"
                                      ? "bg-blue-100 text-blue-800"
                                      : value === "Contacted"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : value === "Qualified"
                                      ? "bg-green-100 text-green-800"
                                      : value === "Disqualified"
                                      ? "bg-red-100 text-red-800"
                                      : value === "Converted"
                                      ? "bg-purple-100 text-purple-800"
                                      : value === "vapi_called"
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {String(displayValue || "N/A")}
                                </span>
                              </TableCell>
                            );
                          }

                          // Special handling for engaged status
                          if (column === "engaged") {
                            return (
                              <TableCell key={column}>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    value
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {value ? "Yes" : "No"}
                                </span>
                              </TableCell>
                            );
                          }

                          // Handle sentiment analysis
                          if (column === ("sentiment_analysis" as keyof typeof lead)) {
                            const sentiment =
                              lead.lead_situation?.[0]?.sentiment_analysis;
                            if (!sentiment)
                              return <TableCell key={column}>-</TableCell>;

                            const sentimentColors = {
                              positive: "bg-green-100 text-green-800",
                              neutral: "bg-blue-100 text-blue-800",
                              negative: "bg-red-100 text-red-800",
                            };

                            return (
                              <TableCell key={column}>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs capitalize ${
                                    sentimentColors[
                                      sentiment as keyof typeof sentimentColors
                                    ] || "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {sentiment}
                                </span>
                              </TableCell>
                            );
                          }


                          // Handle notes
                          if (column === "notes") {
                            const nextSteps = lead.lead_situation?.[0]?.next_steps || "";
                            const latestNote = getLatestNote(nextSteps);
                            const allNotes = parseNotesJson(nextSteps);
                            
                            if (!latestNote)
                              return <TableCell key={column}>-</TableCell>;

                            return (
                              <TableCell
                                key={column}
                                className="max-w-[200px] p-0"
                              >
                                <HoverCard>
                                  <HoverCardTrigger asChild>
                                    <div className="p-4 cursor-help">
                                      <div className="text-sm line-clamp-2">
                                        {latestNote}
                                      </div>
                                      {allNotes.length > 1 && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          +{allNotes.length - 1} more notes
                                        </div>
                                      )}
                                    </div>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-80">
                                    <div className="space-y-2">
                                      <h4 className="text-sm font-semibold">
                                        Latest Note
                                      </h4>
                                      <div className="space-y-2">
                                        <div className="text-xs text-gray-500">
                                          {new Date(allNotes[0]?.datetime).toLocaleString()}
                                        </div>
                                        <p className="text-sm whitespace-pre-wrap">
                                          {latestNote}
                                        </p>
                                      </div>
                                      {allNotes.length > 1 && (
                                        <div className="text-xs text-gray-500 border-t pt-2">
                                          Total notes: {allNotes.length}
                                        </div>
                                      )}
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              </TableCell>
                            );
                          }

                          // Handle assigned Independent Account Managers
                          if (column === "assigned_advisors") {
                            const assignedAdvisors = lead.users_leads?.map(ul => ul.users?.fullname).filter(Boolean);
                            if (!assignedAdvisors || assignedAdvisors.length === 0)
                              return <TableCell key={column}>-</TableCell>;

                            return (
                              <TableCell key={column}>
                                <div className="flex flex-wrap gap-1">
                                  {assignedAdvisors.map((advisorName, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                      {advisorName}
                                    </span>
                                  ))}
                                </div>
                              </TableCell>
                            );
                          }

                          // Contact Email
                          if (column === "contact_email") {
                            return (
                              <TableCell
                                key={column}
                                className={`max-w-[200px] truncate ${
                                  value
                                    ? lead.allow_email
                                      ? "bg-green-50 text-green-800"
                                      : lead.allow_email === false
                                      ? "bg-red-50 text-red-800"
                                      : "bg-gray-50 text-gray-600"
                                    : ""
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{String(value || "N/A")}</span>
                                  {value && (
                                    <span
                                      className={`inline-flex items-center justify-center h-4 w-4 rounded-full ${
                                        lead.allow_mail
                                          ? "bg-green-100 text-green-700"
                                          : lead.allow_mail === false
                                          ? "bg-red-100 text-red-700"
                                          : "bg-gray-100 text-gray-500"
                                      }`}
                                      title={
                                        lead.allow_mail
                                          ? "Email verified"
                                          : lead.allow_mail === false
                                          ? "Email verification failed"
                                          : "Email not verified"
                                      }
                                    >
                                      {lead.allow_mail
                                        ? "✓"
                                        : lead.allow_mail === false
                                        ? "✗"
                                        : "?"}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            );
                          }

                          // Business Telephone
                          if (column === "business_telephone") {
                            return (
                              <TableCell
                                key={column}
                                className={
                                  value
                                    ? lead.allow_phone
                                      ? "bg-green-50 text-green-800"
                                      : lead.allow_phone === false
                                      ? "bg-red-50 text-red-800"
                                      : "bg-gray-50 text-gray-600"
                                    : ""
                                }
                              >
                                <div className="flex items-center gap-2">
                                  <span>{value ? formatPhoneNumber(String(value)) : "N/A"}</span>
                                  {value && (
                                    <span
                                      className={`inline-flex items-center justify-center h-4 w-4 rounded-full ${
                                        lead.allow_phone
                                          ? "bg-green-100 text-green-700"
                                          : lead.allow_phone === false
                                          ? "bg-red-100 text-red-700"
                                          : "bg-gray-100 text-gray-500"
                                      }`}
                                      title={
                                        lead.allow_phone
                                          ? "Phone verified"
                                          : lead.allow_phone === false
                                          ? "Phone verification failed"
                                          : "Phone not verified"
                                      }
                                    >
                                      {lead.allow_phone
                                        ? "✓"
                                        : lead.allow_phone === false
                                        ? "✗"
                                        : "?"}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            );
                          }

                          // Handle sentiment analysis display
                          if (column === ("sentiment_analysis" as keyof typeof lead)) {
                            const sentiment =
                              lead.lead_situation?.[0]?.sentiment_analysis;
                            return (
                              <TableCell key={column}>
                                {sentiment ? (
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      sentiment === "positive"
                                        ? "bg-green-100 text-green-800"
                                        : sentiment === "negative"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    {sentiment.charAt(0).toUpperCase() +
                                      sentiment.slice(1)}
                                  </span>
                                ) : (
                                  "N/A"
                                )}
                              </TableCell>
                            );
                          }



                          // Truncate long text
                          const shouldTruncate = [
                            "email",
                            "goals",
                            "address",
                            "vapi_call_notes",
                          ].includes(column);

                          return (
                            <TableCell
                              key={column}
                              className={`
                              ${isNumeric ? "text-right" : ""}
                              ${shouldTruncate ? "max-w-[200px] truncate" : ""}
                            `}
                            >
                              {displayValue !== null &&
                              displayValue !== undefined
                                ? String(displayValue)
                                : "N/A"}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination Controls */}
        {totalLeads > 0 && (
          <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>{ setCurrentPage((p) => Math.max(1, p - 1));  }}
                disabled={currentPage === 1 || isLoading}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {currentPage} of {Math.max(1, Math.ceil(totalLeads / pageSize))}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setCurrentPage((p) => p + 1);   }}
                disabled={currentPage * pageSize >= totalLeads || isLoading}
              >
                Next
              </Button>
              <span className="text-sm text-gray-400 mx-1">|</span>
              <span className="text-sm text-gray-500">Go to page</span>
              <Input
                ref={goToPageInputRef}
                type="number"
                min={1}
                max={Math.max(1, Math.ceil(totalLeads / pageSize))}
                className="w-16 h-8 text-center text-sm px-1"
                placeholder={String(currentPage)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const raw = (e.target as HTMLInputElement).value;
                    const num = parseInt(raw, 10);
                    const totalP = Math.max(1, Math.ceil(totalLeads / pageSize));
                    if (!isNaN(num)) {
                      const page = Math.max(1, Math.min(num, totalP));
                      setCurrentPage(page);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => {
                  const input = goToPageInputRef.current;
                  if (!input) return;
                  const raw = input.value;
                  const num = parseInt(raw, 10);
                  const totalP = Math.max(1, Math.ceil(totalLeads / pageSize));
                  if (!isNaN(num)) {
                    const page = Math.max(1, Math.min(num, totalP));
                    setCurrentPage(page);
                    input.value = "";
                  } else {
                    toast.error("Please enter a valid page number");
                  }
                }}
              >
                Go
              </Button>
            </div>
            <div className="text-sm text-gray-500">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalLeads)} of {totalLeads} leads
            </div>
          </div>
        )}


        {/* Create Lead Dialog */}
        <CreateLeadCard
          open={showCreateLeadDialog}
          onOpenChange={setShowCreateLeadDialog}
          onSuccess={() => {
            fetchLeads();
            toast.success("Lead created successfully!");
          }}
        />

        {/* Favorite Confirmation Dialog */}
        <AlertDialog open={favoriteConfirmOpen} onOpenChange={setFavoriteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {leadToFavorite?.isFavorite ? 'Remove from Favorites?' : 'Add to Favorites?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {leadToFavorite?.isFavorite
                  ? 'This lead will be removed from your favorites list.'
                  : 'This lead will be added to your favorites list for quick access.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmFavoriteToggle}>
                {leadToFavorite?.isFavorite ? 'Remove' : 'Add'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </div>
    </QueryPerformanceProvider>
  );
}
