"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"

import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { ChevronDown, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ContractRecord {
  id: number
  lead_id: string | null
  contract_id: string | null
  package: string | null
  status: string | null
  sent_at: string | null
  created_at: string
  updated_at: string | null
  leads?: {
    business_name?: string | null
    contact_first_name?: string | null
    contact_last_name?: string | null
  } | null
}

const downloadContract = async (contractId: string) => {
  try {
    const response = await fetch(`/api/contracts/${contractId}/download`)
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.error || "Failed to download contract.")
    }

    const blob = await response.blob()

    if (typeof window !== "undefined") {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `contract-${contractId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    }
  } catch (error: any) {
    console.error("Failed to download contract:", error)
    throw error
  }
}

const cancelContractInvite = async (contractId: string, reason: string) => {
  const response = await fetch(`/api/contracts/${contractId}/cancel`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.error || "Failed to cancel contract invite.")
  }

  return response.json().catch(() => ({ success: true }))
}

const formatDate = (value: string | null) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return format(date, "PPpp")
}

const formatLeadName = (contract: ContractRecord) => {
  const nameParts = [
    contract.leads?.contact_first_name,
    contract.leads?.contact_last_name,
  ].filter(Boolean)

  if (nameParts.length > 0) {
    return nameParts.join(" ")
  }

  return contract.leads?.business_name ?? "—"
}

export default function ContractsPage() {
  const { profile } = useAuth()
  const [contracts, setContracts] = useState<ContractRecord[]>([])
  const canDownload = profile?.role === "manager"
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadingName, setDownloadingName] = useState<string>("")
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<{
    id: number
    contractId: string | null
    leadName: string
  } | null>(null)
  const [cancelReason, setCancelReason] = useState<string>("")
  const [cancelingId, setCancelingId] = useState<number | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchContracts = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const { data, error: queryError } = await supabase
          .from("contracts")
          .select(
            `id, lead_id, contract_id, package, status, sent_at, created_at, updated_at, leads (business_name, contact_first_name, contact_last_name)`
          )
          .order("created_at", { ascending: false })

        if (queryError) throw queryError

        if (isMounted && data) {
          setContracts(data as ContractRecord[])
        }
      } catch (err) {
        console.error("Failed to load contracts", err)
        if (isMounted) {
          setError("Unable to load contracts. Please try again later.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchContracts()

    return () => {
      isMounted = false
    }
  }, [])

  const availableStatuses = useMemo(() => {
    const statuses = new Set<string>()
    contracts.forEach((contract) => {
      if (contract.status) {
        statuses.add(contract.status)
      }
    })
    return Array.from(statuses).sort((a, b) => a.localeCompare(b))
  }, [contracts])

  const filteredContracts = useMemo(() => {
    if (statusFilter === "all") return contracts
    return contracts.filter((contract) => contract.status === statusFilter)
  }, [contracts, statusFilter])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contracts</h1>
            <p className="text-gray-600">
              Review contract dispatch history and track current status.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {availableStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contract Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Loading contracts…
              </div>
            ) : error ? (
              <div className="py-10 text-center text-sm text-red-500">{error}</div>
            ) : filteredContracts.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No contracts found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Contract ID</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell>{contract.contract_id ?? "—"}</TableCell>
                        <TableCell>{contract.package ?? "—"}</TableCell>
                        <TableCell>
                          {contract.status ? (
                            <Badge variant="secondary">{contract.status}</Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{formatDate(contract.sent_at)}</TableCell>
                        <TableCell>{formatDate(contract.updated_at)}</TableCell>
                        <TableCell>{formatLeadName(contract)}</TableCell>
                        <TableCell className="text-right">
                          {contract.lead_id ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="flex items-center gap-2">
                                  Actions
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                              <Link href={`/leads/${contract.lead_id}`}>View Lead</Link>
                                </DropdownMenuItem>
                                {canDownload && contract.contract_id ? (
                                  <DropdownMenuItem
                                    disabled={downloadingId === contract.contract_id}
                                    onClick={async () => {
                                      if (!contract.contract_id) return
                                      try {
                                        setDownloadingId(contract.contract_id)
                                        setDownloadingName(formatLeadName(contract) || contract.contract_id)
                                        setShowDownloadDialog(true)
                                        await downloadContract(contract.contract_id)
                                        toast.success("Contract download started.")
                                      } catch (error: any) {
                                        const message =
                                          error?.message || "Failed to download contract. Please try again later."
                                        toast.error(message)
                                      } finally {
                                        setDownloadingId(null)
                                        setDownloadingName("")
                                        setShowDownloadDialog(false)
                                      }
                                    }}
                                  >
                                    {downloadingId === contract.contract_id ? "Downloading…" : "Download PDF"}
                                  </DropdownMenuItem>
                                ) : null}
                                {canDownload && contract.contract_id ? (
                                  <DropdownMenuItem
                                    disabled={(() => {
                                      if (cancelingId !== null) return true
                                      const normalizedStatus = (contract.status || "").toLowerCase()
                                      return !normalizedStatus.includes("sent")
                                    })()}
                                    onClick={() =>
                                      setCancelTarget({
                                        id: contract.id,
                                        contractId: contract.contract_id,
                                        leadName: formatLeadName(contract),
                                      })
                                    }
                                  >
                                    Cancel Invite
                                  </DropdownMenuItem>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-sm text-muted-foreground">No lead</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Downloading contract</DialogTitle>
              <DialogDescription>
                {downloadingName ? `Preparing ${downloadingName}…` : "Preparing contract…"}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cancel contract invite?</DialogTitle>
              <DialogDescription>
                {cancelTarget
                  ? `This will cancel the outstanding invitation for ${cancelTarget.leadName || "this lead"}.`
                  : "This will cancel the outstanding contract invitation."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">
                Cancellation reason
                <textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                  rows={3}
                  placeholder="Optional reason for cancelling…"
                  disabled={cancelingId !== null}
                />
              </label>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={cancelingId !== null}>
                Close
              </Button>
              <Button
                variant="destructive"
                disabled={cancelingId !== null}
                onClick={async () => {
                  if (!cancelTarget?.contractId) return
                  try {
                    setCancelingId(cancelTarget.id)
                    const result = await cancelContractInvite(cancelTarget.contractId, cancelReason.trim())

                    setContracts((prev) =>
                      prev.map((entry) =>
                        entry.id === cancelTarget.id ? { ...entry, status: "cancelled" } : entry,
                      ),
                    )

                    if (result?.warning) {
                      toast.warning(result.warning)
                    } else {
                      toast.success("Contract invite cancelled.")
                    }

                    setCancelTarget(null)
                    setCancelReason("")
                  } catch (error: any) {
                    toast.error(error?.message || "Failed to cancel contract invite.")
                  } finally {
                    setCancelingId(null)
                  }
                }}
              >
                {cancelingId !== null ? "Cancelling…" : "Cancel Invite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}