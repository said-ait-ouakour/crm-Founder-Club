"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, Search, Eye, FileText, Calendar, DollarSign } from "lucide-react"
import Link from "next/link"
import { policyService, opportunityService } from "@/lib/database"
import type { PolicyValuation } from "@/lib/supabase"
import { SelectOpportunityDialog } from "@/components/select-opportunity-dialog"
import { useIsRecruiter } from "@/contexts/auth-context"

export default function PoliciesPage() {
  const isRecruiter = useIsRecruiter();
  
  // Check if user has access to policies page (recruiters cannot access)
  if (isRecruiter) {
    return (
      <div className="bg-gray-50 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the policies page.
          </p>
          <p className="text-sm text-gray-500">
            Recruiters can only access the recruitment page.
          </p>
        </div>
      </div>
    );
  }

  const [policies, setPolicies] = useState<PolicyValuation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [productFilter, setProductFilter] = useState("all")
  const [showOpportunityDialog, setShowOpportunityDialog] = useState(false)

  useEffect(() => {
    async function loadPolicies() {
      try {
        const data = await policyService.getAll()
        setPolicies(data)
      } catch (error) {
        console.error("Error loading policies:", error)
      } finally {
        setLoading(false)
      }
    }

    loadPolicies()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800"
      case "Inactive":
        return "bg-red-100 text-red-800"
      case "Pending":
        return "bg-yellow-100 text-yellow-800"
      case "Cancelled":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredPolicies = policies.filter((policy) => {
    const matchesSearch =
      (policy.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (policy.product?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (policy.policy_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    const matchesStatus = statusFilter === "all" || policy.status === statusFilter
    const matchesProduct = productFilter === "all" || (policy.product?.includes(productFilter) || false)

    return matchesSearch && matchesStatus && matchesProduct
  })

  const totalCommission = filteredPolicies.reduce((sum, policy) => sum + (policy.written_commission || 0), 0)
  const totalValuation = filteredPolicies.reduce((sum, policy) => sum + (policy.valuation_amount || 0), 0)
  const totalIncome = filteredPolicies.reduce((sum, policy) => sum + (policy.income_amount || 0), 0)

  return (
    <div className="bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Policies & Valuations</h1>
            <p className="text-gray-600 mt-2">Manage policies, valuations, and investment products</p>
          </div>
          <Button 
            className="flex items-center gap-2"
            onClick={() => setShowOpportunityDialog(true)}
          >
            <TrendingUp className="h-4 w-4" />
            Add New Policy
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{totalCommission.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Written commission</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Valuations</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{totalValuation.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Current valuations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{totalIncome.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total income generated</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredPolicies.filter((p) => p.status === "Active").length}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
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
                    placeholder="Search by contact, product, or policy number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="Life">Life Insurance</SelectItem>
                  <SelectItem value="Investment">Investment</SelectItem>
                  <SelectItem value="Pension">Pension</SelectItem>
                  <SelectItem value="Bond">Bond</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Policies Table */}
        <Card>
          <CardHeader>
            <CardTitle>Policies & Valuations ({filteredPolicies.length})</CardTitle>
            <CardDescription>Track and manage client policies with their current valuations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Number</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Valuation</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPolicies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">
                        <Link href={`/policies/${policy.id}`} className="hover:underline">
                          {policy.policy_number}
                        </Link>
                      </TableCell>
                      <TableCell>{policy.contact_name}</TableCell>
                      <TableCell>{policy.product}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(policy.status || '')}>{policy.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {policy.written_commission && `£${policy.written_commission.toLocaleString()}`}
                      </TableCell>
                      <TableCell className="text-right">
                        {policy.valuation_amount && `£${policy.valuation_amount.toLocaleString()}`}
                      </TableCell>
                      <TableCell>
                        {policy.effective_date && new Date(policy.effective_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Link href={`/policies/${policy.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
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
      
      <SelectOpportunityDialog 
        open={showOpportunityDialog} 
        onOpenChange={setShowOpportunityDialog}
        onSelect={(opportunityId) => {
          window.location.href = `/opportunities/${opportunityId}/policies/new`
        }}
      />
    </div>
  )
}
