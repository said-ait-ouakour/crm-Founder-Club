"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Phone, Mail, User, Calendar, Columns, Edit, Plus, MessageSquare, PhoneCall, Eye, MessageCircle, Reply, Filter, ChevronDown, ChevronUp, CheckCircle2, XCircle, UserPlus, X } from "lucide-react";
import { useAuth, useIsAdmin, useIsAdvisor, useIsRecruiter } from "@/contexts/auth-context";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateCandidateStatus } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import { CandidateCallSummaryDialog } from "@/components/candidate-call-summary-dialog";

interface Candidate {
  id: number;
  created_at: string;
  full_name: string | null;
  phone_number: string | null;
  email: string | null;
  recruiter: number | null;
  position: string | null;
  general_location: string | null;
  zip_code: string | null;
  headline: string | null;
  current_title: string | null;
  current_company: string | null;
  current_position_start_date: string | null;
  education_degree: string | null;
  education_institution: string | null;
  profile_url: string | null;
  date_applied: string | null;
  current_stage: string | null;
  job_id: number | null;
  job_url: string | null;
  ats_job_id: string | null;
  minimum_salary: number | null;
  maximum_salary: number | null;
  currency_code: string | null;
  compensation_period: string | null;
  hiring_project_id: number | null;
  hiring_project_title: string | null;
  contract_id: number | null;
  contract_name: string | null;
  screening_questions: string | null;
  meeting_date: string | null;
  interviewer_email: string | null;
  recruiter_name: string | null;
  meeting_link_sent: string | null;
  notes: string | null;
  application_form_submission: string | null;
  meeting_link: string | null;
  status: string | null;
  typeform_sent: boolean | null;
  typeform_completed: boolean | null;
  interview_sent: boolean | null;
  joboffer_sent: boolean | null;
  docs_uploaded: boolean | null;
  references_contacted: boolean | null;
  contract_sent: boolean | null;
  contract_signed: boolean | null;
  hasCalled?: boolean;
  calls?: Array<{
    id: number;
    created_at: string;
    call_ended_reason: string | null;
    call_status: string | null;
  }>;
}

interface User {
  id: number;
  fullName: string;
  email: string;
  user_id: string;
}

// Helper functions for notes JSON handling
const parseNotesJson = (notesString: string): Array<{datetime: string, note: string, author_id?: string | null, author_name?: string}> => {
  if (!notesString) return [];
  try {
    // Handle the JSON format: {"datetime1":"note1","datetime2":"note2"} (legacy)
    // or {"datetime1":{"note":"note1","author_id":"...","author_name":"..."}} (new format)
    const parsed = JSON.parse(notesString);
    return Object.entries(parsed).map(([datetime, value]) => {
      if (typeof value === 'string') {
        // Legacy format: just a string
        return {
          datetime,
          note: value,
          author_id: null,
          author_name: 'Unknown'
        };
      } else if (typeof value === 'object' && value !== null) {
        // New format: object with note, author_id, author_name
        return {
          datetime,
          note: (value as any).note || '',
          author_id: (value as any).author_id || null,
          author_name: (value as any).author_name || 'Unknown'
        };
      } else {
        // Fallback
        return {
          datetime,
          note: String(value),
          author_id: null,
          author_name: 'Unknown'
        };
      }
    }).sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
  } catch {
    // Handle legacy format - convert to new format using current date
    const fallbackDate = new Date().toISOString();
    return notesString ? [{
      datetime: fallbackDate,
      note: notesString,
      author_id: null,
      author_name: 'Unknown'
    }] : [];
  }
};

const getLatestNote = (notesString: string): string => {
  const notes = parseNotesJson(notesString);
  return notes.length > 0 ? notes[0].note : "";
};

const FILTER_STORAGE_KEY = 'recruitment_filters_v1';

type RecruitmentFilterState = {
  searchTerm: string;
  emailFilter: string;
  phoneFilter: string;
  recruiterFilter: string;
  hasNotesFilter: string;
  responseStatusFilter: string;
  responseChannelFilter: string;
  contactedFilter: string;
  roleFilter: string;
  typeformSentFilter: string;
  typeformCompletedFilter: string;
  candidateStatusFilter: string;
  stageFilter: string;
  hasCallSummaryFilter: string;
  page: number;
  localSearchTerm: string;
  localEmailFilter: string;
  localPhoneFilter: string;
  localRecruiterFilter: string;
  localHasNotesFilter: string;
  localResponseStatusFilter: string;
  localResponseChannelFilter: string;
  localContactedFilter: string;
  localRoleFilter: string;
  localTypeformSentFilter: string;
  localTypeformCompletedFilter: string;
  localCandidateStatusFilter: string;
  localStageFilter: string;
  localHasCallSummaryFilter: string;
  filtersExpanded: boolean;
  scrollY: number;
};

const defaultFilterState: RecruitmentFilterState = {
  searchTerm: "",
  emailFilter: "",
  phoneFilter: "",
  recruiterFilter: "all",
  hasNotesFilter: "all",
  responseStatusFilter: "all",
  responseChannelFilter: "all",
  contactedFilter: "all",
  roleFilter: "all",
  typeformSentFilter: "all",
  typeformCompletedFilter: "all",
  candidateStatusFilter: "all",
  stageFilter: "all",
  hasCallSummaryFilter: "all",
  page: 1,
  localSearchTerm: "",
  localEmailFilter: "",
  localPhoneFilter: "",
  localRecruiterFilter: "all",
  localHasNotesFilter: "all",
  localResponseStatusFilter: "all",
  localResponseChannelFilter: "all",
  localContactedFilter: "all",
  localRoleFilter: "all",
  localTypeformSentFilter: "all",
  localTypeformCompletedFilter: "all",
  localCandidateStatusFilter: "all",
  localStageFilter: "all",
  localHasCallSummaryFilter: "all",
  filtersExpanded: false,
  scrollY: 0,
};

