"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, User, DollarSign, FileText, Calendar, Download } from "lucide-react"
import Link from "next/link"
import { factFindService } from "@/lib/database"
import type { FactFind } from "@/lib/supabase"
import { ExportFactFind } from "@/components/export-factfind"

export default function FactFindDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [factFind, setFactFind] = useState<FactFind | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadFactFind() {
      try {
        const data = await factFindService.getById(params.id as string)
        setFactFind(data)
      } catch (error) {
        console.error("Error loading factfind:", error)
        window.location.href = "/factfinds"
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadFactFind()
    }
  }, [params.id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading factfind details...</p>
        </div>
      </div>
    )
  }

  if (!factFind) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">FactFind not found</h2>
          <p className="text-gray-600 mt-2">The factfind you're looking for doesn't exist.</p>
          <Link href="/factfinds">
            <Button className="mt-4">Back to FactFinds</Button>
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
            <Link href="/factfinds">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to FactFinds
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                FactFind - {factFind.contact_name || "Unknown Contact"}
              </h1>
              <p className="text-gray-600 mt-2">
                {factFind.factfind_date ? new Date(factFind.factfind_date).toLocaleDateString() : "Draft"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ExportFactFind factFind={factFind} />
            <Link href={`/factfinds/${factFind.id}/edit`}>
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
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Contact</label>
                    <p className="text-lg font-semibold">
                      {factFind.contact
                        ? `${factFind.contact.first_name} ${factFind.contact.last_name}`
                        : factFind.contact_name || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Consultant</label>
                    <p>{factFind.consultant_name || "Not assigned"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">FactFind Date</label>
                    <p>{factFind.factfind_date ? new Date(factFind.factfind_date).toLocaleDateString() : "Draft"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Owner</label>
                    <p>{factFind.owner || "Not assigned"}</p>
                  </div>
                </div>

                {factFind.reason_for_meeting && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Reason for Meeting</label>
                    <p className="mt-1">{factFind.reason_for_meeting}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client 1 Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Client 1 Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Full Name</label>
                    <p className="text-lg font-semibold">
                      {factFind.c1_title} {factFind.c1_first_name} {factFind.c1_last_name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Occupation</label>
                    <p>{factFind.c1_occupation || "Not provided"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {factFind.c1_dob && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                      <p>{new Date(factFind.c1_dob).toLocaleDateString()}</p>
                    </div>
                  )}
                  {factFind.c1_gender && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Gender</label>
                      <p>{factFind.c1_gender}</p>
                    </div>
                  )}
                  {factFind.c1_marital_status && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Marital Status</label>
                      <p>{factFind.c1_marital_status}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {factFind.c1_employment_status && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Employment Status</label>
                      <p>{factFind.c1_employment_status}</p>
                    </div>
                  )}
                  {factFind.c1_health_status && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Health Status</label>
                      <p>{factFind.c1_health_status}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4">
                  {factFind.c1_smoker !== undefined && (
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${factFind.c1_smoker ? "bg-red-500" : "bg-green-500"}`}
                      ></div>
                      <span className="text-sm">{factFind.c1_smoker ? "Smoker" : "Non-smoker"}</span>
                    </div>
                  )}
                  {factFind.c1_has_will !== undefined && (
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${factFind.c1_has_will ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="text-sm">{factFind.c1_has_will ? "Has Will" : "No Will"}</span>
                    </div>
                  )}
                  {factFind.c1_has_lpa !== undefined && (
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${factFind.c1_has_lpa ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="text-sm">{factFind.c1_has_lpa ? "Has LPA" : "No LPA"}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {factFind.c1_income && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Annual Income</label>
                      <p className="text-lg font-semibold">£{factFind.c1_income.toLocaleString()}</p>
                    </div>
                  )}
                  {factFind.c1_main_home && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Main Home Value</label>
                      <p className="text-lg font-semibold">£{factFind.c1_main_home.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {factFind.c1_savings && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Savings</label>
                      <p className="text-lg font-semibold">£{factFind.c1_savings.toLocaleString()}</p>
                    </div>
                  )}
                  {factFind.c1_pension && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Pension</label>
                      <p className="text-lg font-semibold">£{factFind.c1_pension.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {factFind.net_assets_total && (
                  <div className="pt-4 border-t">
                    <label className="text-sm font-medium text-gray-500">Net Assets Total</label>
                    <p className="text-2xl font-bold text-green-600">£{factFind.net_assets_total.toLocaleString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inheritance Tax */}
            {(factFind.inheritance_tax_due || factFind.taxable_estate) && (
              <Card>
                <CardHeader>
                  <CardTitle>Inheritance Tax Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {factFind.taxable_estate && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Taxable Estate</label>
                        <p className="text-lg font-semibold">£{factFind.taxable_estate.toLocaleString()}</p>
                      </div>
                    )}
                    {factFind.inheritance_tax_allowance && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">IHT Allowance</label>
                        <p className="text-lg font-semibold">£{factFind.inheritance_tax_allowance.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {factFind.inheritance_tax_due && (
                    <div className="pt-4 border-t">
                      <label className="text-sm font-medium text-gray-500">Inheritance Tax Due</label>
                      <p
                        className={`text-2xl font-bold ${factFind.inheritance_tax_due > 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        £{factFind.inheritance_tax_due.toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Beneficiaries */}
            {(factFind.main_beneficiaries || factFind.child_1_name) && (
              <Card>
                <CardHeader>
                  <CardTitle>Beneficiaries</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {factFind.main_beneficiaries && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Main Beneficiaries</label>
                      <p className="mt-1">{factFind.main_beneficiaries}</p>
                    </div>
                  )}

                  {factFind.child_1_name && (
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Child 1</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Name</label>
                          <p>{factFind.child_1_name}</p>
                        </div>
                        {factFind.child_1_relation_c1 && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Relation</label>
                            <p>{factFind.child_1_relation_c1}</p>
                          </div>
                        )}
                      </div>
                      {factFind.child_1_financial_dependency && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            Financially Dependent
                          </Badge>
                        </div>
                      )}
                      {factFind.child_1_note && (
                        <div className="mt-2">
                          <label className="text-sm font-medium text-gray-500">Notes</label>
                          <p className="text-sm">{factFind.child_1_note}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Estate Planning */}
            <Card>
              <CardHeader>
                <CardTitle>Estate Planning & Insurance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(factFind.target_capital || factFind.current_capital || factFind.target_income) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {factFind.target_capital && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Target Capital</label>
                        <p className="text-lg font-semibold">£{factFind.target_capital.toLocaleString()}</p>
                      </div>
                    )}
                    {factFind.current_capital && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Current Capital</label>
                        <p className="text-lg font-semibold">£{factFind.current_capital.toLocaleString()}</p>
                      </div>
                    )}
                    {factFind.target_income && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Target Income</label>
                        <p className="text-lg font-semibold">£{factFind.target_income.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                )}

                {factFind.atr_risk_result && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Risk Assessment</label>
                      <p>{factFind.atr_risk_result}</p>
                    </div>
                    {factFind.atr_in_words && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Risk Description</label>
                        <p>{factFind.atr_in_words}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-500">Insurance & Planning Requirements</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {factFind.isa_used_this_year !== undefined && (
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${factFind.isa_used_this_year ? "bg-green-500" : "bg-gray-300"}`}
                        ></div>
                        <span className="text-sm">ISA Used This Year</span>
                      </div>
                    )}
                    {factFind.whole_of_life_policy !== undefined && (
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${factFind.whole_of_life_policy ? "bg-green-500" : "bg-gray-300"}`}
                        ></div>
                        <span className="text-sm">Whole of Life Policy</span>
                      </div>
                    )}
                    {factFind.critical_illness_cover !== undefined && (
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${factFind.critical_illness_cover ? "bg-green-500" : "bg-gray-300"}`}
                        ></div>
                        <span className="text-sm">Critical Illness Cover</span>
                      </div>
                    )}
                    {factFind.private_medical_insurance !== undefined && (
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${factFind.private_medical_insurance ? "bg-green-500" : "bg-gray-300"}`}
                        ></div>
                        <span className="text-sm">Private Medical Insurance</span>
                      </div>
                    )}
                    {factFind.long_term_care !== undefined && (
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${factFind.long_term_care ? "bg-green-500" : "bg-gray-300"}`}
                        ></div>
                        <span className="text-sm">Long Term Care</span>
                      </div>
                    )}
                    {factFind.pensions !== undefined && (
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${factFind.pensions ? "bg-green-500" : "bg-gray-300"}`}
                        ></div>
                        <span className="text-sm">Pensions</span>
                      </div>
                    )}
                    {factFind.investments !== undefined && (
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${factFind.investments ? "bg-green-500" : "bg-gray-300"}`}
                        ></div>
                        <span className="text-sm">Investments</span>
                      </div>
                    )}
                    {factFind.mortgage_cover !== undefined && (
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${factFind.mortgage_cover ? "bg-green-500" : "bg-gray-300"}`}
                        ></div>
                        <span className="text-sm">Mortgage Cover</span>
                      </div>
                    )}
                  </div>
                </div>

                {factFind.will_planning_notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Will Planning Notes</label>
                    <p className="mt-1 whitespace-pre-wrap">{factFind.will_planning_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Feedback */}
            {(factFind.feedback_1_solution || factFind.feedback_1_benefit || factFind.feedback_1_expectation) && (
              <Card>
                <CardHeader>
                  <CardTitle>Client Feedback</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {factFind.feedback_1_solution && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Solution 1</label>
                      <p className="mt-1">{factFind.feedback_1_solution}</p>
                    </div>
                  )}
                  {factFind.feedback_1_benefit && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Benefit 1</label>
                      <p className="mt-1">{factFind.feedback_1_benefit}</p>
                    </div>
                  )}
                  {factFind.feedback_1_expectation && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Expectation 1</label>
                      <p className="mt-1">{factFind.feedback_1_expectation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Currency</label>
                  <p className="mt-1">{factFind.currency || "GBP"}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{new Date(factFind.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{new Date(factFind.updated_at).toLocaleDateString()}</span>
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
                {factFind.contact_id && (
                  <Link href={`/contacts/${factFind.contact_id}`} className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <User className="h-4 w-4 mr-2" />
                      View Contact
                    </Button>
                  </Link>
                )}
                {factFind.contact_id && (
                  <Link href={`/opportunities/new?contact_id=${factFind.contact_id}`} className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Create Opportunity
                    </Button>
                  </Link>
                )}
                <Link href={`/factfinds/${factFind.id}/edit`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit FactFind
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
