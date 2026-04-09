"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, Target, Phone, Mail, MapPin, Plus } from "lucide-react"
import Link from "next/link"
import { contactService, leadService } from "@/lib/database"
import type { Contact, Lead } from "@/lib/supabase"
import { useIsRecruiter } from "@/contexts/auth-context"
import { formatPhoneNumber } from "@/lib/phone-utils"

export default function ContactsPage() {
  const isRecruiter = useIsRecruiter();

  const [contacts, setContacts] = useState<Contact[]>([])
  const [qualifiedLeads, setQualifiedLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [riskFilter, setRiskFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all") // all, contacts, qualified_leads
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        let totalContacts = 0
        let totalLeads = 0

        // Load contacts if showing all or just contacts
        if (typeFilter === "all" || typeFilter === "contacts") {
          const filters: any = {}
          if (statusFilter !== "all") filters.status = statusFilter
          if (riskFilter !== "all") filters.risk_level = riskFilter
          if (searchTerm.trim() !== "") filters.search = searchTerm.trim()
          const { data, count } = await contactService.getAll({ page, pageSize, filters })
          setContacts(data)
          totalContacts = count ?? 0
        } else {
          setContacts([])
        }

        // Load qualified leads if showing all or just qualified leads
        if (typeFilter === "all" || typeFilter === "qualified_leads") {
          const leadFilters: any = {
            current_status: "Qualified"
          }
          if (searchTerm.trim() !== "") {
            leadFilters.search = searchTerm.trim()
          }
          const { data: leads, count: leadCount } = await leadService.getAll({ page, pageSize, filters: leadFilters })
          setQualifiedLeads(leads)
          totalLeads = leadCount ?? 0
        } else {
          setQualifiedLeads([])
        }

        setTotalCount(totalContacts + totalLeads)
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [page, pageSize, statusFilter, riskFilter, searchTerm, typeFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800"
      case "Inactive":
        return "bg-red-100 text-red-800"
      case "Pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Low":
        return "bg-green-100 text-green-800"
      case "Medium":
        return "bg-yellow-100 text-yellow-800"
      case "High":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Pagination controls
  const totalPages = Math.ceil(totalCount / pageSize)
  const canPrev = page > 1
  const canNext = page < totalPages

  // Gate AFTER hooks so effects run consistently
  if (isRecruiter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the contacts page.
          </p>
          <p className="text-sm text-gray-500">
            Recruiters can only access the recruitment page.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading contacts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
            <p className="text-gray-600 mt-2">Manage converted contacts and client relationships</p>
          </div>
          <Link href="/contacts/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Contact
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search contacts and qualified leads..."
                    value={searchTerm}
                    onChange={(e) => { setPage(1); setSearchTerm(e.target.value) }}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={(v) => { setPage(1); setTypeFilter(v) }}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All (Contacts + Qualified Leads)</SelectItem>
                  <SelectItem value="contacts">Contacts Only</SelectItem>
                  <SelectItem value="qualified_leads">Qualified Leads Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v) }}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={(v) => { setPage(1); setRiskFilter(v) }}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by risk level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="Low">Low Risk</SelectItem>
                  <SelectItem value="Medium">Medium Risk</SelectItem>
                  <SelectItem value="High">High Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Contacts & Qualified Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {typeFilter === "all" ? "Contacts & Qualified Leads" : 
               typeFilter === "contacts" ? "Contacts" : "Qualified Leads"} ({totalCount})
            </CardTitle>
            <CardDescription>
              {typeFilter === "all" ? "Manage your client relationships and qualified leads" :
               typeFilter === "contacts" ? "Manage your client relationships and track their progress through service phases" :
               "View and manage qualified leads ready for conversion"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Property Value</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Render Contacts */}
                  {contacts.map((contact: Contact) => (
                    <TableRow key={`contact-${contact.id}`}>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">Contact</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {contact.first_name} {contact.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{contact.occupation}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </div>
                          {contact.mobile_phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {formatPhoneNumber(contact.mobile_phone)}
                            </div>
                          )}
                          {contact.city && (
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3" />
                              {contact.city}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(contact.status)}>{contact.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {contact.risk_level && (
                          <Badge variant="outline" className={getRiskColor(contact.risk_level)}>
                            {contact.risk_level}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.property_value ? `£${contact.property_value.toLocaleString()}` : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div
                            className={`w-3 h-3 rounded-full ${contact.phase_1_complete ? "bg-green-500" : "bg-gray-300"}`}
                          ></div>
                          <div
                            className={`w-3 h-3 rounded-full ${contact.phase_2_complete ? "bg-green-500" : "bg-gray-300"}`}
                          ></div>
                          <div
                            className={`w-3 h-3 rounded-full ${contact.phase_3_complete ? "bg-green-500" : "bg-gray-300"}`}
                          ></div>
                        </div>
                      </TableCell>
                      <TableCell>{contact.owner}</TableCell>
                      <TableCell>{new Date(contact.last_updated).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/contacts/${contact.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/contacts/${contact.id}/opportunities/new`}>
                            <Button variant="outline" size="sm" title="Create Opportunity">
                              <Target className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Render Qualified Leads */}
                  {qualifiedLeads.map((lead: Lead) => (
                    <TableRow key={`lead-${lead.id}`}>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-100 text-green-800">Qualified Lead</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {lead.contact_first_name} {lead.contact_last_name}
                          </div>
                          <div className="text-sm text-gray-500">{lead.business_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {lead.contact_email || lead.company_email || "N/A"}
                          </div>
                          {lead.mobile_phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {formatPhoneNumber(lead.mobile_phone)}
                            </div>
                          )}
                          {lead.business_town && (
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3" />
                              {lead.business_town}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">Qualified</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-gray-100 text-gray-800">N/A</Badge>
                      </TableCell>
                      <TableCell>
                        {lead.annual_revenue ? `£${lead.annual_revenue.toLocaleString()}` : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                        </div>
                      </TableCell>
                      <TableCell>{lead.owner || "Unassigned"}</TableCell>
                      <TableCell>{lead.created_on ? new Date(lead.created_on).toLocaleDateString() : "N/A"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/leads/${lead.id}`}>
                            <Button variant="outline" size="sm" title="View Lead">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/leads/${lead.id}/convert`}>
                            <Button variant="outline" size="sm" title="Convert to Contact">
                              <Target className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Page {page} of {totalPages} ({totalCount} {typeFilter === "all" ? "total items" : typeFilter === "contacts" ? "contacts" : "qualified leads"})
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={!canPrev}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={!canNext}>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
