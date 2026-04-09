"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, Loader2, Clock } from "lucide-react";
import { Lead as BaseLead } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { useAuth, useIsAdvisor } from "@/contexts/auth-context";
import { useOutlookConnection } from "@/hooks/use-outlook-connection";
import type { OutlookEvent } from "@/lib/outlook";

// Helper function to format lead name: business name first, then contact name
const formatLeadName = (lead: any): string => {
  const businessName = lead.business_name?.trim();
  const contactFirstName = lead.contact_first_name?.trim();
  const contactLastName = lead.contact_last_name?.trim();
  const contactName = `${contactFirstName || ''} ${contactLastName || ''}`.trim();
  
  if (businessName && contactName) {
    return `${businessName} (${contactName})`;
  } else if (businessName) {
    return businessName;
  } else if (contactName) {
    return contactName;
  }
  return 'Unknown Lead';
};

// Extend the base Lead type with additional properties
interface Lead extends Omit<BaseLead, "name"> {
  name: string;
}

interface User {
  id: string;
  fullname: string;
  email: string;
  role?: string;
}

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (meeting: {
    advisor_id: string;
    lead_id: string;
    meeting_date: Date;
    meeting_note: string;
  }) => Promise<void>;
  users: User[];
  isLoadingUsers?: boolean;
  onSearchLeads: (searchTerm: string) => Promise<Lead[]>;
  preselectedLead?: Lead;
  /** Called when save fails (e.g. webhook did not respond with 200) */
  onError?: (message: string) => void;
}

