"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Circle } from "lucide-react"
import type { Opportunity } from "@/lib/supabase"

const PIPELINE_STAGES = [
  { id: 1, label: "Google Search", shortLabel: "Lead Source" },
  { id: 2, label: "IHT Calculator", shortLabel: "IHT Calc" },
  { id: 3, label: "Mini Fact Find", shortLabel: "Mini FF" },
  { id: 4.1, label: "L2L Generated", shortLabel: "L2L Gen" },
  { id: 4.2, label: "Consultant Call", shortLabel: "15 min Call" },
  { id: 5, label: "L2L Payment", shortLabel: "£395" },
  { id: 6, label: "First Meeting", shortLabel: "Teams" },
  { id: 7, label: "File Assembly", shortLabel: "File Check" },
  { id: 8, label: "Final Meeting", shortLabel: "Sign" },
  { id: 9, label: "Application Submitted", shortLabel: "App Sub" },
  { id: 10, label: "Account Opened", shortLabel: "Acc Open" },
  { id: 11, label: "Money Received", shortLabel: "Money In" },
  { id: 12, label: "Closed as Won", shortLabel: "Won" },
]

const STAGE_TO_INDEX: Record<string, number> = {
  "Prospecting": 0,
  "Qualification": 2,
  "Proposal": 4,
  "Negotiation": 7,
  "Closed Won": 12,
  "Closed Lost": -1,
  "Google Search": 0,
  "IHT Calculator Completed": 1,
  "Mini Fact Find Completed": 2,
  "L2L Generated and Validated": 3,
  "Consultant Call": 4,
  "L2L Payment": 5,
  "First Meeting": 6,
  "File Assembly + File Checker": 7,
  "Final Meeting": 8,
  "Application Submitted": 9,
  "Account Opened": 10,
  "Money Received": 11,
  "Closed as Won": 12,
}

function getCompletedCount(stage: string): number {
  const index = STAGE_TO_INDEX[stage]
  if (index === undefined) return 0
  if (index === -1) return 0
  return index
}

interface OpportunityProgressPipelineProps {
  opportunity: Opportunity
  className?: string
}

export function OpportunityProgressPipeline({ opportunity, className = "" }: OpportunityProgressPipelineProps) {
  const completedCount = getCompletedCount(opportunity.stage)
  const isClosedWon = opportunity.stage === "Closed Won" || opportunity.stage === "Closed as Won"
  const isClosedLost = opportunity.stage === "Closed Lost"

  return (
    <Card className={`${className} w-full overflow-hidden`}>
      <CardContent className="pt-5 pb-4 px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 tracking-wide uppercase">
            Opportunity Pipeline
          </h3>
          <span className="text-xs font-medium text-gray-500">
            {isClosedLost
              ? "Closed Lost"
              : isClosedWon
                ? "12 / 12 stages"
                : `${completedCount} / ${PIPELINE_STAGES.length} stages`}
          </span>
        </div>

        {/* Desktop: horizontal pipeline */}
        <div className="hidden md:block">
          <div className="flex items-start gap-0">
            {PIPELINE_STAGES.map((stage, index) => {
              const isCompleted = isClosedWon || index < completedCount
              const isNext = !isClosedWon && !isClosedLost && index === completedCount
              const isFuture = !isCompleted && !isNext

              return (
                <div key={stage.id} className="flex-1 flex flex-col items-center relative group">
                  {/* Connector line */}
                  {index > 0 && (
                    <div
                      className={`absolute top-3 -left-1/2 w-full h-0.5 ${
                        isCompleted ? "bg-green-500" : isNext ? "bg-green-300" : "bg-gray-200"
                      }`}
                    />
                  )}

                  {/* Stage dot */}
                  <div className="relative z-10">
                    {isCompleted ? (
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                    ) : isNext ? (
                      <div className="w-6 h-6 rounded-full bg-green-200 border-2 border-green-400 flex items-center justify-center shadow-sm animate-pulse">
                        <Circle className="h-3 w-3 text-green-600" />
                      </div>
                    ) : (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${
                        isClosedLost ? "bg-red-100 border-2 border-red-200" : "bg-gray-100 border-2 border-gray-200"
                      }`}>
                        <Circle className={`h-3 w-3 ${isClosedLost ? "text-red-300" : "text-gray-300"}`} />
                      </div>
                    )}
                  </div>

                  {/* Stage label */}
                  <div className="mt-1.5 text-center px-0.5">
                    <p className={`text-[10px] leading-tight font-medium ${
                      isCompleted
                        ? "text-green-700"
                        : isNext
                          ? "text-green-600"
                          : isClosedLost
                            ? "text-red-400"
                            : "text-gray-400"
                    }`}>
                      {stage.shortLabel}
                    </p>
                  </div>

                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-lg">
                      {stage.label}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Mobile: compact two-row grid */}
        <div className="md:hidden">
          <div className="grid grid-cols-7 gap-x-1 gap-y-3">
            {PIPELINE_STAGES.map((stage, index) => {
              const isCompleted = isClosedWon || index < completedCount
              const isNext = !isClosedWon && !isClosedLost && index === completedCount

              return (
                <div key={stage.id} className="flex flex-col items-center">
                  {isCompleted ? (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                  ) : isNext ? (
                    <div className="w-5 h-5 rounded-full bg-green-200 border-2 border-green-400 flex items-center justify-center animate-pulse">
                      <Circle className="h-2 w-2 text-green-600" />
                    </div>
                  ) : (
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      isClosedLost ? "bg-red-100 border border-red-200" : "bg-gray-100 border border-gray-200"
                    }`}>
                      <Circle className={`h-2 w-2 ${isClosedLost ? "text-red-300" : "text-gray-300"}`} />
                    </div>
                  )}
                  <p className={`text-[8px] leading-tight mt-0.5 text-center ${
                    isCompleted
                      ? "text-green-700 font-medium"
                      : isNext
                        ? "text-green-600 font-medium"
                        : "text-gray-400"
                  }`}>
                    {stage.shortLabel}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className={`w-full h-1.5 rounded-full ${isClosedLost ? "bg-red-100" : "bg-gray-100"}`}>
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                isClosedLost ? "bg-red-400" : isClosedWon ? "bg-green-500" : "bg-green-400"
              }`}
              style={{
                width: `${isClosedWon ? 100 : (completedCount / PIPELINE_STAGES.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
