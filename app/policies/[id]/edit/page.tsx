"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Calendar as CalendarIcon, DollarSign, FileText, User } from "lucide-react"
import Link from "next/link"
import { policyService, opportunityService } from "@/lib/database"
import type { PolicyValuation, Opportunity } from "@/lib/supabase"

export default function EditPolicyPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [policy, setPolicy] = useState<Partial<PolicyValuation>>({})
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])

  // Load policy and opportunities
  useEffect(() => {
    async function loadData() {
      try {
        // Load opportunities for the dropdown
        const opps = await opportunityService.getAll()
        setOpportunities(opps)

        // Load the existing policy
        const data = await policyService.getById(params.id as string)
        
        // Format dates for date inputs
        const formattedPolicy = {
          ...data,
          effective_date: data.effective_date ? data.effective_date.split('T')[0] : '',
          valuation_date: data.valuation_date ? data.valuation_date.split('T')[0] : ''
        }
        
        setPolicy(formattedPolicy)
      } catch (error) {
        console.error("Error loading data:", error)
        window.location.href = "/policies"
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params.id, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    
    // Handle number inputs
    if (type === 'number') {
      setPolicy(prev => ({
        ...prev,
        [name]: value ? parseFloat(value) : null
      }))
    } else {
      setPolicy(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }


  const handleSelectChange = (name: string, value: string | null) => {
    setPolicy(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (policy.id) {
        await policyService.update(policy.id, policy)
        window.location.href = `/policies/${policy.id}`
        router.refresh()
      }
    } catch (error) {
      console.error("Error updating policy:", error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading policy...</p>
        </div>
      </div>
    )
  }

  if (!policy) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Policy not found</h2>
          <p className="text-gray-600 mt-2">The policy you're looking for doesn't exist.</p>
          <Link href="/policies">
            <Button className="mt-4">Back to Policies</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Policy</h1>
            <p className="text-gray-600">Update the policy details below</p>
          </div>
          <div className="flex space-x-2">
            <Link href={`/policies/${policy.id}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Policy Information
              </CardTitle>
              <CardDescription>Update the basic details of this policy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="policy_number">Policy Number</Label>
                  <Input
                    id="policy_number"
                    name="policy_number"
                    value={policy.policy_number || ''}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product">Product</Label>
                  <Input
                    id="product"
                    name="product"
                    value={policy.product || ''}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={policy.status || ''} 
                    onValueChange={(value) => handleSelectChange('status', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                      <SelectItem value="Lapsed">Lapsed</SelectItem>
                      <SelectItem value="Matured">Matured</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="effective_date">Effective Date</Label>
                  <div className="relative">
                    <Input
                      id="effective_date"
                      name="effective_date"
                      type="date"
                      value={policy.effective_date || ''}
                      onChange={handleInputChange}
                      className="pl-10"
                    />
                    <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_name">Contact Name</Label>
                  <Input
                    id="contact_name"
                    name="contact_name"
                    value={policy.contact_name || ''}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="policy_owner">Policy Owner</Label>
                  <Input
                    id="policy_owner"
                    name="policy_owner"
                    value={policy.policy_owner || ''}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="opportunity_id">Related Opportunity</Label>
                  <Select 
                    value={policy.opportunity_id || 'none'} 
                    onValueChange={(value) => handleSelectChange('opportunity_id', value === 'none' ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select opportunity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {opportunities.map((opp) => (
                        <SelectItem key={opp.id} value={opp.id}>
                          {opp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Information
              </CardTitle>
              <CardDescription>Update the financial details of this policy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="premium_amount">Premium Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">£</span>
                    <Input
                      id="premium_amount"
                      name="premium_amount"
                      type="number"
                      step="0.01"
                      value={policy.premium_amount || ''}
                      onChange={handleInputChange}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="written_commission">Written Commission</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">£</span>
                    <Input
                      id="written_commission"
                      name="written_commission"
                      type="number"
                      step="0.01"
                      value={policy.written_commission || ''}
                      onChange={handleInputChange}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="received_commission">Received Commission</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">£</span>
                    <Input
                      id="received_commission"
                      name="received_commission"
                      type="number"
                      step="0.01"
                      value={policy.received_commission || ''}
                      onChange={handleInputChange}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valuation_amount">Valuation Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">£</span>
                    <Input
                      id="valuation_amount"
                      name="valuation_amount"
                      type="number"
                      step="0.01"
                      value={policy.valuation_amount || ''}
                      onChange={handleInputChange}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valuation_date">Valuation Date</Label>
                  <div className="relative">
                    <Input
                      id="valuation_date"
                      name="valuation_date"
                      type="date"
                      value={policy.valuation_date || ''}
                      onChange={handleInputChange}
                      className="pl-10"
                    />
                    <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="income_amount">Income Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">£</span>
                    <Input
                      id="income_amount"
                      name="income_amount"
                      type="number"
                      step="0.01"
                      value={policy.income_amount || ''}
                      onChange={handleInputChange}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Additional Information
              </CardTitle>
              <CardDescription>Add any additional details about this policy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="provider_name">Provider Name</Label>
                  <Input
                    id="provider_name"
                    name="provider_name"
                    value={policy.provider_name || ''}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider_client_number">Provider Client Number</Label>
                  <Input
                    id="provider_client_number"
                    name="provider_client_number"
                    value={policy.provider_client_number || ''}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workflow_status">Workflow Status</Label>
                  <Select 
                    value={policy.workflow_status || ''} 
                    onValueChange={(value) => handleSelectChange('workflow_status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Pending Review">Pending Review</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="On Hold">On Hold</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assigned To</Label>
                  <Input
                    id="assigned_to"
                    name="assigned_to"
                    value={policy.assigned_to || ''}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={policy.notes || ''}
                    onChange={handleInputChange}
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4 pt-4">
            <Link href={`/policies/${policy.id}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