export function MeetingDialog({
  open,
  onOpenChange,
  onSave,
  users,
  isLoadingUsers = false,
  onSearchLeads,
  preselectedLead,
  onError,
}: MeetingDialogProps) {
  const [note, setNote] = useState("");
  const [selectedAdvisor, setSelectedAdvisor] = useState<User | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchAdvisor, setSearchAdvisor] = useState("");
  const [searchLead, setSearchLead] = useState("");
  const [isSearchingLeads, setIsSearchingLeads] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const { user } = useAuth(); // Access user information from the auth context
  const isAdvisor = useIsAdvisor();
  const [assignedLeads, setAssignedLeads] = useState<Lead[]>([]);
  const { status: outlookStatus } = useOutlookConnection();
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [bookedEvents, setBookedEvents] = useState<OutlookEvent[]>([]);

  // Set the current IAM if the user is an IAM
  useEffect(() => {
    async function selectIAMForCurrentUser() {
      if (!(isAdvisor && user)) return;

      // Try to find by existing users prop first (may not match auth id format)
      const existing = users.find((u) => u.email && u.email.length > 0);
      // Fallback: fetch the users row by user_id to get the internal user id
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, fullname, email, role")
          .eq("user_id", user.id)
          .single();

        if (error) {
          // If query fails, try best-effort selection
          if (existing) setSelectedAdvisor(existing);
          return;
        }

        if (data) {
          setSelectedAdvisor({
            id: String(data.id),
            fullname: (data.fullname as string) || "",
            email: (data.email as string) || "",
            role: (data.role as string) || "advisor",
          });
        }
      } catch {
        if (existing) setSelectedAdvisor(existing);
      }
    }

    selectIAMForCurrentUser();
  }, [isAdvisor, user, users]);

  // Set the preselected lead when dialog opens
  useEffect(() => {
    if (open && preselectedLead) {
      setSelectedLead(preselectedLead);
    } else if (!open) {
      // Reset when dialog closes
      setSelectedLead(null);
      setNote("");
      setSearchLead("");
      setLeads([]);
      setSelectedDate("");
      setSelectedTime("");
      setAvailableSlots([]);
      setBookedEvents([]);
    }
  }, [open, preselectedLead]);

  useEffect(() => {
    async function loadAssignedLeads() {
      if (isAdvisor && user) {
        try {
          // First, get the user record from the users table using the auth id
          const { data: userRecord, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("user_id", user.id)
            .single();

          if (userError) {
            console.error("Error fetching user record:", userError);
            return;
          }

          if (!userRecord) {
            console.error("User record not found");
            return;
          }

          // Now get the assigned leads using the user's id from the users table
          const { data: assignedLeadsData, error } = await supabase
            .from("users_leads")
            .select("lead_id")
            .eq("user_id", userRecord.id);

          if (error) {
            console.error("Error fetching assigned leads:", error);
            return;
          }

          if (assignedLeadsData && assignedLeadsData.length > 0) {
            // Extract lead IDs
            const leadIds = assignedLeadsData.map((item) => item.lead_id);

            // Fetch lead details based on lead IDs
            const { data: leadsData, error: leadsError } = await supabase
              .from("leads")
              .select("*")
              .in("id", leadIds);

            if (leadsError) {
              console.error("Error fetching lead details:", leadsError);
              return;
            }

            if (leadsData) {
              // Transform the data to match the Lead interface
              const transformedLeads = leadsData.map((lead: any) => ({
                ...lead,
                name: formatLeadName(lead)
              }));
              setAssignedLeads(transformedLeads);
            }
          } else {
            setAssignedLeads([]); // No assigned leads
          }
        } catch (error) {
          console.error("Error loading assigned leads:", error);
        }
      }
    }

    loadAssignedLeads();
  }, [isAdvisor, user]);

  // Fetch availability when date is selected
  useEffect(() => {
    async function fetchAvailability() {
      if (!selectedDate || !outlookStatus?.connected || !outlookStatus?.primaryCalendarId) {
        setAvailableSlots([]);
        setBookedEvents([]);
        return;
      }

      try {
        setLoadingAvailability(true);
        
        // Set start and end of the selected date
        const startDate = new Date(selectedDate);
        startDate.setUTCHours(0, 0, 0, 0);
        const endDate = new Date(selectedDate);
        endDate.setUTCHours(23, 59, 59, 999);

        const response = await fetch(
          `/api/outlook/events?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const data = await response.json();
        const events = data.events || [];
        setBookedEvents(events);

        // Generate time slots from 8 AM to 6 PM (30-minute intervals)
        const slots: string[] = [];
        for (let hour = 8; hour < 18; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            slots.push(timeStr);
          }
        }

        // Filter out slots that conflict with existing events
        const available = slots.filter(slot => {
          const slotDateTime = new Date(`${selectedDate}T${slot}`);
          const slotEndTime = new Date(slotDateTime.getTime() + 30 * 60 * 1000); // 30 minutes duration

          // Check if this slot conflicts with any event
          return !events.some((event: OutlookEvent) => {
            const eventStart = new Date(event.start.dateTime);
            const eventEnd = new Date(event.end.dateTime);
            
            // Check for overlap
            return (
              (slotDateTime >= eventStart && slotDateTime < eventEnd) ||
              (slotEndTime > eventStart && slotEndTime <= eventEnd) ||
              (slotDateTime <= eventStart && slotEndTime >= eventEnd)
            );
          });
        });

        setAvailableSlots(available);
      } catch (error) {
        console.error('Error fetching availability:', error);
        setAvailableSlots([]);
        setBookedEvents([]);
      } finally {
        setLoadingAvailability(false);
      }
    }

    fetchAvailability();
  }, [selectedDate, outlookStatus?.connected, outlookStatus?.primaryCalendarId]);

  const handleSearchLeads = async () => {
    const searchTerm = searchLead.trim();
    if (!searchTerm) {
      setLeads([]);
      return;
    }

    setIsSearchingLeads(true);
    try {
      // Always use the onSearchLeads function which has batching logic implemented
      // This ensures advisors only see their assigned leads and handles batching properly
      const results = await onSearchLeads(searchTerm);
      setLeads(results);
    } catch (error) {
      console.error("Error searching leads:", error);
      setLeads([]);
    } finally {
      setIsSearchingLeads(false);
    }
  };

  // Ensure the lead's name is displayed in the dialog
  const handleSave = async () => {
    const currentLead = preselectedLead || selectedLead;
    if (!selectedAdvisor || !currentLead || !selectedDate || !selectedTime)
      return;

    try {
      setIsSaving(true);
      const meetingDateTime = new Date(`${selectedDate}T${selectedTime}`);
      await onSave({
        advisor_id: selectedAdvisor.id,
        lead_id: currentLead.id,
        meeting_date: meetingDateTime,
        meeting_note: note,
      });
      onOpenChange(false);
      setNote("");
      setSelectedAdvisor(null);
      setSelectedLead(null);
      setSearchLead("");
      setLeads([]);
      setSelectedDate("");
      setSelectedTime("");
    } catch (error) {
      console.error("Error saving meeting:", error);
      const message = error instanceof Error ? error.message : "Failed to save meeting. Please try again.";
      onError?.(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Schedule New Meeting</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4 overflow-y-auto min-h-0 flex-1 pr-1 -mr-1">
          {/* IAM Selection */}
          {!isAdvisor && (
            <div className="grid gap-2">
              <Label>Independent Account Manager (IAM)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search IAMs..."
                  value={searchAdvisor}
                  onChange={(e) => setSearchAdvisor(e.target.value)}
                  className="pl-8"
                />
              </div>
              {isLoadingUsers ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                  {users
                    .filter(
                      (user) =>
                        user.fullname?.toLowerCase()
                          .includes(searchAdvisor.toLowerCase()) ||
                        user.email?.toLowerCase()
                          .includes(searchAdvisor.toLowerCase())
                    )
                    .map((user) => (
                      <div
                        key={user.id}
                        className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
                          selectedAdvisor?.id === user.id ? "bg-blue-50" : ""
                        }`}
                        onClick={() => setSelectedAdvisor(user)}
                      >
                        <div className="font-medium flex items-center gap-2">
                          <span>{user.fullname}</span>
                          {user.role && (
                            <span
                              className={`text-xs font-semibold ${
                                user.role === "manager"
                                  ? "text-purple-600"
                                  : "text-blue-600"
                              }`}
                            >
                              {user.role === "manager" ? "Manager" : "IAM"}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Lead Selection */}
          <div className="grid gap-2">
            <Label>Lead</Label>
            {preselectedLead ? (
              <div className="p-3 border rounded-md bg-blue-50">
                <div className="font-medium">{preselectedLead.business_name || `${preselectedLead.contact_first_name || ''} ${preselectedLead.contact_last_name || ''}`.trim() || 'Unknown Lead'}</div>
                {preselectedLead.business_name && preselectedLead.contact_first_name && (
                  <div className="text-sm text-gray-600 mt-1">
                    {preselectedLead.contact_first_name} {preselectedLead.contact_last_name}
                  </div>
                )}
                <div className="text-sm text-gray-500 mt-1">{preselectedLead.contact_email || preselectedLead.company_email || 'No email'}</div>
                <div className="text-sm text-gray-500">
                  {preselectedLead.business_telephone || preselectedLead.mobile_phone || "No phone number"}
                </div>
              </div>
            ) : (
              <>
                <div className="relative flex items-center gap-2">
                  <div className="relative w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search leads by name, email, or phone number..."
                      value={searchLead}
                      onChange={(e) => setSearchLead(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Button
                    onClick={handleSearchLeads}
                    disabled={isSearchingLeads}
                    className="shrink-0"
                  >
                    {isSearchingLeads ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Search"
                    )}
                  </Button>
                </div>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                  {leads.length > 0 ? (
                    leads.map((lead) => (
                      <div
                        key={lead.id}
                        className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
                          selectedLead?.id === lead.id ? "bg-blue-50" : ""
                        }`}
                        onClick={() => setSelectedLead(lead)}
                      >
                        <div className="font-medium">{lead.business_name || `${lead.contact_first_name || ''} ${lead.contact_last_name || ''}`.trim() || 'Unknown Lead'}</div>
                        {lead.business_name && lead.contact_first_name && (
                          <div className="text-sm text-gray-600">
                            {lead.contact_first_name} {lead.contact_last_name}
                          </div>
                        )}
                        <div className="text-sm text-gray-500">{lead.contact_email || lead.company_email || 'No email'}</div>
                        <div className="text-sm text-gray-500">
                          {lead.business_telephone || lead.mobile_phone || "No phone number"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500">
                      {isSearchingLeads
                        ? "Searching..."
                        : "No leads found. Try a different search term."}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Date Picker */}
          <div className="grid gap-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedTime(""); // Reset time when date changes
              }}
              className="w-full"
            />
          </div>

          {/* Availability Checker */}
          {selectedDate && outlookStatus?.connected && (
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Available Times (8 AM - 6 PM)
              </Label>
              {loadingAvailability ? (
                <div className="flex items-center justify-center p-4 border rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-600">Checking availability...</span>
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot}
                      type="button"
                      variant={selectedTime === slot ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTime(slot)}
                      className="text-xs"
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="p-3 border rounded-md bg-yellow-50 text-sm text-yellow-800">
                  No available slots found for this date. All times between 8 AM - 6 PM are booked.
                </div>
              )}
            </div>
          )}

          {/* Time Picker */}
          <div className="grid gap-2">
            <Label>Time</Label>
            <Input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full"
            />
            {selectedDate && selectedTime && bookedEvents.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {bookedEvents.some(event => {
                  const eventStart = new Date(event.start.dateTime);
                  const eventEnd = new Date(event.end.dateTime);
                  const selectedDateTime = new Date(`${selectedDate}T${selectedTime}`);
                  return selectedDateTime >= eventStart && selectedDateTime < eventEnd;
                }) && (
                  <span className="text-red-600 font-medium">
                    ⚠️ This time conflicts with an existing Outlook event
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Add meeting notes..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              !selectedAdvisor ||
              (!preselectedLead && !selectedLead) ||
              !selectedDate ||
              !selectedTime ||
              isSaving
            }
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Meeting"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
