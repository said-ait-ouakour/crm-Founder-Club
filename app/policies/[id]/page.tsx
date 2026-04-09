"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, TrendingUp, Calendar, User, DollarSign, FileText, Target } from "lucide-react"
import Link from "next/link"
import { policyService } from "@/lib/database"
import type { PolicyValuation } from "@/lib/supabase"

export default function PolicyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [policy, setPolicy] = useState<PolicyValuation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if this is a 'new' policy route
    if (params.id === 'new') {
      window.location.href = '/policies/new';
      return;
    }

    async function loadPolicy() {
      try {
        setLoading(true);
        console.log("Loading policy with ID:", params.id);
        const data = await policyService.getById(params.id as string);
        console.log("Policy data received:", data);
        
        if (!data) {
          console.error("Policy not found for ID:", params.id);
          window.location.href = "/policies";
          return;
        }
        
        setPolicy(data);
      } catch (error) {
        console.error("Error loading policy:", {
          error,
          id: params.id,
          timestamp: new Date().toISOString()
        });
        window.location.href = "/policies";
      } finally {
        setLoading(false);
      }
    }

    if (params.id && params.id !== 'new') {
      loadPolicy()
    }
  }, [params.id, router])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading policy details...</p>
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/policies">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Policies
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{policy.product || "Policy Details"}</h1>
              <p className="text-gray-600 mt-2">{policy.policy_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/policies/${policy.id}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Policy Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Product</label>
                    <p className="text-lg font-semibold">{policy.product || "Not specified"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Policy Number</label>
                    <p className="text-lg font-semibold">{policy.policy_number || "Not assigned"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Contact Name</label>
                    <p>{policy.contact_name || "Not specified"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Policy Owner</label>
                    <p>{policy.policy_owner || "Not specified"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {policy.effective_date && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Effective Date</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{new Date(policy.effective_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(policy.status)}>{policy.status}</Badge>
                    </div>
                  </div>
                </div>

                {policy.opportunity && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Related Opportunity</label>
                    <div className="mt-1">
                      <Link href={`/opportunities/${policy.opportunity.id}`} className="text-blue-600 hover:underline">
                        {policy.opportunity.name}
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {policy.written_commission && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Written Commission</label>
                      <p className="text-lg font-semibold text-green-600">
                        £{policy.written_commission.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {policy.received_commission && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Received Commission</label>
                      <p className="text-lg font-semibold text-blue-600">
                        £{policy.received_commission.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {policy.premium_amount && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Premium Amount</label>
                      <p className="text-lg font-semibold">£{policy.premium_amount.toLocaleString()}</p>
                    </div>
                  )}
                  {policy.income_amount && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Income Amount</label>
                      <p className="text-lg font-semibold">£{policy.income_amount.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {policy.income_to_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Income to Date</label>
                    <p className="text-lg font-semibold">£{policy.income_to_date.toLocaleString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Valuation Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Valuation Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {policy.valuation_entity && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Valuation Entity</label>
                      <p className="text-lg font-semibold">{policy.valuation_entity}</p>
                    </div>
                  )}
                  {policy.valuation_date && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Valuation Date</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{new Date(policy.valuation_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {policy.valuation_amount && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Current Valuation</label>
                      <p className="text-2xl font-bold text-green-600">£{policy.valuation_amount.toLocaleString()}</p>
                    </div>
                  )}
                  {policy.cash_account_amount && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Cash Account</label>
                      <p className="text-lg font-semibold">£{policy.cash_account_amount.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {policy.provider_name && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Provider</label>
                      <p>{policy.provider_name}</p>
                    </div>
                  )}
                  {policy.provider_client_number && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Provider Client Number</label>
                      <p>{policy.provider_client_number}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Fund History */}
            {policy.fund_history && (
              <Card>
                <CardHeader>
                  <CardTitle>Fund History</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{policy.fund_history}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Management Information */}
            <Card>
              <CardHeader>
                <CardTitle>Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {policy.owner && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Owner</label>
                    <p className="mt-1">{policy.owner}</p>
                  </div>
                )}

                {policy.advisor_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Advisor</label>
                    <p className="mt-1">{policy.advisor_name}</p>
                  </div>
                )}

                {policy.assigned_to && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Assigned To</label>
                    <p className="mt-1">{policy.assigned_to}</p>
                  </div>
                )}

                {policy.policy_register_status && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Register Status</label>
                    <div className="mt-1">
                      <Badge variant="outline">{policy.policy_register_status}</Badge>
                    </div>
                  </div>
                )}

                {policy.workflow_status && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Workflow Status</label>
                    <div className="mt-1">
                      <Badge variant="outline">{policy.workflow_status}</Badge>
                    </div>
                  </div>
                )}

                {policy.email_link_sent !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email Link Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className={`w-2 h-2 rounded-full ${policy.email_link_sent ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="text-sm">{policy.email_link_sent ? "Sent" : "Not sent"}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{new Date(policy.created_on).toLocaleDateString()}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{new Date(policy.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {policy.opportunity && (
                  <Link href={`/opportunities/${policy.opportunity.id}`} className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Target className="h-4 w-4 mr-2" />
                      View Opportunity
                    </Button>
                  </Link>
                )}
                {policy.opportunity?.contact && (
                  <Link href={`/contacts/${policy.opportunity.contact.id}`} className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <User className="h-4 w-4 mr-2" />
                      View Contact
                    </Button>
                  </Link>
                )}
                <Link href={`/policies/${policy.id}/edit`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Policy
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
