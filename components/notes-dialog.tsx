"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Save, X, Plus, Check } from "lucide-react";

interface NotesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  currentNotes?: string;
  isNewNote?: boolean;
  onNotesUpdated?: () => void;
}

// Helper function to parse notes JSON
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

// Helper function to stringify notes to JSON
const stringifyNotesToJson = (notesArray: Array<{datetime: string, note: string}>): string => {
  const notesObj: Record<string, string> = {};
  notesArray.forEach(({datetime, note}) => {
    notesObj[datetime] = note;
  });
  return JSON.stringify(notesObj);
};

export function NotesDialog({
  isOpen,
  onClose,
  leadId,
  leadName,
  currentNotes = "",
  isNewNote = false,
  onNotesUpdated,
}: NotesDialogProps) {
  const [newNote, setNewNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewNoteField, setShowNewNoteField] = useState(false);
  const [leadNotes, setLeadNotes] = useState<Array<{datetime: string, note: string}>>([]);

  // Load lead notes when dialog opens
  useEffect(() => {
    if (isOpen && leadId) {
      loadLeadNotes();
      setNewNote("");
      setShowNewNoteField(false);
    }
  }, [isOpen, leadId]);

  const loadLeadNotes = async () => {
    setIsLoading(true);
    try {
      const { data: situationData, error } = await supabase
        .from("lead_situation")
        .select("advisor_notes, last_update")
        .eq("lead_id", leadId)
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!situationData) {
        setLeadNotes([]);
        return;
      }
      
      const notes = parseNotesJson(
        typeof situationData?.advisor_notes === 'string' ? situationData.advisor_notes : "",
        situationData?.last_update
      );
      setLeadNotes(notes);
    } catch (error) {
      console.error("Error loading notes:", error);
      setLeadNotes([]); // Set empty array on error to prevent infinite loading
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewNote = async () => {
    if (!newNote.trim()) {
      toast.error("Note cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const currentDateTime = new Date().toISOString();
      
      // Add new note to existing notes
      const updatedNotes = [
        { datetime: currentDateTime, note: newNote.trim() },
        ...leadNotes
      ];
      
      const updatedNotesJson = stringifyNotesToJson(updatedNotes);

      // First, check if lead_situation record exists for this lead (maybeSingle = 0 or 1 row)
      const { data: existingSituation, error: fetchError } = await supabase
        .from("lead_situation")
        .select("id")
        .eq("lead_id", leadId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (existingSituation) {
        // Update existing lead_situation record
        const { error: updateError } = await supabase
          .from("lead_situation")
          .update({
            advisor_notes: updatedNotesJson,
            last_update: new Date().toISOString(),
          })
          .eq("lead_id", leadId);

        if (updateError) throw updateError;
      } else {
        // Create new lead_situation record
        const { error: insertError } = await supabase
          .from("lead_situation")
          .insert({
            lead_id: leadId,
            advisor_notes: updatedNotesJson,
            last_update: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;
      }

      toast.success("Note added successfully");
      setNewNote("");
      setShowNewNoteField(false);
      await loadLeadNotes(); // Refresh the notes list
      onNotesUpdated?.();
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (newNote.trim() && showNewNoteField) {
      if (confirm("You have an unsaved note. Are you sure you want to close?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Notes for {leadName}</DialogTitle>
          <DialogDescription>
            View notes history and add new notes for this lead.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Notes History Section */}
          <div>
            <h3 className="text-lg font-medium mb-3">Notes History</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading notes...</span>
              </div>
            ) : leadNotes.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {leadNotes.map((noteItem, index) => (
                  <div key={index} className="border rounded p-3 bg-gray-50">
                    <div className="text-xs text-gray-500 mb-1">
                      {new Date(noteItem.datetime).toLocaleDateString()} at {new Date(noteItem.datetime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <p className="text-sm text-gray-800">{noteItem.note}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No notes found for this lead.
              </div>
            )}
          </div>

          {/* Add New Note Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium">Add New Note</h3>
              {!showNewNoteField && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowNewNoteField(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add New
                </Button>
              )}
            </div>
            
            {showNewNoteField && (
              <div className="space-y-3">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter your new note here..."
                  className="min-h-[100px] resize-none"
                  disabled={isSaving}
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddNewNote} 
                    disabled={isSaving || !newNote.trim()}
                    size="sm"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Validate
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setShowNewNoteField(false);
                      setNewNote("");
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
