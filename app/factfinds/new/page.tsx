"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { factFindService } from "@/lib/database"
import { supabase } from "@/lib/supabase"
import type { FactFind } from "@/lib/supabase"
import { LeadSearch } from "@/components/lead-search"

export default function NewFactFindPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const contactId = searchParams.get("contact_id")

  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [selectedLead, setSelectedLead] = useState<any | null>(null)
  const [advisors, setAdvisors] = useState<any[]>([])
  const [supervisors, setSupervisors] = useState<any[]>([])
  const [formData, setFormData] = useState({
    contact_id: null, // Keep as null
    lead_id: contactId || "", // Use contactId as lead_id for now
    factfind_date: new Date().toISOString().split("T")[0],
    consultant_name: "",
    owner: "",
    contact_name: "",
    currency: "GBP",
    reason_for_meeting: "",

    // Client 1 Details
    c1_title: "",
    c1_first_name: "",
    c1_middle_name: "",
    c1_last_name: "",
    c1_gender: "",
    c1_marital_status: "",
    c1_health_status: "",
    c1_employment_status: "",
    c1_occupation: "",
    c1_dob: "",
    c1_smoker: false,
    c1_nationality: "",
    c1_has_will: false,
    c1_has_lpa: false,
    c1_national_insurance: "",
    c1_town_of_birth: "",

    // Client 2 Details
    c2_title: "",
    c2_first_name: "",
    c2_middle_name: "",
    c2_last_name: "",
    c2_gender: "",
    c2_marital_status: "",
    c2_health_status: "",
    c2_employment_status: "",
    c2_occupation: "",
    c2_dob: "",
    c2_smoker: false,
    c2_nationality: "",
    c2_has_will: false,
    c2_has_lpa: false,
    c2_national_insurance: "",
    c2_town_of_birth: "",

    // Income & Expenses (Client 1)
    c1_income: "",
    c1_council_tax: "",
    c1_utilities: "",
    c1_groceries: "",
    c1_insurances: "",
    c1_entertainment: "",
    c1_regular_commitments: "",
    c1_discretionary_spending: "",
    c1_mortgage_payments: "",
    c1_loans_or_credit_cards: "",
    c1_other_outgoings: "",

    // Income & Expenses (Client 2)
    c2_income: "",
    c2_council_tax: "",
    c2_utilities: "",
    c2_groceries: "",
    c2_insurances: "",
    c2_entertainment: "",
    c2_regular_commitments: "",
    c2_discretionary_spending: "",
    c2_mortgage_payments: "",
    c2_loans_or_credit_cards: "",
    c2_other_outgoings: "",

    // Assets (Client 1)
    c1_main_home: "",
    c1_second_property: "",
    c1_investments: "",
    c1_savings: "",
    c1_pension: "",
    c1_life_not_in_trust: "",
    c1_car_or_boat: "",
    c1_chattels: "",
    c1_business_assets: "",

    // Assets (Client 2)
    c2_main_home: "",
    c2_second_property: "",
    c2_investments: "",
    c2_savings: "",
    c2_pension: "",
    c2_life_not_in_trust: "",
    c2_car_or_boat: "",
    c2_chattels: "",
    c2_business_assets: "",

    // Liabilities & Tax
    mortgages_total: "",
    loans_total: "",
    hp_credit_total: "",
    net_assets_total: "",
    inheritance_tax_allowance: "",
    taxable_estate: "",
    inheritance_tax_due: "",

    // Beneficiaries
    main_beneficiaries: "",
    child_1_name: "",
    child_1_relation_c1: "",
    child_1_relation_c2: "",
    child_1_financial_dependency: false,
    child_1_note: "",

    // Estate Planning
    isa_used_this_year: false,
    atr_risk_result: "",
    atr_in_words: "",
    target_capital: "",
    current_capital: "",
    target_income: "",
    whole_of_life_policy: false,
    inter_vivos_life_cover: false,
    critical_illness_cover: false,
    private_medical_insurance: false,
    long_term_care: false,
    savings_scheme: false,
    investments: false,
    pensions: false,
    mortgage_cover: false,
    will_planning_notes: "",

    // Client Feedback
    feedback_1_solution: "",
    feedback_1_benefit: "",
    feedback_1_expectation: "",
  })

  useEffect(() => {
    async function loadData() {
      try {
        console.log("Loading data for factfind form...")
        
        // Load leads
        const { data: leadsData, error: leadsError } = await supabase
          .from('leads')
          .select('id, first_name, last_name, email, phone_number, owner')
          .order('first_name')
        
        if (leadsError) {
          console.error("Error loading leads:", leadsError)
        } else {
          console.log("Leads loaded:", leadsData?.length || 0, "leads")
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
          console.log("Advisors loaded:", advisorsData?.length || 0, "advisors")
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
          console.log("Supervisors loaded:", supervisorsData?.length || 0, "supervisors")
          setSupervisors(supervisorsData || [])
        }
        
        // If contactId is provided, find and set the selected lead
        if (contactId) {
          const lead = leadsData?.find((l) => l.id === contactId)
          if (lead) {
            setSelectedLead(lead)
            setFormData(prev => ({
              ...prev,
              lead_id: contactId,
              contact_name: `${lead.first_name} ${lead.last_name}`,
              c1_first_name: lead.first_name,
              c1_last_name: lead.last_name,
            }))
          }
        }
      } catch (error) {
        console.error("Error loading data:", error)
      }
    }

    loadData()
  }, [contactId])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    if (field === "lead_id") {
      const lead = leads.find((l) => l.id === value)
      setSelectedLead(lead || null)
      if (lead) {
        setFormData((prev) => ({
          ...prev,
          contact_name: `${String(lead.first_name)} ${String(lead.last_name)}`,
          owner: String(lead.owner || ""),
          c1_first_name: String(lead.first_name),
          c1_last_name: String(lead.last_name),
        }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.lead_id) {
        alert("Please select a lead")
        setLoading(false)
        return
      }

      const factFindData: Omit<FactFind, "id" | "created_at" | "updated_at"> = {
        contact_id: null, // Keep contact_id as null
        lead_id: formData.lead_id, // Use lead_id instead
        factfind_date: formData.factfind_date || undefined,
        consultant_name: formData.consultant_name,
        owner: formData.owner,
        contact_name: formData.contact_name,
        currency: formData.currency,
        reason_for_meeting: formData.reason_for_meeting,

        // Client 1 Details
        c1_title: formData.c1_title,
        c1_first_name: formData.c1_first_name,
        c1_middle_name: formData.c1_middle_name,
        c1_last_name: formData.c1_last_name,
        c1_gender: formData.c1_gender,
        c1_marital_status: formData.c1_marital_status,
        c1_health_status: formData.c1_health_status,
        c1_employment_status: formData.c1_employment_status,
        c1_occupation: formData.c1_occupation,
        c1_dob: formData.c1_dob || undefined,
        c1_smoker: formData.c1_smoker,
        c1_nationality: formData.c1_nationality,
        c1_has_will: formData.c1_has_will,
        c1_has_lpa: formData.c1_has_lpa,
        c1_national_insurance: formData.c1_national_insurance,
        c1_town_of_birth: formData.c1_town_of_birth,

        // Client 2 Details
        c2_title: formData.c2_title,
        c2_first_name: formData.c2_first_name,
        c2_middle_name: formData.c2_middle_name,
        c2_last_name: formData.c2_last_name,
        c2_gender: formData.c2_gender,
        c2_marital_status: formData.c2_marital_status,
        c2_health_status: formData.c2_health_status,
        c2_employment_status: formData.c2_employment_status,
        c2_occupation: formData.c2_occupation,
        c2_dob: formData.c2_dob || undefined,
        c2_smoker: formData.c2_smoker,
        c2_nationality: formData.c2_nationality,
        c2_has_will: formData.c2_has_will,
        c2_has_lpa: formData.c2_has_lpa,
        c2_national_insurance: formData.c2_national_insurance,
        c2_town_of_birth: formData.c2_town_of_birth,

        // Financial data
        c1_income: formData.c1_income ? Number.parseFloat(formData.c1_income) : undefined,
        c1_council_tax: formData.c1_council_tax ? Number.parseFloat(formData.c1_council_tax) : undefined,
        c1_utilities: formData.c1_utilities ? Number.parseFloat(formData.c1_utilities) : undefined,
        c1_groceries: formData.c1_groceries ? Number.parseFloat(formData.c1_groceries) : undefined,
        c1_insurances: formData.c1_insurances ? Number.parseFloat(formData.c1_insurances) : undefined,
        c1_entertainment: formData.c1_entertainment ? Number.parseFloat(formData.c1_entertainment) : undefined,
        c1_regular_commitments: formData.c1_regular_commitments
          ? Number.parseFloat(formData.c1_regular_commitments)
          : undefined,
        c1_discretionary_spending: formData.c1_discretionary_spending
          ? Number.parseFloat(formData.c1_discretionary_spending)
          : undefined,
        c1_mortgage_payments: formData.c1_mortgage_payments
          ? Number.parseFloat(formData.c1_mortgage_payments)
          : undefined,
        c1_loans_or_credit_cards: formData.c1_loans_or_credit_cards
          ? Number.parseFloat(formData.c1_loans_or_credit_cards)
          : undefined,
        c1_other_outgoings: formData.c1_other_outgoings ? Number.parseFloat(formData.c1_other_outgoings) : undefined,

        c2_income: formData.c2_income ? Number.parseFloat(formData.c2_income) : undefined,
        c2_council_tax: formData.c2_council_tax ? Number.parseFloat(formData.c2_council_tax) : undefined,
        c2_utilities: formData.c2_utilities ? Number.parseFloat(formData.c2_utilities) : undefined,
        c2_groceries: formData.c2_groceries ? Number.parseFloat(formData.c2_groceries) : undefined,
        c2_insurances: formData.c2_insurances ? Number.parseFloat(formData.c2_insurances) : undefined,
        c2_entertainment: formData.c2_entertainment ? Number.parseFloat(formData.c2_entertainment) : undefined,
        c2_regular_commitments: formData.c2_regular_commitments
          ? Number.parseFloat(formData.c2_regular_commitments)
          : undefined,
        c2_discretionary_spending: formData.c2_discretionary_spending
          ? Number.parseFloat(formData.c2_discretionary_spending)
          : undefined,
        c2_mortgage_payments: formData.c2_mortgage_payments
          ? Number.parseFloat(formData.c2_mortgage_payments)
          : undefined,
        c2_loans_or_credit_cards: formData.c2_loans_or_credit_cards
          ? Number.parseFloat(formData.c2_loans_or_credit_cards)
          : undefined,
        c2_other_outgoings: formData.c2_other_outgoings ? Number.parseFloat(formData.c2_other_outgoings) : undefined,

        // Assets
        c1_main_home: formData.c1_main_home ? Number.parseFloat(formData.c1_main_home) : undefined,
        c1_second_property: formData.c1_second_property ? Number.parseFloat(formData.c1_second_property) : undefined,
        c1_investments: formData.c1_investments ? Number.parseFloat(formData.c1_investments) : undefined,
        c1_savings: formData.c1_savings ? Number.parseFloat(formData.c1_savings) : undefined,
        c1_pension: formData.c1_pension ? Number.parseFloat(formData.c1_pension) : undefined,
        c1_life_not_in_trust: formData.c1_life_not_in_trust
          ? Number.parseFloat(formData.c1_life_not_in_trust)
          : undefined,
        c1_car_or_boat: formData.c1_car_or_boat ? Number.parseFloat(formData.c1_car_or_boat) : undefined,
        c1_chattels: formData.c1_chattels ? Number.parseFloat(formData.c1_chattels) : undefined,
        c1_business_assets: formData.c1_business_assets ? Number.parseFloat(formData.c1_business_assets) : undefined,

        c2_main_home: formData.c2_main_home ? Number.parseFloat(formData.c2_main_home) : undefined,
        c2_second_property: formData.c2_second_property ? Number.parseFloat(formData.c2_second_property) : undefined,
        c2_investments: formData.c2_investments ? Number.parseFloat(formData.c2_investments) : undefined,
        c2_savings: formData.c2_savings ? Number.parseFloat(formData.c2_savings) : undefined,
        c2_pension: formData.c2_pension ? Number.parseFloat(formData.c2_pension) : undefined,
        c2_life_not_in_trust: formData.c2_life_not_in_trust
          ? Number.parseFloat(formData.c2_life_not_in_trust)
          : undefined,
        c2_car_or_boat: formData.c2_car_or_boat ? Number.parseFloat(formData.c2_car_or_boat) : undefined,
        c2_chattels: formData.c2_chattels ? Number.parseFloat(formData.c2_chattels) : undefined,
        c2_business_assets: formData.c2_business_assets ? Number.parseFloat(formData.c2_business_assets) : undefined,

        // Liabilities & Tax
        mortgages_total: formData.mortgages_total ? Number.parseFloat(formData.mortgages_total) : undefined,
        loans_total: formData.loans_total ? Number.parseFloat(formData.loans_total) : undefined,
        hp_credit_total: formData.hp_credit_total ? Number.parseFloat(formData.hp_credit_total) : undefined,
        net_assets_total: formData.net_assets_total ? Number.parseFloat(formData.net_assets_total) : undefined,
        inheritance_tax_allowance: formData.inheritance_tax_allowance
          ? Number.parseFloat(formData.inheritance_tax_allowance)
          : undefined,
        taxable_estate: formData.taxable_estate ? Number.parseFloat(formData.taxable_estate) : undefined,
        inheritance_tax_due: formData.inheritance_tax_due ? Number.parseFloat(formData.inheritance_tax_due) : undefined,

        // Beneficiaries
        main_beneficiaries: formData.main_beneficiaries,
        child_1_name: formData.child_1_name,
        child_1_relation_c1: formData.child_1_relation_c1,
        child_1_relation_c2: formData.child_1_relation_c2,
        child_1_financial_dependency: formData.child_1_financial_dependency,
        child_1_note: formData.child_1_note,

        // Estate Planning
        isa_used_this_year: formData.isa_used_this_year,
        atr_risk_result: formData.atr_risk_result,
        atr_in_words: formData.atr_in_words,
        target_capital: formData.target_capital ? Number.parseFloat(formData.target_capital) : undefined,
        current_capital: formData.current_capital ? Number.parseFloat(formData.current_capital) : undefined,
        target_income: formData.target_income ? Number.parseFloat(formData.target_income) : undefined,
        whole_of_life_policy: formData.whole_of_life_policy,
        inter_vivos_life_cover: formData.inter_vivos_life_cover,
        critical_illness_cover: formData.critical_illness_cover,
        private_medical_insurance: formData.private_medical_insurance,
        long_term_care: formData.long_term_care,
        savings_scheme: formData.savings_scheme,
        investments: formData.investments,
        pensions: formData.pensions,
        mortgage_cover: formData.mortgage_cover,
        will_planning_notes: formData.will_planning_notes,

        // Client Feedback
        feedback_1_solution: formData.feedback_1_solution,
        feedback_1_benefit: formData.feedback_1_benefit,
        feedback_1_expectation: formData.feedback_1_expectation,
        
        // Set name to lead's name
        name: selectedLead ? `${selectedLead.first_name} ${selectedLead.last_name}` : "",
      }

      console.log("Creating factfind with data:", factFindData)
      
      // Send data to webhook and get the created factfind ID
      try {
        const webhookData = {
          type: "factfind_created",
          factfind: factFindData,
          lead: selectedLead,
          formData: formData,
          timestamp: new Date().toISOString()
        }

        const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_WEBHOOK_FACTFIND_URL}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData)
        })

        if (!webhookResponse.ok) {
          console.warn("Webhook call failed:", webhookResponse.status, webhookResponse.statusText)
          alert("Error creating factfind. Please try again.")
          return
        }

        const webhookResult = await webhookResponse.json()
        console.log("Webhook response:", webhookResult)

        if (webhookResult.factfind_id) {
          // Redirect to the created factfind using the ID from webhook response
          window.location.href = `/factfinds/${webhookResult.factfind_id}`
        } else {
          console.error("No factfind_id in webhook response")
          alert("Error: No factfind ID received from server")
        }
      } catch (webhookError) {
        console.error("Error sending webhook data:", webhookError)
        alert("Error creating factfind. Please try again.")
      }
    } catch (error) {
      console.error("Error creating factfind:", error)
      alert("Error creating factfind. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href={contactId ? `/leads/${contactId}` : "/factfinds"}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {contactId ? "Back to Lead" : "Back to FactFinds"}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New FactFind</h1>
            <p className="text-gray-600 mt-2">
              {selectedLead
                ? `Creating factfind for ${selectedLead.first_name} ${selectedLead.last_name}`
                : "Add a new factfind to the CRM system"}
            </p>
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
                  <Label htmlFor="lead_id">Lead *</Label>
                  <LeadSearch
                    leads={leads}
                    selectedLead={selectedLead}
                                         onSelectLead={(lead) => {
                       if (lead) {
                         setSelectedLead(lead)
                         setFormData(prev => ({
                           ...prev,
                           lead_id: lead.id,
                           contact_name: `${String(lead.first_name)} ${String(lead.last_name)}`,
                           c1_first_name: String(lead.first_name),
                           c1_last_name: String(lead.last_name),
                         }))
                       } else {
                         setSelectedLead(null)
                         setFormData(prev => ({
                           ...prev,
                           lead_id: "",
                           contact_name: "",
                           c1_first_name: "",
                           c1_last_name: "",
                         }))
                       }
                     }}
                    placeholder="Search by name or email..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="factfind_date">FactFind Date</Label>
                  <Input
                    id="factfind_date"
                    type="date"
                    value={formData.factfind_date}
                    onChange={(e) => handleInputChange("factfind_date", e.target.value)}
                  />
                </div>
              </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <Label htmlFor="consultant_name">Consultant Name</Label>
                   <Select
                     value={formData.consultant_name}
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
                   <Select value={formData.owner} onValueChange={(value) => handleInputChange("owner", value)}>
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
                  value={formData.reason_for_meeting}
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
                  <Select value={formData.c1_title} onValueChange={(value) => handleInputChange("c1_title", value)}>
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
                    value={formData.c1_first_name}
                    onChange={(e) => handleInputChange("c1_first_name", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="c1_middle_name">Middle Name</Label>
                  <Input
                    id="c1_middle_name"
                    value={formData.c1_middle_name}
                    onChange={(e) => handleInputChange("c1_middle_name", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="c1_last_name">Last Name</Label>
                  <Input
                    id="c1_last_name"
                    value={formData.c1_last_name}
                    onChange={(e) => handleInputChange("c1_last_name", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="c1_gender">Gender</Label>
                  <Select value={formData.c1_gender} onValueChange={(value) => handleInputChange("c1_gender", value)}>
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
                    value={formData.c1_dob}
                    onChange={(e) => handleInputChange("c1_dob", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="c1_nationality">Nationality</Label>
                  <Input
                    id="c1_nationality"
                    value={formData.c1_nationality}
                    onChange={(e) => handleInputChange("c1_nationality", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="c1_marital_status">Marital Status</Label>
                  <Select
                    value={formData.c1_marital_status}
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
                    value={formData.c1_occupation}
                    onChange={(e) => handleInputChange("c1_occupation", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="c1_employment_status">Employment Status</Label>
                  <Select
                    value={formData.c1_employment_status}
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
                    value={formData.c1_health_status}
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
                    value={formData.c1_national_insurance}
                    onChange={(e) => handleInputChange("c1_national_insurance", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="c1_smoker"
                    checked={formData.c1_smoker}
                    onCheckedChange={(checked) => handleInputChange("c1_smoker", checked)}
                  />
                  <Label htmlFor="c1_smoker">Smoker</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="c1_has_will"
                    checked={formData.c1_has_will}
                    onCheckedChange={(checked) => handleInputChange("c1_has_will", checked)}
                  />
                  <Label htmlFor="c1_has_will">Has Will</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="c1_has_lpa"
                    checked={formData.c1_has_lpa}
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
                    value={formData.c1_income}
                    onChange={(e) => handleInputChange("c1_income", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="c1_council_tax">Council Tax (£)</Label>
                  <Input
                    id="c1_council_tax"
                    type="number"
                    value={formData.c1_council_tax}
                    onChange={(e) => handleInputChange("c1_council_tax", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="c1_utilities">Utilities (£)</Label>
                  <Input
                    id="c1_utilities"
                    type="number"
                    value={formData.c1_utilities}
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
                    value={formData.c1_groceries}
                    onChange={(e) => handleInputChange("c1_groceries", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="c1_insurances">Insurances (£)</Label>
                  <Input
                    id="c1_insurances"
                    type="number"
                    value={formData.c1_insurances}
                    onChange={(e) => handleInputChange("c1_insurances", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="c1_entertainment">Entertainment (£)</Label>
                  <Input
                    id="c1_entertainment"
                    type="number"
                    value={formData.c1_entertainment}
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
                    value={formData.c1_mortgage_payments}
                    onChange={(e) => handleInputChange("c1_mortgage_payments", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="c1_loans_or_credit_cards">Loans/Credit Cards (£)</Label>
                  <Input
                    id="c1_loans_or_credit_cards"
                    type="number"
                    value={formData.c1_loans_or_credit_cards}
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
                    value={formData.c1_main_home}
                    onChange={(e) => handleInputChange("c1_main_home", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="c1_second_property">Second Property (£)</Label>
                  <Input
                    id="c1_second_property"
                    type="number"
                    value={formData.c1_second_property}
                    onChange={(e) => handleInputChange("c1_second_property", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="c1_investments">Investments (£)</Label>
                  <Input
                    id="c1_investments"
                    type="number"
                    value={formData.c1_investments}
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
                    value={formData.c1_savings}
                    onChange={(e) => handleInputChange("c1_savings", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="c1_pension">Pension (£)</Label>
                  <Input
                    id="c1_pension"
                    type="number"
                    value={formData.c1_pension}
                    onChange={(e) => handleInputChange("c1_pension", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="c1_life_not_in_trust">Life Insurance (£)</Label>
                  <Input
                    id="c1_life_not_in_trust"
                    type="number"
                    value={formData.c1_life_not_in_trust}
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
                    value={formData.c1_car_or_boat}
                    onChange={(e) => handleInputChange("c1_car_or_boat", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="c1_chattels">Chattels (£)</Label>
                  <Input
                    id="c1_chattels"
                    type="number"
                    value={formData.c1_chattels}
                    onChange={(e) => handleInputChange("c1_chattels", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="c1_business_assets">Business Assets (£)</Label>
                  <Input
                    id="c1_business_assets"
                    type="number"
                    value={formData.c1_business_assets}
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
                    value={formData.mortgages_total}
                    onChange={(e) => handleInputChange("mortgages_total", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="loans_total">Total Loans (£)</Label>
                  <Input
                    id="loans_total"
                    type="number"
                    value={formData.loans_total}
                    onChange={(e) => handleInputChange("loans_total", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="hp_credit_total">HP/Credit Total (£)</Label>
                  <Input
                    id="hp_credit_total"
                    type="number"
                    value={formData.hp_credit_total}
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
                    value={formData.net_assets_total}
                    onChange={(e) => handleInputChange("net_assets_total", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="inheritance_tax_allowance">IHT Allowance (£)</Label>
                  <Input
                    id="inheritance_tax_allowance"
                    type="number"
                    value={formData.inheritance_tax_allowance}
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
                    value={formData.taxable_estate}
                    onChange={(e) => handleInputChange("taxable_estate", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="inheritance_tax_due">Inheritance Tax Due (£)</Label>
                  <Input
                    id="inheritance_tax_due"
                    type="number"
                    value={formData.inheritance_tax_due}
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
                  value={formData.main_beneficiaries}
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
                    value={formData.child_1_name}
                    onChange={(e) => handleInputChange("child_1_name", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="child_1_relation_c1">Relation to Client 1</Label>
                  <Input
                    id="child_1_relation_c1"
                    value={formData.child_1_relation_c1}
                    onChange={(e) => handleInputChange("child_1_relation_c1", e.target.value)}
                    placeholder="e.g., Son, Daughter"
                  />
                </div>
                <div>
                  <Label htmlFor="child_1_relation_c2">Relation to Client 2</Label>
                  <Input
                    id="child_1_relation_c2"
                    value={formData.child_1_relation_c2}
                    onChange={(e) => handleInputChange("child_1_relation_c2", e.target.value)}
                    placeholder="e.g., Son, Daughter"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="child_1_financial_dependency"
                  checked={formData.child_1_financial_dependency}
                  onCheckedChange={(checked) => handleInputChange("child_1_financial_dependency", checked)}
                />
                <Label htmlFor="child_1_financial_dependency">Financially Dependent</Label>
              </div>

              <div>
                <Label htmlFor="child_1_note">Child 1 Notes</Label>
                <Textarea
                  id="child_1_note"
                  value={formData.child_1_note}
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
                    value={formData.target_capital}
                    onChange={(e) => handleInputChange("target_capital", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="current_capital">Current Capital (£)</Label>
                  <Input
                    id="current_capital"
                    type="number"
                    value={formData.current_capital}
                    onChange={(e) => handleInputChange("current_capital", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="target_income">Target Income (£)</Label>
                  <Input
                    id="target_income"
                    type="number"
                    value={formData.target_income}
                    onChange={(e) => handleInputChange("target_income", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="atr_risk_result">ATR Risk Result</Label>
                  <Select
                    value={formData.atr_risk_result}
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
                    value={formData.atr_in_words}
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
                      checked={formData.isa_used_this_year}
                      onCheckedChange={(checked) => handleInputChange("isa_used_this_year", checked)}
                    />
                    <Label htmlFor="isa_used_this_year">ISA Used This Year</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="whole_of_life_policy"
                      checked={formData.whole_of_life_policy}
                      onCheckedChange={(checked) => handleInputChange("whole_of_life_policy", checked)}
                    />
                    <Label htmlFor="whole_of_life_policy">Whole of Life Policy</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="inter_vivos_life_cover"
                      checked={formData.inter_vivos_life_cover}
                      onCheckedChange={(checked) => handleInputChange("inter_vivos_life_cover", checked)}
                    />
                    <Label htmlFor="inter_vivos_life_cover">Inter Vivos Life Cover</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="critical_illness_cover"
                      checked={formData.critical_illness_cover}
                      onCheckedChange={(checked) => handleInputChange("critical_illness_cover", checked)}
                    />
                    <Label htmlFor="critical_illness_cover">Critical Illness Cover</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="private_medical_insurance"
                      checked={formData.private_medical_insurance}
                      onCheckedChange={(checked) => handleInputChange("private_medical_insurance", checked)}
                    />
                    <Label htmlFor="private_medical_insurance">Private Medical Insurance</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="long_term_care"
                      checked={formData.long_term_care}
                      onCheckedChange={(checked) => handleInputChange("long_term_care", checked)}
                    />
                    <Label htmlFor="long_term_care">Long Term Care</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="savings_scheme"
                      checked={formData.savings_scheme}
                      onCheckedChange={(checked) => handleInputChange("savings_scheme", checked)}
                    />
                    <Label htmlFor="savings_scheme">Savings Scheme</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="investments"
                      checked={formData.investments}
                      onCheckedChange={(checked) => handleInputChange("investments", checked)}
                    />
                    <Label htmlFor="investments">Investments</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pensions"
                      checked={formData.pensions}
                      onCheckedChange={(checked) => handleInputChange("pensions", checked)}
                    />
                    <Label htmlFor="pensions">Pensions</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mortgage_cover"
                      checked={formData.mortgage_cover}
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
                  value={formData.will_planning_notes}
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
                  value={formData.feedback_1_solution}
                  onChange={(e) => handleInputChange("feedback_1_solution", e.target.value)}
                  placeholder="Describe the first proposed solution..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="feedback_1_benefit">Benefit 1</Label>
                <Textarea
                  id="feedback_1_benefit"
                  value={formData.feedback_1_benefit}
                  onChange={(e) => handleInputChange("feedback_1_benefit", e.target.value)}
                  placeholder="Benefits of the first solution..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="feedback_1_expectation">Expectation 1</Label>
                <Textarea
                  id="feedback_1_expectation"
                  value={formData.feedback_1_expectation}
                  onChange={(e) => handleInputChange("feedback_1_expectation", e.target.value)}
                  placeholder="Client expectations for the first solution..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link href={contactId ? `/leads/${contactId}` : "/factfinds"}>
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
                  Create FactFind
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
