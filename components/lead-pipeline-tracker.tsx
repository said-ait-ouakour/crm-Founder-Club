"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Circle, Zap, Lock } from "lucide-react"

export const PIPELINE_STAGES = [
  {
    stage: 0,
    label: "New Lead",
    shortLabel: "New",
    trigger: "auto",
    description: "Entry point for all leads.",
    requiredFields: [],
  },
  {
    stage: 1,
    label: "Introduced",
    shortLabel: "Introduced",
    trigger: "auto",
    description: "Triggered automatically after a validated call (>60s, AI-confirmed introduction).",
    requiredFields: [],
  },
  {
    stage: 2,
    label: "Arranging a Demo",
    shortLabel: "Demo Arrange",
    trigger: "manual",
    description: "Manually set when a demo is being arranged.",
    requiredFields: ["Demo date/time", "Attendees (names + roles)", "Pre-demo email sent"],
  },
  {
    stage: 3,
    label: "Demo Held",
    shortLabel: "Demo Held",
    trigger: "manual",
    description: "Set after the demo has taken place.",
    requiredFields: ["Demo outcome", "Key pain points", "Decision maker (name + role)", "Follow-up date"],
  },
  {
    stage: 4,
    label: "Proposal Form Completed",
    shortLabel: "Proposal",
    trigger: "manual",
    description: "Proposal form filled in with full details.",
    requiredFields: ["Company size", "Sector", "Requested modules", "Training materials received", "NDA signed", "Pricing tier"],
  },
  {
    stage: 5,
    label: "Proposal Letter Sent",
    shortLabel: "Letter Sent",
    trigger: "manual",
    description: "Formal proposal letter sent to the prospect.",
    requiredFields: ["Proposal sent date", "Recipient (name, role, email)", "Demo video included", "Decision maker confirmed", "Follow-up date"],
  },
  {
    stage: 6,
    label: "Contract Terms Agreed",
    shortLabel: "Terms Agreed",
    trigger: "manual",
    description: "Commercial terms negotiated and agreed.",
    requiredFields: ["Agreed pricing", "Payment terms", "Contract sent date", "Recipient details", "Expected signature date", "Implementation start date"],
  },
  {
    stage: 7,
    label: "Signed — New Client",
    shortLabel: "Signed",
    trigger: "auto",
    description: "Triggered automatically when a signed contract is received.",
    requiredFields: ["Signed date", "Contract value", "User count", "Go-live target date", "Assigned account manager"],
  },
  {
    stage: 8,
    label: "Handover Complete",
    shortLabel: "Handover",
    trigger: "manual",
    description: "Updated by account manager when transition to delivery team is complete.",
    requiredFields: [],
  },
]

interface LeadPipelineTrackerProps {
  currentStage: number
  className?: string
}

export function LeadPipelineTracker({ currentStage, className = "" }: LeadPipelineTrackerProps) {
  const safeStage = Math.max(0, Math.min(8, currentStage ?? 0))

  return (
    <Card className={`${className} w-full overflow-visible`}>
      <CardContent className="pt-5 pb-4 px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide uppercase">
            Omniflow Pipeline
          </h3>
          <span className="text-xs font-medium text-gray-500">
            Stage {safeStage} / 8 — {PIPELINE_STAGES[safeStage].label}
          </span>
        </div>

        {/* Desktop: horizontal stepper */}
        <div className="hidden md:block">
          <div className="flex items-start gap-0">
            {PIPELINE_STAGES.map((s, index) => {
              const isCompleted = index < safeStage
              const isCurrent  = index === safeStage
              const isFuture   = index > safeStage
              const isAuto     = s.trigger === "auto"

              return (
                <div key={s.stage} className="flex-1 flex flex-col items-center relative group">
                  {/* Connector line */}
                  {index > 0 && (
                    <div
                      className={`absolute top-3 -left-1/2 w-full h-0.5 ${
                        isCompleted ? "bg-blue-500" : isCurrent ? "bg-blue-300" : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  )}

                  {/* Stage dot */}
                  <div className="relative z-10">
                    {isCompleted ? (
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center shadow-sm animate-pulse">
                        <Circle className="h-3 w-3 text-blue-600" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm">
                        <Circle className="h-3 w-3 text-gray-300 dark:text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Stage label */}
                  <div className="mt-1.5 text-center px-0.5">
                    <p className={`text-[10px] leading-tight font-medium ${
                      isCompleted ? "text-blue-700 dark:text-blue-400"
                      : isCurrent  ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-400 dark:text-gray-600"
                    }`}>
                      {s.shortLabel}
                    </p>
                  </div>

                  {/* Tooltip — high z-index + overflow-visible on Card so it is not clipped by header/stacking */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 translate-y-[-100%] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[200]">
                    <div className="bg-gray-900 text-white text-[11px] px-3 py-2 rounded shadow-lg min-w-[180px] max-w-[220px]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-semibold">{s.label}</span>
                        {isAuto && <Zap className="h-3 w-3 text-yellow-400 flex-shrink-0" />}
                        {!isAuto && <Lock className="h-3 w-3 text-gray-400 flex-shrink-0" />}
                      </div>
                      <p className="text-gray-300 text-[10px] leading-snug">{s.description}</p>
                      {s.requiredFields.length > 0 && (
                        <div className="mt-1.5 border-t border-gray-700 pt-1.5">
                          <p className="text-gray-400 text-[9px] uppercase tracking-wide mb-1">Required fields</p>
                          {s.requiredFields.map((f) => (
                            <p key={f} className="text-gray-300 text-[10px]">· {f}</p>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Arrow */}
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-900 mx-auto" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Mobile: compact two-row grid */}
        <div className="md:hidden">
          <div className="grid grid-cols-5 gap-x-1 gap-y-3">
            {PIPELINE_STAGES.map((s, index) => {
              const isCompleted = index < safeStage
              const isCurrent  = index === safeStage
              return (
                <div key={s.stage} className="flex flex-col items-center">
                  {isCompleted ? (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-5 h-5 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center animate-pulse">
                      <Circle className="h-2 w-2 text-blue-600" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                      <Circle className="h-2 w-2 text-gray-300 dark:text-gray-600" />
                    </div>
                  )}
                  <p className={`text-[8px] leading-tight mt-0.5 text-center ${
                    isCompleted ? "text-blue-700 dark:text-blue-400 font-medium"
                    : isCurrent  ? "text-blue-600 dark:text-blue-400 font-medium"
                    : "text-gray-400 dark:text-gray-600"
                  }`}>
                    {s.shortLabel}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-1.5 rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${(safeStage / 8) * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
