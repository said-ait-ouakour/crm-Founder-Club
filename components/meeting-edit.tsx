"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, useIsAdvisor } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useOutlookConnection } from "@/hooks/use-outlook-connection";
import type { OutlookEvent } from "@/lib/outlook";
import { Clock } from "lucide-react";

interface User {
  id: string;
  fullname?: string;
  email: string;
}

interface MeetingEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (meeting: {
    id: number;
    advisor_id: string;
    meeting_date: Date;
    meeting_note: string;
  }) => Promise<void>;
  onDelete?: (meetingId: number) => Promise<void>;
  users: User[];
  meeting: {
    id: number;
    advisor_id: string;
    meeting_date: Date;
    meeting_note: string;
    leads?: { 
      business_name: string | null; 
      contact_first_name: string | null; 
      contact_last_name: string | null;
    } | null;
  };
}

export function MeetingEditDialog({
  open,
  onOpenChange,
  onEdit,
  onDelete,
  users,
  meeting,
}: MeetingEditDialogProps) {
  const { toast } = useToast();
  const [note, setNote] = useState(meeting.meeting_note);
  const [selectedAdvisor, setSelectedAdvisor] = useState<User | null>(
    users.find((u) => u.id === meeting.advisor_id) || null
  );
  // Helper to extract date/time from meeting_date (handles UTC conversion)
  const getLocalDateAndTime = (date: Date) => {
    // If the date is stored in UTC, extract UTC components to get the original local time
    const dateStr = date.toISOString();
    const utcDate = new Date(dateStr);
    const localDate = utcDate.toISOString().split("T")[0];
    // Extract UTC time components (these represent the original local time before conversion)
    const utcHours = String(utcDate.getUTCHours()).padStart(2, '0');
    const utcMinutes = String(utcDate.getUTCMinutes()).padStart(2, '0');
    const localTime = `${utcHours}:${utcMinutes}`;
    return { date: localDate, time: localTime };
  };

  const initialDateTime = getLocalDateAndTime(meeting.meeting_date);
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDateTime.date
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    initialDateTime.time
  );
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isAdvisor = useIsAdvisor();
  const { status: outlookStatus } = useOutlookConnection();
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [bookedEvents, setBookedEvents] = useState<OutlookEvent[]>([]);

  // Update form fields when meeting prop changes or dialog opens
  useEffect(() => {
    if (open && meeting.id > 0) {
      setNote(meeting.meeting_note || "");
      const dateTime = getLocalDateAndTime(meeting.meeting_date);
      setSelectedDate(dateTime.date);
      setSelectedTime(dateTime.time);
      const advisor = users.find((u) => u.id === meeting.advisor_id);
      setSelectedAdvisor(advisor || null);
    }
  }, [open, meeting, users]);

  const handleSave = async () => {
    if (!selectedDate || !selectedTime) return;

    try {
      setIsSaving(true);
      const meetingDateTime = new Date(`${selectedDate}T${selectedTime}`);

      await onEdit({
        id: meeting.id,
        advisor_id: selectedAdvisor?.id || meeting.advisor_id, // Keep the existing advisor if not changed
        meeting_date: meetingDateTime,
        meeting_note: note,
      });

      toast({
        title: "Meeting Updated",
        description: "The meeting has been successfully updated.",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving meeting:", error);
      toast({
        title: "Error",
        description: "Failed to update the meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      setIsDeleting(true);
      await onDelete(meeting.id);
      setDeleteDialogOpen(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting meeting:", error);
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Meeting</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Advisor Selection */}
          {!isAdvisor && (
            <div className="grid gap-2">
              <Label>Advisor</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
                      selectedAdvisor?.id === user.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedAdvisor(user)}
                  >
                    <div className="font-medium">{user.fullname || user.email}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

        <DialogFooter className="flex justify-between items-center">
          <div className="flex gap-2">
            {onDelete && (
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isSaving || isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Meeting
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving || isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!selectedDate || !selectedTime || isSaving || isDeleting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Are you sure you want to delete this meeting? This action cannot be undone.</p>
              {meeting.leads && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900">
                      <span className="font-semibold">Lead:</span>{" "}
                      {meeting.leads.business_name || 
                       `${meeting.leads.contact_first_name || ''} ${meeting.leads.contact_last_name || ''}`.trim() || 
                       'Unknown Lead'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Date:</span>{" "}
                      {meeting.meeting_date.toLocaleString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {meeting.meeting_note && (
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Note:</span> {meeting.meeting_note}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete Meeting"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}