"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, Calendar, User, Plus, TrendingUp } from "lucide-react"
import Link from "next/link"
import { opportunityService } from "@/lib/database"
import type { Opportunity } from "@/lib/supabase"
import { useIsRecruiter } from "@/contexts/auth-context"

export default function OpportunitiesPage() {
  const isRecruiter = useIsRecruiter();
  
  // Check if user has access to opportunities page (recruiters cannot access)
  if (isRecruiter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the opportunities page.
          </p>
          <p className="text-sm text-gray-500">
            Recruiters can only access the recruitment page.
          </p>
        </div>
      </div>
    );
  }

  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [stageFilter, setStageFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  useEffect(() => {
    async function loadOpportunities() {
      try {
        const data = await opportunityService.getAll()
        setOpportunities(data)
      } catch (error) {
        console.error("Error loading opportunities:", error)
      } finally {
        setLoading(false)
      }
    }

    loadOpportunities()
  }, [])

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "Prospecting":
        return "bg-blue-100 text-blue-800"
      case "Qualification":
        return "bg-yellow-100 text-yellow-800"
      case "Proposal":
        return "bg-purple-100 text-purple-800"
      case "Negotiation":
        return "bg-orange-100 text-orange-800"
      case "Closed Won":
        return "bg-green-100 text-green-800"
      case "Closed Lost":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800"
      case "Medium":
        return "bg-yellow-100 text-yellow-800"
      case "Low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredOpportunities = opportunities.filter((opportunity) => {
    const matchesSearch =
      opportunity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (opportunity.lead &&
        `${opportunity.lead.first_name} ${opportunity.lead.last_name}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()))
    const matchesStage = stageFilter === "all" || opportunity.stage === stageFilter
    const matchesPriority = priorityFilter === "all" || opportunity.priority === priorityFilter

    return matchesSearch && matchesStage && matchesPriority
  })

  const totalValue = filteredOpportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0)
  const openOpportunities = filteredOpportunities.filter((opp) => opp.status === "Open")

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading opportunities...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Opportunities</h1>
            <p className="text-gray-600 mt-2">Track sales opportunities and deal progression</p>
          </div>
          <Link href="/opportunities/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Opportunity
            </Button>
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{filteredOpportunities.length} opportunities</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Opportunities</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openOpportunities.length}</div>
              <p className="text-xs text-muted-foreground">
                £{openOpportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0).toLocaleString()} value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Deal Size</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                £
                {filteredOpportunities.length > 0
                  ? Math.round(totalValue / filteredOpportunities.length).toLocaleString()
                  : "0"}
              </div>
              <p className="text-xs text-muted-foreground">Average opportunity value</p>
            </CardContent>
          </Card>
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
                    placeholder="Search opportunities by name or lead..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="Prospecting">Prospecting</SelectItem>
                  <SelectItem value="Qualification">Qualification</SelectItem>
                  <SelectItem value="Proposal">Proposal</SelectItem>
                  <SelectItem value="Negotiation">Negotiation</SelectItem>
                  <SelectItem value="Closed Won">Closed Won</SelectItem>
                  <SelectItem value="Closed Lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="High">High Priority</SelectItem>
                  <SelectItem value="Medium">Medium Priority</SelectItem>
                  <SelectItem value="Low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Opportunities Table */}
        <Card>
          <CardHeader>
            <CardTitle>Opportunities ({filteredOpportunities.length})</CardTitle>
            <CardDescription>Track and manage your sales opportunities through the deal pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Opportunity</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Priority</TableHead>
                    {/* <TableHead>Probability</TableHead> */}
                    <TableHead>Amount</TableHead>
                    <TableHead>Expected Close</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOpportunities.map((opportunity) => (
                    <TableRow key={opportunity.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{opportunity.name}</div>
                          <div className="text-sm text-gray-500 truncate max-w-48">{opportunity.description}</div>
                        </div>
                      </TableCell>
                                             <TableCell>
                         <div className="flex items-center gap-2">
                           <User className="h-4 w-4 text-gray-400" />
                           {opportunity.lead
                             ? `${opportunity.lead.first_name} ${opportunity.lead.last_name}`
                             : "No lead"}
                         </div>
                       </TableCell>
                      <TableCell>
                        <Badge className={getStageColor(opportunity.stage)}>{opportunity.stage}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPriorityColor(opportunity.priority)}>
                          {opportunity.priority}
                        </Badge>
                      </TableCell>
                      {/* <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${opportunity.probability}%` }}
                            ></div>
                          </div>
                          <span className="text-sm">{opportunity.probability}%</span>
                        </div>
                      </TableCell> */}
                      <TableCell>{opportunity.amount ? `£${opportunity.amount.toLocaleString()}` : "N/A"}</TableCell>
                      <TableCell>
                        {opportunity.expected_close_date
                          ? new Date(opportunity.expected_close_date).toLocaleDateString()
                          : "Not set"}
                      </TableCell>
                      <TableCell>{opportunity.owner}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/opportunities/${opportunity.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
