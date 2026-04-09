"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Edit, User, Target, Calendar, Volume2, Package, FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import { opportunityService } from "@/lib/database"
import { supabase } from "@/lib/supabase"
import type { Opportunity } from "@/lib/supabase"

interface VoiceMemo {
  voice_memo_id: string
  opportunity_id: string
  created_at: string
  voice_memo: {
    id: string
    url: string
    name: string
    created_at: string
  } | null
}

export default function OpportunityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [voiceMemos, setVoiceMemos] = useState<VoiceMemo[]>([])
  const [factFind, setFactFind] = useState<any>(null)
  const [illustrations, setIllustrations] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOpportunityData() {
      try {
        const opportunityData = await opportunityService.getById(params.id as string)

        setOpportunity(opportunityData)

        // Load fact find if opportunity has fact_find_id
        console.log("Opportunity data:", opportunityData)
        console.log("Opportunity fact_find_id:", opportunityData?.fact_find_id)
        if (opportunityData?.fact_find_id) {
          const { data: factFindData, error: factFindError } = await supabase
            .from('factfinds')
            .select('id, name, file_id')
            .eq('id', opportunityData.fact_find_id)
            .single()

          if (factFindError) {
            console.error("Error loading fact find:", factFindError)
          } else {
            console.log("Fact find data loaded:", factFindData)
            setFactFind(factFindData)
          }
        } else {
          console.log("No fact_find_id found in opportunity data")
        }

        // Load voice memos
        const { data: voiceMemosData, error: voiceMemosError } = await supabase
          .from('opportunities_voice_memos')
          .select('voice_memo_id, opportunity_id, created_at')
          .eq('opportunity_id', params.id as string)

        if (voiceMemosError) {
          console.error("Error loading voice memos:", voiceMemosError)
        } else {
          console.log("Voice memos loaded:", voiceMemosData?.length || 0, "voice memos")
          
          // Load voice memo details for each voice memo
          if (voiceMemosData && voiceMemosData.length > 0) {
            const voiceMemoIds = voiceMemosData.map(vm => vm.voice_memo_id)
            const { data: voiceMemoDetails, error: detailsError } = await supabase
              .from('voice_memos')
              .select('id, url, name, created_at')
              .in('id', voiceMemoIds)

            if (detailsError) {
              console.error("Error loading voice memo details:", detailsError)
            } else {
              // Combine the data
              const combinedVoiceMemos = voiceMemosData.map(vm => {
                const details = voiceMemoDetails?.find(d => d.id === vm.voice_memo_id)
                return {
                  voice_memo_id: String(vm.voice_memo_id),
                  opportunity_id: String(vm.opportunity_id),
                  created_at: String(vm.created_at || ''),
                  voice_memo: details ? {
                    id: String(details.id),
                    url: String(details.url || ''),
                    name: String(details.name || ''),
                    created_at: String(details.created_at || '')
                  } : null
                }
              }).filter(vm => vm.voice_memo !== null) as VoiceMemo[]
              
                             console.log("Combined voice memos:", combinedVoiceMemos)
               setVoiceMemos(combinedVoiceMemos)
            }
          } else {
            setVoiceMemos([])
          }
        }

        // Load associated illustrations using illustration_id from opportunities table
        if (opportunityData?.illustration_id) {
          console.log('Loading illustration with ID:', opportunityData.illustration_id)
          const { data: illustrationData, error: illustrationError } = await supabase
            .from('illustrations')
            .select('id, name, property_value, property_type, location, funding_required, created_at')
            .eq('id', opportunityData.illustration_id)
            .single()

          if (illustrationError) {
            console.error('Error loading illustration:', illustrationError)
            setIllustrations([])
          } else {
            console.log('Illustration loaded:', illustrationData)
            setIllustrations(illustrationData ? [illustrationData] : [])
          }
        } else {
          console.log('No illustration_id found for this opportunity')
          setIllustrations([])
        }

        // Load associated products
        console.log("Attempting to load products for opportunity:", params.id)
        
        const { data: productsData, error: productsError } = await supabase
          .from('opportunity_products')
          .select('product_id, opportunity_id')
          .eq('opportunity_id', params.id as string)

        if (productsError) {
          console.error('Error loading opportunity products:', productsError)
          setProducts([])
        } else {
          console.log('Products data loaded:', productsData)
          if (productsData && productsData.length > 0) {
            // Load product details for each product
            const productIds = productsData.map(op => op.product_id)
            console.log('Product IDs to fetch:', productIds)
            
            const { data: productDetails, error: productDetailsError } = await supabase
              .from('products')
              .select('id, name, standard_cost, list_price, product_type')
              .in('id', productIds)

            if (productDetailsError) {
              console.error('Error loading product details:', productDetailsError)
              setProducts([])
            } else {
              console.log('Product details loaded:', productDetails)
              setProducts(productDetails || [])
            }
          } else {
            console.log('No products found for this opportunity')
            setProducts([])
          }
        }
      } catch (error) {
        console.error("Error loading opportunity data:", error)
        window.location.href = "/opportunities"
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadOpportunityData()
    }
  }, [params.id, router])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading opportunity details...</p>
        </div>
      </div>
    )
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Opportunity not found</h2>
          <p className="text-gray-600 mt-2">The opportunity you're looking for doesn't exist.</p>
          <Link href="/opportunities">
            <Button className="mt-4">Back to Opportunities</Button>
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
            <Link href="/opportunities">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Opportunities
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{opportunity.name}</h1>
              <p className="text-gray-600 mt-2">Opportunity Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/opportunities/${opportunity.id}/edit`}>
              <Button variant="outline" className="bg-white hover:bg-gray-50">
                <Edit className="h-4 w-4 mr-2" />
                Edit Opportunity
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
                  <Target className="h-5 w-5" />
                  Opportunity Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Lead</label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-gray-400" />
                      {opportunity.lead ? (
                        <Link href={`/leads/${opportunity.lead.id}`} className="text-blue-600 hover:underline">
                          {opportunity.lead.first_name} {opportunity.lead.last_name}
                        </Link>
                      ) : (
                        <span>No lead assigned</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Owner</label>
                    <p className="mt-1">{opportunity.owner || "Not assigned"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Opportunity Name</label>
                    <p className="text-lg font-semibold">{opportunity.name}</p>
                  </div>
                  {opportunity.type && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Opportunity Type</label>
                      <p className="mt-1">{opportunity.type}</p>
                    </div>
                  )}
                </div>

                {opportunity.topic && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Opportunity Topic</label>
                      <p className="mt-1">{opportunity.topic}</p>
                    </div>
                    {factFind && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Fact Find</label>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-medium">
                            {factFind.name}
                          </span>
                          {factFind.file_id ? (
                            <a
                              href={`https://drive.google.com/file/d/${factFind.file_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              View fact find
                            </a>
                          ) : (
                            <span className="text-gray-500 text-sm">(No file ID)</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {opportunity.main_objectives && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Main Objectives</label>
                      <p className="mt-1 whitespace-pre-wrap">{opportunity.main_objectives}</p>
                    </div>
                    {opportunity.benifits && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Benefits</label>
                        <p className="mt-1 whitespace-pre-wrap">{opportunity.benifits}</p>
                      </div>
                    )}
                  </div>
                )}

                {opportunity.description && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Description</label>
                      <p className="mt-1">{opportunity.description}</p>
                    </div>
                    {opportunity.advisor_initial_analysis && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Advisor Initial Analysis</label>
                        <p className="mt-1 whitespace-pre-wrap">{opportunity.advisor_initial_analysis}</p>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                {/* Additional Financial Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {opportunity.revenue_user_provided && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Revenue (User Provided)</label>
                      <p className="mt-1">£{opportunity.revenue_user_provided.toLocaleString()}</p>
                    </div>
                  )}
                  {opportunity.revenue_system_calculated && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Revenue (System Calculated)</label>
                      <p className="mt-1">£{opportunity.revenue_system_calculated.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {opportunity.investment_manager && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Investment Manager</label>
                      <p className="mt-1">{opportunity.investment_manager}</p>
                    </div>
                  )}
                  {opportunity.rating && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Rating</label>
                      <p className="mt-1">{opportunity.rating}</p>
                    </div>
                  )}
                </div> */}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {opportunity.paid_owner && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Paid Owner Date</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{new Date(opportunity.paid_owner).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                  {opportunity.paid_advisor && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Paid Advisor Date</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{new Date(opportunity.paid_advisor).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Financial Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {opportunity.amount && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Opportunity Value</label>
                      <p className="text-2xl font-bold text-green-600">£{opportunity.amount.toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Probability</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-24 bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full"
                          style={{ width: `${opportunity.probability}%` }}
                        ></div>
                      </div>
                      <span className="text-lg font-semibold">{opportunity.probability}%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {opportunity.expected_close_date && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Expected Close Date</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{new Date(opportunity.expected_close_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                  {opportunity.currency && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Currency</label>
                      <p className="mt-1">{opportunity.currency}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {opportunity.price_list && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Price List</label>
                      <p className="mt-1">{opportunity.price_list}</p>
                    </div>
                  )}
                  {opportunity.received595_pay !== undefined && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Received 595 Pay</label>
                      <p className="mt-1">
                        <Badge variant={opportunity.received595_pay ? "default" : "secondary"}>
                          {opportunity.received595_pay ? "Yes" : "No"}
                        </Badge>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Associated Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Associated Products ({products.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {products.length > 0 ? (
                  <div className="space-y-4">
                    {products.map((product) => (
                      <div key={product.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium">{product.name || "Unknown Product"}</p>
                            <p className="text-sm text-gray-500">{product.product_type || "No type specified"}</p>
                          </div>
                          <div className="text-right">
                            {product.standard_cost && (
                              <p className="font-semibold">£{product.standard_cost.toLocaleString()}</p>
                            )}
                            <p className="text-sm text-gray-500">{product.list_price || "No price list"}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <Link href={`/products`}>
                            <Button size="sm" variant="outline">
                              View Products
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No products associated with this opportunity yet</p>
                    <Link href="/products">
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Browse Products
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Associated Illustrations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Associated Illustrations ({illustrations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {illustrations.length > 0 ? (
                  <div className="space-y-4">
                    {illustrations.map((illustration) => (
                      <div key={illustration.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium">{illustration.name || "Unknown Illustration"}</p>
                            <p className="text-sm text-gray-500">{illustration.property_type || "No type specified"}</p>
                          </div>
                          <div className="text-right">
                            {illustration.property_value && (
                              <p className="font-semibold">£{illustration.property_value.toLocaleString()}</p>
                            )}
                            <p className="text-sm text-gray-500">{illustration.location || "No location"}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          {illustration.funding_required && (
                            <div>
                              <span className="text-gray-500">Funding:</span>
                              <span className="ml-1 font-medium">{illustration.funding_required}</span>
                            </div>
                          )}
                          {illustration.created_at && (
                            <div>
                              <span className="text-gray-500">Created:</span>
                              <span className="ml-1 font-medium">
                                {new Date(illustration.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex justify-end">
                          <Link href={`/illustrations`}>
                            <Button size="sm" variant="outline">
                              View Illustrations
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No illustrations associated with this opportunity yet</p>
                    <Link href="/illustrations">
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Browse Illustrations
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {opportunity.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{opportunity.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Status & Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Stage</label>
                  <div className="mt-1">
                    <Badge className={getStageColor(opportunity.stage)}>{opportunity.stage}</Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Priority</label>
                  <div className="mt-1">
                    <Badge variant="outline" className={getPriorityColor(opportunity.priority)}>
                      {opportunity.priority}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge variant={opportunity.status === "Open" ? "default" : "secondary"}>
                      {opportunity.status}
                    </Badge>
                  </div>
                </div>

                {opportunity.closed_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Closed Date</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{new Date(opportunity.closed_date).toLocaleDateString()}</span>
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
                    <span>{new Date(opportunity.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{new Date(opportunity.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Voice Memos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5" />
                  Voice Memos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {voiceMemos.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <Volume2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No voice memos recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {voiceMemos.map((voiceMemo) => (
                      voiceMemo.voice_memo && (
                                                 <div key={voiceMemo.voice_memo_id} className="border rounded-lg p-4 bg-gray-50">
                                                     <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-2">
                               <Volume2 className="h-4 w-4 text-gray-500" />
                               <span className="text-sm font-medium text-gray-700">
                                 {voiceMemo.voice_memo.name || `Voice Memo ${voiceMemo.voice_memo_id}`}
                               </span>
                             </div>
                             <span className="text-xs text-gray-500">
                               {new Date(voiceMemo.voice_memo.created_at).toLocaleDateString()}
                             </span>
                           </div>
                           {/* <div className="text-xs text-gray-400 mb-2">
                             URL: {voiceMemo.voice_memo.url}
                           </div> */}
                                                     <audio 
                             controls 
                             className="w-full"
                             preload="metadata"
                             onError={(e) => console.error("Audio error:", e)}
                             onLoadStart={() => console.log("Loading audio:", voiceMemo.voice_memo?.url)}
                           >
                             <source src={voiceMemo.voice_memo.url} type="audio/wav" />
                             <source src={voiceMemo.voice_memo.url} type="audio/mpeg" />
                             Your browser does not support the audio element.
                           </audio>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {opportunity.contact && (
                  <Link href={`/contacts/${opportunity.contact.id}`} className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <User className="h-4 w-4 mr-2" />
                      View Contact
                    </Button>
                  </Link>
                )}
                <Link href={`/opportunities/${opportunity.id}/edit`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Opportunity
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
