"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, RefreshCw, Clock, ChevronRight, AlertCircle, Inbox, UserPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsAdmin, useIsAdvisor, useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UnassignedLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  lead_source: string;
  created_on: string;
  next_steps: string;
  summary: string;
  business_name?: string;
}

interface Advisor {
  id: string; // auth.uid()
  fullName: string;
  role?: string;
}

interface CentralLeadsHubProps {
  /** Polling interval in milliseconds (default: 30s) */
  pollInterval?: number;
  className?: string;
}

export function CentralLeadsHub({
  pollInterval = 30000,
  className,
}: CentralLeadsHubProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isAdvisor = useIsAdvisor();
  const [leads, setLeads] = useState<UnassignedLead[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [confirmingLead, setConfirmingLead] = useState<UnassignedLead | null>(null);
  const [assigningToAdvisorLead, setAssigningToAdvisorLead] = useState<UnassignedLead | null>(null);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null>(null);
  const [isConfirmingManagerAction, setIsConfirmingManagerAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchLeads = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      // Use get_leads_filtered_v9 RPC to fetch unassigned leads
      const { data, error: rpcError } = await supabase.rpc('get_leads_filtered_v9', {
        p_unassigned: true,
        p_page: 1,
        p_page_size: 50,
        p_sort_key: 'created_on',
        p_sort_dir: 'desc'
      });

      if (rpcError) throw rpcError;

      const processedLeads = (data || []).map((row: any) => {
        const lead = row.lead;
        const situation = row.lead_situation;
        return {
          id: lead.id,
          first_name: lead.contact_first_name || "Unknown",
          last_name: lead.contact_last_name || "Contact",
          email: lead.contact_email || lead.company_email || "N/A",
          lead_source: lead.lead_source || "N/A",
          created_on: lead.created_on,
          next_steps: situation?.next_steps || "Ready for initial follow-up",
          summary: situation?.summary || "Lead awaiting AI processing",
          business_name: lead.business_name
        };
      });

      setLeads(processedLeads);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      console.error("[CentralLeadsHub] Fetch error:", err);
      setError(err.message || "Unable to load the hub");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Polling for leads
  useEffect(() => {
    fetchLeads();
    const interval = setInterval(() => fetchLeads(), pollInterval);
    return () => clearInterval(interval);
  }, [fetchLeads, pollInterval]);

  // Fetch advisors if manager
  useEffect(() => {
    if (!isAdmin) return;

    const fetchAdvisors = async () => {
      try {
        const response = await fetch("/api/users");
        if (!response.ok) throw new Error("Failed to fetch users");
        const result = await response.json();
        // Filter for active advisors as requested
        const activeAdvisors = (result.data || [])
          .filter((u: any) => u.role?.toLowerCase() === 'advisor' && u.is_active === true)
          .map((u: any) => ({
            id: u.user_id, // Important: use auth.uid() which is stored in user_id
            fullName: u.fullname || u.email
          }));
        setAdvisors(activeAdvisors);
      } catch (err) {
        console.error("[CentralLeadsHub] Advisor fetch failed:", err);
      }
    };

    fetchAdvisors();
  }, [isAdmin]);

  const handleAssign = async (leadId: string, advisorAuthId?: string) => {
    if (assigningId) return;
    
    setAssigningId(leadId);
    try {
      const { data, error: assignError } = await supabase.rpc('assign_lead_v2', {
        p_lead_id: leadId,
        p_target_auth_user_id: advisorAuthId || null
      });

      if (assignError) throw assignError;

      if (data && data.success === false) {
          if (data.code === '409') {
              toast.error("Lead already claimed", {
                description: data.error || "Someone else just grabbed this lead.",
              });
              fetchLeads(true); // Refresh list
              return;
          }
          throw new Error(data.error || "Failed to assign lead");
      }

      toast.success(advisorAuthId ? "Lead assigned to advisor!" : "Lead assigned successfully!", {
        description: advisorAuthId ? "The advisor has been notified." : "Redirecting you to the lead details...",
      });

      // Refresh list, regardless of redirect
      fetchLeads(true);

      // Navigate to the lead details page only if self-assigning
      if (!advisorAuthId) {
        router.push(`/leads/${leadId}`);
      }
    } catch (err: any) {
      console.error("[CentralLeadsHub] Assignment error:", err);
      toast.error("Assignment failed", {
        description: err.message || "An unexpected error occurred.",
      });
    } finally {
      setAssigningId(null);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className={cn("overflow-hidden border-2 border-sidebar-primary/20 shadow-xl bg-white/50 backdrop-blur-sm", className)}>
      <CardHeader className="bg-gradient-to-r from-purple-600/5 to-sidebar-primary/5 pb-4 border-b border-purple-100/50">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-gray-900">
              <Zap className="h-5 w-5 text-sidebar-primary animate-pulse" />
              Central Leads Hub
              <Badge variant="secondary" className="ml-2 bg-purple-100 text-sidebar-primary animate-pulse border-purple-200 uppercase tracking-tighter text-[10px]">
                LIVE HUB
              </Badge>
            </CardTitle>
            <CardDescription className="text-[10px] flex items-center gap-1 font-medium text-sidebar-primary/60 uppercase tracking-widest">
              <Clock className="h-3 w-3" />
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchLeads(true)}
              disabled={refreshing}
              className={cn("hover:bg-purple-100/50 transition-all active:scale-95", refreshing && "animate-spin")}
            >
              <RefreshCw className="h-4 w-4 text-sidebar-primary" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-200/50 hover:scrollbar-thumb-purple-300">
          {loading ? (
            <div className="p-12 text-center flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sidebar-primary"></div>
              <p className="text-sm text-muted-foreground animate-pulse">Syncing hub activity...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center flex flex-col items-center gap-3 text-red-500">
              <AlertCircle className="h-10 w-10 opacity-50" />
              <p className="text-sm font-medium">{error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchLeads(true)} className="border-red-200 hover:bg-red-50">Retry</Button>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center gap-4 text-muted-foreground">
              <div className="relative">
                <Inbox className="h-12 w-12 opacity-20" />
                <div className="absolute top-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white animate-ping" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900">All Caught Up!</p>
                <p className="text-xs">No unassigned leads waiting in the queue.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-purple-50">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={(e) => {
                    // Only advisors can claim for themselves; managers open a separate assignment UI
                    if (!isAdvisor && !isAdmin) return; 
                    
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (isAdmin) {
                      setAssigningToAdvisorLead(lead);
                    } else if (isAdvisor) {
                      setConfirmingLead(lead);
                    }
                  }}
                  className={cn(
                    "group block p-4 hover:bg-purple-50/40 transition-all relative",
                    (isAdvisor || isAdmin) ? "cursor-pointer" : "cursor-default opacity-90",
                    assigningId === lead.id && "pointer-events-none opacity-80"
                  )}
                >
                  {/* Loading Overlay */}
                  {assigningId === lead.id && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-sidebar-primary" />
                        <span className="text-[10px] font-bold text-sidebar-primary uppercase tracking-tighter">Claiming...</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm group-hover:text-sidebar-primary transition-colors">
                          {lead.business_name || `${lead.first_name} ${lead.last_name}`}
                        </span>
                        <Badge variant="outline" className="bg-sidebar-primary text-white border-0 text-[9px] h-4 px-1.5 font-bold tracking-tight">
                          {lead.lead_source.toUpperCase()}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto bg-gray-100 px-1.5 py-0.5 rounded">
                          {formatRelativeTime(lead.created_on)}
                        </span>
                      </div>
                      
                      <div className="bg-white/80 border border-purple-100 rounded-lg p-3 text-[13px] text-gray-700 shadow-sm group-hover:border-purple-200 transition-all group-hover:shadow-md">
                        <p className="font-bold text-sidebar-primary mb-1.5 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                          <Zap className="h-3.5 w-3.5 fill-sidebar-primary" /> Next Action Recommendation:
                        </p>
                        <p className="italic leading-relaxed text-gray-600 font-medium">
                          "{lead.next_steps}"
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!!assigningId || (!isAdvisor && !isAdmin)}
                          className={cn(
                            "h-8 text-[11px] font-bold gap-1.5 shadow-sm transition-all active:scale-95 border-2",
                            (isAdvisor || isAdmin)
                              ? "border-sidebar-primary text-sidebar-primary hover:bg-sidebar-primary hover:text-white" 
                              : "border-gray-200 text-gray-400 cursor-not-allowed"
                          )}
                        >
                          {assigningId === lead.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : isAdvisor ? (
                            <UserPlus className="h-3 w-3" />
                          ) : isAdmin ? (
                            <UserPlus className="h-3 w-3" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {isAdvisor ? "CLAIM THIS LEAD" : isAdmin ? "DELEGATE LEAD" : "ADVISORS ONLY"}
                        </Button>
                        
                        {(isAdvisor || isAdmin) && (
                          <div className="flex items-center gap-1 text-[10px] text-sidebar-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            {isAdmin ? "Delegate to advisor" : "Click to claim"} <ChevronRight className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog open={!!confirmingLead} onOpenChange={() => setConfirmingLead(null)}>
        <AlertDialogContent className="border-purple-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-sidebar-primary" />
              Claim this lead?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 py-2">
              You are about to assign <span className="font-bold text-gray-900">{confirmingLead?.business_name || (confirmingLead?.first_name + ' ' + confirmingLead?.last_name)}</span> to yourself. 
              Once claimed, this lead will be removed from the public hub and added to your personal workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="font-semibold border-purple-200 text-sidebar-primary hover:bg-purple-50">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (confirmingLead) {
                  handleAssign(confirmingLead.id);
                  setConfirmingLead(null);
                }
              }}
              className="bg-sidebar-primary hover:bg-sidebar-primary/90 text-white font-bold"
            >
              Confirm Assignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!assigningToAdvisorLead} onOpenChange={() => {
        setAssigningToAdvisorLead(null);
        setSelectedAdvisorId(null);
        setIsConfirmingManagerAction(false);
      }}>
        <DialogContent className="sm:max-w-[425px] border-purple-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-sidebar-primary" />
              {isConfirmingManagerAction ? "Confirm Delegation" : "Delegate to Advisor"}
            </DialogTitle>
            <DialogDescription className="text-gray-600 pt-2">
              {isConfirmingManagerAction 
                ? "Verify the details below before completing the delegation." 
                : `Select an advisor to handle the lead ${assigningToAdvisorLead?.business_name || assigningToAdvisorLead?.first_name}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            {!isConfirmingManagerAction ? (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-sidebar-primary">Select Advisor</label>
                <Select onValueChange={(val) => setSelectedAdvisorId(val)}>
                  <SelectTrigger className="w-full border-purple-200 focus:ring-sidebar-primary">
                    <SelectValue placeholder="Choose an advisor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {advisors.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground italic">No active advisors found</div>
                    ) : (
                      advisors.map((advisor) => (
                        <SelectItem key={advisor.id} value={advisor.id}>
                          {advisor.fullName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200 text-center space-y-2">
                <p className="text-sm font-medium text-gray-900">
                  Assigning to:
                  <span className="block font-bold text-lg text-sidebar-primary pt-1">
                    {advisors.find(a => a.id === selectedAdvisorId)?.fullName}
                  </span>
                </p>
                <p className="text-[10px] text-sidebar-primary uppercase font-bold tracking-tighter opacity-70 italic">Final confirmation required</p>
              </div>
            )}
            
            {selectedAdvisorId && !isConfirmingManagerAction && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 animate-in fade-in slide-in-from-top-2">
                <p className="text-[11px] text-sidebar-primary leading-relaxed font-medium">
                  <strong>Assignment Policy:</strong> Once assigned, the lead will be moved to the chosen advisor's workspace immediately.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                if (isConfirmingManagerAction) {
                  setIsConfirmingManagerAction(false);
                } else {
                  setAssigningToAdvisorLead(null);
                  setSelectedAdvisorId(null);
                }
              }}
              className="font-semibold border-purple-200 text-sidebar-primary hover:bg-purple-50"
            >
              Back
            </Button>
            <Button 
              className="bg-sidebar-primary hover:bg-sidebar-primary/90 text-white font-bold"
              disabled={!selectedAdvisorId}
              onClick={() => {
                if (!isConfirmingManagerAction) {
                  setIsConfirmingManagerAction(true);
                } else {
                  if (assigningToAdvisorLead && selectedAdvisorId) {
                    handleAssign(assigningToAdvisorLead.id, selectedAdvisorId);
                    setAssigningToAdvisorLead(null);
                    setSelectedAdvisorId(null);
                    setIsConfirmingManagerAction(false);
                  }
                }
              }}
            >
              {isConfirmingManagerAction ? "Confirm Delegation" : "Assign Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
