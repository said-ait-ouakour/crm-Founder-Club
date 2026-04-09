"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { format } from 'date-fns'

type CandidateCall = {
  id: number
  created_at: string
  candidate_id: number | null
  advisor_id: number | null
  advisor_name: string | null
  summary: string | null
  analysis: string | null
  call_score: number | null
  transcript: string | null
  call_status: string | null
  call_ended_reason: string | null
  feedback_agreement: string | null
  feedback_score: number | null
  terry_feedback: string | null
  candidate_sentiment: string | null
  candidate_interest_level: string | null
  candidate_engagement_style: string | null
  ai_comfort_level: string | null
  qualification_strength: string | null
  sales_readiness: string | null
  earnings_expectation_alignment: string | null
  communication_quality: string | null
  recommended_next_action: string | null
  risk_flags: string[] | null
  motivation_drivers: string[] | null
}

interface CandidateCallSummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  call: CandidateCall | null
  candidateName?: string | null
  candidatePhone?: string | null
}

export function CandidateCallSummaryDialog({ 
  open, 
  onOpenChange, 
  call,
  candidateName,
  candidatePhone 
}: CandidateCallSummaryDialogProps) {
  if (!call) return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>No Call Data</DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
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
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Candidate</h4>
              <p>{candidateName || 'Unknown'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Phone</h4>
              <p>{candidatePhone || 'Not provided'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Advisor</h4>
              <p>{call.advisor_name || 'Not specified'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Date & Time</h4>
              <p>{format(new Date(call.created_at), 'PPpp')}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
              <p>{call.call_status || 'Unknown'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Ended Reason</h4>
              <p>{call.call_ended_reason || 'Unknown'}</p>
            </div>
          </div>

          {/* Call Summary */}
          {call.summary && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Call Summary</h4>
              <div className="bg-muted/50 p-4 rounded-md">
                {call.summary}
              </div>
            </div>
          )}

          {/* Analysis */}
          {call.analysis && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Analysis</h4>
              <div className="bg-muted/50 p-4 rounded-md">
                {call.analysis}
              </div>
            </div>
          )}

          {/* Transcript */}
          {call.transcript && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Transcript</h4>
              <div className="bg-muted/50 p-4 rounded-md whitespace-pre-line max-h-96 overflow-y-auto">
                {call.transcript}
              </div>
            </div>
          )}

          {/* Candidate Assessment Section */}
          {(call.candidate_sentiment || call.candidate_interest_level || call.candidate_engagement_style || 
            call.ai_comfort_level || call.qualification_strength || call.sales_readiness || 
            call.earnings_expectation_alignment || call.communication_quality) && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Candidate Assessment</h3>
              <div className="grid grid-cols-2 gap-4">
                {call.candidate_sentiment && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Sentiment</h4>
                    <p>{call.candidate_sentiment}</p>
                  </div>
                )}
                {call.candidate_interest_level && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Interest Level</h4>
                    <p>{call.candidate_interest_level}</p>
                  </div>
                )}
                {call.candidate_engagement_style && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Engagement Style</h4>
                    <p>{call.candidate_engagement_style}</p>
                  </div>
                )}
                {call.ai_comfort_level && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">AI Comfort Level</h4>
                    <p>{call.ai_comfort_level}</p>
                  </div>
                )}
                {call.qualification_strength && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Qualification Strength</h4>
                    <p>{call.qualification_strength}</p>
                  </div>
                )}
                {call.sales_readiness && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Sales Readiness</h4>
                    <p>{call.sales_readiness}</p>
                  </div>
                )}
                {call.earnings_expectation_alignment && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Earnings Expectation Alignment</h4>
                    <p>{call.earnings_expectation_alignment}</p>
                  </div>
                )}
                {call.communication_quality && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Communication Quality</h4>
                    <p>{call.communication_quality}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Feedback Section */}
          {(call.feedback_agreement || call.feedback_score || call.terry_feedback) && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Feedback</h3>
              <div className="space-y-3">
                {call.feedback_agreement && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Feedback Agreement</h4>
                    <p>{call.feedback_agreement}</p>
                  </div>
                )}
                {call.feedback_score !== null && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Feedback Score</h4>
                    <p>{call.feedback_score}/10</p>
                  </div>
                )}
                {call.terry_feedback && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Terry Feedback</h4>
                    <div className="bg-muted/50 p-4 rounded-md">
                      {call.terry_feedback}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Arrays Section */}
          {(call.risk_flags && call.risk_flags.length > 0) || 
           (call.motivation_drivers && call.motivation_drivers.length > 0) ? (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Additional Insights</h3>
              <div className="space-y-3">
                {call.risk_flags && call.risk_flags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Risk Flags</h4>
                    <div className="flex flex-wrap gap-2">
                      {call.risk_flags.map((flag, index) => (
                        <Badge key={index} variant="destructive">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {call.motivation_drivers && call.motivation_drivers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Motivation Drivers</h4>
                    <div className="flex flex-wrap gap-2">
                      {call.motivation_drivers.map((driver, index) => (
                        <Badge key={index} variant="default">
                          {driver}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Recommended Next Action */}
          {call.recommended_next_action && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-2">Recommended Next Action</h3>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                <p className="text-blue-900">{call.recommended_next_action}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
