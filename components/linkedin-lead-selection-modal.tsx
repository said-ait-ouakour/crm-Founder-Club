"use client"

import { useState, useMemo, useCallback } from "react"
import { Linkedin, Loader2, Users, Building2, ExternalLink, CheckCircle2 } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
export interface PotentialLead {
  provider_id: string
  name: string
  first_name?: string
  last_name?: string
  profile_url?: string
  headline?: string
  company?: string
  company_id?: string
  location?: string
  profile_picture_url?: string
  network_distance?: string
  is_relationship?: boolean
}

interface LinkedInLeadSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  potentialLeads: PotentialLead[]
  sourceLeadId: string
  sourceLeadName?: string
  onConfirm: (selectedLeads: PotentialLead[]) => Promise<void>
  isLoading?: boolean
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function getNetworkBadgeColor(distance?: string) {
  const d = distance?.toUpperCase?.() ?? ""
  switch (d) {
    case "FIRST_DEGREE":
    case "DISTANCE_1":
      return "bg-green-100 text-green-700 border-green-200"
    case "SECOND_DEGREE":
    case "DISTANCE_2":
      return "bg-blue-100 text-blue-700 border-blue-200"
    case "THIRD_DEGREE":
    case "DISTANCE_3":
      return "bg-gray-100 text-gray-700 border-gray-200"
    default:
      return "bg-gray-100 text-gray-600 border-gray-200"
  }
}

function formatNetworkDistance(distance?: string) {
  const d = distance?.toUpperCase?.() ?? ""
  switch (d) {
    case "FIRST_DEGREE":
    case "DISTANCE_1":
      return "1st"
    case "SECOND_DEGREE":
    case "DISTANCE_2":
      return "2nd"
    case "THIRD_DEGREE":
    case "DISTANCE_3":
      return "3rd"
    default:
      return distance || ""
  }
}

export function LinkedInLeadSelectionModal({
  open,
  onOpenChange,
  potentialLeads,
  sourceLeadId,
  sourceLeadName,
  onConfirm,
  isLoading = false,
}: LinkedInLeadSelectionModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggleSelection = useCallback((providerId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(providerId)) {
        next.delete(providerId)
      } else {
        next.add(providerId)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(potentialLeads.map((lead) => lead.provider_id)))
  }, [potentialLeads])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const selectedLeads = useMemo(() => {
    return potentialLeads.filter((lead) => selectedIds.has(lead.provider_id))
  }, [potentialLeads, selectedIds])

  const handleConfirm = useCallback(async () => {
    if (selectedLeads.length === 0) return
    setIsSubmitting(true)
    try {
      await onConfirm(selectedLeads)
      setSelectedIds(new Set())
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedLeads, onConfirm])

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      setSelectedIds(new Set())
      onOpenChange(false)
    }
  }, [isSubmitting, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Select LinkedIn Profiles
          </DialogTitle>
          <DialogDescription>
            We found {potentialLeads.length} potential lead{potentialLeads.length !== 1 ? "s" : ""} at the company
            {sourceLeadName && (
              <span className="font-medium"> related to {sourceLeadName}</span>
            )}
            . Select the profiles you want to add as new leads and start conversations with.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="mt-3 text-sm text-gray-600">Loading potential leads...</p>
          </div>
        ) : potentialLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-gray-300" />
            <p className="mt-3 text-gray-600">No potential leads found</p>
            <p className="text-sm text-gray-500">Try searching manually on LinkedIn</p>
          </div>
        ) : (
          <div className="flex flex-col min-h-0 flex-1">
            <div className="flex items-center justify-between px-1 py-2 border-b flex-shrink-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-normal">
                  {selectedIds.size} of {potentialLeads.length} selected
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  disabled={selectedIds.size === potentialLeads.length}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  disabled={selectedIds.size === 0}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-2 max-h-[50vh]">
              <div className="space-y-2 py-2">
                {potentialLeads.map((lead) => {
                  const isSelected = selectedIds.has(lead.provider_id)
                  return (
                    <div
                      key={lead.provider_id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? "border-blue-300 bg-blue-50/50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                      onClick={() => toggleSelection(lead.provider_id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(lead.provider_id)}
                        className="mt-1"
                      />

                      <Avatar className="h-10 w-10 flex-shrink-0">
                        {lead.profile_picture_url ? (
                          <AvatarImage src={lead.profile_picture_url} alt={lead.name} />
                        ) : null}
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                          {getInitials(lead.name || "?")}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">
                            {lead.name}
                          </span>
                          {lead.is_relationship && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Connected
                            </Badge>
                          )}
                          {lead.network_distance && !lead.is_relationship && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${getNetworkBadgeColor(lead.network_distance)}`}
                            >
                              {formatNetworkDistance(lead.network_distance)}
                            </Badge>
                          )}
                        </div>

                        {lead.headline && (
                          <p className="text-sm text-gray-600 truncate mt-0.5">
                            {lead.headline}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {lead.company && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {lead.company}
                            </span>
                          )}
                          {lead.location && (
                            <span className="truncate">{lead.location}</span>
                          )}
                        </div>
                      </div>

                      {lead.profile_url && (
                        <a
                          href={lead.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0 p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-shrink-0 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIds.size === 0 || isSubmitting || isLoading}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding Leads...
              </>
            ) : (
              <>
                <Linkedin className="h-4 w-4" />
                Add {selectedIds.size > 0 ? selectedIds.size : ""} Lead{selectedIds.size !== 1 ? "s" : ""} & Start Agent
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
