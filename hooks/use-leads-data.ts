import { useState, useEffect, useCallback, useRef } from 'react';
import { useLeadsCache } from './use-leads-cache';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface UseLeadsDataOptions {
  pageSize: number;
  isAdvisor: boolean;
  userId?: string;
  enableCache?: boolean;
  cacheTTL?: number;
}

interface LeadsData {
  leads: any[];
  totalLeads: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  invalidateCache: () => void;
}

export function useLeadsData({
  pageSize,
  isAdvisor,
  userId,
  enableCache = true,
  cacheTTL = 5 * 60 * 1000, // 5 minutes default
}: UseLeadsDataOptions): LeadsData {
  const [leads, setLeads] = useState<any[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { getCachedData, setCachedData, invalidateCache: clearCache } = useLeadsCache();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Function to check if lead has been called
  const checkLeadCalledStatus = useCallback(async (leadIds: string[]) => {
    if (leadIds.length === 0) return new Set<string>();

    const { data: calls, error } = await supabase
      .from("calls")
      .select("lead_id")
      .in("lead_id", leadIds);

    if (error) {
      console.error("Error checking call status:", error);
      return new Set<string>();
    }

    return new Set(calls?.map((call) => call.lead_id.toString()) || []);
  }, []);

  // Main fetch function
  const fetchLeads = useCallback(async (
    searchParams: any,
    currentPage: number,
    sortConfig: any
  ) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      // Create cache key
      const cacheKey = {
        filters: searchParams.filters,
        sortConfig,
        page: currentPage,
        pageSize,
        advisorId: isAdvisor ? userId : undefined,
      };

      // Check cache first
      if (enableCache) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          console.log('Using cached leads data');
          setLeads(cachedData.leads);
          setTotalLeads(cachedData.totalLeads);
          setTotalPages(cachedData.totalPages);
          setIsLoading(false);
          return;
        }
      }

      console.log('Fetching fresh leads data...');

      // Get assigned lead IDs for advisors
      let assignedLeadIds: string[] = [];
      if (isAdvisor && userId) {
        const { data: visibleLeadRows, error: visibleLeadError } = await supabase.rpc("get_visible_lead_ids", {
          p_auth_user_id: userId,
        });

        if (visibleLeadError) throw visibleLeadError;
        assignedLeadIds = (visibleLeadRows || []).map((row: { lead_id: string }) => row.lead_id);

        if (assignedLeadIds.length === 0) {
          setLeads([]);
          setTotalLeads(0);
          setTotalPages(0);
          setIsLoading(false);
          return;
        }
      }

      // Build the main query
      let query = supabase.from("leads").select(
        `*,
          email_conversation (
            id,
            twilio_conv_id,
            whatsapp_twilio_conv_id
          ),
          calls(
            id,
            transcript,
            call_ended_reason
          ),
          lead_situation (
            id,
            sentiment_analysis,
            next_steps,
            advisor_notes,
            created_at
          )`,
        { count: "exact" }
      );

      // Apply advisor filtering
      if (isAdvisor && assignedLeadIds.length > 0) {
        query = query.in("id", assignedLeadIds);
      }

      // Apply all filters (simplified version - you'll need to add your specific filters)
      if (searchParams.filters.status) {
        query = query.eq("current_status", searchParams.filters.status);
      }

      if (searchParams.filters.current_progress) {
        // Add your progress filtering logic
      }

      // Apply sorting
      if (sortConfig.key) {
        query = query.order(sortConfig.key as string, {
          ascending: sortConfig.direction === "asc",
          nullsFirst: true,
        });
      }

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Execute query
      const { data: leads, error, count } = await query;

      if (error) throw error;

      // Get call status for leads
      const leadIds = leads?.map((lead) => lead.id) || [];
      const calledLeadIds = await checkLeadCalledStatus(leadIds);

      // Add hasCalled property to leads
      const leadsWithCallStatus = leads?.map((lead) => ({
        ...lead,
        hasCalled: calledLeadIds.has(lead.id.toString()),
        lead_situation: lead.lead_situation || [],
      })) || [];

      // Cache the results
      if (enableCache) {
        const cacheData = {
          leads: leadsWithCallStatus,
          totalLeads: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
        };
        setCachedData(cacheKey, cacheData);
      }

      setLeads(leadsWithCallStatus);
      setTotalLeads(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      console.error("Error fetching leads:", error);
      setError(error.message || 'Failed to fetch leads');
      toast.error("Failed to fetch leads");
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, isAdvisor, userId, enableCache, getCachedData, setCachedData, checkLeadCalledStatus]);

  const refetch = useCallback(async () => {
    // This would need the current search params and page
    // You'll need to pass these as parameters or store them in state
    console.log('Refetch requested');
  }, []);

  const invalidateCache = useCallback(() => {
    clearCache();
    console.log('Cache invalidated');
  }, [clearCache]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    leads,
    totalLeads,
    totalPages,
    isLoading,
    error,
    refetch,
    invalidateCache,
  };
}
