import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth, useIsAdmin, useIsAdvisor } from "@/contexts/auth-context";
import { fetchAllLeadIdsViaGetLeadsFiltered } from "@/lib/get-leads-filtered-navigation";

interface UseLeadNavigationOptions {
  currentLeadId: string;
  searchParams?: { searchTerm?: string; filters?: Record<string, unknown> };
  sortConfig?: { key: string; direction: "asc" | "desc" };
  mode?: "detail" | "inbox";
}

interface LeadNavigation {
  currentIndex: number;
  totalLeads: number;
  hasNext: boolean;
  hasPrevious: boolean;
  nextLeadId: string | null;
  previousLeadId: string | null;
  isLoading: boolean;
  error: string | null;
  navigateToNext: () => void;
  navigateToPrevious: () => void;
}

export function useLeadNavigation({
  currentLeadId,
  searchParams = {},
  sortConfig = { key: "created_on", direction: "desc" },
  mode = "detail",
}: UseLeadNavigationOptions): LeadNavigation {
  const { user } = useAuth();
  const isManager = useIsAdmin();
  const isAdvisor = useIsAdvisor();

  const [currentIndex, setCurrentIndex] = useState(-1);
  const [totalLeads, setTotalLeads] = useState(0);
  const [nextLeadId, setNextLeadId] = useState<string | null>(null);
  const [previousLeadId, setPreviousLeadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ctxKey = useMemo(
    () =>
      JSON.stringify({
        id: currentLeadId,
        st: searchParams?.searchTerm ?? "",
        fl: searchParams?.filters ?? {},
        sk: sortConfig?.key ?? "created_on",
        sd: sortConfig?.direction ?? "desc",
        uid: user?.id ?? null,
        adv: isAdvisor,
        mgr: isManager,
        mode,
      }),
    [
      currentLeadId,
      searchParams?.searchTerm,
      searchParams?.filters,
      sortConfig?.key,
      sortConfig?.direction,
      user?.id,
      isAdvisor,
      isManager,
      mode,
    ]
  );

  const fetchLeadNavigation = useCallback(async () => {
    if (!currentLeadId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { ids, total } = await fetchAllLeadIdsViaGetLeadsFiltered({
        searchTerm: searchParams?.searchTerm ?? "",
        filters: (searchParams?.filters ?? {}) as Record<string, any>,
        sortKey: String(sortConfig?.key || "created_on"),
        sortDir: (sortConfig?.direction as "asc" | "desc") || "desc",
        userId: user?.id ?? null,
        isAdvisor,
        isManager,
      });

      const idx = ids.indexOf(String(currentLeadId));

      setTotalLeads(total);
      setCurrentIndex(idx);

      if (idx >= 0 && idx < ids.length) {
        setPreviousLeadId(idx > 0 ? ids[idx - 1] : null);
        setNextLeadId(idx < ids.length - 1 ? ids[idx + 1] : null);
      } else {
        setPreviousLeadId(null);
        setNextLeadId(null);
      }
    } catch (err) {
      console.error("[useLeadNavigation]", err);
      setError(err instanceof Error ? err.message : "Failed to fetch navigation");
      setCurrentIndex(-1);
      setTotalLeads(0);
      setNextLeadId(null);
      setPreviousLeadId(null);
    } finally {
      setIsLoading(false);
    }
  }, [ctxKey, currentLeadId, searchParams?.filters, searchParams?.searchTerm, sortConfig?.direction, sortConfig?.key, user?.id, isAdvisor, isManager, mode]);

  useEffect(() => {
    if (currentLeadId) {
      fetchLeadNavigation();
    }
  }, [currentLeadId, fetchLeadNavigation]);

  const navigateToNext = useCallback(() => {
    if (nextLeadId) {
      const baseUrl = mode === "inbox" ? `/leads/${nextLeadId}/inbox` : `/leads/${nextLeadId}`;
      window.location.href = baseUrl;
    }
  }, [nextLeadId, mode]);

  const navigateToPrevious = useCallback(() => {
    if (previousLeadId) {
      const baseUrl = mode === "inbox" ? `/leads/${previousLeadId}/inbox` : `/leads/${previousLeadId}`;
      window.location.href = baseUrl;
    }
  }, [previousLeadId, mode]);

  return {
    currentIndex,
    totalLeads,
    hasNext: !!nextLeadId,
    hasPrevious: !!previousLeadId,
    nextLeadId,
    previousLeadId,
    isLoading,
    error,
    navigateToNext,
    navigateToPrevious,
  };
}
