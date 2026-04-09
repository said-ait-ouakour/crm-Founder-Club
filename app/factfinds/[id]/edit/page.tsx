"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { factFindService, contactService } from "@/lib/database"
import { supabase } from "@/lib/supabase"
import type { FactFind, Contact } from "@/lib/supabase"

// Form data type with date fields as strings for input compatibility
type FactFindFormData = Omit<Partial<FactFind>, 'factfind_date' | 'c1_dob' | 'c2_dob'> & {
  factfind_date?: string
  c1_dob?: string
  c2_dob?: string
}

export default function EditFactFindPage() {
  const router = useRouter()
  const params = useParams()
  const factFindId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [selectedLead, setSelectedLead] = useState<any | null>(null)
  const [advisors, setAdvisors] = useState<any[]>([])
  const [supervisors, setSupervisors] = useState<any[]>([])
  const [formData, setFormData] = useState<FactFindFormData>({})

  // Load fact find data and contacts
  useEffect(() => {
    async function loadData() {
      try {
        // Load contacts for the dropdown
        const { data: contactsData } = await contactService.getAll()
        setContacts(contactsData)

        // Load leads
        const { data: leadsData, error: leadsError } = await supabase
          .from('leads')
          .select('id, first_name, last_name, email, phone_number, owner')
          .order('first_name')
        
        if (leadsError) {
          console.error("Error loading leads:", leadsError)
        } else {
          const typedLeads = leadsData?.map((item) => ({
            id: String(item.id),
            first_name: String(item.first_name || ''),
            last_name: String(item.last_name || ''),
            email: String(item.email || ''),
            phone_number: String(item.phone_number || ''),
            owner: String(item.owner || '')
          })) || []
          setLeads(typedLeads)
        }

        // Load advisors (users with role 'advisor')
        const { data: advisorsData, error: advisorsError } = await supabase
          .from('users')
          .select('id, fullName, email')
          .eq('role', 'advisor')
          .order('fullName')
        
        if (advisorsError) {
          console.error("Error loading advisors:", advisorsError)
        } else {
          setAdvisors(advisorsData || [])
        }

        // Load all users for supervisors
        const { data: supervisorsData, error: supervisorsError } = await supabase
          .from('users')
          .select('id, fullName, email')
          .order('fullName')
        
        if (supervisorsError) {
          console.error("Error loading supervisors:", supervisorsError)
        } else {
          setSupervisors(supervisorsData || [])
        }

        // Load the existing fact find
        const factFind = await factFindService.getById(factFindId)
        
        // Format dates for date inputs
        const formattedFactFind = {
          ...factFind,
          factfind_date: factFind.factfind_date 
            ? (factFind.factfind_date instanceof Date 
                ? factFind.factfind_date.toISOString().split('T')[0] 
                : String(factFind.factfind_date).split('T')[0])
            : '',
          c1_dob: factFind.c1_dob 
            ? (factFind.c1_dob instanceof Date 
                ? factFind.c1_dob.toISOString().split('T')[0] 
                : String(factFind.c1_dob).split('T')[0])
            : '',
          c2_dob: factFind.c2_dob 
            ? (factFind.c2_dob instanceof Date 
                ? factFind.c2_dob.toISOString().split('T')[0] 
                : String(factFind.c2_dob).split('T')[0])
            : ''
        }
        
        setFormData(formattedFactFind)
        
        // Set selected contact if exists
        if (factFind.contact_id) {
          const contact = contactsData.find(c => c.id === factFind.contact_id)
          if (contact) setSelectedContact(contact)
        }
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [factFindId])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact)
    setFormData(prev => ({
      ...prev,
      contact_id: contact.id,
      contact_name: `${contact.first_name} ${contact.last_name}`.trim(),
      c1_first_name: contact.first_name,
      c1_last_name: contact.last_name,
      c1_email: contact.email,
      c1_mobile_phone: contact.mobile_phone,
      c1_home_phone: contact.home_phone
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Create a clean update object with only the fields that exist in the factfinds table
      // Exclude date fields initially, then add them after conversion
      const { factfind_date, c1_dob, c2_dob, ...restFormData } = formData
      const updateData: Partial<FactFind> = { ...restFormData } as Partial<FactFind>
      
      // Convert date strings back to Date objects for the database
      if (factfind_date && typeof factfind_date === 'string') {
        updateData.factfind_date = new Date(factfind_date)
      }
      if (c1_dob && typeof c1_dob === 'string') {
        updateData.c1_dob = new Date(c1_dob)
      } else if (c1_dob === '') {
        updateData.c1_dob = null
      }
      if (c2_dob && typeof c2_dob === 'string') {
        updateData.c2_dob = new Date(c2_dob)
      } else if (c2_dob === '') {
        updateData.c2_dob = null
      }
      
      // Remove any potential 'contact' property if it exists
      if ('contact' in updateData) {
        delete updateData.contact
      }
      
      console.log("updating fact find :",updateData)
      await factFindService.update(factFindId, updateData)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_WEBHOOK_UPDATE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ "update" : "factfind", 
          "id": factFindId,
          "factfind_data": updateData})
      })
      if (!response.ok) {
        throw new Error('Failed to send data to webhook')
      }
      
      window.location.href = `/factfinds/${factFindId}`
      router.refresh()
    } catch (error) {
      console.error("Error updating fact find:", error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading fact find...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Fact Find</h1>
            <p className="text-gray-600">Update the fact find details below</p>
          </div>
          <div className="flex space-x-2">
            <Link href="/factfinds">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Fact Finds
              </Button>
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Basic Information</CardTitle>
                      <CardDescription>Essential factfind details and meeting information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="contact_name">Contact Name</Label>
                          <Input
                            id="contact_name"
                            value={formData.contact_name || ''}
                            onChange={(e) => handleInputChange("contact_name", e.target.value)}
                            placeholder="Contact name..."
                            readOnly
                            className="bg-gray-50"
                          />
                        </div>
                        <div>
                          <Label htmlFor="factfind_date">FactFind Date</Label>
                          <Input
                            id="factfind_date"
                            type="date"
                            value={formData.factfind_date || ''}
                            onChange={(e) => handleInputChange("factfind_date", e.target.value)}
                          />
                        </div>
                      </div>
        
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                           <Label htmlFor="consultant_name">Consultant Name</Label>
                           <Select
                             value={formData.consultant_name || ''}
                             onValueChange={(value) => handleInputChange("consultant_name", value)}
                           >
                             <SelectTrigger>
                               <SelectValue placeholder="Select consultant..." />
                             </SelectTrigger>
                             <SelectContent>
                               {advisors.map((advisor) => (
                                 <SelectItem key={advisor.id} value={advisor.fullName}>
                                   {advisor.fullName}
                                 </SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                         </div>
                         <div>
                           <Label htmlFor="owner">Owner</Label>
                           <Select value={formData.owner || ''} onValueChange={(value) => handleInputChange("owner", value)}>
                             <SelectTrigger>
                               <SelectValue placeholder="Select owner..." />
                             </SelectTrigger>
                             <SelectContent>
                               {supervisors.map((supervisor) => (
                                 <SelectItem key={supervisor.id} value={supervisor.fullName}>
                                   {supervisor.fullName}
                                 </SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                         </div>
                       </div>
        
                      <div>
                        <Label htmlFor="reason_for_meeting">Reason for Meeting</Label>
                        <Textarea
                          id="reason_for_meeting"
                          value={formData.reason_for_meeting || ''}
                          onChange={(e) => handleInputChange("reason_for_meeting", e.target.value)}
                          placeholder="Purpose and objectives of this factfind meeting..."
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>
        
                  {/* Client 1 Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Client 1 Details</CardTitle>
                      <CardDescription>Primary client personal and identification information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="c1_title">Title</Label>
                          <Select value={formData.c1_title || ''} onValueChange={(value) => handleInputChange("c1_title", value)}>
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
                          <Label htmlFor="c1_first_name">First Name</Label>
                          <Input
                            id="c1_first_name"
                            value={formData.c1_first_name || ''}
                            onChange={(e) => handleInputChange("c1_first_name", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="c1_middle_name">Middle Name</Label>
                          <Input
                            id="c1_middle_name"
                            value={formData.c1_middle_name || ''}
                            onChange={(e) => handleInputChange("c1_middle_name", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="c1_last_name">Last Name</Label>
                          <Input
                            id="c1_last_name"
                            value={formData.c1_last_name || ''}
                            onChange={(e) => handleInputChange("c1_last_name", e.target.value)}
                          />
                        </div>
                      </div>
        
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="c1_gender">Gender</Label>
                          <Select value={formData.c1_gender || ''} onValueChange={(value) => handleInputChange("c1_gender", value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="c1_dob">Date of Birth</Label>
                          <Input
                            id="c1_dob"
                            type="date"
                            value={formData.c1_dob || ''}
                            onChange={(e) => handleInputChange("c1_dob", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="c1_nationality">Nationality</Label>
                          <Input
                            id="c1_nationality"
                            value={formData.c1_nationality || ''}
                            onChange={(e) => handleInputChange("c1_nationality", e.target.value)}
                          />
                        </div>
                      </div>
        
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="c1_marital_status">Marital Status</Label>
                          <Select
                            value={formData.c1_marital_status || ''}
                            onValueChange={(value) => handleInputChange("c1_marital_status", value)}
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
                          <Label htmlFor="c1_occupation">Occupation</Label>
                          <Input
                            id="c1_occupation"
                            value={formData.c1_occupation || ''}
                            onChange={(e) => handleInputChange("c1_occupation", e.target.value)}
                          />
                        </div>
                      </div>
        
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="c1_employment_status">Employment Status</Label>
                          <Select
                            value={formData.c1_employment_status || ''}
                            onValueChange={(value) => handleInputChange("c1_employment_status", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Employed">Employed</SelectItem>
                              <SelectItem value="Self-Employed">Self-Employed</SelectItem>
                              <SelectItem value="Retired">Retired</SelectItem>
                              <SelectItem value="Unemployed">Unemployed</SelectItem>
                              <SelectItem value="Student">Student</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="c1_health_status">Health Status</Label>
                          <Select
                            value={formData.c1_health_status || ''}
                            onValueChange={(value) => handleInputChange("c1_health_status", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Excellent">Excellent</SelectItem>
                              <SelectItem value="Good">Good</SelectItem>
                              <SelectItem value="Fair">Fair</SelectItem>
                              <SelectItem value="Poor">Poor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="c1_national_insurance">National Insurance</Label>
                          <Input
                            id="c1_national_insurance"
                            value={formData.c1_national_insurance || ''}
                            onChange={(e) => handleInputChange("c1_national_insurance", e.target.value)}
                          />
                        </div>
                      </div>
        
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="c1_smoker"
                            checked={!!formData.c1_smoker}
                            onCheckedChange={(checked) => handleInputChange("c1_smoker", checked)}
                          />
                          <Label htmlFor="c1_smoker">Smoker</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="c1_has_will"
                            checked={!!formData.c1_has_will}
                            onCheckedChange={(checked) => handleInputChange("c1_has_will", checked)}
                          />
                          <Label htmlFor="c1_has_will">Has Will</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="c1_has_lpa"
                            checked={!!formData.c1_has_lpa}
                            onCheckedChange={(checked) => handleInputChange("c1_has_lpa", checked)}
                          />
                          <Label htmlFor="c1_has_lpa">Has LPA</Label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
        
                  {/* Client 1 Income & Expenses */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Client 1 - Income & Expenses</CardTitle>
                      <CardDescription>Annual income and expenditure breakdown</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="c1_income">Annual Income (£)</Label>
                          <Input
                            id="c1_income"
                            type="number"
                            value={formData.c1_income || ''}
                            onChange={(e) => handleInputChange("c1_income", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="c1_council_tax">Council Tax (£)</Label>
                          <Input
                            id="c1_council_tax"
                            type="number"
                            value={formData.c1_council_tax || ''}
                            onChange={(e) => handleInputChange("c1_council_tax", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="c1_utilities">Utilities (£)</Label>
                          <Input
                            id="c1_utilities"
                            type="number"
                            value={formData.c1_utilities || ''}
                            onChange={(e) => handleInputChange("c1_utilities", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
        
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="c1_groceries">Groceries (£)</Label>
                          <Input
                            id="c1_groceries"
                            type="number"
                            value={formData.c1_groceries || ''}
                            onChange={(e) => handleInputChange("c1_groceries", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="c1_insurances">Insurances (£)</Label>
                          <Input
                            id="c1_insurances"
                            type="number"
                            value={formData.c1_insurances || ''}
                            onChange={(e) => handleInputChange("c1_insurances", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="c1_entertainment">Entertainment (£)</Label>
                          <Input
                            id="c1_entertainment"
                            type="number"
                            value={formData.c1_entertainment || ''}
                            onChange={(e) => handleInputChange("c1_entertainment", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
        
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="c1_mortgage_payments">Mortgage Payments (£)</Label>
                          <Input
                            id="c1_mortgage_payments"
                            type="number"
                            value={formData.c1_mortgage_payments || ''}
                            onChange={(e) => handleInputChange("c1_mortgage_payments", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="c1_loans_or_credit_cards">Loans/Credit Cards (£)</Label>
                          <Input
                            id="c1_loans_or_credit_cards"
                            type="number"
                            value={formData.c1_loans_or_credit_cards || ''}
                            onChange={(e) => handleInputChange("c1_loans_or_credit_cards", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
        
                  {/* Client 1 Assets */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Client 1 - Assets</CardTitle>
                      <CardDescription>Property, investments, and other assets</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="c1_main_home">Main Home (£)</Label>
                          <Input
                            id="c1_main_home"
                            type="number"
                            value={formData.c1_main_home || ''}
                            onChange={(e) => handleInputChange("c1_main_home", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="c1_second_property">Second Property (£)</Label>
                          <Input
                            id="c1_second_property"
                            type="number"
                            value={formData.c1_second_property || ''}
                            onChange={(e) => handleInputChange("c1_second_property", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="c1_investments">Investments (£)</Label>
                          <Input
                            id="c1_investments"
                            type="number"
                            value={formData.c1_investments || ''}
                            onChange={(e) => handleInputChange("c1_investments", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
        
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="c1_savings">Savings (£)</Label>
                          <Input
                            id="c1_savings"
                            type="number"
                            value={formData.c1_savings || ''}
                            onChange={(e) => handleInputChange("c1_savings", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="c1_pension">Pension (£)</Label>
                          <Input
                            id="c1_pension"
                            type="number"
                            value={formData.c1_pension || ''}
                            onChange={(e) => handleInputChange("c1_pension", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="c1_life_not_in_trust">Life Insurance (£)</Label>
                          <Input
                            id="c1_life_not_in_trust"
                            type="number"
                            value={formData.c1_life_not_in_trust || ''}
                            onChange={(e) => handleInputChange("c1_life_not_in_trust", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
        
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="c1_car_or_boat">Car/Boat (£)</Label>
                          <Input
                            id="c1_car_or_boat"
                            type="number"
                            value={formData.c1_car_or_boat || ''}
                            onChange={(e) => handleInputChange("c1_car_or_boat", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="c1_chattels">Chattels (£)</Label>
                          <Input
                            id="c1_chattels"
                            type="number"
                            value={formData.c1_chattels || ''}
                            onChange={(e) => handleInputChange("c1_chattels", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="c1_business_assets">Business Assets (£)</Label>
                          <Input
                            id="c1_business_assets"
                            type="number"
                            value={formData.c1_business_assets || ''}
                            onChange={(e) => handleInputChange("c1_business_assets", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
        
                  {/* Liabilities & Tax */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Liabilities & Tax</CardTitle>
                      <CardDescription>Debts, liabilities, and inheritance tax calculations</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="mortgages_total">Total Mortgages (£)</Label>
                          <Input
                            id="mortgages_total"
                            type="number"
                            value={formData.mortgages_total || ''}
                            onChange={(e) => handleInputChange("mortgages_total", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="loans_total">Total Loans (£)</Label>
                          <Input
                            id="loans_total"
                            type="number"
                            value={formData.loans_total || ''}
                            onChange={(e) => handleInputChange("loans_total", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="hp_credit_total">HP/Credit Total (£)</Label>
                          <Input
                            id="hp_credit_total"
                            type="number"
                            value={formData.hp_credit_total || ''}
                            onChange={(e) => handleInputChange("hp_credit_total", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
        
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="net_assets_total">Net Assets Total (£)</Label>
                          <Input
                            id="net_assets_total"
                            type="number"
                            value={formData.net_assets_total || ''}
                            onChange={(e) => handleInputChange("net_assets_total", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="inheritance_tax_allowance">IHT Allowance (£)</Label>
                          <Input
                            id="inheritance_tax_allowance"
                            type="number"
                            value={formData.inheritance_tax_allowance || ''}
                            onChange={(e) => handleInputChange("inheritance_tax_allowance", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
        
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="taxable_estate">Taxable Estate (£)</Label>
                          <Input
                            id="taxable_estate"
                            type="number"
                            value={formData.taxable_estate || ''}
                            onChange={(e) => handleInputChange("taxable_estate", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="inheritance_tax_due">Inheritance Tax Due (£)</Label>
                          <Input
                            id="inheritance_tax_due"
                            type="number"
                            value={formData.inheritance_tax_due || ''}
                            onChange={(e) => handleInputChange("inheritance_tax_due", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
        
                  {/* Beneficiaries */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Beneficiaries</CardTitle>
                      <CardDescription>Family members and beneficiary information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="main_beneficiaries">Main Beneficiaries</Label>
                        <Textarea
                          id="main_beneficiaries"
                          value={formData.main_beneficiaries || ''}
                          onChange={(e) => handleInputChange("main_beneficiaries", e.target.value)}
                          placeholder="List main beneficiaries..."
                          rows={3}
                        />
                      </div>
        
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="child_1_name">Child 1 Name</Label>
                          <Input
                            id="child_1_name"
                            value={formData.child_1_name || ''}
                            onChange={(e) => handleInputChange("child_1_name", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="child_1_relation_c1">Relation to Client 1</Label>
                          <Input
                            id="child_1_relation_c1"
                            value={formData.child_1_relation_c1 || ''}
                            onChange={(e) => handleInputChange("child_1_relation_c1", e.target.value)}
                            placeholder="e.g., Son, Daughter"
                          />
                        </div>
                        <div>
                          <Label htmlFor="child_1_relation_c2">Relation to Client 2</Label>
                          <Input
                            id="child_1_relation_c2"
                            value={formData.child_1_relation_c2 || ''}
                            onChange={(e) => handleInputChange("child_1_relation_c2", e.target.value)}
                            placeholder="e.g., Son, Daughter"
                          />
                        </div>
                      </div>
        
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="child_1_financial_dependency"
                          checked={!!formData.child_1_financial_dependency}
                          onCheckedChange={(checked) => handleInputChange("child_1_financial_dependency", checked)}
                        />
                        <Label htmlFor="child_1_financial_dependency">Financially Dependent</Label>
                      </div>
        
                      <div>
                        <Label htmlFor="child_1_note">Child 1 Notes</Label>
                        <Textarea
                          id="child_1_note"
                          value={formData.child_1_note || ''}
                          onChange={(e) => handleInputChange("child_1_note", e.target.value)}
                          placeholder="Additional notes about this child..."
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
        
                  {/* Estate Planning */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Estate Planning & Insurance</CardTitle>
                      <CardDescription>Planning requirements and insurance coverage</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="target_capital">Target Capital (£)</Label>
                          <Input
                            id="target_capital"
                            type="number"
                            value={formData.target_capital || ''}
                            onChange={(e) => handleInputChange("target_capital", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="current_capital">Current Capital (£)</Label>
                          <Input
                            id="current_capital"
                            type="number"
                            value={formData.current_capital || ''}
                            onChange={(e) => handleInputChange("current_capital", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="target_income">Target Income (£)</Label>
                          <Input
                            id="target_income"
                            type="number"
                            value={formData.target_income || ''}
                            onChange={(e) => handleInputChange("target_income", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
        
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="atr_risk_result">ATR Risk Result</Label>
                          <Select
                            value={formData.atr_risk_result || ''}
                            onValueChange={(value) => handleInputChange("atr_risk_result", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Conservative">Conservative</SelectItem>
                              <SelectItem value="Moderate">Moderate</SelectItem>
                              <SelectItem value="Balanced">Balanced</SelectItem>
                              <SelectItem value="Growth">Growth</SelectItem>
                              <SelectItem value="Aggressive">Aggressive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="atr_in_words">ATR in Words</Label>
                          <Input
                            id="atr_in_words"
                            value={formData.atr_in_words || ''}
                            onChange={(e) => handleInputChange("atr_in_words", e.target.value)}
                            placeholder="Risk tolerance description"
                          />
                        </div>
                      </div>
        
                      <div className="space-y-3">
                        <Label>Insurance & Planning Requirements</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="isa_used_this_year"
                              checked={!!formData.isa_used_this_year}
                              onCheckedChange={(checked) => handleInputChange("isa_used_this_year", checked)}
                            />
                            <Label htmlFor="isa_used_this_year">ISA Used This Year</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="whole_of_life_policy"
                              checked={!!formData.whole_of_life_policy}
                              onCheckedChange={(checked) => handleInputChange("whole_of_life_policy", checked)}
                            />
                            <Label htmlFor="whole_of_life_policy">Whole of Life Policy</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="inter_vivos_life_cover"
                              checked={!!formData.inter_vivos_life_cover}
                              onCheckedChange={(checked) => handleInputChange("inter_vivos_life_cover", checked)}
                            />
                            <Label htmlFor="inter_vivos_life_cover">Inter Vivos Life Cover</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="critical_illness_cover"
                              checked={!!formData.critical_illness_cover}
                              onCheckedChange={(checked) => handleInputChange("critical_illness_cover", checked)}
                            />
                            <Label htmlFor="critical_illness_cover">Critical Illness Cover</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="private_medical_insurance"
                              checked={!!formData.private_medical_insurance}
                              onCheckedChange={(checked) => handleInputChange("private_medical_insurance", checked)}
                            />
                            <Label htmlFor="private_medical_insurance">Private Medical Insurance</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="long_term_care"
                              checked={!!formData.long_term_care}
                              onCheckedChange={(checked) => handleInputChange("long_term_care", checked)}
                            />
                            <Label htmlFor="long_term_care">Long Term Care</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="savings_scheme"
                              checked={!!formData.savings_scheme}
                              onCheckedChange={(checked) => handleInputChange("savings_scheme", checked)}
                            />
                            <Label htmlFor="savings_scheme">Savings Scheme</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="investments"
                              checked={!!formData.investments}
                              onCheckedChange={(checked) => handleInputChange("investments", checked)}
                            />
                            <Label htmlFor="investments">Investments</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="pensions"
                              checked={!!formData.pensions}
                              onCheckedChange={(checked) => handleInputChange("pensions", checked)}
                            />
                            <Label htmlFor="pensions">Pensions</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="mortgage_cover"
                              checked={!!formData.mortgage_cover}
                              onCheckedChange={(checked) => handleInputChange("mortgage_cover", checked)}
                            />
                            <Label htmlFor="mortgage_cover">Mortgage Cover</Label>
                          </div>
                        </div>
                      </div>
        
                      <div>
                        <Label htmlFor="will_planning_notes">Will Planning Notes</Label>
                        <Textarea
                          id="will_planning_notes"
                          value={formData.will_planning_notes || ''}
                          onChange={(e) => handleInputChange("will_planning_notes", e.target.value)}
                          placeholder="Notes about will planning requirements..."
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>
        
                  {/* Client Feedback */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Client Feedback</CardTitle>
                      <CardDescription>Client expectations and feedback on proposed solutions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="feedback_1_solution">Solution 1</Label>
                        <Textarea
                          id="feedback_1_solution"
                          value={formData.feedback_1_solution || ''}
                          onChange={(e) => handleInputChange("feedback_1_solution", e.target.value)}
                          placeholder="Describe the first proposed solution..."
                          rows={2}
                        />
                      </div>
        
                      <div>
                        <Label htmlFor="feedback_1_benefit">Benefit 1</Label>
                        <Textarea
                          id="feedback_1_benefit"
                          value={formData.feedback_1_benefit || ''}
                          onChange={(e) => handleInputChange("feedback_1_benefit", e.target.value)}
                          placeholder="Benefits of the first solution..."
                          rows={2}
                        />
                      </div>
        
                      <div>
                        <Label htmlFor="feedback_1_expectation">Expectation 1</Label>
                        <Textarea
                          id="feedback_1_expectation"
                          value={formData.feedback_1_expectation || ''}
                          onChange={(e) => handleInputChange("feedback_1_expectation", e.target.value)}
                          placeholder="Client expectations for the first solution..."
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
        
                  {/* Submit Button */}
                  <div className="flex justify-end gap-4">
                    <Link href={factFindId ? `/factfinds/${factFindId}` : "/factfinds"}>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </Link>
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save FactFind
                        </>
                      )}
                    </Button>
                  </div>
                </form>
      </div>
    </div>
  )
}