export default function RecruitmentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isAdvisor = useIsAdvisor();
  const isRecruiter = useIsRecruiter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [recruiterNames, setRecruiterNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [recruiterFilter, setRecruiterFilter] = useState("all");
  const [emailFilter, setEmailFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [hasNotesFilter, setHasNotesFilter] = useState("all");
  const [responseStatusFilter, setResponseStatusFilter] = useState("all");
  const [responseChannelFilter, setResponseChannelFilter] = useState("all");
  const [contactedFilter, setContactedFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [quickNote, setQuickNote] = useState("");
  const [communicationStats, setCommunicationStats] = useState<Record<number, any>>({});
  const [roleFilter, setRoleFilter] = useState("all");
  const [typeformSentFilter, setTypeformSentFilter] = useState("all");
  const [typeformCompletedFilter, setTypeformCompletedFilter] = useState("all");
  const [candidateStatusFilter, setCandidateStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [hasCallSummaryFilter, setHasCallSummaryFilter] = useState("all");
  
  // State for call summary
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [candidateCalls, setCandidateCalls] = useState<Record<number, any[]>>({});
  
  // State for onboarding confirmation dialog
  const [onboardingDialogOpen, setOnboardingDialogOpen] = useState(false);
  const [candidateToOnboard, setCandidateToOnboard] = useState<Candidate | null>(null);
  const [isAddingToOnboarding, setIsAddingToOnboarding] = useState(false);
  
  // Local filter states that don't trigger search automatically
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [localEmailFilter, setLocalEmailFilter] = useState("");
  const [localPhoneFilter, setLocalPhoneFilter] = useState("");
  const [localRecruiterFilter, setLocalRecruiterFilter] = useState("all");
  const [localHasNotesFilter, setLocalHasNotesFilter] = useState("all");
  const [localResponseStatusFilter, setLocalResponseStatusFilter] = useState("all");
  const [localResponseChannelFilter, setLocalResponseChannelFilter] = useState("all");
  const [localContactedFilter, setLocalContactedFilter] = useState("all");
  const [localTypeformSentFilter, setLocalTypeformSentFilter] = useState("all");
  const [localTypeformCompletedFilter, setLocalTypeformCompletedFilter] = useState("all");
  const [localCandidateStatusFilter, setLocalCandidateStatusFilter] = useState("all");
  const [localStageFilter, setLocalStageFilter] = useState("all");
  const [localHasCallSummaryFilter, setLocalHasCallSummaryFilter] = useState("all");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [roles, setRoles] = useState<string[]>([]);
  const [localRoleFilter, setLocalRoleFilter] = useState("all");
  const filtersStateRef = useRef<RecruitmentFilterState>(defaultFilterState);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [pendingScroll, setPendingScroll] = useState<number | null>(null);

  // Check if user has access to recruitment page (only recruiters and managers)
  const hasAccess = isAdmin || isRecruiter;

  const persistScrollPosition = useCallback((scrollY: number) => {
    if (typeof window === "undefined") return;
    const nextState: RecruitmentFilterState = {
      ...(filtersStateRef.current ?? defaultFilterState),
      scrollY,
    };
    filtersStateRef.current = nextState;
    try {
      sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(nextState));
    } catch (error) {
      console.error("Failed to persist recruitment scroll position:", error);
    }
  }, []);

  const persistStateBeforeNavigate = useCallback(() => {
    const container = scrollContainerRef.current ?? (typeof document !== "undefined" ? document.querySelector("main") as HTMLElement | null : null);
    if (container) {
      scrollContainerRef.current = container;
      persistScrollPosition(container.scrollTop);
    } else if (typeof window !== "undefined") {
      persistScrollPosition(window.scrollY);
    }
  }, [persistScrollPosition]);

  useEffect(() => {
    if (typeof window === "undefined") {
      setFiltersInitialized(true);
      return;
    }

    try {
      const storedRaw = sessionStorage.getItem(FILTER_STORAGE_KEY);
      if (storedRaw) {
        const parsed = JSON.parse(storedRaw);
        const normalized: RecruitmentFilterState = {
          ...defaultFilterState,
          searchTerm: typeof parsed.searchTerm === "string" ? parsed.searchTerm : defaultFilterState.searchTerm,
          emailFilter: typeof parsed.emailFilter === "string" ? parsed.emailFilter : defaultFilterState.emailFilter,
          phoneFilter: typeof parsed.phoneFilter === "string" ? parsed.phoneFilter : defaultFilterState.phoneFilter,
          recruiterFilter: typeof parsed.recruiterFilter === "string" ? parsed.recruiterFilter : defaultFilterState.recruiterFilter,
          hasNotesFilter: typeof parsed.hasNotesFilter === "string" ? parsed.hasNotesFilter : defaultFilterState.hasNotesFilter,
          responseStatusFilter: typeof parsed.responseStatusFilter === "string" ? parsed.responseStatusFilter : defaultFilterState.responseStatusFilter,
          responseChannelFilter: typeof parsed.responseChannelFilter === "string" ? parsed.responseChannelFilter : defaultFilterState.responseChannelFilter,
          contactedFilter: typeof parsed.contactedFilter === "string" ? parsed.contactedFilter : defaultFilterState.contactedFilter,
          roleFilter: typeof parsed.roleFilter === "string" ? parsed.roleFilter : defaultFilterState.roleFilter,
          typeformSentFilter: typeof parsed.typeformSentFilter === "string" ? parsed.typeformSentFilter : defaultFilterState.typeformSentFilter,
          typeformCompletedFilter: typeof parsed.typeformCompletedFilter === "string" ? parsed.typeformCompletedFilter : defaultFilterState.typeformCompletedFilter,
          candidateStatusFilter: typeof parsed.candidateStatusFilter === "string" ? parsed.candidateStatusFilter : defaultFilterState.candidateStatusFilter,
          stageFilter: typeof parsed.stageFilter === "string" ? parsed.stageFilter : defaultFilterState.stageFilter,
          hasCallSummaryFilter: typeof parsed.hasCallSummaryFilter === "string" ? parsed.hasCallSummaryFilter : defaultFilterState.hasCallSummaryFilter,
          page: typeof parsed.page === "number" && parsed.page > 0 ? parsed.page : defaultFilterState.page,
          localSearchTerm: typeof parsed.localSearchTerm === "string" ? parsed.localSearchTerm : parsed.searchTerm ?? defaultFilterState.localSearchTerm,
          localEmailFilter: typeof parsed.localEmailFilter === "string" ? parsed.localEmailFilter : defaultFilterState.localEmailFilter,
          localPhoneFilter: typeof parsed.localPhoneFilter === "string" ? parsed.localPhoneFilter : defaultFilterState.localPhoneFilter,
          localRecruiterFilter: typeof parsed.localRecruiterFilter === "string" ? parsed.localRecruiterFilter : defaultFilterState.localRecruiterFilter,
          localHasNotesFilter: typeof parsed.localHasNotesFilter === "string" ? parsed.localHasNotesFilter : defaultFilterState.localHasNotesFilter,
          localResponseStatusFilter: typeof parsed.localResponseStatusFilter === "string" ? parsed.localResponseStatusFilter : defaultFilterState.localResponseStatusFilter,
          localResponseChannelFilter: typeof parsed.localResponseChannelFilter === "string" ? parsed.localResponseChannelFilter : defaultFilterState.localResponseChannelFilter,
          localContactedFilter: typeof parsed.localContactedFilter === "string" ? parsed.localContactedFilter : defaultFilterState.localContactedFilter,
          localRoleFilter: typeof parsed.localRoleFilter === "string" ? parsed.localRoleFilter : defaultFilterState.localRoleFilter,
          localTypeformSentFilter: typeof parsed.localTypeformSentFilter === "string" ? parsed.localTypeformSentFilter : defaultFilterState.localTypeformSentFilter,
          localTypeformCompletedFilter: typeof parsed.localTypeformCompletedFilter === "string" ? parsed.localTypeformCompletedFilter : defaultFilterState.localTypeformCompletedFilter,
          localCandidateStatusFilter: typeof parsed.localCandidateStatusFilter === "string" ? parsed.localCandidateStatusFilter : defaultFilterState.localCandidateStatusFilter,
          localStageFilter: typeof parsed.localStageFilter === "string" ? parsed.localStageFilter : defaultFilterState.localStageFilter,
          localHasCallSummaryFilter: typeof parsed.localHasCallSummaryFilter === "string" ? parsed.localHasCallSummaryFilter : defaultFilterState.localHasCallSummaryFilter,
          filtersExpanded: typeof parsed.filtersExpanded === "boolean" ? parsed.filtersExpanded : defaultFilterState.filtersExpanded,
          scrollY: typeof parsed.scrollY === "number" ? parsed.scrollY : defaultFilterState.scrollY,
        };

        filtersStateRef.current = normalized;

        setSearchTerm(normalized.searchTerm);
        setEmailFilter(normalized.emailFilter);
        setPhoneFilter(normalized.phoneFilter);
        setRecruiterFilter(normalized.recruiterFilter);
        setHasNotesFilter(normalized.hasNotesFilter);
        setResponseStatusFilter(normalized.responseStatusFilter);
        setResponseChannelFilter(normalized.responseChannelFilter);
        setContactedFilter(normalized.contactedFilter);
        setRoleFilter(normalized.roleFilter);
        setTypeformSentFilter(normalized.typeformSentFilter);
        setTypeformCompletedFilter(normalized.typeformCompletedFilter);
        setCandidateStatusFilter(normalized.candidateStatusFilter);
        setStageFilter(normalized.stageFilter);
        setHasCallSummaryFilter(normalized.hasCallSummaryFilter);
        setPage(normalized.page);

        setLocalSearchTerm(normalized.localSearchTerm);
        setLocalEmailFilter(normalized.localEmailFilter);
        setLocalPhoneFilter(normalized.localPhoneFilter);
        setLocalRecruiterFilter(normalized.localRecruiterFilter);
        setLocalHasNotesFilter(normalized.localHasNotesFilter);
        setLocalResponseStatusFilter(normalized.localResponseStatusFilter);
        setLocalResponseChannelFilter(normalized.localResponseChannelFilter);
        setLocalContactedFilter(normalized.localContactedFilter);
        setLocalRoleFilter(normalized.localRoleFilter);
        setLocalTypeformSentFilter(normalized.localTypeformSentFilter);
        setLocalTypeformCompletedFilter(normalized.localTypeformCompletedFilter);
        setLocalCandidateStatusFilter(normalized.localCandidateStatusFilter);
        setLocalStageFilter(normalized.localStageFilter);
        setLocalHasCallSummaryFilter(normalized.localHasCallSummaryFilter);
        setFiltersExpanded(normalized.filtersExpanded);
        setPendingScroll(normalized.scrollY);
      } else {
        filtersStateRef.current = defaultFilterState;
      }
    } catch (error) {
      console.error("Failed to load recruitment filters from session storage:", error);
      filtersStateRef.current = defaultFilterState;
    } finally {
      setFiltersInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!filtersInitialized) return;

    const nextState: RecruitmentFilterState = {
      searchTerm,
      emailFilter,
      phoneFilter,
      recruiterFilter,
      hasNotesFilter,
      responseStatusFilter,
      responseChannelFilter,
      contactedFilter,
      roleFilter,
      typeformSentFilter,
      typeformCompletedFilter,
      candidateStatusFilter,
      stageFilter,
      hasCallSummaryFilter,
      page,
      localSearchTerm,
      localEmailFilter,
      localPhoneFilter,
      localRecruiterFilter,
      localHasNotesFilter,
      localResponseStatusFilter,
      localResponseChannelFilter,
      localContactedFilter,
      localRoleFilter,
      localTypeformSentFilter,
      localTypeformCompletedFilter,
      localCandidateStatusFilter,
      localStageFilter,
      localHasCallSummaryFilter,
      filtersExpanded,
      scrollY: filtersStateRef.current?.scrollY ?? 0,
    };

    filtersStateRef.current = nextState;

    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(nextState));
      } catch (error) {
        console.error("Failed to persist recruitment filters:", error);
      }
    }
  }, [
    filtersInitialized,
    searchTerm,
    emailFilter,
    phoneFilter,
    recruiterFilter,
    hasNotesFilter,
    responseStatusFilter,
    responseChannelFilter,
    contactedFilter,
    roleFilter,
    typeformSentFilter,
    typeformCompletedFilter,
    page,
    localSearchTerm,
    localEmailFilter,
    localPhoneFilter,
    localRecruiterFilter,
    localHasNotesFilter,
    localResponseStatusFilter,
    localResponseChannelFilter,
    localContactedFilter,
    localRoleFilter,
    localTypeformSentFilter,
    localTypeformCompletedFilter,
    localCandidateStatusFilter,
    filtersExpanded,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let searchFrameId: number | null = null;
    let throttledFrameId: number | null = null;
    let container: HTMLElement | null = null;

    const handleScroll = () => {
      if (!container) return;
      if (throttledFrameId) {
        cancelAnimationFrame(throttledFrameId);
      }
      throttledFrameId = window.requestAnimationFrame(() => {
        persistScrollPosition(container!.scrollTop);
      });
    };

    const findContainer = () => {
      const found = document.querySelector("main");
      if (!found || !(found instanceof HTMLElement)) {
        searchFrameId = window.requestAnimationFrame(findContainer);
        return;
      }

      container = found;
      scrollContainerRef.current = container;
      container.addEventListener("scroll", handleScroll, { passive: true });
    };

    findContainer();

    return () => {
      if (searchFrameId) {
        cancelAnimationFrame(searchFrameId);
      }
      if (throttledFrameId) {
        cancelAnimationFrame(throttledFrameId);
      }
      if (container) {
        container.removeEventListener("scroll", handleScroll);
        if (scrollContainerRef.current === container) {
          scrollContainerRef.current = null;
        }
      }
    };
  }, [persistScrollPosition]);

  useEffect(() => {
    if (pendingScroll === null) return;
    if (loading) return;
    if (typeof window === "undefined") return;

    const container = scrollContainerRef.current ?? document.querySelector("main");
    if (!container || !(container instanceof HTMLElement)) {
      return;
    }

    scrollContainerRef.current = container;

    const applyScroll = () => {
      container.scrollTo({ top: pendingScroll, left: 0, behavior: "auto" });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(applyScroll);
    });

    setPendingScroll(null);
  }, [pendingScroll, loading]);

  // If user doesn't have access, show unauthorized message
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the recruitment page.
          </p>
          <p className="text-sm text-gray-500">
            Only recruiters and managers can access this page.
          </p>
        </div>
      </div>
    );
  }

  // Column definitions for candidates
  const columnDefinitions = [
    { key: "actions", label: "Actions" },
    // Basic Information
    { key: "full_name", label: "Full Name" },
    { key: "email", label: "Email" },
    { key: "phone_number", label: "Phone" },
    { key: "position", label: "Position" },
    { key: "general_location", label: "Location" },
    { key: "zip_code", label: "Zip Code" },
    { key: "headline", label: "Headline" },
    { key: "current_title", label: "Current Title" },
    { key: "current_company", label: "Current Company" },
    { key: "current_position_start_date", label: "Position Start Date" },
    { key: "education_degree", label: "Education Degree" },
    { key: "education_institution", label: "Education Institution" },
    { key: "profile_url", label: "Profile URL" },
    { key: "date_applied", label: "Date Applied" },
    { key: "current_stage", label: "Current Stage" },
    { key: "job_id", label: "Job ID" },
    { key: "job_url", label: "Job URL" },
    { key: "ats_job_id", label: "ATS Job ID" },
    { key: "minimum_salary", label: "Min Salary" },
    { key: "maximum_salary", label: "Max Salary" },
    { key: "currency_code", label: "Currency" },
    { key: "compensation_period", label: "Compensation Period" },
    { key: "hiring_project_id", label: "Hiring Project ID" },
    { key: "hiring_project_title", label: "Hiring Project Title" },
    { key: "contract_id", label: "Contract ID" },
    { key: "contract_name", label: "Contract Name" },
    { key: "screening_questions", label: "Screening Questions" },
    { key: "meeting_date", label: "Meeting Date" },
    { key: "interviewer_email", label: "Interviewer Email" },
    { key: "recruiter_name", label: "Recruiter Name" },
    { key: "meeting_link_sent", label: "Meeting Link Sent" },
    { key: "notes", label: "Notes" },
    { key: "communication_stats", label: "Communication" },
    { key: "application_form_submission", label: "Application Form" },
    { key: "meeting_link", label: "Meeting Link" },
    { key: "typeform_sent", label: "Typeform Sent" },
    { key: "typeform_completed", label: "Typeform Completed" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Created At" },
  ] as const;

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Set<keyof Candidate | 'actions' | 'communication_stats'>>(
    new Set([
      "actions",
      "full_name",
      "email", 
      "phone_number",
      "position",
      "recruiter_name",
      "status",
      "created_at",
      "notes",
      "communication_stats",
      "typeform_sent",
      "typeform_completed"
    ])
  );

  // Toggle column visibility
  const toggleColumnVisibility = (column: keyof Candidate | 'actions' | 'communication_stats') => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(column)) {
        newSet.delete(column);
      } else {
        newSet.add(column);
      }
      return newSet;
    });
  };

  // Handle quick note submission
  const handleQuickNote = async () => {
    if (!selectedCandidate || !quickNote.trim()) return;

    try {
      const response = await fetch(`/api/candidates/${selectedCandidate.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note: quickNote.trim() }),
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Note added successfully",
        });
        setQuickNoteOpen(false);
        setQuickNote("");
        setSelectedCandidate(null);
        // Reload candidates to show updated notes
        window.location.reload();
      } else {
        console.error("Error adding note:", result.error);
        toast({
          title: "Error",
          description: result.error || "Failed to add note",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding note:", error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    }
  };

  // Open quick note dialog
  const openQuickNote = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setQuickNote("");
    setQuickNoteOpen(true);
  };

  // Apply filters function
  const applyFilters = () => {
    setSearchTerm(localSearchTerm);
    setEmailFilter(localEmailFilter);
    setPhoneFilter(localPhoneFilter);
    setRecruiterFilter(localRecruiterFilter);
    setHasNotesFilter(localHasNotesFilter);
    setResponseStatusFilter(localResponseStatusFilter);
    setResponseChannelFilter(localResponseChannelFilter);
    setContactedFilter(localContactedFilter);
    setRoleFilter(localRoleFilter);
    setTypeformSentFilter(localTypeformSentFilter);
    setTypeformCompletedFilter(localTypeformCompletedFilter);
    setCandidateStatusFilter(localCandidateStatusFilter);
    setStageFilter(localStageFilter);
    setHasCallSummaryFilter(localHasCallSummaryFilter);
    setPage(1);
    const container = scrollContainerRef.current ?? (typeof document !== "undefined" ? document.querySelector("main") : null);
    if (container && container instanceof HTMLElement) {
      container.scrollTo({ top: 0, left: 0, behavior: "auto" });
      persistScrollPosition(0);
    } else if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0 });
      persistScrollPosition(0);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setLocalSearchTerm("");
    setLocalEmailFilter("");
    setLocalPhoneFilter("");
    setLocalRecruiterFilter("all");
    setLocalHasNotesFilter("all");
    setLocalResponseStatusFilter("all");
    setLocalResponseChannelFilter("all");
    setLocalContactedFilter("all");
    setLocalRoleFilter("all");
    setLocalTypeformSentFilter("all");
    setLocalTypeformCompletedFilter("all");
    setLocalCandidateStatusFilter("all");
    setLocalStageFilter("all");
    setLocalHasCallSummaryFilter("all");
    setSearchTerm("");
    setEmailFilter("");
    setPhoneFilter("");
    setRecruiterFilter("all");
    setHasNotesFilter("all");
    setResponseStatusFilter("all");
    setResponseChannelFilter("all");
    setContactedFilter("all");
    setRoleFilter("all");
    setTypeformSentFilter("all");
    setTypeformCompletedFilter("all");
    setCandidateStatusFilter("all");
    setStageFilter("all");
    setHasCallSummaryFilter("all");
    setPage(1);
    const container = scrollContainerRef.current ?? (typeof document !== "undefined" ? document.querySelector("main") : null);
    if (container && container instanceof HTMLElement) {
      container.scrollTo({ top: 0, left: 0, behavior: "auto" });
      persistScrollPosition(0);
    } else if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0 });
      persistScrollPosition(0);
    }
  };

  // Load communication statistics and get filtered candidate IDs
  const loadCommunicationStats = async (candidateIds: number[]) => {
    if (candidateIds.length === 0) return { stats: {}, filteredIds: [] };
    
    try {
      const params = new URLSearchParams({
        candidate_ids: candidateIds.join(','),
      });
      
      if (responseStatusFilter !== "all") {
        params.append("response_status", responseStatusFilter);
      }
      if (responseChannelFilter !== "all") {
        params.append("response_channel", responseChannelFilter);
      }
      if (contactedFilter !== "all") {
        if (contactedFilter === "contacted") {
          params.append("message_count", "gte:1");
        } else if (contactedFilter === "not_contacted") {
          params.append("message_count", "eq:0");
        }
      }

      const response = await fetch(`/api/candidates/communication-stats?${params}`);
      const result = await response.json();
      
      if (response.ok) {
        const statsMap: Record<number, any> = {};
        const filteredIds: number[] = [];
        
        result.data.forEach((stat: any) => {
          statsMap[stat.candidate_id] = stat;
          filteredIds.push(stat.candidate_id);
        });
        
        return { stats: statsMap, filteredIds };
      } else {
        console.error("Error loading communication stats:", result.error);
        return { stats: {}, filteredIds: candidateIds };
      }
    } catch (error) {
      console.error("Error loading communication stats:", error);
      return { stats: {}, filteredIds: candidateIds };
    }
  };

  const handleUpdateStatus = async (
    candidate_id: number,
    status: "not_suitable" | "interview_booked" | "interview_attended" | "not_interested" | "has_position_already"
  ) => {
    if (!candidate_id) {
      toast({
        title: "Error",
        description: "Invalid candidate ID",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateCandidateStatus(candidate_id, status);
      const statusLabels: Record<string, string> = {
        interview_attended: "Interview Attended",
        interview_booked: "Interview Booked",
        not_suitable: "Not Suitable",
        not_interested: "Not interested",
        has_position_already: "Has a position already",
      };
      toast({
        title: "Success",
        description: `Candidate status updated to ${statusLabels[status] ?? status}`,
      });
      
      setRefreshFlag((prev) => prev + 1);
    } catch (err) {
      console.error("Error updating status:", err);
      toast({
        title: "Error",
        description: "Failed to update candidate status",
        variant: "destructive",
      });
    }
  };

  // Handle add to onboarding
  const handleAddToOnboarding = (candidate: Candidate) => {
    setCandidateToOnboard(candidate);
    setOnboardingDialogOpen(true);
  };

  const confirmAddToOnboarding = async () => {
    if (!candidateToOnboard) return;

    setIsAddingToOnboarding(true);
    try {
      // Wait for webhook response before showing success
      const response = await fetch(`/api/candidates/${candidateToOnboard.id}/add-to-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Parse response
      const result = await response.json();

      // Only show success if webhook responded successfully
      if (response.ok && result.success && result.webhook_response !== undefined) {
        toast({
          title: "Success",
          description: `${candidateToOnboard.full_name || 'Candidate'} has been added to onboarding`,
        });
        setOnboardingDialogOpen(false);
        setCandidateToOnboard(null);
      } else {
        // Webhook failed or didn't respond properly
        const errorMessage = result.error || result.message || 'Failed to add candidate to onboarding. Webhook did not respond successfully.';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error adding candidate to onboarding:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add candidate to onboarding",
        variant: "destructive",
      });
    } finally {
      setIsAddingToOnboarding(false);
    }
  };

  // Fetch calls for a specific candidate
  const fetchCandidateCalls = useCallback(async (candidateId: number) => {
    try {
      const { data, error } = await supabase
        .from("candidate_calls")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCandidateCalls((prev) => ({
        ...prev,
        [candidateId]: data || [],
      }));

      return data || [];
    } catch (error) {
      console.error("Error fetching candidate calls:", error);
      return [];
    }
  }, []);

  // Check if candidates have been called
  const checkCandidateCalledStatus = useCallback(async (candidateIds: number[]) => {
    try {
      if (candidateIds.length === 0) {
        return new Set<number>();
      }

      const { data, error } = await supabase
        .from("candidate_calls")
        .select("candidate_id")
        .in("candidate_id", candidateIds);

      if (error) throw error;

      const calledCandidateIds = (data || [])
        .map((call) => call.candidate_id)
        .filter((id): id is number => id !== null && id !== undefined && typeof id === 'number')
        .map((id) => Number(id));

      return new Set(calledCandidateIds);
    } catch (error) {
      console.error("Error checking candidate call status:", error);
      return new Set<number>();
    }
  }, []);

  // Handle viewing call summary
  const handleViewCallSummary = useCallback(
    async (candidateId: number, candidateName?: string | null, candidatePhone?: string | null) => {
      try {
        let calls = candidateCalls[candidateId];

        if (!calls) {
          calls = await fetchCandidateCalls(candidateId);
        }

        if (calls && calls.length > 0) {
          setSelectedCall({
            ...calls[0],
            candidateName,
            candidatePhone,
          });
          setIsCallDialogOpen(true);
        } else {
          toast({
            title: "No Call History",
            description: "No call history found for this candidate",
            variant: "default",
          });
        }
      } catch (error) {
        console.error("Error viewing call summary:", error);
        toast({
          title: "Error",
          description: "Failed to load call details",
          variant: "destructive",
        });
      }
    },
    [candidateCalls, fetchCandidateCalls]
  );

  // Load candidates
  useEffect(() => {
    if (!filtersInitialized) return;

    async function loadCandidates() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        });
        
        // Add role-based parameters
        if (isAdmin) {
          params.append("isAdmin", "true");
        } else if (isRecruiter) {
          params.append("isRecruiter", "true");
        } else if (isAdvisor && user?.id) {
          // Find the current user in the users array to get database ID
          const currentUser = users.find(u => u.user_id === user.id);
          console.log("Advisor filtering:", { 
            authUserId: user.id, 
            currentUser, 
            usersCount: users.length 
          });
          if (currentUser) {
            params.append("advisorId", currentUser.id.toString());
          }
        }
        
        if (searchTerm.trim() !== "") params.append("search", searchTerm.trim());
        if (recruiterFilter !== "all" && recruiterFilter.trim() !== "") {
          params.append("recruiter", recruiterFilter);
          console.log("[Recruiter Filter] Sending recruiter filter:", recruiterFilter);
        }
        if (emailFilter.trim() !== "") params.append("email", emailFilter.trim());
        if (phoneFilter.trim() !== "") params.append("phone", phoneFilter.trim());
        if (hasNotesFilter !== "all") params.append("has_notes", hasNotesFilter);
        if (roleFilter !== "all") params.append("role", roleFilter);
        if (typeformSentFilter !== "all") params.append("typeform_sent", typeformSentFilter);
        if (typeformCompletedFilter !== "all") params.append("typeform_completed", typeformCompletedFilter);
        if (candidateStatusFilter !== "all") params.append("candidate_status", candidateStatusFilter);
        if (stageFilter !== "all") params.append("stage", stageFilter);
        if (hasCallSummaryFilter !== "all") params.append("has_call_summary", hasCallSummaryFilter);
        
        // Pass communication filters to API (they will be applied at database level)
        if (responseStatusFilter !== "all") params.append("response_status", responseStatusFilter);
        if (responseChannelFilter !== "all") params.append("response_channel", responseChannelFilter);
        if (contactedFilter !== "all") params.append("contacted", contactedFilter);

        const response = await fetch(`/api/candidates?${params}`);
        const result = await response.json();
        
        if (response.ok) {
          let candidates = result.data;
          let totalCount = result.count;
          
          // Load communication statistics for display (even if filters are applied)
          const candidateIds = candidates.map((c: Candidate) => c.id);
          const { stats } = await loadCommunicationStats(candidateIds);
          setCommunicationStats(stats);
          
          // Check call status for candidates
          const calledCandidateIds = await checkCandidateCalledStatus(candidateIds);
          
          // Add hasCalled property to candidates
          const candidatesWithCallStatus = candidates.map((candidate: Candidate) => ({
            ...candidate,
            hasCalled: calledCandidateIds.has(candidate.id),
          }));
          
          setCandidates(candidatesWithCallStatus);
          setTotalCount(totalCount);
        } else {
          console.error("Error loading candidates:", result.error);
        }
      } catch (error) {
        console.error("Error loading candidates:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCandidates();
  }, [
    page,
    pageSize,
    searchTerm,
    phoneFilter,
    recruiterFilter,
    emailFilter,
    hasNotesFilter,
    responseStatusFilter,
    responseChannelFilter,
    contactedFilter,
    roleFilter,
    typeformSentFilter,
    typeformCompletedFilter,
    candidateStatusFilter,
    stageFilter,
    hasCallSummaryFilter,
    isAdvisor,
    isAdmin,
    user?.id,
    users,
    refreshFlag,
    filtersInitialized,
    checkCandidateCalledStatus,
  ]);

  // Load recruiter names from candidates table
  useEffect(() => {
    async function loadRecruiterNames() {
      try {
        const response = await fetch("/api/candidates/recruiters");
        const result = await response.json();
        
        if (response.ok) {
          setRecruiterNames(result.data || []);
        } else {
          console.error("Error loading recruiter names:", result.error);
          setRecruiterNames([]);
        }
      } catch (error) {
        console.error("Error loading recruiter names:", error);
        setRecruiterNames([]);
      }
    }

    async function loadUsers() {
      try {
        const response = await fetch("/api/users");
        const result = await response.json();
        
        if (response.ok) {
          // Map the API response to match the User interface (fullname -> fullName)
          const mappedUsers = (result.data || []).map((user: any) => ({
            id: user.id,
            fullName: user.fullname || user.fullName || "", // Handle both cases
            email: user.email || "",
            user_id: user.user_id || "",
          }));
          setUsers(mappedUsers);
        } else {
          console.error("Error loading users:", result.error);
          setUsers([]); // Ensure users is always an array
        }
      } catch (error) {
        console.error("Error loading users:", error);
        setUsers([]); // Ensure users is always an array
      }
    }

    async function loadUsersRoles() {
      try {
        const response = await fetch("/api/candidates/positions");
        const result = await response.json();
        
        if (response.ok) {
          setRoles(result);
        } else {
          console.error("Error loading roles:", result.error);
        }
      } catch (error) {
        console.error("Error loading roles:", error);
      }
    }

    // Load recruiter names from candidates table
    loadRecruiterNames();
    // Load users for both admins and advisors (for other purposes)
    loadUsers();
    loadUsersRoles();
  }, []);

  // Get recruiter name from users table
  const getRecruiterName = (recruiterId: number | null) => {
    if (!recruiterId) return "Unassigned";
    const user = users.find(u => u.id === recruiterId);
    return user ? user.fullName : `User ID: ${recruiterId}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Pagination controls
  const totalPages = Math.ceil(totalCount / pageSize);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recruitment</h1>
            <p className="text-gray-600 mt-2">
              {isAdmin 
                ? "Manage all candidate applications and recruitment process" 
                : isRecruiter
                ? "View and manage candidate applications"
                : "View your assigned candidate applications"
              }
            </p>
          </div>
          <Button
            onClick={() => router.push('/candidates/new')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Candidate
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filters & Search</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="flex items-center gap-2"
              >
                {filtersExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Hide Filters
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show Filters
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {filtersExpanded && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-input" className="text-sm font-medium">Search by Name</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search-input"
                    placeholder="Search candidates by full name..."
                    value={localSearchTerm}
                    onChange={(e) => setLocalSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email-input" className="text-sm font-medium">Filter by Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email-input"
                    placeholder="Enter email address..."
                    value={localEmailFilter}
                    onChange={(e) => setLocalEmailFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone-input" className="text-sm font-medium">Filter by Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone-input"
                    placeholder="Enter phone number..."
                    value={localPhoneFilter}
                    onChange={(e) => setLocalPhoneFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes-filter" className="text-sm font-medium">Notes Status</Label>
                <Select value={localHasNotesFilter} onValueChange={setLocalHasNotesFilter}>
                  <SelectTrigger id="notes-filter" className="w-full">
                    <SelectValue placeholder="Filter by notes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Candidates</SelectItem>
                    <SelectItem value="true">Has Notes</SelectItem>
                    <SelectItem value="false">No Notes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="response-status-filter" className="text-sm font-medium">Response Status</Label>
                <Select value={localResponseStatusFilter} onValueChange={setLocalResponseStatusFilter}>
                  <SelectTrigger id="response-status-filter" className="w-full">
                    <SelectValue placeholder="Response status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Response Status</SelectItem>
                    <SelectItem value="responded">Has Responded</SelectItem>
                    <SelectItem value="no_response">No Response</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="response-channel-filter" className="text-sm font-medium">Response Channel</Label>
                <Select value={localResponseChannelFilter} onValueChange={setLocalResponseChannelFilter}>
                  <SelectTrigger id="response-channel-filter" className="w-full">
                    <SelectValue placeholder="Response channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="email">Responded via Email</SelectItem>
                    <SelectItem value="sms">Responded via SMS</SelectItem>
                    <SelectItem value="whatsapp">Responded via WhatsApp</SelectItem>
                    <SelectItem value="calls">Responded via Calls</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact-status-filter" className="text-sm font-medium">Contact Status</Label>
                <Select value={localContactedFilter} onValueChange={setLocalContactedFilter}>
                  <SelectTrigger id="contact-status-filter" className="w-full">
                    <SelectValue placeholder="Contact status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Candidates</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="not_contacted">Not Contacted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {(isAdmin || isRecruiter) && (
                <div className="space-y-2">
                  <Label htmlFor="recruiter-filter" className="text-sm font-medium">Recruiter</Label>
                  <Select value={localRecruiterFilter} onValueChange={setLocalRecruiterFilter}>
                    <SelectTrigger id="recruiter-filter" className="w-full">
                      <SelectValue placeholder="Filter by recruiter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Recruiters</SelectItem>
                      {recruiterNames && recruiterNames.length > 0 ? (
                        recruiterNames.map((name, index) => (
                          <SelectItem key={index} value={name}>
                            {name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="loading" disabled>Loading recruiters...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="role-filter" className="text-sm font-medium">Role</Label>
                <Select value={localRoleFilter} onValueChange={setLocalRoleFilter}>
                  <SelectTrigger id="role-filter" className="w-full">
                    <SelectValue placeholder="Filter by roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.filter((pos) => pos && pos.trim() !== "").map((role, index) => (
                      <SelectItem key={index} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="typeform-sent-filter" className="text-sm font-medium">Typeform Sent</Label>
                <Select value={localTypeformSentFilter} onValueChange={setLocalTypeformSentFilter}>
                  <SelectTrigger id="typeform-sent-filter" className="w-full">
                    <SelectValue placeholder="Filter by typeform sent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Candidates</SelectItem>
                    <SelectItem value="true">Typeform Sent</SelectItem>
                    <SelectItem value="false">Typeform Not Sent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="typeform-completed-filter" className="text-sm font-medium">Typeform Completed</Label>
                <Select value={localTypeformCompletedFilter} onValueChange={setLocalTypeformCompletedFilter}>
                  <SelectTrigger id="typeform-completed-filter" className="w-full">
                    <SelectValue placeholder="Filter by typeform completed" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Candidates</SelectItem>
                    <SelectItem value="true">Typeform Completed</SelectItem>
                    <SelectItem value="false">Typeform Not Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="candidate-status-filter" className="text-sm font-medium">Candidate Status</Label>
                <Select value={localCandidateStatusFilter} onValueChange={setLocalCandidateStatusFilter}>
                  <SelectTrigger id="candidate-status-filter" className="w-full">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="not_suitable">Not Suitable</SelectItem>
                    <SelectItem value="interview_booked">Interview Booked</SelectItem>
                    <SelectItem value="interview_attended">Interview Attended</SelectItem>
                    <SelectItem value="not_interested">Not interested</SelectItem>
                    <SelectItem value="has_position_already">Has a position already</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="stage-filter" className="text-sm font-medium">Stage</Label>
                <Select value={localStageFilter} onValueChange={setLocalStageFilter}>
                  <SelectTrigger id="stage-filter" className="w-full">
                    <SelectValue placeholder="Filter by stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="interview">Interview Sent</SelectItem>
                    <SelectItem value="joboffer">Job Offer Sent</SelectItem>
                    <SelectItem value="documents">Document Uploaded</SelectItem>
                    <SelectItem value="references">References Contacted</SelectItem>
                    <SelectItem value="contractsent">Contract Sent</SelectItem>
                    <SelectItem value="contractsigned">Contract Signed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="call-summary-filter" className="text-sm font-medium">Call Summary</Label>
                <Select value={localHasCallSummaryFilter} onValueChange={setLocalHasCallSummaryFilter}>
                  <SelectTrigger id="call-summary-filter" className="w-full">
                    <SelectValue placeholder="Filter by call summary" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Candidates</SelectItem>
                    <SelectItem value="true">Has Call Summary</SelectItem>
                    <SelectItem value="false">No Call Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Actions</Label>
                <div className="flex gap-2">
                  <Button onClick={applyFilters} className="flex items-center gap-2 flex-1">
                    <Search className="h-4 w-4" />
                    Search
                  </Button>
                  <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2 flex-1">
                    <Filter className="h-4 w-4" />
                    Clear
                  </Button>
                </div>
              </div>
            </div>
            </CardContent>
          )}
        </Card>

        {/* Candidates Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Candidates ({totalCount})</CardTitle>
                <CardDescription>
                  Manage candidate applications and track recruitment progress
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                    >
                      <Columns className="mr-2 h-4 w-4" />
                      Columns
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-2" align="end">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium leading-none">
                        Toggle columns
                      </h4>
                      <div className="space-y-1">
                        {columnDefinitions.map((column) => (
                          <div
                            key={column.key}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`col-${column.key}`}
                              checked={visibleColumns.has(
                                column.key as keyof Candidate
                              )}
                              onCheckedChange={() =>
                                toggleColumnVisibility(column.key as keyof Candidate)
                              }
                            />
                            <label
                              htmlFor={`col-${column.key}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {column.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="[&_tr]:border-b-0">
                  <TableRow className="bg-gray-100">
                    {columnDefinitions
                      .filter(col => visibleColumns.has(col.key as keyof Candidate | 'actions' | 'communication_stats'))
                      .map((column) => {
                        return (
                          <TableHead key={column.key}>
                            {column.label}
                          </TableHead>
                        );
                      })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate) => (
                    <TableRow
                      key={candidate.id}
                      className={`
        transition-colors duration-300 first:border-t
        ${
          candidate.status === "not_suitable"
            ? "bg-red-50 hover:bg-red-100 border-l-4 border-red-400"
            : candidate.status === "interview_booked"
            ? "bg-amber-50 hover:bg-amber-100 border-l-4 border-amber-400"
            : candidate.status === "interview_attended"
            ? "bg-green-50 hover:bg-green-100 border-l-4 border-green-400"
            : candidate.status === "not_interested"
            ? "bg-slate-50 hover:bg-slate-100 border-l-4 border-slate-400"
            : candidate.status === "has_position_already"
            ? "bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-400"
            : "hover:bg-gray-50"
        }
      `}

                    >
                      {columnDefinitions
                        .filter(col => visibleColumns.has(col.key as keyof Candidate | 'actions' | 'communication_stats'))
                        .map((columnDef) => {
                        const column = columnDef.key as keyof Candidate | 'actions' | 'communication_stats';
                        // Handle special cases for display
                        if (column === "full_name") {
                          return (
                            <TableCell key={column}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <div>
                                  <div className="font-medium">
                                    {candidate.full_name || "No name provided"}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          );
                        }

                        if (column === "email") {
                          return (
                            <TableCell key={column}>
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                {candidate.email || "-"}
                              </div>
                            </TableCell>
                          );
                        }

                        if (column === "phone_number") {
                          return (
                            <TableCell key={column}>
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {candidate.phone_number || "-"}
                              </div>
                            </TableCell>
                          );
                        }

                        if (columnDef.key === "recruiter_name") {
                          return (
                            <TableCell key={column}>
                              <div className="text-sm">
                                {candidate.recruiter_name || getRecruiterName(candidate.recruiter) || "Unassigned"}
                              </div>
                            </TableCell>
                          );
                        }

                        if (column === "recruiter_name") {
                          return (
                            <TableCell key={column}>
                              <div className="text-sm">
                                {candidate.recruiter_name || "Unassigned"}
                              </div>
                            </TableCell>
                          );
                        }

                        if (column === "created_at") {
                          return (
                            <TableCell key={column}>
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Calendar className="h-3 w-3" />
                                {formatDate(candidate.created_at)}
                              </div>
                            </TableCell>
                          );
                        }

                        // Handle notes with hover card and quick note button
                        if (column === "notes") {
                          const latestNote = getLatestNote(candidate.notes || "");
                          const allNotes = parseNotesJson(candidate.notes || "");
                          
                          return (
                            <TableCell
                              key={column}
                              className="max-w-[200px] p-0"
                            >
                              <div className="flex items-center gap-2 p-4">
                                {latestNote ? (
                                  <HoverCard>
                                    <HoverCardTrigger asChild>
                                      <div className="flex-1 cursor-help">
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
                                        <h4 className="text-sm font-semibold">All Notes</h4>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                          {allNotes.map((noteItem, index) => (
                                            <div key={index} className="border rounded p-2 bg-gray-50">
                                              <div className="text-xs text-gray-500 mb-1">
                                                {new Date(noteItem.datetime).toLocaleDateString('en-US', {
                                                  weekday: 'long',
                                                  year: 'numeric',
                                                  month: 'long',
                                                  day: 'numeric'
                                                })} at {new Date(noteItem.datetime).toLocaleTimeString('en-US', {
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })}
                                                {noteItem.author_name && noteItem.author_name !== 'Unknown' && noteItem.author_name !== 'Unknown User' && (
                                                  <span className="ml-2 text-gray-600">by {noteItem.author_name}</span>
                                                )}
                                              </div>
                                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{noteItem.note}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                ) : (
                                  <div className="flex-1 text-gray-400 text-sm">No notes</div>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openQuickNote(candidate)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          );
                        }

                        // Handle communication stats
                        if (column === "communication_stats") {
                          const stats = communicationStats[candidate.id];
                          
                          return (
                            <TableCell key={column}>
                              <div className="flex items-center gap-2">
                                {stats ? (
                                  <HoverCard>
                                    <HoverCardTrigger asChild>
                                      <div className="flex items-center gap-2 cursor-help">
                                        <div className="flex items-center gap-1">
                                          <MessageCircle className="h-4 w-4 text-blue-500" />
                                          <span className="text-sm font-medium">{stats.total_messages}</span>
                                        </div>
                                        {stats.has_responded ? (
                                          <div className="flex items-center gap-1">
                                            <Reply className="h-3 w-3 text-green-500" />
                                            <span className="text-xs text-green-600">Responded</span>
                                            <div className="flex items-center gap-1 ml-1">
                                              {stats.response_channels?.email && <Mail className="h-2 w-2 text-blue-500" />}
                                              {stats.response_channels?.sms && <MessageSquare className="h-2 w-2 text-green-500" />}
                                              {stats.response_channels?.whatsapp && <MessageSquare className="h-2 w-2 text-green-600" />}
                                              {stats.response_channels?.calls && <Phone className="h-2 w-2 text-purple-500" />}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1">
                                            <Reply className="h-3 w-3 text-gray-400" />
                                            <span className="text-xs text-gray-500">No response</span>
                                          </div>
                                        )}
                                      </div>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-80">
                                      <div className="space-y-3">
                                        <h4 className="text-sm font-semibold">Communication Statistics</h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                          <div>
                                            <div className="font-medium text-gray-700">Total Messages</div>
                                            <div className="text-lg font-bold text-blue-600">{stats.total_messages}</div>
                                          </div>
                                          <div>
                                            <div className="font-medium text-gray-700">Response Status</div>
                                            <div className={`text-sm font-medium ${stats.has_responded ? 'text-green-600' : 'text-gray-500'}`}>
                                              {stats.has_responded ? 'Has Responded' : 'No Response'}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="font-medium text-gray-700">Outbound</div>
                                            <div className="text-sm text-gray-600">{stats.outbound_messages}</div>
                                          </div>
                                          <div>
                                            <div className="font-medium text-gray-700">Inbound</div>
                                            <div className="text-sm text-gray-600">{stats.inbound_messages}</div>
                                          </div>
                                        </div>
                                        <div className="border-t pt-2">
                                          <div className="text-xs text-gray-500 mb-1">Channels</div>
                                          <div className="flex gap-4 text-xs">
                                            <span>Email: {stats.communication_channels.email}</span>
                                            <span>SMS/WhatsApp: {stats.communication_channels.sms_whatsapp}</span>
                                            <span>Calls: {stats.communication_channels.calls}</span>
                                          </div>
                                        </div>
                                        {stats.response_channels && (
                                          <div className="border-t pt-2">
                                            <div className="text-xs text-gray-500 mb-1">Response Channels</div>
                                            <div className="flex gap-2 text-xs">
                                              {stats.response_channels.email && (
                                                <span className="flex items-center gap-1 text-blue-600">
                                                  <Mail className="h-3 w-3" />
                                                  Email
                                                </span>
                                              )}
                                              {stats.response_channels.sms && (
                                                <span className="flex items-center gap-1 text-green-600">
                                                  <MessageSquare className="h-3 w-3" />
                                                  SMS
                                                </span>
                                              )}
                                              {stats.response_channels.whatsapp && (
                                                <span className="flex items-center gap-1 text-green-700">
                                                  <MessageSquare className="h-3 w-3" />
                                                  WhatsApp
                                                </span>
                                              )}
                                              {stats.response_channels.calls && (
                                                <span className="flex items-center gap-1 text-purple-600">
                                                  <Phone className="h-3 w-3" />
                                                  Calls
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {stats.latest_message_date && (
                                          <div className="border-t pt-2">
                                            <div className="text-xs text-gray-500">Latest Message</div>
                                            <div className="text-xs text-gray-600">
                                              {new Date(stats.latest_message_date).toLocaleDateString()} at{' '}
                                              {new Date(stats.latest_message_date).toLocaleTimeString()}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                ) : (
                                  <div className="flex items-center gap-2 text-gray-400">
                                    <MessageCircle className="h-4 w-4" />
                                    <span className="text-sm">Loading...</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          );
                        }

                        // Handle typeform_sent column
                        if (column === "typeform_sent") {
                          return (
                            <TableCell key={column}>
                              <div className="flex items-center gap-2">
                                {candidate.typeform_sent === true ? (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="text-sm font-medium">Sent</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-gray-400">
                                    <XCircle className="h-4 w-4" />
                                    <span className="text-sm">Not Sent</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          );
                        }

                        // Handle typeform_completed column
                        if (column === "typeform_completed") {
                          return (
                            <TableCell key={column}>
                              <div className="flex items-center gap-2">
                                {candidate.typeform_completed === true ? (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="text-sm font-medium">Completed</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-gray-400">
                                    <XCircle className="h-4 w-4" />
                                    <span className="text-sm">Not Completed</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          );
                        }

                        // Handle status column
                        if (column === "status") {
                          return (
                            <TableCell key={column}>
                              <div className="flex items-center gap-2">
                                {candidate.status === "not_suitable" ? (
                                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                                    Not Suitable
                                  </Badge>
                                ) : candidate.status === "interview_booked" ? (
                                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                                    Interview Booked
                                  </Badge>
                                ) : candidate.status === "interview_attended" ? (
                                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                                    Interview Attended
                                  </Badge>
                                ) : candidate.status === "not_interested" ? (
                                  <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-300">
                                    Not interested
                                  </Badge>
                                ) : candidate.status === "has_position_already" ? (
                                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                                    Has a position already
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                                    No Status
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          );
                        }

                        // Handle actions column
                        if (column === "actions") {
                          return (
                            <TableCell key={column}>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    persistStateBeforeNavigate();
                                    window.location.href = `/candidates/${candidate.id}`;
                                  }}
                                  className="h-8"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    persistStateBeforeNavigate();
                                    window.location.href = `/candidates/${candidate.id}/edit`;
                                  }}
                                  className="h-8"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                {candidate.phone_number && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(`tel:${candidate.phone_number}`, '_self')}
                                    className="h-8"
                                  >
                                    <PhoneCall className="h-4 w-4 mr-1" />
                                    Call
                                  </Button>
                                )}
                                <Button
                                  variant={candidate.hasCalled ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleViewCallSummary(candidate.id, candidate.full_name, candidate.phone_number)}
                                  title={
                                    candidate.hasCalled
                                      ? "View call summary"
                                      : "Not called yet"
                                  }
                                  className={`h-8 ${
                                    candidate.hasCalled
                                      ? "bg-green-600 hover:bg-green-700 text-white"
                                      : ""
                                  }`}
                                >
                                  <Phone className="h-4 w-4 mr-1" />
                                  {candidate.hasCalled ? "View Call Summary" : "Not Called Yet"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddToOnboarding(candidate)}
                                  className="h-8 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Add to Onboarding
                                </Button>
                                <div className="flex justify-end">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        Update Status
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-48 shadow-md"
                                    >
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleUpdateStatus(
                                            candidate.id,
                                            "not_suitable"
                                          )
                                        }
                                        className={`
                                          ${candidate.status === "not_suitable"
                                            ? "bg-red-100 text-red-700 font-medium"
                                            : "text-red-600 hover:bg-red-100 hover:text-red-700"}
                                          focus:bg-red-100 focus:text-red-700
                                          data-[highlighted]:bg-red-100 data-[highlighted]:text-red-700
                                          transition-colors duration-200 cursor-pointer
                                        `}
                                      >
                                        Not Suitable
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleUpdateStatus(
                                            candidate.id,
                                            "interview_booked"
                                          )
                                        }
                                        className={`
                                          ${
                                          candidate.status === "interview_booked"
                                          ? "bg-amber-50 text-amber-600 font-medium"
                                          : "text-amber-500 hover:bg-amber-100 hover:text-amber-700"
                                          }
                                          focus:bg-amber-100 focus:text-amber-700
                                          data-[highlighted]:bg-amber-100 data-[highlighted]:text-amber-700
                                          transition-colors duration-200 cursor-pointer
                                        `}
                                      >
                                        Interview Booked
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleUpdateStatus(
                                            candidate.id,
                                            "interview_attended"
                                          )
                                        }
                                        className={`
                                          ${
                                          candidate.status === "interview_attended"
                                          ? "bg-green-50 text-green-600 font-medium"
                                          : "text-green-600 hover:bg-green-100 hover:text-green-700"
                                          }
                                          focus:bg-green-100 focus:text-green-700
                                          data-[highlighted]:bg-green-100 data-[highlighted]:text-green-700
                                          transition-colors duration-200 cursor-pointer
                                        `}
                                      >
                                        Interview Attended
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleUpdateStatus(
                                            candidate.id,
                                            "not_interested"
                                          )
                                        }
                                        className={`
                                          ${
                                          candidate.status === "not_interested"
                                          ? "bg-slate-50 text-slate-600 font-medium"
                                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-700"
                                          }
                                          focus:bg-slate-100 focus:text-slate-700
                                          data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-700
                                          transition-colors duration-200 cursor-pointer
                                        `}
                                      >
                                        Not interested
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleUpdateStatus(
                                            candidate.id,
                                            "has_position_already"
                                          )
                                        }
                                        className={`
                                          ${
                                          candidate.status === "has_position_already"
                                          ? "bg-blue-50 text-blue-600 font-medium"
                                          : "text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                                          }
                                          focus:bg-blue-100 focus:text-blue-700
                                          data-[highlighted]:bg-blue-100 data-[highlighted]:text-blue-700
                                          transition-colors duration-200 cursor-pointer
                                        `}
                                      >
                                        Has a position already
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </TableCell>
                          );
                        }

                        // Default display for other columns
                        const value = candidate[column as keyof Candidate];
                        return (
                          <TableCell key={column}>
                            <div className="text-sm">
                              {value !== null && value !== undefined ? String(value) : "-"}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Page {page} of {totalPages} ({totalCount} candidates)
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(page - 1)} 
                  disabled={!canPrev}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(page + 1)} 
                  disabled={!canNext}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call Summary Dialog */}
        <CandidateCallSummaryDialog
          open={isCallDialogOpen}
          onOpenChange={setIsCallDialogOpen}
          call={selectedCall}
          candidateName={selectedCall?.candidateName}
          candidatePhone={selectedCall?.candidatePhone}
        />

        {/* Quick Note Dialog */}
        <Dialog open={quickNoteOpen} onOpenChange={setQuickNoteOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Quick Note</DialogTitle>
              <DialogDescription>
                Add a note for {selectedCandidate?.full_name || 'this candidate'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quick-note" className="text-right">
                  Note
                </Label>
                <Textarea
                  id="quick-note"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Enter your note here..."
                  className="col-span-3"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQuickNoteOpen(false);
                  setQuickNote("");
                  setSelectedCandidate(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleQuickNote}
                disabled={!quickNote.trim()}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Add Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add to Onboarding Confirmation Dialog */}
        <AlertDialog open={onboardingDialogOpen} onOpenChange={setOnboardingDialogOpen}>
          <AlertDialogContent>
            <div className="relative">
              {/* Loading Overlay */}
              {isAddingToOnboarding && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                    <p className="text-sm font-medium text-gray-700">Adding to onboarding...</p>
                  </div>
                </div>
              )}
              
              <button
                type="button"
                onClick={() => setOnboardingDialogOpen(false)}
                disabled={isAddingToOnboarding}
                className="absolute right-0 top-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10 p-1"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
              <AlertDialogHeader>
              <AlertDialogTitle>Add Candidate to Onboarding</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to add this candidate to the onboarding process?
              </AlertDialogDescription>
            </AlertDialogHeader>
            {candidateToOnboard && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="font-medium">Candidate Details:</p>
                <p className="text-sm text-gray-600">
                  {candidateToOnboard.full_name || 'Unnamed Candidate'}
                  {candidateToOnboard.email && ` - ${candidateToOnboard.email}`}
                </p>
                {candidateToOnboard.position && (
                  <p className="text-sm text-gray-600 mt-1">
                    Position: {candidateToOnboard.position}
                  </p>
                )}
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isAddingToOnboarding}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmAddToOnboarding}
                disabled={isAddingToOnboarding}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isAddingToOnboarding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Confirm & Add to Onboarding
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

