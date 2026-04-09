"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, FileText, User, Calendar, Check } from "lucide-react"
import Link from "next/link"
import { opportunityService } from "@/lib/database"
import type { Opportunity } from "@/lib/supabase"

export function SelectOpportunityDialog({ open, onOpenChange, onSelect }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (opportunityId: string) => void
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOpportunity, setSelectedOpportunity] = useState<string | null>(null)

  useEffect(() => {
    async function loadOpportunities() {
      try {
        setLoading(true)
        const data = await opportunityService.getAll()
        setOpportunities(data)
      } catch (error) {
        console.error("Error loading opportunities:", error)
      } finally {
        setLoading(false)
      }
    }

    if (open) {
      loadOpportunities()
    }
  }, [open])

  const filteredOpportunities = opportunities.filter(opportunity => 
    opportunity.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opportunity.contact?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opportunity.contact?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opportunity.contact?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (opportunity.contact?.mobile_phone?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Select an Opportunity</DialogTitle>
          <DialogDescription>
            Choose an opportunity to create a new policy for
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search opportunities..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="border rounded-md h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading opportunities...
                    </TableCell>
                  </TableRow>
                ) : filteredOpportunities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No opportunities found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOpportunities.map((opportunity) => (
                    <TableRow 
                      key={opportunity.id}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        selectedOpportunity === opportunity.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedOpportunity(opportunity.id)}
                    >
                      <TableCell className="font-medium">
                        {opportunity.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span>
                            {opportunity.contact?.first_name} {opportunity.contact?.last_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{opportunity.contact?.email || '-'}</TableCell>
                      <TableCell>{opportunity.contact?.mobile_phone || '-'}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {opportunity.status || 'New'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          {new Date(opportunity.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {selectedOpportunity === opportunity.id && (
                          <Check className="h-5 w-5 text-green-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            disabled={!selectedOpportunity}
            onClick={() => selectedOpportunity && onSelect(selectedOpportunity)}
          >
            Select Opportunity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
