"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { format } from 'date-fns'

type Call = {
  id: number
  created_at: string
  lead_first_name: string
  lead_phone: string
  advisor_name: string
  summary: string
  analysis: string
  lead_last_name: string
  transcript: string | null
  call_score: string
  lead_id: string
  call_status: string | null
  call_ended_reason: string | null
}


interface CallSummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  call: Call | null
}

export function CallSummaryDialog({ open, onOpenChange, call }: CallSummaryDialogProps) {
  if (!call) return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>No Call Data</DialogTitle>
      </DialogHeader>
    </DialogContent>
  </Dialog>

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Call Details
            {call.call_score && (
              <Badge variant="outline" className="ml-2">
                Score: {call.call_score}/10
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Lead</h4>
              <p>{call.lead_first_name} {call.lead_last_name}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Phone</h4>
              <p>{call.lead_phone}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Advisor</h4>
              <p>{call.advisor_name}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Date & Time</h4>
              <p>{format(new Date(call.created_at), 'PPpp')}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
              <p>{call.call_status
                  ? call.call_status
                  : 'Unknown'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Ended Reason</h4>
              <p>
                {call.call_ended_reason
                  ? call.call_ended_reason
                  : 'Unknown'}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Call Summary</h4>
            <div className="bg-muted/50 p-4 rounded-md">
              {call.summary || 'No summary available.'}
            </div>
          </div>

          {call.analysis && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Analysis</h4>
              <div className="bg-muted/50 p-4 rounded-md">
                {call.analysis}
              </div>
            </div>
          )}
          {/* Transcript Field */}
          {call.transcript && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Transcript</h4>
              <div className="bg-muted/50 p-4 rounded-md whitespace-pre-line">
                {call.transcript}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
