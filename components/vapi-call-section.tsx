"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Clock, Phone, ArrowRight } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface CallTranscript {
  id: string
  advisor: string
  timestamp: string
  transcript: string
  sentiment: 'positive' | 'neutral' | 'negative'
  nextSteps: string
}

interface VAPICallSectionProps {
  leadId: string
  phoneNumber: string
  isPhoneValidated: boolean
  className?: string
  trainingCompleted?: boolean
}

export function VAPICallSection({ leadId, phoneNumber, isPhoneValidated, className = "", trainingCompleted = true }: VAPICallSectionProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [lastCall, setLastCall] = useState<CallTranscript | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLastCall = async () => {
      try {
        setIsLoading(true)
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('calls')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        
        if (error) throw error
        
        if (data) {
          setLastCall({
            id: String(data.id),
            advisor: String(data.advisor_name || 'Advisor'),
            timestamp: String(data.created_at),
            transcript: String(data.transcript || 'No transcript available'),
            sentiment: (data.sentiment as 'positive' | 'neutral' | 'negative') || 'neutral',
            nextSteps: String(data.next_steps || '')
          })
        }
      } catch (err) {
        console.error('Error fetching last call:', err)
        setError('Failed to load call history')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (isPhoneValidated) {
      fetchLastCall()
    }
  }, [leadId, isPhoneValidated])

  if (!trainingCompleted) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-red-600 font-medium">
            Your account is locked and cannot access call history or make calls.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/leads/${leadId}/inbox`} className="flex items-center gap-2">
              View All Communications <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!isPhoneValidated) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Please verify the phone number to view call history.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/leads/${leadId}/inbox`} className="flex items-center gap-2">
              View All Communications <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Loading Call History...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
          </CardContent>
        </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Last Call with {lastCall?.advisor || 'Advisor'}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {lastCall?.sentiment === 'positive' ? 'Positive' : 
             lastCall?.sentiment === 'negative' ? 'Negative' : 'Neutral'}
          </Badge>
        </div>
        {lastCall?.timestamp && (
          <div className="flex items-center text-sm text-gray-500 gap-1">
            <Clock className="h-3.5 w-3.5" />
            {new Date(lastCall.timestamp).toLocaleString()}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {lastCall ? (
          <>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Transcript</h4>
              <ScrollArea className="h-48 rounded-md border p-3 text-sm bg-gray-50">
                <div className="whitespace-pre-line">{lastCall.transcript}</div>
              </ScrollArea>
            </div>
            
            {lastCall.nextSteps && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Next Steps</h4>
                <p className="text-sm text-gray-700">{lastCall.nextSteps}</p>
              </div>
            )}
            
            <div className="flex justify-between pt-2">
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href={`/leads/${leadId}/inbox`} className="flex items-center">
                  View All Communications <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No call history found</p>
            <Button asChild variant="outline" className="mt-4 gap-2">
              <Link href={`/leads/${leadId}/inbox`} className="flex items-center">
                View All Communications <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
