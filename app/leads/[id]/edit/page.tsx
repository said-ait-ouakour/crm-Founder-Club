"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { leadService } from "@/lib/database"
import type { Lead } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Check, Plus } from "lucide-react"

// Helper functions for notes JSON handling
const parseNotesJson = (notesString: string, lastUpdate?: string): Array<{datetime: string, note: string}> => {
  if (!notesString) return [];
  try {
    // Handle the JSON format: {"datetime1":"note1","datetime2":"note2"}
    const parsed = JSON.parse(notesString);
    return Object.entries(parsed).map(([datetime, note]) => ({
      datetime,
      note: note as string
    })).sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
  } catch {
    // Handle legacy format - convert to new format using last_update as date
    const fallbackDate = lastUpdate || new Date().toISOString();
    return notesString ? [{
      datetime: fallbackDate,
      note: notesString
    }] : [];
  }
};

// Helper function to stringify notes to JSON
const stringifyNotesToJson = (notesArray: Array<{datetime: string, note: string}>): string => {
  const notesObj: Record<string, string> = {};
  notesArray.forEach(({datetime, note}) => {
    notesObj[datetime] = note;
  });
  return JSON.stringify(notesObj);
};

export default function EditLeadPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [lead, setLead] = useState<Lead | null>(null)
  
  // State for inline notes management
  const [notesArray, setNotesArray] = useState<Array<{datetime: string, note: string}>>([])
  const [showNewNoteField, setShowNewNoteField] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null)
  const [editingNoteText, setEditingNoteText] = useState("")
  const [formData, setFormData] = useState({
    // Contact Person Information
    contact_first_name: "",
    contact_last_name: "",
    contact_title: "",
    contact_position: "",
    contact_email: "",
    mobile_phone: "",
    other_phone: "",
    business_telephone: "",
    salutation: "",
    date_of_birth: "",
    
    // Business Information
    business_name: "",
    business_address_1: "",
    business_address_2: "",
    business_locality: "",
    business_town: "",
    business_county: "",
    business_post_code: "",
    company_email: "",
    website: "",
    linkedin_company_url: "",
    industry: "",
    company_size: "",
    annual_revenue: "",
    sic_07_code: "",
    sic_07_description: "",
    major_sector_desc: "",
    contact_urn: "",
    
    // Employee & Turnover Bands
    employees_band_desc: "",
    national_employees_band_desc: "",
    modeled_turnover_band_desc: "",
    
    // Lead Management
    owner: "",
    current_status: "Open",
    current_progress: "Needs Analysis",
    status_reason: "",
    lead_source: "",
    type_of_lead: "",
    customer_type: "",
    engaged: false,
    
    // Goals & Budget
    goals: "",
    budget: "",
    budget_frequency: "Monthly",
    goal_term: "",
    goal_year: "",
    household_income: "",
    
    // Compliance
    tps_checked: false,
    ctps_checked: false,
    verified_phone: false,
    verified_email: false,
    
    // Communication Preferences
    preferred_contact_method: "Email",
    allow_email: true,
    allow_phone: true,
    allow_fax: false,
    allow_mail: true,
    allow_bulk_email: false,
    best_time_to_contact: "",
    
    // Marketing
    marketing_materials_sent: false,
    added_to_marketing_list: false,
    campaign_name: "",
    last_campaign_date: "",
    
    // System Fields
    easy_id: "",
    easy_description: "",
    notes: "",
  })

  useEffect(() => {
    async function loadLead() {
      if (!params?.id) return
      
      try {
        const data = await leadService.getById(params.id as string)
        setLead(data)

        // Load notes from lead_situation table (maybeSingle = 0 or 1 row)
        const { data: situationData, error: situationError } = await supabase
          .from("lead_situation")
          .select("advisor_notes, last_update")
          .eq("lead_id", params.id)
          .maybeSingle();

        if (situationError) {
          console.error("Error loading lead situation:", situationError);
        }

        // Initialize notes array
        const advisorNotes = situationData?.advisor_notes;
        const lastUpdate = (situationData as any)?.last_update;
        const notes = parseNotesJson(
          typeof advisorNotes === 'string' ? advisorNotes : "",
          lastUpdate
        )
        setNotesArray(notes)

        // Check if we need to edit a specific note
        const editNoteParam = searchParams?.get('editNote')
        if (editNoteParam) {
          const noteToEdit = notes.find(note => note.datetime === editNoteParam)
          if (noteToEdit) {
            const noteIndex = notes.findIndex(note => note.datetime === editNoteParam)
            setEditingNoteIndex(noteIndex)
            setEditingNoteText(noteToEdit.note)
            
            // Focus on the textarea after a short delay to ensure it's rendered
            setTimeout(() => {
              const textarea = document.getElementById(`edit-note-${noteIndex}`) as HTMLTextAreaElement
              if (textarea) {
                // Scroll the textarea into view
                textarea.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center' 
                })
                
                // Focus and move cursor to end of text
                textarea.focus()
                textarea.setSelectionRange(textarea.value.length, textarea.value.length)
              }
            }, 200)
          }
        }

        // Populate form with existing data
        setFormData({
          // Contact Person Information
          contact_first_name: data.contact_first_name || "",
          contact_last_name: data.contact_last_name || "",
          contact_title: data.contact_title || "",
          contact_position: data.contact_position || "",
          contact_email: data.contact_email || "",
          mobile_phone: data.mobile_phone || "",
          other_phone: data.other_phone || "",
          business_telephone: data.business_telephone || "",
          salutation: data.salutation || "",
          date_of_birth: data.date_of_birth ? data.date_of_birth.split('T')[0] : "",
          
          // Business Information
          business_name: data.business_name || "",
          business_address_1: data.business_address_1 || "",
          business_address_2: data.business_address_2 || "",
          business_locality: data.business_locality || "",
          business_town: data.business_town || "",
          business_county: data.business_county || "",
          business_post_code: data.business_post_code || "",
          company_email: data.company_email || "",
          website: data.website || "",
          linkedin_company_url: data.linkedin_company_url || "",
          industry: data.industry || "",
          company_size: data.company_size || "",
          annual_revenue: data.annual_revenue ? data.annual_revenue.toString() : "",
          sic_07_code: data.sic_07_code || "",
          sic_07_description: data.sic_07_description || "",
          major_sector_desc: data.major_sector_desc || "",
          contact_urn: data.contact_urn || "",
          
          // Employee & Turnover Bands
          employees_band_desc: data.employees_band_desc || "",
          national_employees_band_desc: data.national_employees_band_desc || "",
          modeled_turnover_band_desc: data.modeled_turnover_band_desc || "",
          
          // Lead Management
          owner: data.owner || "",
          current_status: data.current_status || "Open",
          current_progress: data.current_progress || "Needs Analysis",
          status_reason: data.status_reason || "",
          lead_source: data.lead_source || "",
          type_of_lead: data.type_of_lead || "",
          customer_type: data.customer_type || "",
          engaged: data.engaged ?? false,
          
          // Goals & Budget
          goals: data.goals || "",
          budget: data.budget ? data.budget.toString() : "",
          budget_frequency: data.budget_frequency || "Monthly",
          goal_term: data.goal_term || "",
          goal_year: data.goal_year ? data.goal_year.toString() : "",
          household_income: data.household_income ? data.household_income.toString() : "",
          
          // Compliance
          tps_checked: data.tps_checked ?? false,
          ctps_checked: data.ctps_checked ?? false,
          verified_phone: data.verified_phone ?? false,
          verified_email: data.verified_email ?? false,
          
          // Communication Preferences
          preferred_contact_method: data.preferred_contact_method || "Email",
          allow_email: data.allow_email ?? true,
          allow_phone: data.allow_phone ?? true,
          allow_fax: data.allow_fax ?? false,
          allow_mail: data.allow_mail ?? true,
          allow_bulk_email: data.allow_bulk_email ?? false,
          best_time_to_contact: data.best_time_to_contact || "",
          
          // Marketing
          marketing_materials_sent: data.marketing_materials_sent ?? false,
          added_to_marketing_list: data.added_to_marketing_list ?? false,
          campaign_name: data.campaign_name || "",
          last_campaign_date: data.last_campaign_date ? data.last_campaign_date.split('T')[0] : "",
          
          // System Fields
          easy_id: data.easy_id || "",
          easy_description: data.easy_description || "",
          notes: data.notes || "",
        })
      } catch (error) {
        console.error("Error loading lead:", error)
        window.location.href =  "/leads";
      } finally {
        setInitialLoading(false)
      }
    }

      loadLead()
  }, [params?.id, router, searchParams])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Notes management functions
  const handleAddNewNote = () => {
    if (!newNote.trim()) return;
    
    const currentDateTime = new Date().toISOString();
    const updatedNotes = [
      { datetime: currentDateTime, note: newNote.trim() },
      ...notesArray
    ];
    
    setNotesArray(updatedNotes);
    setNewNote("");
    setShowNewNoteField(false);
  }

  const handleEditNote = (index: number) => {
    setEditingNoteIndex(index);
    setEditingNoteText(notesArray[index].note);
  }

  const handleSaveEditNote = (index: number) => {
    if (!editingNoteText.trim()) return;
    
    const updatedNotes = [...notesArray];
    updatedNotes[index] = { ...updatedNotes[index], note: editingNoteText.trim() };
    
    setNotesArray(updatedNotes);
    setEditingNoteIndex(null);
    setEditingNoteText("");
  }

  const handleCancelEditNote = () => {
    setEditingNoteIndex(null);
    setEditingNoteText("");
  }

  const handleDeleteNote = (index: number) => {
    if (confirm("Are you sure you want to delete this note?")) {
      const updatedNotes = notesArray.filter((_, i) => i !== index);
      setNotesArray(updatedNotes);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!params?.id) {
      toast({
        title: "Error",
        description: "Invalid lead ID",
        variant: "destructive"
      })
      setLoading(false)
      return
    }

    try {
      const updateData: Partial<Lead> = {
        ...formData,
        // Handle date fields - only include if not empty
        date_of_birth: formData.date_of_birth && formData.date_of_birth.trim() !== "" ? formData.date_of_birth : undefined,
        last_campaign_date: formData.last_campaign_date && formData.last_campaign_date.trim() !== "" ? formData.last_campaign_date : undefined,
        // Handle numeric fields - convert to numbers or undefined
        budget: formData.budget && formData.budget.trim() !== "" ? Number.parseFloat(formData.budget) : undefined,
        goal_year: formData.goal_year && formData.goal_year.trim() !== "" ? Number.parseInt(formData.goal_year) : undefined,
        household_income: formData.household_income && formData.household_income.trim() !== "" ? Number.parseFloat(formData.household_income) : undefined,
        annual_revenue: formData.annual_revenue && formData.annual_revenue.trim() !== "" ? Number.parseFloat(formData.annual_revenue) : undefined,
        // Handle string fields - convert empty strings to undefined
        salutation: formData.salutation && formData.salutation.trim() !== "" ? formData.salutation : undefined,
        mobile_phone: formData.mobile_phone && formData.mobile_phone.trim() !== "" ? formData.mobile_phone : undefined,
        other_phone: formData.other_phone && formData.other_phone.trim() !== "" ? formData.other_phone : undefined,
        business_telephone: formData.business_telephone && formData.business_telephone.trim() !== "" ? formData.business_telephone : undefined,
        business_address_1: formData.business_address_1 && formData.business_address_1.trim() !== "" ? formData.business_address_1 : undefined,
        business_address_2: formData.business_address_2 && formData.business_address_2.trim() !== "" ? formData.business_address_2 : undefined,
        business_locality: formData.business_locality && formData.business_locality.trim() !== "" ? formData.business_locality : undefined,
        business_town: formData.business_town && formData.business_town.trim() !== "" ? formData.business_town : undefined,
        business_county: formData.business_county && formData.business_county.trim() !== "" ? formData.business_county : undefined,
        business_post_code: formData.business_post_code && formData.business_post_code.trim() !== "" ? formData.business_post_code : undefined,
        company_email: formData.company_email && formData.company_email.trim() !== "" ? formData.company_email : undefined,
        website: formData.website && formData.website.trim() !== "" ? formData.website : undefined,
        linkedin_company_url: formData.linkedin_company_url && formData.linkedin_company_url.trim() !== "" ? formData.linkedin_company_url : undefined,
        industry: formData.industry && formData.industry.trim() !== "" ? formData.industry : undefined,
        company_size: formData.company_size && formData.company_size.trim() !== "" ? formData.company_size : undefined,
        sic_07_code: formData.sic_07_code && formData.sic_07_code.trim() !== "" ? formData.sic_07_code : undefined,
        sic_07_description: formData.sic_07_description && formData.sic_07_description.trim() !== "" ? formData.sic_07_description : undefined,
        major_sector_desc: formData.major_sector_desc && formData.major_sector_desc.trim() !== "" ? formData.major_sector_desc : undefined,
        contact_urn: formData.contact_urn && formData.contact_urn.trim() !== "" ? formData.contact_urn : undefined,
        employees_band_desc: formData.employees_band_desc && formData.employees_band_desc.trim() !== "" ? formData.employees_band_desc : undefined,
        national_employees_band_desc: formData.national_employees_band_desc && formData.national_employees_band_desc.trim() !== "" ? formData.national_employees_band_desc : undefined,
        modeled_turnover_band_desc: formData.modeled_turnover_band_desc && formData.modeled_turnover_band_desc.trim() !== "" ? formData.modeled_turnover_band_desc : undefined,
        owner: formData.owner && formData.owner.trim() !== "" ? formData.owner : undefined,
        status_reason: formData.status_reason && formData.status_reason.trim() !== "" ? formData.status_reason : undefined,
        goals: formData.goals && formData.goals.trim() !== "" ? formData.goals : undefined,
        budget_frequency: formData.budget_frequency && formData.budget_frequency.trim() !== "" ? formData.budget_frequency : undefined,
        goal_term: formData.goal_term && formData.goal_term.trim() !== "" ? formData.goal_term : undefined,
        type_of_lead: formData.type_of_lead && formData.type_of_lead.trim() !== "" ? formData.type_of_lead : undefined,
        customer_type: formData.customer_type && formData.customer_type.trim() !== "" ? formData.customer_type : undefined,
        lead_source: formData.lead_source && formData.lead_source.trim() !== "" ? formData.lead_source : undefined,
        campaign_name: formData.campaign_name && formData.campaign_name.trim() !== "" ? formData.campaign_name : undefined,
        preferred_contact_method: formData.preferred_contact_method && formData.preferred_contact_method.trim() !== "" ? formData.preferred_contact_method : undefined,
        best_time_to_contact: formData.best_time_to_contact && formData.best_time_to_contact.trim() !== "" ? formData.best_time_to_contact : undefined,
        easy_id: formData.easy_id && formData.easy_id.trim() !== "" ? formData.easy_id : undefined,
        easy_description: formData.easy_description && formData.easy_description.trim() !== "" ? formData.easy_description : undefined,
      }

      await leadService.update(params.id as string, updateData)
      
      // Save notes to lead_situation table
      if (notesArray.length > 0) {
        const notesJson = stringifyNotesToJson(notesArray);
        
        // Check if lead_situation record exists (maybeSingle = 0 or 1 row)
        const { data: existingSituation, error: fetchError } = await supabase
          .from("lead_situation")
          .select("id")
          .eq("lead_id", params.id)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        if (existingSituation) {
          // Update existing lead_situation record
          const { error: updateError } = await supabase
            .from("lead_situation")
            .update({
              advisor_notes: notesJson,
              last_update: new Date().toISOString(),
            })
            .eq("lead_id", params.id);

          if (updateError) throw updateError;
        } else {
          // Create new lead_situation record
          const { error: insertError } = await supabase
            .from("lead_situation")
            .insert({
              lead_id: params.id,
              advisor_notes: notesJson,
              last_update: new Date().toISOString(),
              created_at: new Date().toISOString(),
            });

          if (insertError) throw insertError;
        }
      }
      
      // Show success message with lead name
      const leadName = `${formData.contact_first_name} ${formData.contact_last_name}`.trim()
      toast({
        title: "Success",
        description: `Lead ${leadName} updated successfully`,
        variant: "success"
      })
      
      // Short delay to show the toast before redirecting
      setTimeout(() => {
        window.location.href = `/leads/${params.id}`
      }, 1500)
    } catch (error) {
      console.error("Error updating lead:", error)
      toast({
        title: "Error",
        description: "Error updating lead. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading lead...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Edit Lead</h1>
            <p className="text-gray-600 mt-2">
              Editing {lead.contact_first_name} {lead.contact_last_name}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Person Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Person Information</CardTitle>
              <CardDescription>Primary contact details for the business lead</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <Label htmlFor="contact_first_name">First Name *</Label>
                  <Input
                    id="contact_first_name"
                    value={formData.contact_first_name}
                    onChange={(e) => handleInputChange("contact_first_name", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact_last_name">Last Name *</Label>
                  <Input
                    id="contact_last_name"
                    value={formData.contact_last_name}
                    onChange={(e) => handleInputChange("contact_last_name", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact_title">Title</Label>
                  <Input
                    id="contact_title"
                    value={formData.contact_title}
                    onChange={(e) => handleInputChange("contact_title", e.target.value)}
                    placeholder="e.g., CEO, Manager"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_position">Position</Label>
                  <Input
                    id="contact_position"
                    value={formData.contact_position}
                    onChange={(e) => handleInputChange("contact_position", e.target.value)}
                    placeholder="Job position"
                  />
                </div>
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="contact_email">Contact Email *</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange("contact_email", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="mobile_phone">Mobile Phone</Label>
                  <Input
                    id="mobile_phone"
                    value={formData.mobile_phone}
                    onChange={(e) => handleInputChange("mobile_phone", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="other_phone">Other Phone</Label>
                  <Input
                    id="other_phone"
                    value={formData.other_phone}
                    onChange={(e) => handleInputChange("other_phone", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Company details and business profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                <Label htmlFor="business_name">Business Name *</Label>
                  <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => handleInputChange("business_name", e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_telephone">Business Telephone</Label>
                  <Input
                    id="business_telephone"
                    value={formData.business_telephone}
                    onChange={(e) => handleInputChange("business_telephone", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="company_email">Company Email</Label>
                  <Input
                    id="company_email"
                    type="email"
                    value={formData.company_email}
                    onChange={(e) => handleInputChange("company_email", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin_company_url">LinkedIn Company URL</Label>
                  <Input
                    id="linkedin_company_url"
                    value={formData.linkedin_company_url}
                    onChange={(e) => handleInputChange("linkedin_company_url", e.target.value)}
                    placeholder="https://linkedin.com/company/example"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => handleInputChange("industry", e.target.value)}
                    placeholder="e.g., Technology, Finance"
                  />
                </div>
                <div>
                  <Label htmlFor="company_size">Company Size</Label>
                  <Select value={formData.company_size} onValueChange={(value) => handleInputChange("company_size", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="500+">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="annual_revenue">Annual Revenue</Label>
                  <Input
                    id="annual_revenue"
                    type="number"
                    value={formData.annual_revenue}
                    onChange={(e) => handleInputChange("annual_revenue", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sic_07_code">SIC Code</Label>
                  <Input
                    id="sic_07_code"
                    value={formData.sic_07_code}
                    onChange={(e) => handleInputChange("sic_07_code", e.target.value)}
                    placeholder="e.g., 62010"
                  />
                </div>
                <div>
                  <Label htmlFor="sic_07_description">SIC Description</Label>
                  <Input
                    id="sic_07_description"
                    value={formData.sic_07_description}
                    onChange={(e) => handleInputChange("sic_07_description", e.target.value)}
                    placeholder="Business activity description"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Address */}
          <Card>
            <CardHeader>
              <CardTitle>Business Address</CardTitle>
              <CardDescription>Company location and address details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="business_address_1">Address Line 1</Label>
                <Input
                  id="business_address_1"
                  value={formData.business_address_1}
                  onChange={(e) => handleInputChange("business_address_1", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="business_address_2">Address Line 2</Label>
                <Input
                  id="business_address_2"
                  value={formData.business_address_2}
                  onChange={(e) => handleInputChange("business_address_2", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_locality">Locality</Label>
                  <Input
                    id="business_locality"
                    value={formData.business_locality}
                    onChange={(e) => handleInputChange("business_locality", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="business_town">Town/City</Label>
                  <Input
                    id="business_town"
                    value={formData.business_town}
                    onChange={(e) => handleInputChange("business_town", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_county">County</Label>
                  <Input
                    id="business_county"
                    value={formData.business_county}
                    onChange={(e) => handleInputChange("business_county", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="business_post_code">Post Code</Label>
                  <Input
                    id="business_post_code"
                    value={formData.business_post_code}
                    onChange={(e) => handleInputChange("business_post_code", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lead Management */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Management</CardTitle>
              <CardDescription>Status, progress, and assignment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="current_status">Status</Label>
                  <Select
                    value={formData.current_status}
                    onValueChange={(value) => handleInputChange("current_status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="Qualified">Qualified</SelectItem>
                      <SelectItem value="Disqualified">Disqualified</SelectItem>
                      <SelectItem value="Converted">Converted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="current_progress">Progress</Label>
                  <Select
                    value={formData.current_progress}
                    onValueChange={(value) => handleInputChange("current_progress", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Needs Analysis">Needs Analysis</SelectItem>
                      <SelectItem value="Call">Call</SelectItem>
                      <SelectItem value="Convince">Convince</SelectItem>
                      <SelectItem value="Qualify">Qualify</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="status_reason">Status Reason</Label>
                <Textarea
                  id="status_reason"
                  value={formData.status_reason}
                  onChange={(e) => handleInputChange("status_reason", e.target.value)}
                  placeholder="Reason for current status..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="lead_source">Lead Source</Label>
                  <Select
                    value={formData.lead_source}
                    onValueChange={(value) => handleInputChange("lead_source", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Website">Website</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Partners">Partners</SelectItem>
                      <SelectItem value="Seminar">Seminar</SelectItem>
                      <SelectItem value="Cold Call">Cold Call</SelectItem>
                      <SelectItem value="Typeform">Typeform</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type_of_lead">Type of Lead</Label>
                  <Select
                    value={formData.type_of_lead}
                    onValueChange={(value) => handleInputChange("type_of_lead", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New Business">New Business</SelectItem>
                      <SelectItem value="Existing Client">Existing Client</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="customer_type">Customer Type</Label>
                  <Select
                    value={formData.customer_type}
                    onValueChange={(value) => handleInputChange("customer_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SME">SME</SelectItem>
                      <SelectItem value="Enterprise">Enterprise</SelectItem>
                      <SelectItem value="Startup">Startup</SelectItem>
                      <SelectItem value="Non-Profit">Non-Profit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="engaged"
                  checked={formData.engaged}
                  onCheckedChange={(checked) => handleInputChange("engaged", checked)}
                />
                <Label htmlFor="engaged">Engaged</Label>
              </div>
            </CardContent>
          </Card>

          {/* Goals & Budget */}
          <Card>
            <CardHeader>
              <CardTitle>Goals & Budget</CardTitle>
              <CardDescription>Business objectives and budget information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="goals">Goals & Objectives</Label>
                <Textarea
                  id="goals"
                  value={formData.goals}
                  onChange={(e) => handleInputChange("goals", e.target.value)}
                  placeholder="What would the business like to achieve?"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={formData.budget}
                    onChange={(e) => handleInputChange("budget", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="budget_frequency">Budget Frequency</Label>
                  <Select
                    value={formData.budget_frequency}
                    onValueChange={(value) => handleInputChange("budget_frequency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Annually">Annually</SelectItem>
                      <SelectItem value="One-time">One-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="goal_year">Goal Year</Label>
                  <Input
                    id="goal_year"
                    type="number"
                    value={formData.goal_year}
                    onChange={(e) => handleInputChange("goal_year", e.target.value)}
                    placeholder="2024"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="goal_term">Goal Term</Label>
                <Input
                  id="goal_term"
                  value={formData.goal_term}
                  onChange={(e) => handleInputChange("goal_term", e.target.value)}
                  placeholder="e.g., 5 years, 10 years, Long-term"
                />
              </div>

                <div>
                  <Label htmlFor="household_income">Household Income</Label>
                  <Input
                    id="household_income"
                    type="number"
                    value={formData.household_income}
                    onChange={(e) => handleInputChange("household_income", e.target.value)}
                    placeholder="0.00"
                  />
              </div>
            </CardContent>
          </Card>

          {/* Compliance & Communication Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance & Communication Preferences</CardTitle>
              <CardDescription>Data protection compliance and communication settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Compliance Status</Label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tps_checked"
                      checked={formData.tps_checked}
                      onCheckedChange={(checked) => handleInputChange("tps_checked", checked)}
                    />
                    <Label htmlFor="tps_checked">TPS Checked</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ctps_checked"
                      checked={formData.ctps_checked}
                      onCheckedChange={(checked) => handleInputChange("ctps_checked", checked)}
                    />
                    <Label htmlFor="ctps_checked">CTPS Checked</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="verified_phone"
                      checked={formData.verified_phone}
                      onCheckedChange={(checked) => handleInputChange("verified_phone", checked)}
                    />
                    <Label htmlFor="verified_phone">Phone Verified</Label>
                </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="verified_email"
                      checked={formData.verified_email}
                      onCheckedChange={(checked) => handleInputChange("verified_email", checked)}
                    />
                    <Label htmlFor="verified_email">Email Verified</Label>
                </div>
              </div>
              </div>

              <div>
                <Label htmlFor="preferred_contact_method">Preferred Contact Method</Label>
                <Select
                  value={formData.preferred_contact_method}
                  onValueChange={(value) => handleInputChange("preferred_contact_method", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Phone">Phone</SelectItem>
                    <SelectItem value="Mobile">Mobile</SelectItem>
                    <SelectItem value="Mail">Mail</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="best_time_to_contact">Best Time to Contact</Label>
                <Input
                  id="best_time_to_contact"
                  value={formData.best_time_to_contact}
                  onChange={(e) => handleInputChange("best_time_to_contact", e.target.value)}
                  placeholder="e.g., Weekdays 9-5, Evenings only"
                />
              </div>

              <div className="space-y-3">
                <Label>Marketing Permissions</Label>
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
                      id="allow_fax"
                      checked={formData.allow_fax}
                      onCheckedChange={(checked) => handleInputChange("allow_fax", checked)}
                    />
                    <Label htmlFor="allow_fax">Allow Fax</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allow_mail"
                      checked={formData.allow_mail}
                      onCheckedChange={(checked) => handleInputChange("allow_mail", checked)}
                    />
                    <Label htmlFor="allow_mail">Allow Mail</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allow_bulk_email"
                      checked={formData.allow_bulk_email}
                      onCheckedChange={(checked) => handleInputChange("allow_bulk_email", checked)}
                    />
                    <Label htmlFor="allow_bulk_email">Allow Bulk Email</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Marketing */}
          <Card>
            <CardHeader>
              <CardTitle>Marketing</CardTitle>
              <CardDescription>Marketing activities and campaign information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Marketing Status</Label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="marketing_materials_sent"
                      checked={formData.marketing_materials_sent}
                      onCheckedChange={(checked) => handleInputChange("marketing_materials_sent", checked)}
                    />
                    <Label htmlFor="marketing_materials_sent">Marketing Materials Sent</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="added_to_marketing_list"
                      checked={formData.added_to_marketing_list}
                      onCheckedChange={(checked) => handleInputChange("added_to_marketing_list", checked)}
                    />
                    <Label htmlFor="added_to_marketing_list">Added to Marketing List</Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="campaign_name">Campaign Name</Label>
                  <Input
                    id="campaign_name"
                    value={formData.campaign_name}
                    onChange={(e) => handleInputChange("campaign_name", e.target.value)}
                    placeholder="Campaign name"
                  />
                </div>
                <div>
                  <Label htmlFor="last_campaign_date">Last Campaign Date</Label>
                  <Input
                    id="last_campaign_date"
                    type="date"
                    value={formData.last_campaign_date}
                    onChange={(e) => handleInputChange("last_campaign_date", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Management */}
          <Card>
            <CardHeader>
              <CardTitle>Notes Management</CardTitle>
              <CardDescription>View and manage notes for this lead</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Notes History */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-medium">Notes History ({notesArray.length})</Label>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowNewNoteField(!showNewNoteField)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Note
                  </Button>
                </div>
                
                {/* Add New Note Field */}
                {showNewNoteField && (
                  <div className="mb-4 p-4 border rounded bg-blue-50">
                    <Label htmlFor="new-note" className="text-sm font-medium">New Note</Label>
                    <Textarea
                      id="new-note"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Enter your new note here..."
                      className="mt-2 min-h-[80px]"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button 
                        type="button"
                        onClick={handleAddNewNote} 
                        disabled={!newNote.trim()}
                        size="sm"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Validate
                      </Button>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setShowNewNoteField(false);
                          setNewNote("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notes List */}
                {notesArray.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {notesArray.map((noteItem, index) => (
                      <div key={index} className="border rounded p-3 bg-gray-50">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div className="text-xs text-gray-500">
                            {new Date(noteItem.datetime).toLocaleDateString()} at {new Date(noteItem.datetime).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              type="button"
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditNote(index)}
                              className="text-blue-600 hover:text-blue-800 h-6 w-6 p-0"
                            >
                              ✏️
                            </Button>
                            <Button 
                              type="button"
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteNote(index)}
                              className="text-red-600 hover:text-red-800 h-6 w-6 p-0"
                            >
                              🗑️
                            </Button>
                          </div>
                        </div>
                        
                        {editingNoteIndex === index ? (
                          <div className="space-y-2">
                            <Textarea
                              id={`edit-note-${index}`}
                              value={editingNoteText}
                              onChange={(e) => setEditingNoteText(e.target.value)}
                              className="min-h-[60px]"
                            />
                            <div className="flex gap-2">
                              <Button 
                                type="button"
                                onClick={() => handleSaveEditNote(index)} 
                                disabled={!editingNoteText.trim()}
                                size="sm"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm"
                                onClick={handleCancelEditNote}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-800">{noteItem.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 border rounded">
                    No notes added yet. Click "Add Note" to create the first note.
                  </div>
                )}
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
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Lead
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
