"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { format } from 'date-fns'
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, FileText } from "lucide-react"

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

interface CharlotteCallSummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
}

export function CharlotteCallSummaryDialog({ open, onOpenChange, leadId }: CharlotteCallSummaryDialogProps) {
  const [loading, setLoading] = useState(true)
  const [calls, setCalls] = useState<Call[]>([])
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCallDetails, setShowCallDetails] = useState(false)
  const [viewingTranscript, setViewingTranscript] = useState<Call | null>(null)

  // Reset to list view when dialog is closed
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Dialog is being closed, reset to list view
      setShowCallDetails(false)
      setSelectedCall(null)
      setViewingTranscript(null)
    }
    onOpenChange(newOpen)
  }

  useEffect(() => {
    const fetchCalls = async () => {
      if (!open || !leadId) return
      
      try {
        setLoading(true)
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('calls')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        
        setCalls((data as Call[]) || [])
        setError(null)
      } catch (err) {
        console.error('Error fetching calls:', err)
        setError('Failed to load call data')
        setCalls([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchCalls()
  }, [open, leadId])

  const handleCallClick = (call: Call) => {
    setSelectedCall(call)
    setShowCallDetails(true)
  }

  const handleBackToList = () => {
    setShowCallDetails(false)
    setSelectedCall(null)
  }

  const handleViewTranscript = (call: Call, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent row click
    setViewingTranscript(call)
  }

  const handleBackFromTranscript = () => {
    setViewingTranscript(null)
  }

  const formatCallEndedReason = (reason?: string | null) => {
    if (!reason) return "Unknown"
    
    return reason
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (!leadId) return null
  
  if (loading) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading Call Data...</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error Loading Calls</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-muted-foreground">
              {error}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (calls.length === 0 && !loading) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Call Data</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-muted-foreground">
              No call records found for this lead.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Show call details view
  if (showCallDetails && selectedCall) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="p-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="flex items-center gap-2">
                Call Details
                {selectedCall.call_score && (
                  <Badge variant="outline" className="ml-2">
                    Score: {selectedCall.call_score}/10
                  </Badge>
                )}
              </DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Lead</h4>
                <p>{selectedCall.lead_first_name} {selectedCall.lead_last_name}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Phone</h4>
                <p>{selectedCall.lead_phone}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Advisor</h4>
                <p>{selectedCall.advisor_name || 'Unknown'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Date & Time</h4>
                <p>{format(new Date(selectedCall.created_at), 'PPpp')}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                <p>{selectedCall.call_status || 'Unknown'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Ended Reason</h4>
                <p>{formatCallEndedReason(selectedCall.call_ended_reason)}</p>
              </div>
            </div>

            {selectedCall.summary && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Call Summary</h4>
                <div className="bg-muted/50 p-4 rounded-md">
                  {selectedCall.summary}
                </div>
              </div>
            )}

            {selectedCall.analysis && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Analysis</h4>
                <div className="bg-muted/50 p-4 rounded-md">
                  {selectedCall.analysis}
                </div>
              </div>
            )}

            {selectedCall.transcript && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Transcript</h4>
                <div className="bg-muted/50 p-4 rounded-md whitespace-pre-line">
                  {selectedCall.transcript}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Show transcript view
  if (viewingTranscript) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackFromTranscript}
                className="p-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Call Transcript
              </DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            {viewingTranscript.transcript ? (
              <div className="bg-muted/50 p-4 rounded-md whitespace-pre-line max-h-[60vh] overflow-y-auto">
                {viewingTranscript.transcript}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transcript available for this call.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Show calls list view
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Call History ({calls.length} calls)</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Advisor</TableHead>
                <TableHead>Ended Reason</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Transcript</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => (
                <TableRow
                  key={call.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleCallClick(call)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {format(new Date(call.created_at), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(call.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">
                      {call.advisor_name || 'Unknown'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={
                        ['customer-ended-call', 'assistant-ended-call'].includes(call.call_ended_reason || '')
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : ['customer-busy', 'customer-did-not-answer', 'voicemail'].includes(call.call_ended_reason || '')
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-gray-50 text-gray-700'
                      }
                    >
                      {formatCallEndedReason(call.call_ended_reason)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {call.call_score ? (
                      <Badge variant="secondary">
                        {call.call_score}/10
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {call.transcript ? (
                      <button
                        onClick={(e) => handleViewTranscript(call, e)}
                        className="text-blue-600 hover:text-blue-800 underline text-sm"
                      >
                        View Transcript
                      </button>
                    ) : (
                      <span className="text-muted-foreground text-sm">No transcript</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {calls.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No calls found for this lead.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
