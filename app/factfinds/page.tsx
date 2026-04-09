"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, User, Calendar, DollarSign, Plus } from "lucide-react"
import Link from "next/link"
import { factFindService } from "@/lib/database"
import type { FactFind } from "@/lib/supabase"
import { useIsRecruiter } from "@/contexts/auth-context"

export default function FactFindsPage() {
  const isRecruiter = useIsRecruiter();
  
  // Check if user has access to factfinds page (recruiters cannot access)
  if (isRecruiter) {
    return (
      <div className="bg-gray-50 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the factfinds page.
          </p>
          <p className="text-sm text-gray-500">
            Recruiters can only access the recruitment page.
          </p>
        </div>
      </div>
    );
  }

  const [factFinds, setFactFinds] = useState<FactFind[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [consultantFilter, setConsultantFilter] = useState("all")

  useEffect(() => {
    async function loadFactFinds() {
      try {
        const data = await factFindService.getAll()
        setFactFinds(data)
      } catch (error) {
        console.error("Error loading factfinds:", error)
      } finally {
        setLoading(false)
      }
    }

    loadFactFinds()
  }, [])

  const filteredFactFinds = factFinds.filter((factfind) => {
    const matchesSearch =
      (factfind.contact_name && factfind.contact_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (factfind.consultant_name && factfind.consultant_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (factfind.contact &&
        `${factfind.contact.first_name} ${factfind.contact.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesConsultant = consultantFilter === "all" || factfind.consultant_name === consultantFilter

    return matchesSearch && matchesConsultant
  })

  const totalNetAssets = filteredFactFinds.reduce((sum, ff) => sum + (ff.net_assets_total || 0), 0)
  const totalIHTDue = filteredFactFinds.reduce((sum, ff) => sum + (ff.inheritance_tax_due || 0), 0)

  if (loading) {
    return (
      <div className="bg-gray-50 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading factfinds...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">FactFinds</h1>
            <p className="text-gray-600 mt-2">Detailed client information and financial assessments</p>
          </div>
          <Link href="/factfinds/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New FactFind
            </Button>
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total FactFinds</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredFactFinds.length}</div>
              <p className="text-xs text-muted-foreground">Client assessments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Net Assets</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{(totalNetAssets / 1000000).toFixed(1)}M</div>
              <p className="text-xs text-muted-foreground">Combined client assets</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">IHT Exposure</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{totalIHTDue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total inheritance tax due</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Estate Value</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                £
                {filteredFactFinds.length > 0
                  ? Math.round(totalNetAssets / filteredFactFinds.length).toLocaleString()
                  : "0"}
              </div>
              <p className="text-xs text-muted-foreground">Average per client</p>
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
                    placeholder="Search by contact or consultant name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={consultantFilter} onValueChange={setConsultantFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by consultant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Consultants</SelectItem>
                  <SelectItem value="Terry Murphy">Terry Murphy</SelectItem>
                  <SelectItem value="Aidan Kelly">Aidan Kelly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* FactFinds Table */}
        <Card>
          <CardHeader>
            <CardTitle>FactFinds ({filteredFactFinds.length})</CardTitle>
            <CardDescription>Comprehensive client financial assessments and planning documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Consultant</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Income</TableHead>
                    <TableHead>Property Value</TableHead>
                    <TableHead>Net Assets</TableHead>
                    <TableHead>IHT Due</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFactFinds.map((factfind) => (
                    <TableRow key={factfind.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {factfind.contact
                              ? `${factfind.contact.first_name} ${factfind.contact.last_name}`
                              : factfind.contact_name || "Unknown"}
                          </div>
                          <div className="text-sm text-gray-500">{factfind.c1_occupation}</div>
                        </div>
                      </TableCell>
                      <TableCell>{factfind.consultant_name}</TableCell>
                      <TableCell>
                        {factfind.factfind_date ? new Date(factfind.factfind_date).toLocaleDateString() : "Draft"}
                      </TableCell>
                      <TableCell>{factfind.c1_income ? `£${factfind.c1_income.toLocaleString()}` : "N/A"}</TableCell>
                      <TableCell>
                        {factfind.c1_main_home ? `£${factfind.c1_main_home.toLocaleString()}` : "N/A"}
                      </TableCell>
                      <TableCell>
                        {factfind.net_assets_total ? `£${factfind.net_assets_total.toLocaleString()}` : "N/A"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            factfind.inheritance_tax_due && factfind.inheritance_tax_due > 0
                              ? "text-red-600 font-medium"
                              : "text-green-600"
                          }
                        >
                          £{factfind.inheritance_tax_due ? factfind.inheritance_tax_due.toLocaleString() : "0"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/factfinds/${factfind.id}`}>
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
