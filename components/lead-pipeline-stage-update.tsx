"use client"

import { useState } from "react"
import { Zap, Lock, ChevronDown, Loader2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { leadService } from "@/lib/database"
import { PIPELINE_STAGES } from "@/components/lead-pipeline-tracker"

interface LeadPipelineStageUpdateProps {
  leadId: string
  currentStage: number
  onStageUpdated?: (newStage: number) => void
  disabled?: boolean
}

// Stages that are automated by n8n and cannot be set manually
const AUTO_ONLY_STAGES = new Set([1, 7])

export function LeadPipelineStageUpdate({
  leadId,
  currentStage,
  onStageUpdated,
  disabled = false,
}: LeadPipelineStageUpdateProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const safeCurrentStage = Math.max(0, Math.min(8, currentStage ?? 0))

  const handleChange = async (value: string) => {
    const newStage = parseInt(value, 10)
    if (isNaN(newStage) || newStage === safeCurrentStage) return

    setIsUpdating(true)
    try {
      const result = await leadService.updatePipelineStage(leadId, newStage)
      if (!result.success) {
        toast.error(result.error ?? "Failed to update pipeline stage")
        return
      }
      toast.success(`Pipeline stage updated to: ${PIPELINE_STAGES[newStage].label}`)
      onStageUpdated?.(newStage)
    } catch (err: any) {
      toast.error(err?.message ?? "Unexpected error updating stage")
    } finally {
      setIsUpdating(false)
    }
  }

  // Only show stages that are ahead of the current stage
  const availableStages = PIPELINE_STAGES.filter((s) => s.stage > safeCurrentStage)

  return (
    <div className="flex items-center gap-2">
      {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      <Select
        value={String(safeCurrentStage)}
        onValueChange={handleChange}
        disabled={disabled || isUpdating}
      >
        <SelectTrigger className="h-9 w-[210px] font-medium bg-background border-input">
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {safeCurrentStage}
              </span>
              {PIPELINE_STAGES[safeCurrentStage].label}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* Current stage — shown as read-only reference */}
          <SelectItem value={String(safeCurrentStage)} disabled>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-xs font-bold bg-muted px-1.5 py-0.5 rounded">{safeCurrentStage}</span>
              {PIPELINE_STAGES[safeCurrentStage].label}
              <span className="text-[10px] text-muted-foreground">(current)</span>
            </span>
          </SelectItem>

          {availableStages.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No further stages available
            </div>
          )}

          {availableStages.map((s) => {
            const isAuto = AUTO_ONLY_STAGES.has(s.stage)
            return (
              <SelectItem
                key={s.stage}
                value={String(s.stage)}
                disabled={isAuto}
                className={isAuto ? "opacity-50 cursor-not-allowed" : ""}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {s.stage}
                  </span>
                  {s.label}
                  {isAuto ? (
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-600">
                      <Zap className="h-3 w-3" /> Auto
                    </span>
                  ) : (
                    <Lock className="h-3 w-3 text-gray-400" />
                  )}
                </span>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
