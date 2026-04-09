"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Mail, MessageSquare, PhoneCall, UserCheck, Calendar } from "lucide-react"
import type { Lead } from "@/lib/supabase"
import { useEffect, useState } from "react"

const leadStages = [
  { id: 1, name: "Email Sent", value: "iht_email_sent", icon: Mail, status: "" },
  { id: 2, name: "SMS", value: "sms_sent", icon: MessageSquare, status: "" },
  { id: 3, name: "Vapi & WhatsApp Scheduled", value: "vapi_call_scheduled", icon: Calendar, status: "" },
  { id: 4, name: "WhatsApp Sent", value: "whatsapp_sent", icon: MessageSquare, status: "" },
  { id: 5, name: "Vapi Call Made", value: "vapi_call_made", icon: PhoneCall, status: "" },
  { id: 6, name: "Engaged", value: "engaged", icon: UserCheck, status: "" },
  { id: 7, name: "Qualified", value: "qualified", icon: Calendar, status: "" },
]

interface LeadProgressDashboardProps {
  lead: Lead
  className?: string
}

export function LeadProgressDashboard({ lead, className = "" }: LeadProgressDashboardProps) {
  const [stages, setStages] = useState([...leadStages])

  // Update stages based on lead's current progress and engagement
  useEffect(() => {
    if (!lead) return
    
    const updatedStages = [...leadStages]
    const currentStageIndex = updatedStages.findIndex(stage => stage.value === lead.current_progress)
    const vapiScheduledIndex = updatedStages.findIndex(stage => stage.value === 'vapi_call_scheduled')
    const whatsappSentIndex = updatedStages.findIndex(stage => stage.value === 'whatsapp_sent')
    const vapiCallMadeIndex = updatedStages.findIndex(stage => stage.value === 'vapi_call_made')
    const engagedStageIndex = updatedStages.findIndex(stage => stage.value === 'engaged')
    const qualifiedStageIndex = updatedStages.findIndex(stage => stage.value === 'qualified')
    
    // Mark VAPI call scheduled as completed if WhatsApp is sent or VAPI call is made
    if (vapiScheduledIndex !== -1 && 
        (lead.current_progress === 'whatsapp_sent' || 
         lead.current_progress === 'vapi_call_made' ||
         (currentStageIndex > vapiScheduledIndex))) {
      updatedStages[vapiScheduledIndex].status = "completed"
    }
    
    // Mark WhatsApp sent as completed if VAPI call is made or beyond
    if (whatsappSentIndex !== -1 && 
        (lead.current_progress === 'vapi_call_made' || 
         (currentStageIndex > whatsappSentIndex))) {
      updatedStages[whatsappSentIndex].status = "completed"
    }
    
    // Mark VAPI call made as completed if the stage is vapi_call_made or beyond
    if (vapiCallMadeIndex !== -1 && 
        (lead.current_progress === 'vapi_call_made' || 
         (currentStageIndex > vapiCallMadeIndex))) {
      updatedStages[vapiCallMadeIndex].status = "completed"
    }
    
    // Mark Engaged as completed if the lead is engaged
    if (engagedStageIndex !== -1 && lead.engaged) {
      updatedStages[engagedStageIndex].status = "completed"
    }
    
    // Mark Qualified as completed if the lead's current_status is "Qualified"
    if (qualifiedStageIndex !== -1 && lead.current_status === "Qualified") {
      updatedStages[qualifiedStageIndex].status = "completed"
    }
    
    if (currentStageIndex !== -1) {
      // Mark all previous stages as completed
      for (let i = 0; i < currentStageIndex; i++) {
        updatedStages[i].status = "completed"
      }
      // Mark current stage as in progress (if not already marked as completed)
      if (updatedStages[currentStageIndex].status !== "completed") {
        updatedStages[currentStageIndex].status = "in_progress"
      }
      // Mark all next stages as pending
      for (let i = currentStageIndex + 1; i < updatedStages.length; i++) {
        if (updatedStages[i].status !== "completed") {
          updatedStages[i].status = "pending"
        }
      }
    }
    
    setStages(updatedStages)
  }, [lead?.current_progress, lead?.engaged, lead?.current_status])

  // Calculate progress percentage
  const completedStages = stages.filter(stage => stage.status === "completed").length
  const totalStages = stages.length
  const progress = Math.round((completedStages / totalStages) * 100)

  return (
    <Card className={`${className} w-full`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Lead Progress Dashboard</CardTitle>
            <p className="text-sm text-gray-500">Track and manage your lead through the sales pipeline</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-sm font-medium mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="relative mt-8 px-4">
            {/* Horizontal line */}
            <div className="absolute left-4 right-4 top-6 h-0.5 bg-gray-200"></div>
            
            <div className="relative flex justify-between">
              {stages.map((stage, index) => {
                const Icon = stage.icon
                const isCompleted = stage.status === "completed"
                const isInProgress = stage.status === "in_progress"
                const isLast = index === stages.length - 1
                
                return (
                  <div key={stage.id} className="relative flex flex-col items-center flex-1 max-w-[200px] px-2">
                    {/* Status indicator */}
                    <div className={`relative z-10 rounded-full p-2 mb-2 ${
                      isCompleted 
                        ? "bg-green-100 text-green-600" 
                        : isInProgress 
                          ? "bg-blue-100 text-blue-600" 
                          : "bg-gray-100 text-gray-400"
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    {/* Content */}
                    <div className="text-center">
                      <h4 className={`text-sm font-medium ${
                        isCompleted 
                          ? "text-green-700" 
                          : isInProgress 
                            ? "text-blue-700" 
                            : "text-gray-500"
                      }`}>
                        {stage.name}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {isCompleted ? "Done" : isInProgress ? "In Progress" : ""}
                      </p>
                    </div>
                    
                    {/* Status dot */}
                    <div className="absolute top-5">
                      {isCompleted && (
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      )}
                      {isInProgress && (
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}