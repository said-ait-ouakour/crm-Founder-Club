import React, { useState, useEffect } from "react";
import type { Advisor } from "@/lib/supabase";
import { advisorService } from "@/lib/database";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface AssignAdvisorButtonProps {
  selectedLeadIds: string[];
  onSuccess?: () => void;
}

export const AssignAdvisorButton: React.FC<AssignAdvisorButtonProps> = ({ 
  selectedLeadIds,
  onSuccess 
}) => {
  const [open, setOpen] = useState(false);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchAdvisors = async () => {
        try {
          const data = await advisorService.getAll();
          setAdvisors(data);
        } catch (error) {
          console.error("Error fetching advisors:", error);
          toast.error("Failed to load advisors");
        }
      };
      fetchAdvisors();
    }
  }, [open]);

  const handleAssign = async () => {
    if (!selectedAdvisorId || selectedLeadIds.length === 0) {
      toast.error("Please select an advisor and at least one lead");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/leads/assign-advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          advisorId: selectedAdvisorId,
          leadIds: selectedLeadIds,
        }),
        credentials: "same-origin"
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to assign leads");
      }

      if (!result.success || result.count === 0) {
        throw new Error("No leads were updated");
      }

      toast.success(`Successfully assigned ${result.count} lead(s) to advisor`);
      onSuccess?.();
      setOpen(false);
      setSelectedAdvisorId(null);
    } catch (error) {
      console.error("Error assigning leads:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred while assigning leads");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedAdvisor = advisors.find(a => a.user_id === selectedAdvisorId);
  const selectedCount = selectedLeadIds.length;

  return (
    <>
      <Button
        variant="default"
        onClick={() => setOpen(true)}
        disabled={selectedCount === 0}
        className="ml-2"
      >
        Assign to IAM {selectedCount > 0 && `(${selectedCount})`}
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Leads to IAM</DialogTitle>
            <DialogDescription>
              Assign {selectedCount} selected lead(s) to an IAM
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="advisor">Select IAM</Label>
              <select
                id="advisor"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedAdvisorId || ""}
                onChange={(e) => setSelectedAdvisorId(e.target.value || null)}
              >
                <option value="">Select an IAM...</option>
                {advisors.map((advisor) => (
                  <option key={advisor.id} value={advisor.user_id || ""}>
                    {advisor.fullname || advisor.email}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedAdvisor && (
              <div className="rounded-md border p-4">
                <h4 className="font-medium mb-2">Assignment Summary</h4>
                <p className="text-sm text-muted-foreground">
                  Assigning <strong>{selectedCount} lead(s)</strong> to{' '}
                  <strong>{selectedAdvisor.fullname || selectedAdvisor.email}</strong>
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={!selectedAdvisorId || isLoading}
            >
              {isLoading ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};