"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { policyService, opportunityService } from "@/lib/database"
import type { PolicyValuation, Opportunity } from "@/lib/supabase"

export default function NewPolicyPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [formData, setFormData] = useState({
    contact_name: "",
    policy_owner: "",
    owner: "",
    product: "",
    policy_register_status: "Active",
    effective_date: new Date().toISOString().split("T")[0],
    received_commission: "",
    written_commission: "",
    premium_amount: "",
    advisor_name: "",
    policy_number: "",
    fund_history: "",
    status: "Active",
    valuation_entity: "",
    valuation_date: new Date().toISOString().split("T")[0],
    valuation_amount: "",
    cash_account_amount: "",
    provider_name: "",
    provider_client_number: "",
    income_amount: "",
    income_to_date: "",
    workflow_status: "In Progress",
    email_link_sent: false,
    assigned_to: "",
  })

  useEffect(() => {
    console.log('useEffect triggered with params.id:', params.id);
    let isMounted = true;
    
    async function loadOpportunity() {
      console.log('loadOpportunity called with id:', params.id);
      
      if (!params.id) {
        console.log('No ID provided, redirecting to /opportunities');
        window.location.href = "/opportunities";
        return;
      }

      try {
        console.log('Setting loading to true');
        setLoading(true);
        
        console.log('Calling opportunityService.getById with id:', params.id);
        const data = await opportunityService.getById(params.id as string);
        console.log('Received data from opportunityService.getById:', data);
        
        if (!isMounted) {
          console.log('Component unmounted, aborting');
          return;
        }
        
        if (!data) {
          console.error('Opportunity not found for id:', params.id);
          throw new Error("Opportunity not found");
        }
        
        console.log('Setting opportunity state');
        setOpportunity(data);

        // Pre-populate form with opportunity data
        console.log('Pre-populating form data');
        const newFormData = {
          contact_name: data.contact ? `${data.contact.first_name} ${data.contact.last_name}` : "",
          policy_owner: data.contact ? `${data.contact.first_name} ${data.contact.last_name}` : "",
          owner: data.owner || "",
          advisor_name: data.owner || "",
          assigned_to: data.owner || "",
        };
        console.log('New form data:', newFormData);
        
        setFormData(prev => ({
          ...prev,
          ...newFormData
        }));
        
        console.log('Form data set successfully');
      } catch (error) {
        console.error("Error in loadOpportunity:", error);
        if (isMounted) {
          window.location.href = "/opportunities";
        }
      } finally {
        console.log('Setting loading to false');
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadOpportunity().catch(error => {
      console.error('Unhandled error in loadOpportunity:', error);
      if (isMounted) {
        window.location.href = "/opportunities";
      }
    });
    
    return () => {
      console.log('Cleanup: setting isMounted to false');
      isMounted = false;
    };
  }, [params.id, router]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const policyData: Omit<PolicyValuation, "id" | "created_on" | "updated_at"> = {
        opportunity_id: params.id as string,
        contact_name: formData.contact_name,
        policy_owner: formData.policy_owner,
        owner: formData.owner,
        product: formData.product,
        policy_register_status: formData.policy_register_status,
        effective_date: formData.effective_date || undefined,
        received_commission: formData.received_commission ? Number.parseFloat(formData.received_commission) : undefined,
        written_commission: formData.written_commission ? Number.parseFloat(formData.written_commission) : undefined,
        premium_amount: formData.premium_amount ? Number.parseFloat(formData.premium_amount) : undefined,
        advisor_name: formData.advisor_name,
        policy_number: formData.policy_number,
        fund_history: formData.fund_history,
        status: formData.status,
        valuation_entity: formData.valuation_entity,
        valuation_date: formData.valuation_date || undefined,
        valuation_amount: formData.valuation_amount ? Number.parseFloat(formData.valuation_amount) : undefined,
        cash_account_amount: formData.cash_account_amount ? Number.parseFloat(formData.cash_account_amount) : undefined,
        provider_name: formData.provider_name,
        provider_client_number: formData.provider_client_number,
        income_amount: formData.income_amount ? Number.parseFloat(formData.income_amount) : undefined,
        income_to_date: formData.income_to_date ? Number.parseFloat(formData.income_to_date) : undefined,
        workflow_status: formData.workflow_status,
        email_link_sent: formData.email_link_sent,
        assigned_to: formData.assigned_to,
      }

      const policy = await policyService.create(policyData)
      window.location.href = `/policies/${policy.id}`
    } catch (error) {
      console.error("Error creating policy:", error)
      alert("Error creating policy. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading opportunity details...</p>
          <p className="text-sm text-gray-500 mt-2">ID: {params.id}</p>
        </div>
      </div>
    )
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading opportunity...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/opportunities/${opportunity.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Opportunity
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Policy</h1>
            <p className="text-gray-600 mt-2">Creating policy for opportunity: {opportunity.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Essential policy details and identification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_name">Contact Name</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) => handleInputChange("contact_name", e.target.value)}
                    placeholder="Client name"
                  />
                </div>
                <div>
                  <Label htmlFor="policy_owner">Policy Owner</Label>
                  <Input
                    id="policy_owner"
                    value={formData.policy_owner}
                    onChange={(e) => handleInputChange("policy_owner", e.target.value)}
                    placeholder="Policy owner name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product">Product *</Label>
                  <Select
                    value={formData.product}
                    onValueChange={(value) => handleInputChange("product", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Whole of Life Policy">Whole of Life Policy</SelectItem>
                      <SelectItem value="Investment Bond">Investment Bond</SelectItem>
                      <SelectItem value="Pension Transfer">Pension Transfer</SelectItem>
                      <SelectItem value="ISA">ISA</SelectItem>
                      <SelectItem value="Critical Illness Cover">Critical Illness Cover</SelectItem>
                      <SelectItem value="Income Protection">Income Protection</SelectItem>
                      <SelectItem value="Term Life Insurance">Term Life Insurance</SelectItem>
                      <SelectItem value="Annuity">Annuity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="policy_number">Policy Number</Label>
                  <Input
                    id="policy_number"
                    value={formData.policy_number}
                    onChange={(e) => handleInputChange("policy_number", e.target.value)}
                    placeholder="POL-2024-XXX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="effective_date">Effective Date</Label>
                  <Input
                    id="effective_date"
                    type="date"
                    value={formData.effective_date}
                    onChange={(e) => handleInputChange("effective_date", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Details */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Details</CardTitle>
              <CardDescription>Commission, premium, and financial information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="written_commission">Written Commission (£)</Label>
                  <Input
                    id="written_commission"
                    type="number"
                    value={formData.written_commission}
                    onChange={(e) => handleInputChange("written_commission", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="received_commission">Received Commission (£)</Label>
                  <Input
                    id="received_commission"
                    type="number"
                    value={formData.received_commission}
                    onChange={(e) => handleInputChange("received_commission", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="premium_amount">Premium Amount (£)</Label>
                  <Input
                    id="premium_amount"
                    type="number"
                    value={formData.premium_amount}
                    onChange={(e) => handleInputChange("premium_amount", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="income_amount">Income Amount (£)</Label>
                  <Input
                    id="income_amount"
                    type="number"
                    value={formData.income_amount}
                    onChange={(e) => handleInputChange("income_amount", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="income_to_date">Income to Date (£)</Label>
                  <Input
                    id="income_to_date"
                    type="number"
                    value={formData.income_to_date}
                    onChange={(e) => handleInputChange("income_to_date", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Valuation Details */}
          <Card>
            <CardHeader>
              <CardTitle>Valuation Details</CardTitle>
              <CardDescription>Current valuation and provider information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valuation_entity">Valuation Entity</Label>
                  <Input
                    id="valuation_entity"
                    value={formData.valuation_entity}
                    onChange={(e) => handleInputChange("valuation_entity", e.target.value)}
                    placeholder="e.g., Tabifa Holdings"
                  />
                </div>
                <div>
                  <Label htmlFor="valuation_date">Valuation Date</Label>
                  <Input
                    id="valuation_date"
                    type="date"
                    value={formData.valuation_date}
                    onChange={(e) => handleInputChange("valuation_date", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valuation_amount">Valuation Amount (£)</Label>
                  <Input
                    id="valuation_amount"
                    type="number"
                    value={formData.valuation_amount}
                    onChange={(e) => handleInputChange("valuation_amount", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="cash_account_amount">Cash Account Amount (£)</Label>
                  <Input
                    id="cash_account_amount"
                    type="number"
                    value={formData.cash_account_amount}
                    onChange={(e) => handleInputChange("cash_account_amount", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="provider_name">Provider Name</Label>
                  <Input
                    id="provider_name"
                    value={formData.provider_name}
                    onChange={(e) => handleInputChange("provider_name", e.target.value)}
                    placeholder="Insurance/Investment provider"
                  />
                </div>
                <div>
                  <Label htmlFor="provider_client_number">Provider Client Number</Label>
                  <Input
                    id="provider_client_number"
                    value={formData.provider_client_number}
                    onChange={(e) => handleInputChange("provider_client_number", e.target.value)}
                    placeholder="Client reference number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Management Information */}
          <Card>
            <CardHeader>
              <CardTitle>Management Information</CardTitle>
              <CardDescription>Assignment and workflow details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="owner">Owner</Label>
                  <Select value={formData.owner} onValueChange={(value) => handleInputChange("owner", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Terry Murphy">Terry Murphy</SelectItem>
                      <SelectItem value="Aidan Kelly">Aidan Kelly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="advisor_name">Advisor Name</Label>
                  <Input
                    id="advisor_name"
                    value={formData.advisor_name}
                    onChange={(e) => handleInputChange("advisor_name", e.target.value)}
                    placeholder="Financial advisor"
                  />
                </div>
                <div>
                  <Label htmlFor="assigned_to">Assigned To</Label>
                  <Input
                    id="assigned_to"
                    value={formData.assigned_to}
                    onChange={(e) => handleInputChange("assigned_to", e.target.value)}
                    placeholder="Team member assigned"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="policy_register_status">Policy Register Status</Label>
                  <Select
                    value={formData.policy_register_status}
                    onValueChange={(value) => handleInputChange("policy_register_status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="workflow_status">Workflow Status</Label>
                  <Select
                    value={formData.workflow_status}
                    onValueChange={(value) => handleInputChange("workflow_status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Pending Review">Pending Review</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="On Hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email_link_sent"
                  checked={formData.email_link_sent}
                  onCheckedChange={(checked) => handleInputChange("email_link_sent", checked)}
                />
                <Label htmlFor="email_link_sent">Email Link Sent</Label>
              </div>
            </CardContent>
          </Card>

          {/* Fund History */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>Fund history and additional notes</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="fund_history">Fund History</Label>
                <Textarea
                  id="fund_history"
                  value={formData.fund_history}
                  onChange={(e) => handleInputChange("fund_history", e.target.value)}
                  placeholder="Fund performance history, switches, and notes..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link href={`/opportunities/${opportunity.id}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Policy
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
