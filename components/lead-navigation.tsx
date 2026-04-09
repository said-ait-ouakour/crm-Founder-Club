import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLeadNavigation } from "@/hooks/use-lead-navigation";
import { useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LeadNavigationProps {
  currentLeadId: string;
  searchParams?: any;
  sortConfig?: any;
  variant?: "default" | "compact";
  mode?: "detail" | "inbox";
}

export function LeadNavigation({ 
  currentLeadId, 
  searchParams = {}, 
  sortConfig = { key: 'created_on', direction: 'desc' },
  variant = "default",
  mode = "detail"
}: LeadNavigationProps) {
  const {
    currentIndex,
    totalLeads,
    hasNext,
    hasPrevious,
    isLoading,
    error,
    navigateToNext,
    navigateToPrevious,
  } = useLeadNavigation({
    currentLeadId,
    searchParams,
    sortConfig,
    mode,
  });

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if not in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === 'ArrowLeft' && hasPrevious) {
        event.preventDefault();
        navigateToPrevious();
      } else if (event.key === 'ArrowRight' && hasNext) {
        event.preventDefault();
        navigateToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrevious, hasNext, navigateToPrevious, navigateToNext]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 border border-yellow-500 bg-yellow-50 p-2 rounded">
        <div className="text-xs text-yellow-600 font-bold">Loading...</div>
        <div className="animate-pulse bg-gray-200 h-8 w-8 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-8 w-8 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 border border-red-300 bg-red-50 p-2 rounded">
        <span>Navigation error: {error}</span>
      </div>
    );
  }

  if (currentIndex === -1 || totalLeads === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 border border-gray-300 bg-gray-50 rounded px-2 py-1">
        <span>No navigation available ({currentIndex}/{totalLeads})</span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={navigateToPrevious}
                disabled={!hasPrevious}
                className="flex items-center gap-1 px-2 py-1 h-8"
              >
                <ChevronLeft className="h-3 w-3" />
                <span className="text-xs">Previous</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Previous lead (←)</p>
            </TooltipContent>
          </Tooltip>
          
          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {currentIndex + 1} / {totalLeads}
          </span>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={navigateToNext}
                disabled={!hasNext}
                className="flex items-center gap-1 px-2 py-1 h-8"
              >
                <span className="text-xs">Next</span>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Next lead (→)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={navigateToPrevious}
              disabled={!hasPrevious}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Previous lead (←)</p>
          </TooltipContent>
        </Tooltip>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">Lead {currentIndex + 1}</span>
          <span>of {totalLeads}</span>
        </div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={navigateToNext}
              disabled={!hasNext}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Next lead (→)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
