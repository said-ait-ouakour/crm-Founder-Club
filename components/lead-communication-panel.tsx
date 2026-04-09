"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Phone, MessageSquare, FileText, FileSignature, Loader2, Slash } from "lucide-react"
import type { Lead } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"
import { BrochurePreviewDialog } from "@/components/brochure-preview-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface LeadCommunicationPanelProps {
  lead: Lead
  className?: string
  trainingCompleted?: boolean
}

const CALL_TYPES = ["First Call", "Follow-up Call", "Discovery Call", "Decision Call", "Other"]

export function LeadCommunicationPanel({ lead, className = "", trainingCompleted = true }: LeadCommunicationPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams() || new URLSearchParams()
  const activeTab = searchParams?.get('tab') || ''
  const { profile } = useAuth()
  const [isSendingBrochure, setIsSendingBrochure] = useState(false)
  const [showBrochurePreview, setShowBrochurePreview] = useState(false)
  const [showContractDialog, setShowContractDialog] = useState(false)
  const [selectedContractPackage, setSelectedContractPackage] = useState<string | null>(null)
  const [isSendingContract, setIsSendingContract] = useState(false)
  const [showContractConfirmation, setShowContractConfirmation] = useState(false)
  const [contractDate, setContractDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [contractClient, setContractClient] = useState<string>(lead.business_name || "")
  const [contractToEmail, setContractToEmail] = useState<string>(lead.contact_email || "")
  const [showCallTypeDialog, setShowCallTypeDialog] = useState(false)
  const [isUpdatingCallStage, setIsUpdatingCallStage] = useState(false)

  const CONTRACT_SENDING_ENABLED = true

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', tab)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const isActive = (tab: string) => activeTab === tab

  const handlePreviewBrochure = () => {
    if (!profile) {
      toast.error("User profile not found")
      return
    }
    setShowBrochurePreview(true)
  }

  const handleOpenContractDialog = () => {
    if (!profile) {
      toast.error("User profile not found")
      return
    }
    if (!CONTRACT_SENDING_ENABLED) {
      toast.info("Contract sending is temporarily disabled")
      return
    }
    setShowContractDialog(true)
  }

  const getPreferredCallNumber = () => {
    const number = lead.business_telephone || lead.mobile_phone || lead.other_phone || ""
    return number?.trim() || ""
  }

  const handleOpenCallTypeDialog = () => {
    if (!trainingCompleted) {
      return
    }

    const callNumber = getPreferredCallNumber()
    if (!callNumber) {
      toast.error("No phone number available for this lead.")
      return
    }

    setShowCallTypeDialog(true)
  }

  const handleCallDialogChange = (open: boolean) => {
    if (isUpdatingCallStage) return
    setShowCallTypeDialog(open)
  }

  const handleCallTypeSelection = async (callType: string) => {
    const callNumber = getPreferredCallNumber()
    if (!callNumber) {
      toast.error("No phone number available for this lead.")
      return
    }

    setIsUpdatingCallStage(true)
    try {
      const response = await fetch(`/api/leads/${lead.id}/stage`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stage: callType }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error || "Failed to update call stage.")
      }

      const updatedStage = result?.stage || callType
      toast.success(`Call type recorded as ${updatedStage}.`)
      setShowCallTypeDialog(false)
      router.refresh()

      setTimeout(() => {
        const sanitizedNumber = callNumber.replace(/\s+/g, "")
        window.location.href = `tel:${sanitizedNumber}`
      }, 150)
    } catch (error: any) {
      console.error("Failed to update call type:", error)
      toast.error(error?.message || "Failed to record call type.")
    } finally {
      setIsUpdatingCallStage(false)
    }
  }

  const resetContractFields = () => {
    setContractDate(new Date().toISOString().split("T")[0])
    setContractClient(lead.business_name || "")
    setContractToEmail(lead.contact_email || "")
  }

  const handleContractDialogChange = (open: boolean) => {
    if (open) {
      resetContractFields()
    }
    setShowContractDialog(open)
    if (!open) {
      setSelectedContractPackage(null)
      setShowContractConfirmation(false)
    }
  }

  const senderName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.email || 'Unknown User'

  const handleSendBrochure = async (customContent?: string, subject?: string, brochureType?: string) => {
    if (!profile) {
      toast.error("User profile not found")
      return
    }

    setIsSendingBrochure(true)
    try {
      const requestBody: any = {
        lead_id: lead.id,
        name: senderName
      }

      // Only include content if it's been customized
      if (customContent) {
        requestBody.content = customContent
      }

      // Include subject if provided
      if (subject) {
        requestBody.subject = subject
      }

      // Include brochure type if provided
      if (brochureType) {
        requestBody.brochureType = brochureType
      }

      const response = await fetch('/api/send-brochure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send brochure')
      }

      toast.success("Brochure sent successfully!")
      setShowBrochurePreview(false)
      
      // Reload the page to refresh the lead data
      window.location.reload()
    } catch (error) {
      console.error('Error sending brochure:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send brochure')
    } finally {
      setIsSendingBrochure(false)
    }
  }

  const handleSendContract = async () => {
    if (!profile) {
      toast.error("User profile not found")
      return
    }

    if (!selectedContractPackage) {
      toast.error("Please select a contract package")
      return
    }
    if (!contractDate) {
      toast.error("Please provide a contract date")
      return
    }
    if (!contractToEmail) {
      toast.error("Please provide a recipient email")
      return
    }
    if (!contractClient) {
      toast.error("Please provide a client name")
      return
    }

    setIsSendingContract(true)
    try {
      const packageType = selectedContractPackage === 'enterprise' ? 'Enterprise_Package' : 'SME_Package'
      const response = await fetch('/api/send-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: lead.id,
          name: senderName,
          package_type: packageType,
          date: contractDate,
          to_email: contractToEmail,
          client: contractClient,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result?.error || 'Failed to send contract')
      }

      toast.success('Contract sent successfully!')
      handleContractDialogChange(false)
      setShowContractConfirmation(false)
    } catch (error) {
      console.error('Error sending contract:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send contract')
    } finally {
      setIsSendingContract(false)
    }
  }

  const handleRequestContractSend = () => {
    if (!selectedContractPackage) {
      toast.error("Please select a contract package")
      return
    }
    if (!CONTRACT_SENDING_ENABLED) {
      toast.info("Contract sending is temporarily disabled")
      return
    }
    setShowContractConfirmation(true)
  }

  const CONTRACT_PACKAGES = [
    {
      value: 'enterprise',
      title: 'Enterprise Package',
      subtitle: '21+ staff',
    },
    {
      value: 'sme',
      title: 'SME Package',
      subtitle: 'Up to 20 staff',
    },
  ]

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant={isActive('inbox') ? 'secondary' : 'outline'} 
            className="flex flex-col h-auto py-4" 
            onClick={() => handleTabChange('inbox')}
          >
            <MessageSquare className="h-5 w-5 mb-1" />
            <span>Full Inbox</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex flex-col h-auto py-4"
            onClick={handleOpenCallTypeDialog}
            disabled={!trainingCompleted || isUpdatingCallStage}
            title={
              !trainingCompleted
                ? "Account is locked - cannot make calls"
                : getPreferredCallNumber()
                ? "Record the call type before dialing"
                : "No phone number available"
            }
          >
            {isUpdatingCallStage ? (
              <Loader2 className="h-5 w-5 mb-1 animate-spin" />
            ) : (
              <Phone className="h-5 w-5 mb-1" />
            )}
            <span>{isUpdatingCallStage ? "Preparing…" : "Call"}</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex flex-col h-auto py-4" 
            onClick={handleOpenContractDialog}
            disabled={!CONTRACT_SENDING_ENABLED || isSendingContract}
            title={CONTRACT_SENDING_ENABLED ? 'Send a contract to the lead' : 'Contract sending temporarily disabled'}
          >
            {isSendingContract ? (
              <Loader2 className="h-5 w-5 mb-1 animate-spin" />
            ) : CONTRACT_SENDING_ENABLED ? (
              <FileSignature className="h-5 w-5 mb-1" />
            ) : (
              <Slash className="h-5 w-5 mb-1" />
            )}
            <span>
              {CONTRACT_SENDING_ENABLED
                ? (isSendingContract ? 'Sending…' : 'Send Contract')
                : 'Send Contract'}
            </span>
          </Button>

          <Button 
            variant="outline" 
            className="flex flex-col h-auto py-4" 
            onClick={handlePreviewBrochure}
            disabled={isSendingBrochure}
            title="Preview and send brochure to lead"
          >
            <FileText className="h-5 w-5 mb-1" />
            <span>{isSendingBrochure ? "Sending..." : "Send Brochure"}</span>
          </Button>
        </div>
      </CardContent>
      
      {/* Brochure Preview Dialog */}
      <BrochurePreviewDialog
        open={showBrochurePreview}
        onOpenChange={setShowBrochurePreview}
        lead={lead}
        advisorName={profile?.first_name && profile?.last_name 
          ? `${profile.first_name} ${profile.last_name}` 
          : profile?.email || 'Unknown User'
        }
        onSend={handleSendBrochure}
        isSending={isSendingBrochure}
      />

      {/* Call Type Selection Dialog */}
      <Dialog open={showCallTypeDialog} onOpenChange={handleCallDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select call type</DialogTitle>
            <DialogDescription>Choose the type of call you are about to make. This will update the lead stage.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {CALL_TYPES.map((option) => (
              <Button
                key={option}
                variant="outline"
                className={cn(
                  "justify-start h-auto py-3 flex-col items-start text-left",
                  "bg-white text-slate-900 border-slate-200 hover:bg-slate-50",
                  "dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800",
                  "shadow-sm"
                )}
                onClick={() => handleCallTypeSelection(option)}
                disabled={isUpdatingCallStage}
              >
                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{option}</span>
              </Button>
            ))}
          </div>
          <DialogFooter className="mt-2">
            <Button
              variant="ghost"
              onClick={() => handleCallDialogChange(false)}
              disabled={isUpdatingCallStage}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contract Package Dialog */}
      <Dialog open={showContractDialog} onOpenChange={handleContractDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose the contract package you want to send to this lead.
            </p>
            <RadioGroup
              value={selectedContractPackage ?? ''}
              onValueChange={(value) => setSelectedContractPackage(value)}
              className="grid gap-3"
            >
              {CONTRACT_PACKAGES.map((pkg) => {
                const isSelected = selectedContractPackage === pkg.value
                const radioId = `contract-${pkg.value}`
                return (
                  <Label
                    key={pkg.value}
                    htmlFor={radioId}
                    className={cn(
                      "cursor-pointer rounded-lg border p-4 transition-colors",
                      isSelected ? "border-blue-600 bg-blue-50 dark:bg-blue-950" : "border-muted"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem id={radioId} value={pkg.value} className="mt-1" />
                      <div>
                        <div className="text-sm font-semibold">{pkg.title}</div>
                        <div className="text-xs text-muted-foreground">{pkg.subtitle}</div>
                      </div>
                    </div>
                  </Label>
                )
              })}
            </RadioGroup>
            <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">
                The contract will be sent with the following details:
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contract-date" className="text-xs font-semibold text-slate-600">
                    Date
                  </Label>
                  <Input
                    id="contract-date"
                    type="date"
                    value={contractDate}
                    onChange={(event) => setContractDate(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contract-client" className="text-xs font-semibold text-slate-600">
                    Client
                  </Label>
                  <Input
                    id="contract-client"
                    value={contractClient}
                    onChange={(event) => setContractClient(event.target.value)}
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="contract-to-email" className="text-xs font-semibold text-slate-600">
                    To / Receiver
                  </Label>
                  <Input
                    id="contract-to-email"
                    type="email"
                    value={contractToEmail}
                    onChange={(event) => setContractToEmail(event.target.value)}
                    placeholder="recipient@example.com"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleContractDialogChange(false)}
              disabled={isSendingContract}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestContractSend}
              disabled={isSendingContract}
            >
              {isSendingContract ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showContractConfirmation} onOpenChange={setShowContractConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm contract send</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedContractPackage === 'enterprise'
                ? 'Send the Enterprise Package (21+ staff) contract to this lead?'
                : 'Send the SME Package (up to 20 staff) contract to this lead?'}
              <br />
              <span className="mt-2 block text-xs text-muted-foreground">
                Date: {contractDate || '—'}
              </span>
              <span className="block text-xs text-muted-foreground">
                Client: {contractClient || '—'}
              </span>
              <span className="block text-xs text-muted-foreground">
                To / Receiver: {contractToEmail || '—'}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSendingContract}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendContract} disabled={isSendingContract}>
              {isSendingContract ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}