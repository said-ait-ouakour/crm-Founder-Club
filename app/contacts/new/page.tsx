"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { contactService } from "@/lib/database"
import type { Contact } from "@/lib/supabase"

export default function NewContactPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    salutation: "",
    email: "",
    mobile_phone: "",
    home_phone: "",
    business_phone: "",
    owner: "",
    status: "Active",
    occupation: "",
    risk_level: "Medium",
    street_1: "",
    street_2: "",
    city: "",
    county: "",
    postal_code: "",
    country: "United Kingdom",
    birthday: "",
    anniversary: "",
    gender: "",
    marital_status: "",
    spouse_partner_name: "",
    property_value: "",
    savings_investments: "",
    mortgage_value: "",
    supervising_financial_advisor: "",
    supporting_broker: "",
    preferred_day: "",
    preferred_time: "",
    preferred_service: "",
    allow_email: true,
    allow_phone: true,
    allow_mail: true,
    notes: "",
  })

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
      const contactData: Omit<Contact, "id" | "created_at" | "last_updated"> = {
        ...formData,
        property_value: formData.property_value ? Number.parseFloat(formData.property_value) : undefined,
        savings_investments: formData.savings_investments ? Number.parseFloat(formData.savings_investments) : undefined,
        mortgage_value: formData.mortgage_value ? Number.parseFloat(formData.mortgage_value) : undefined,
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

      const contact = await contactService.create(contactData)
      window.location.href = `/contacts/${contact.id}`
    } catch (error) {
      console.error("Error creating contact:", error)
      alert("Error creating contact. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/contacts">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contacts
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Contact</h1>
            <p className="text-gray-600 mt-2">Add a new contact to the T&B CRM system</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Essential contact details and identification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="salutation">Salutation</Label>
                  <Select value={formData.salutation} onValueChange={(value) => handleInputChange("salutation", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mr">Mr</SelectItem>
                      <SelectItem value="Mrs">Mrs</SelectItem>
                      <SelectItem value="Ms">Ms</SelectItem>
                      <SelectItem value="Dr">Dr</SelectItem>
                      <SelectItem value="Prof">Prof</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange("first_name", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange("last_name", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) => handleInputChange("occupation", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="mobile_phone">Mobile Phone</Label>
                  <Input
                    id="mobile_phone"
                    value={formData.mobile_phone}
                    onChange={(e) => handleInputChange("mobile_phone", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="home_phone">Home Phone</Label>
                  <Input
                    id="home_phone"
                    value={formData.home_phone}
                    onChange={(e) => handleInputChange("home_phone", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="business_phone">Business Phone</Label>
                  <Input
                    id="business_phone"
                    value={formData.business_phone}
                    onChange={(e) => handleInputChange("business_phone", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
              <CardDescription>Contact address and location details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="street_1">Street Address 1</Label>
                  <Input
                    id="street_1"
                    value={formData.street_1}
                    onChange={(e) => handleInputChange("street_1", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="street_2">Street Address 2</Label>
                  <Input
                    id="street_2"
                    value={formData.street_2}
                    onChange={(e) => handleInputChange("street_2", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={formData.city} onChange={(e) => handleInputChange("city", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="county">County</Label>
                  <Input
                    id="county"
                    value={formData.county}
                    onChange={(e) => handleInputChange("county", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => handleInputChange("postal_code", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleInputChange("country", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Management */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Management</CardTitle>
              <CardDescription>Management and assignment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supervising_financial_advisor">Supervising Financial Advisor</Label>
                  <Input
                    id="supervising_financial_advisor"
                    value={formData.supervising_financial_advisor}
                    onChange={(e) => handleInputChange("supervising_financial_advisor", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="supporting_broker">Supporting Broker</Label>
                  <Input
                    id="supporting_broker"
                    value={formData.supporting_broker}
                    onChange={(e) => handleInputChange("supporting_broker", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Personal and family details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => handleInputChange("birthday", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="anniversary">Anniversary</Label>
                  <Input
                    id="anniversary"
                    type="date"
                    value={formData.anniversary}
                    onChange={(e) => handleInputChange("anniversary", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                      <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="marital_status">Marital Status</Label>
                  <Select
                    value={formData.marital_status}
                    onValueChange={(value) => handleInputChange("marital_status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Divorced">Divorced</SelectItem>
                      <SelectItem value="Widowed">Widowed</SelectItem>
                      <SelectItem value="Civil Partnership">Civil Partnership</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="spouse_partner_name">Spouse/Partner Name</Label>
                  <Input
                    id="spouse_partner_name"
                    value={formData.spouse_partner_name}
                    onChange={(e) => handleInputChange("spouse_partner_name", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
              <CardDescription>Financial assets and property details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="property_value">Property Value</Label>
                  <Input
                    id="property_value"
                    type="number"
                    value={formData.property_value}
                    onChange={(e) => handleInputChange("property_value", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="savings_investments">Savings & Investments</Label>
                  <Input
                    id="savings_investments"
                    type="number"
                    value={formData.savings_investments}
                    onChange={(e) => handleInputChange("savings_investments", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="mortgage_value">Mortgage Value</Label>
                  <Input
                    id="mortgage_value"
                    type="number"
                    value={formData.mortgage_value}
                    onChange={(e) => handleInputChange("mortgage_value", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Contact preferences and communication settings</CardDescription>
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
                      <SelectValue placeholder="Select..." />
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
                      <SelectValue placeholder="Select..." />
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
              <CardTitle>Notes</CardTitle>
              <CardDescription>Additional information and comments</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Any additional notes or comments..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link href="/contacts">
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
                  Create Contact
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
