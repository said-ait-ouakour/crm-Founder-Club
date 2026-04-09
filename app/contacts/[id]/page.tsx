"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Edit, Phone, Mail, MapPin, Calendar, User, Target, TrendingUp } from "lucide-react"
import Link from "next/link"
import { contactService, opportunityService } from "@/lib/database"
import type { Contact, Opportunity } from "@/lib/supabase"
import { ContactCommunicationPanel } from "@/components/contact-communication-panel"
import { ContactProgressDashboard } from "@/components/contact-progress-dashboard"

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [contact, setContact] = useState<Contact | null>(null)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadContactData() {
      try {
        const [contactData, opportunitiesData] = await Promise.all([
          contactService.getById(params.id as string),
          opportunityService.getByContactId(params.id as string),
        ])

        setContact(contactData)
        setOpportunities(opportunitiesData)
      } catch (error) {
        console.error("Error loading contact data:", error)
        window.location.href = "/contacts"
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadContactData()
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading contact details...</p>
        </div>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Contact not found</h2>
          <p className="text-gray-600 mt-2">The contact you're looking for doesn't exist.</p>
          <Link href="/contacts">
            <Button className="mt-4">Back to Contacts</Button>
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
            <Link href="/contacts">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Contacts
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {contact.first_name} {contact.last_name}
              </h1>
              <p className="text-gray-600 mt-2">Contact Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/contacts/${contact.id}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Link href={`/contacts/${contact.id}/opportunities/new`}>
              <Button>
                <Target className="h-4 w-4 mr-2" />
                Create Opportunity
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
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Full Name</label>
                    <p className="text-lg font-semibold">
                      {contact.salutation} {contact.first_name} {contact.last_name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Occupation</label>
                    <p>{contact.occupation || "Not provided"}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{contact.email}</span>
                  </div>
                  {contact.mobile_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{contact.mobile_phone} (Mobile)</span>
                    </div>
                  )}
                  {contact.home_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{contact.home_phone} (Home)</span>
                    </div>
                  )}
                  {contact.business_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{contact.business_phone} (Business)</span>
                    </div>
                  )}
                  {(contact.street_1 || contact.city) && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                      <div>
                        {contact.street_1 && <div>{contact.street_1}</div>}
                        {contact.street_2 && <div>{contact.street_2}</div>}
                        {contact.city && contact.postal_code && (
                          <div>
                            {contact.city}, {contact.postal_code}
                          </div>
                        )}
                        {contact.country && <div>{contact.country}</div>}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
{/* Progress Dashboard */}
<ContactProgressDashboard contact={contact} />
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
                  {contact.property_value && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Property Value</label>
                      <p className="text-lg font-semibold">£{contact.property_value.toLocaleString()}</p>
                    </div>
                  )}
                  {contact.savings_investments && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Savings & Investments</label>
                      <p className="text-lg font-semibold">£{contact.savings_investments.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contact.mortgage_value && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Mortgage Value</label>
                      <p className="text-lg font-semibold">£{contact.mortgage_value.toLocaleString()}</p>
                    </div>
                  )}
                  {contact.total_current_value && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Total Current Value</label>
                      <p className="text-lg font-semibold">£{contact.total_current_value.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contact.birthday && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Birthday</label>
                      <p>{new Date(contact.birthday).toLocaleDateString()}</p>
                    </div>
                  )}
                  {contact.anniversary && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Anniversary</label>
                      <p>{new Date(contact.anniversary).toLocaleDateString()}</p>
                    </div>
                  )}
                  {contact.gender && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Gender</label>
                      <p>{contact.gender}</p>
                    </div>
                  )}
                  {contact.marital_status && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Marital Status</label>
                      <p>{contact.marital_status}</p>
                    </div>
                  )}
                  {contact.spouse_partner_name && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Spouse/Partner</label>
                      <p>{contact.spouse_partner_name}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            

            {/* Related Records */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Opportunities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Opportunities ({opportunities.length})
                    </span>
                    <Link href={`/contacts/${contact.id}/opportunities/new`}>
                      <Button size="sm" variant="outline">
                        Add
                      </Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {opportunities.length > 0 ? (
                    <div className="space-y-3">
                      {opportunities.slice(0, 3).map((opportunity) => (
                        <div key={opportunity.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{opportunity.name}</p>
                              <p className="text-sm text-gray-500">{opportunity.stage}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">
                                {opportunity.amount ? `£${opportunity.amount.toLocaleString()}` : "N/A"}
                              </p>
                              <p className="text-sm text-gray-500">{opportunity.probability}%</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {opportunities.length > 3 && (
                        <Link href="/opportunities" className="text-sm text-blue-600 hover:underline">
                          View all {opportunities.length} opportunities
                        </Link>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No opportunities yet</p>
                  )}
                </CardContent>
              </Card>

            </div>

            {/* Notes */}
            {contact.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{contact.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Inbox Button */}
            <Link href={`/contacts/${contact.id}/inbox`}>
              <Button className="w-full mb-2" variant="default">
                Open Inbox
              </Button>
            </Link>

            {/* Status & Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Status & Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(contact.status)}>{contact.status}</Badge>
                  </div>
                  {contact.status_reason && <p className="text-sm text-gray-600 mt-1">{contact.status_reason}</p>}
                </div>

                {contact.risk_level && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Risk Level</label>
                    <div className="mt-1">
                      <Badge variant="outline" className={getRiskColor(contact.risk_level)}>
                        {contact.risk_level}
                      </Badge>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">Service Phases</label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${contact.phase_1_complete ? "bg-green-500" : "bg-gray-300"}`}
                      ></div>
                      <span className="text-sm">Phase 1 Complete</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${contact.phase_2_complete ? "bg-green-500" : "bg-gray-300"}`}
                      ></div>
                      <span className="text-sm">Phase 2 Complete</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${contact.phase_3_complete ? "bg-green-500" : "bg-gray-300"}`}
                      ></div>
                      <span className="text-sm">Phase 3 Complete</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Management */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contact.owner && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Owner</label>
                    <p className="mt-1">{contact.owner}</p>
                  </div>
                )}

                {contact.supervising_financial_advisor && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Financial Advisor</label>
                    <p className="mt-1">{contact.supervising_financial_advisor}</p>
                  </div>
                )}

                {contact.supporting_broker && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Supporting Broker</label>
                    <p className="mt-1">{contact.supporting_broker}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{new Date(contact.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{new Date(contact.last_updated).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contact.preferred_day && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Preferred Day</label>
                    <p className="mt-1">{contact.preferred_day}</p>
                  </div>
                )}

                {contact.preferred_time && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Preferred Time</label>
                    <p className="mt-1">{contact.preferred_time}</p>
                  </div>
                )}

                {contact.preferred_service && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Preferred Service</label>
                    <p className="mt-1">{contact.preferred_service}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">Communication Permissions</label>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${contact.allow_email ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="text-sm">Email</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${contact.allow_phone ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="text-sm">Phone</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${contact.allow_mail ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="text-sm">Mail</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
