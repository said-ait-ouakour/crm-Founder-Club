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
import { ArrowLeft, ArrowRight } from "lucide-react"
import Link from "next/link"
import { leadService } from "@/lib/database"
import type { Lead, Contact } from "@/lib/supabase"

export default function ConvertLeadPage() {
  const params = useParams()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)
  const [formData, setFormData] = useState({
    owner: "",
    status: "Active",
    occupation: "",
    risk_level: "Medium",
    supervising_financial_advisor: "",
    preferred_day: "",
    preferred_time: "",
    preferred_service: "",
    allow_email: true,
    allow_phone: true,
    allow_mail: true,
    notes: "",
  })

  useEffect(() => {
    async function loadLead() {
      try {
        const data = await leadService.getById(params.id as string)
        setLead(data)
        // Pre-populate form with lead data
        setFormData((prev) => ({
          ...prev,
          owner: data.owner || "",
          allow_email: data.allow_email ?? true,
          allow_phone: data.allow_phone ?? true,
          allow_mail: data.allow_mail ?? true,
          notes: data.notes || "",
        }))
      } catch (error) {
        console.error("Error loading lead:", error)
        window.location.href = "/leads"
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadLead()
    }
  }, [params.id, router])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lead) return

    setConverting(true)

    try {
      const contactData: Omit<Contact, "id" | "created_at" | "last_updated"> = {
        first_name: lead.first_name,
        last_name: lead.last_name,
        salutation: lead.salutation,
        email: lead.email,
        mobile_phone: lead.mobile_phone,
        home_phone: lead.phone_number,
        owner: formData.owner,
        status: formData.status,
        occupation: formData.occupation,
        property_value: lead.property_value,
        savings_investments: lead.savings_investments,
        mortgage_value: lead.mortgage_value,
        risk_level: formData.risk_level,
        supervising_financial_advisor: formData.supervising_financial_advisor,
        preferred_day: formData.preferred_day,
        preferred_time: formData.preferred_time,
        preferred_service: formData.preferred_service,
        allow_email: formData.allow_email,
        allow_phone: formData.allow_phone,
        allow_mail: formData.allow_mail,
        notes: formData.notes,
        street_1: lead.address,
        marital_status: lead.marital_status,
        phase_1_complete: false,
        phase_2_complete: false,
        phase_3_complete: false,
        appointment_booked: false,
        out_of_cash: false,
        funds_switched: false,
        mps_data_input: false,
        osf_data_input: false,
        will_completed: false,
        lpa_signed_by_donor: false,
        lpa_completed: false,
        omw_profile_needed: false,
        docu_sign_sent: false,
        email_to_info: false,
        send_investment_program: false,
        client_agreement_signed: false,
        seminar_invitation_sent: false,
        seminar_attended: false,
        google_review_points: 0,
        trustpilot_points: 0,
        vouched_for_points: 0,
        claimed_points: 0,
        allow_fax: false,
        allow_bulk_email: false,
        potential_survey_literature_useful: false,
        potential_survey_advice_clear: false,
        potential_survey_rushed: false,
        investment_service_status: "Active",
      }

      const contact = await leadService.convertToContact(lead.id, contactData)
      window.location.href = `/contacts/${contact.id}`;
    } catch (error) {
      console.error("Error converting lead:", error)
      alert("Error converting lead to contact. Please try again.")
    } finally {
      setConverting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading lead details...</p>
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Lead not found</h2>
          <Link href="/leads">
            <Button className="mt-4">Back to Leads</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (lead.current_status !== "Qualified") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Lead not qualified</h2>
          <p className="text-gray-600 mt-2">Only qualified leads can be converted to contacts.</p>
          <Link href={`/leads/${lead.id}`}>
            <Button className="mt-4">Back to Lead</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/leads/${lead.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lead
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Convert Lead to Contact</h1>
            <p className="text-gray-600 mt-2">
              Converting {lead.first_name} {lead.last_name} to a contact
            </p>
          </div>
        </div>

        {/* Lead Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Lead Summary</CardTitle>
            <CardDescription>Review the lead information before conversion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="font-semibold">
                  {lead.first_name} {lead.last_name}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p>{lead.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p>{lead.phone_number || lead.mobile_phone || "Not provided"}</p>
              </div>
            </div>
            {lead.goals && (
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-500">Goals</label>
                <p className="text-sm">{lead.goals}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <form onSubmit={handleConvert} className="space-y-6">
          {/* Contact Management */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Management</CardTitle>
              <CardDescription>Set up the contact management details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="owner">Owner *</Label>
                  <Select value={formData.owner} onValueChange={(value) => handleInputChange("owner", value)} required>
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
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) => handleInputChange("occupation", e.target.value)}
                    placeholder="Client's occupation"
                  />
                </div>
                <div>
                  <Label htmlFor="risk_level">Risk Level</Label>
                  <Select value={formData.risk_level} onValueChange={(value) => handleInputChange("risk_level", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="supervising_financial_advisor">Supervising Financial Advisor</Label>
                <Input
                  id="supervising_financial_advisor"
                  value={formData.supervising_financial_advisor}
                  onChange={(e) => handleInputChange("supervising_financial_advisor", e.target.value)}
                  placeholder="Advisor name"
                />
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Preferences</CardTitle>
              <CardDescription>Set up contact preferences and communication settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="preferred_day">Preferred Day</Label>
                  <Select
                    value={formData.preferred_day}
                    onValueChange={(value) => handleInputChange("preferred_day", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select day..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monday">Monday</SelectItem>
                      <SelectItem value="Tuesday">Tuesday</SelectItem>
                      <SelectItem value="Wednesday">Wednesday</SelectItem>
                      <SelectItem value="Thursday">Thursday</SelectItem>
                      <SelectItem value="Friday">Friday</SelectItem>
                      <SelectItem value="Saturday">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="preferred_time">Preferred Time</Label>
                  <Select
                    value={formData.preferred_time}
                    onValueChange={(value) => handleInputChange("preferred_time", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning">Morning</SelectItem>
                      <SelectItem value="Afternoon">Afternoon</SelectItem>
                      <SelectItem value="Evening">Evening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="preferred_service">Preferred Service</Label>
                  <Input
                    id="preferred_service"
                    value={formData.preferred_service}
                    onChange={(e) => handleInputChange("preferred_service", e.target.value)}
                    placeholder="Service preference"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Communication Permissions</Label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allow_email"
                      checked={formData.allow_email}
                      onCheckedChange={(checked) => handleInputChange("allow_email", checked)}
                    />
                    <Label htmlFor="allow_email">Allow Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allow_phone"
                      checked={formData.allow_phone}
                      onCheckedChange={(checked) => handleInputChange("allow_phone", checked)}
                    />
                    <Label htmlFor="allow_phone">Allow Phone</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allow_mail"
                      checked={formData.allow_mail}
                      onCheckedChange={(checked) => handleInputChange("allow_mail", checked)}
                    />
                    <Label htmlFor="allow_mail">Allow Mail</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
              <CardDescription>Add any additional information for the contact</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Any additional notes about the contact..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link href={`/leads/${lead.id}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={converting}>
              {converting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Converting...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Convert to Contact
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
