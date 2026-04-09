"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import type { Lead } from "@/lib/supabase";
import { formatPhoneNumber } from "@/lib/phone-utils";
import { useAuth, useIsAdvisor } from "@/contexts/auth-context";
import { Upload, Scan, Loader2 } from "lucide-react";

interface CreateLeadCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface LeadFormData {
  // Business Information
  business_name: string;
  company_email: string;
  business_telephone: string;
  website: string;
  linkedin_company_url: string;
  industry: string;
  company_size: string;
  annual_revenue: string;
  sic_07_code: string;
  sic_07_description: string;
  major_sector_desc: string;
  contact_urn: string;
  
  // Business Address
  business_address_1: string;
  business_address_2: string;
  business_locality: string;
  business_town: string;
  business_county: string;
  business_post_code: string;
  
  // Contact Person
  contact_title: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_position: string;
  contact_email: string;
  mobile_phone: string;
  other_phone: string;
  
  // Employee & Turnover Bands
  employees_band_desc: string;
  national_employees_band_desc: string;
  modeled_turnover_band_desc: string;
  
  // Compliance
  tps_checked: boolean;
  ctps_checked: boolean;
  verified_phone: boolean;
  verified_email: boolean;
  
  // Personal Information
  salutation: string;
  date_of_birth: string;
  
  // Goals & Budget
  goals: string;
  budget: string;
  budget_frequency: string;
  goal_term: string;
  goal_year: string;
  household_income: string;
  
  // Communication Preferences
  preferred_contact_method: string;
  allow_email: boolean;
  allow_phone: boolean;
  allow_fax: boolean;
  allow_mail: boolean;
  allow_bulk_email: boolean;
  
  // Marketing
  marketing_materials_sent: boolean;
  added_to_marketing_list: boolean;
  campaign_name: string;
  last_campaign_date: string;
  
  // System Fields
  current_status: string;
  lead_source: string;
  type_of_lead: string;
  customer_type: string;
  engaged: boolean;
  owner: string;
  notes: string;
}

const initialFormData: LeadFormData = {
  // Business Information
  business_name: "",
  company_email: "",
  business_telephone: "",
  website: "",
  linkedin_company_url: "",
  industry: "",
  company_size: "",
  annual_revenue: "",
  sic_07_code: "",
  sic_07_description: "",
  major_sector_desc: "",
  contact_urn: "",
  
  // Business Address
  business_address_1: "",
  business_address_2: "",
  business_locality: "",
  business_town: "",
  business_county: "",
  business_post_code: "",
  
  // Contact Person
  contact_title: "",
  contact_first_name: "",
  contact_last_name: "",
  contact_position: "",
  contact_email: "",
  mobile_phone: "",
  other_phone: "",
  
  // Employee & Turnover Bands
  employees_band_desc: "",
  national_employees_band_desc: "",
  modeled_turnover_band_desc: "",
  
  // Compliance
  tps_checked: false,
  ctps_checked: false,
  verified_phone: false,
  verified_email: false,
  
  // Personal Information
  salutation: "",
  date_of_birth: "",
  
  // Goals & Budget
  goals: "",
  budget: "",
  budget_frequency: "",
  goal_term: "",
  goal_year: "",
  household_income: "",
  
  // Communication Preferences
  preferred_contact_method: "",
  allow_email: true,
  allow_phone: true,
  allow_fax: false,
  allow_mail: true,
  allow_bulk_email: false,
  
  // Marketing
  marketing_materials_sent: false,
  added_to_marketing_list: false,
  campaign_name: "",
  last_campaign_date: "",
  
  // System Fields
  current_status: "New",
  lead_source: "",
  type_of_lead: "B2B",
  customer_type: "",
  engaged: false,
  owner: "",
  notes: "",
};

export function CreateLeadCard({ open, onOpenChange, onSuccess }: CreateLeadCardProps) {
  const { user } = useAuth();
  const isAdvisor = useIsAdvisor();
  const [formData, setFormData] = useState<LeadFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("business");
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contactFileInputRef = useRef<HTMLInputElement>(null);

  const tabs = ["business", "contact", "goals", "compliance"];
  const currentTabIndex = tabs.indexOf(activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === tabs.length - 1;

  const handleInputChange = (field: keyof LeadFormData, value: string | boolean) => {
    setFormData(prev => {
      const newData = {
      ...prev,
      [field]: value
      };

      // Auto-update SIC description when SIC code changes
      if (field === 'sic_07_code') {
        const sicCodeToDescription: { [key: string]: string } = {
          '78100': 'Activities of employment placement agencies',
          '55100': 'Hotels and similar accommodation',
          '56101': 'Licenced restaurants',
          '93290': 'Other amusement and recreation activities n.e.c.',
          '92000': 'Gambling and betting activities',
          '86102': 'Medical nursing home activities',
          '62020': 'Information technology consultancy activities',
          '47410': 'Retail sale of computers; peripheral units and software in specialised stores',
          '82200': 'Activities of call centres',
          '61900': 'Other telecommunications activities',
          '61300': 'Satellite telecommunications activities',
          '78300': 'Human resources provision and management of human resources functions'
        };
        
        newData.sic_07_description = sicCodeToDescription[value as string] || '';
      }

      return newData;
    });
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data:image/...;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  };

  const scanDocument = async (file: File) => {
    setIsScanning(true);
    setScanError(null);
    
    try {
      const base64Data = await convertFileToBase64(file);
      const scanType = activeTab === "business" ? "business" : "contact";
      
      const response = await fetch('https://hook.eu2.make.com/i32iowy1bs88ggf8f1n35454hbrr9ago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attribute: scanType,
          data: base64Data,
          type: scanType
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('[CreateLead] Scan result:', result);
      
      // Auto-fill form based on scan type and result
      if (scanType === "business") {
        setFormData(prev => ({
          ...prev,
          business_name: result.business_name || prev.business_name,
          company_email: result.company_email || prev.company_email,
          business_telephone: result.business_telephone || prev.business_telephone,
          website: result.website || prev.website,
          linkedin_company_url: result.linkedin_company_url || prev.linkedin_company_url,
          industry: result.industry || prev.industry,
          company_size: result.company_size || prev.company_size,
          annual_revenue: result.annual_revenue || prev.annual_revenue,
          employees_band_desc: result.employee_band || prev.employees_band_desc,
          modeled_turnover_band_desc: result.turnover_band || prev.modeled_turnover_band_desc,
          sic_07_code: result.sic_code || prev.sic_07_code,
          sic_07_description: result.sic_description || prev.sic_07_description,
          lead_source: result.lead_source || prev.lead_source,
          major_sector_desc: result.major_sector || prev.major_sector_desc,
        }));
      } else if (scanType === "contact") {
        setFormData(prev => ({
          ...prev,
          contact_title: result.contact_title || prev.contact_title,
          contact_first_name: result.contact_first_name || prev.contact_first_name,
          contact_last_name: result.contact_last_name || prev.contact_last_name,
          contact_position: result.contact_position || prev.contact_position,
          contact_email: result.contact_email || prev.contact_email,
        }));
      }
      
    } catch (error) {
      console.error('[CreateLead] Scan error:', error);
      setScanError('Failed to scan document. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if it's an image file
      if (!file.type.startsWith('image/')) {
        setScanError('Please select an image file (PNG, JPG, etc.)');
        return;
      }
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setScanError('File size must be less than 10MB');
        return;
      }
      
      scanDocument(file);
    }
  };

  const handleScanClick = () => {
    if (activeTab === "contact") {
      contactFileInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleNext = () => {
    if (!isLastTab) {
      const nextTab = tabs[currentTabIndex + 1];
      console.log(`[CreateLead] Moving from ${activeTab} to ${nextTab}`);
      setActiveTab(nextTab);
    }
  };

  const handlePrevious = () => {
    if (!isFirstTab) {
      const prevTab = tabs[currentTabIndex - 1];
      console.log(`[CreateLead] Moving from ${activeTab} to ${prevTab}`);
      setActiveTab(prevTab);
    }
  };

  const handleSubmit = async () => {
    console.log('[CreateLead] Starting lead creation process');
    console.log('[CreateLead] Form data:', formData);
    setIsSubmitting(true);
    try {
      // Convert form data to Lead format - B2B schema
      const leadData = {
        // Business Information
        business_name: formData.business_name || null,
        company_email: formData.company_email || null,
        business_telephone: formData.business_telephone ? formatPhoneNumber(formData.business_telephone) : null,
        website: formData.website || null,
        linkedin_company_url: formData.linkedin_company_url || null,
        industry: formData.industry || null,
        company_size: formData.company_size || null,
        annual_revenue: formData.annual_revenue ? parseFloat(formData.annual_revenue.toString()) : null,
        sic_07_code: formData.sic_07_code || null,
        sic_07_description: formData.sic_07_description || null,
        major_sector_desc: formData.major_sector_desc || null,
        contact_urn: formData.contact_urn || null,
        
        // Business Address
        business_address_1: formData.business_address_1 || null,
        business_address_2: formData.business_address_2 || null,
        business_locality: formData.business_locality || null,
        business_town: formData.business_town || null,
        business_county: formData.business_county || null,
        business_post_code: formData.business_post_code || null,
        
        // Contact Person
        contact_title: formData.contact_title || null,
        contact_first_name: formData.contact_first_name || null,
        contact_last_name: formData.contact_last_name || null,
        contact_position: formData.contact_position || null,
        contact_email: formData.contact_email || null,
        mobile_phone: formData.mobile_phone ? formatPhoneNumber(formData.mobile_phone) : null,
        other_phone: formData.other_phone ? formatPhoneNumber(formData.other_phone) : null,
        
        // Employee & Turnover Bands
        employees_band_desc: formData.employees_band_desc || null,
        national_employees_band_desc: formData.national_employees_band_desc || null,
        modeled_turnover_band_desc: formData.modeled_turnover_band_desc || null,
        
        // Compliance
        tps_checked: formData.tps_checked || false,
        ctps_checked: formData.ctps_checked || false,
        verified_phone: formData.verified_phone || false,
        verified_email: formData.verified_email || false,
        
        // Personal Information
        salutation: formData.salutation || null,
        date_of_birth: formData.date_of_birth || null,
        
        // Goals & Budget
        goals: formData.goals || null,
        budget: formData.budget ? parseFloat(formData.budget.toString()) : null,
        budget_frequency: formData.budget_frequency || null,
        goal_term: formData.goal_term || null,
        goal_year: formData.goal_year ? parseInt(formData.goal_year.toString()) : null,
        household_income: formData.household_income ? parseFloat(formData.household_income.toString()) : null,
        
        // Communication Preferences
        preferred_contact_method: formData.preferred_contact_method || null,
        allow_email: formData.allow_email || false,
        allow_phone: formData.allow_phone || false,
        allow_fax: formData.allow_fax || false,
        allow_mail: formData.allow_mail || false,
        allow_bulk_email: formData.allow_bulk_email || false,
        
        // Marketing
        marketing_materials_sent: formData.marketing_materials_sent || false,
        added_to_marketing_list: formData.added_to_marketing_list || false,
        campaign_name: formData.campaign_name || null,
        last_campaign_date: formData.last_campaign_date || null,
        
        // System Fields
        current_status: formData.current_status || "New",
        lead_source: formData.lead_source || null,
        type_of_lead: formData.type_of_lead || "B2B",
        customer_type: formData.customer_type || null,
        engaged: formData.engaged || false,
        owner: formData.owner || null,
        notes: formData.notes || null,
        created_on: new Date().toISOString(),
      };

      console.log('[CreateLead] Prepared lead data for insertion:', leadData);
      console.log('[CreateLead] About to call supabase.from("leads").insert()');
      
      try {
        const { data, error } = await supabase
          .from('leads')
          .insert([leadData])
          .select();

        console.log('[CreateLead] Database response received');
        console.log('[CreateLead] Response data:', data);
        console.log('[CreateLead] Response error:', error);

        if (error) {
          console.error('[CreateLead] Database insertion error:', error);
          throw error;
        }

        console.log('[CreateLead] Lead created successfully:', data);

        // Auto-assign lead to current advisor if user is an advisor
        if (isAdvisor && user?.id && data && data.length > 0) {
          try {
            console.log('[CreateLead] Auto-assigning lead to current advisor:', user.id);
            
            // First, get the user record from the users table using the auth id
            const { data: userRecord, error: userError } = await supabase
              .from("users")
              .select("id")
              .eq("user_id", user.id)
              .single();

            if (userError) {
              console.error('[CreateLead] Error fetching user record:', userError);
            } else if (userRecord) {
              // Assign the lead to the current advisor
              const { error: assignmentError } = await supabase
                .from("users_leads")
                .insert([{
                  user_id: userRecord.id,
                  lead_id: data[0].id
                }]);

              if (assignmentError) {
                console.error('[CreateLead] Error assigning lead to advisor:', assignmentError);
              } else {
                console.log('[CreateLead] Lead successfully assigned to advisor');
              }
            }
          } catch (assignmentError) {
            console.error('[CreateLead] Error in auto-assignment process:', assignmentError);
            // Don't throw here - lead creation was successful, assignment is secondary
          }
        }
      } catch (dbError) {
        console.error('[CreateLead] Database operation failed:', dbError);
        throw dbError;
      }
      
      // Reset form and close dialog
      setFormData(initialFormData);
      setActiveTab("business");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('[CreateLead] Error creating lead:', error);
      // You might want to show an error toast here
    } finally {
      console.log('[CreateLead] Lead creation process completed');
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.business_name && formData.contact_first_name && formData.contact_last_name && (formData.contact_email || formData.company_email);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Lead</DialogTitle>
          <DialogDescription>
            Fill in the lead information across the different sections below.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="business">Business Info</TabsTrigger>
            <TabsTrigger value="contact">Contact Person</TabsTrigger>
            <TabsTrigger value="goals">Goals & Budget</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="business" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Business Information</CardTitle>
                    <CardDescription>Company details and business information</CardDescription>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleScanClick}
                      disabled={isScanning}
                      className="flex items-center gap-2"
                    >
                      {isScanning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Scan className="h-4 w-4" />
                      )}
                      {isScanning ? "Scanning..." : "Scan Document"}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    {scanError && (
                      <p className="text-sm text-red-600">{scanError}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="business_name">Business Name *</Label>
                    <Input
                      id="business_name"
                      value={formData.business_name}
                      onChange={(e) => handleInputChange('business_name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="company_email">Company Email</Label>
                    <Input
                      id="company_email"
                      type="email"
                      value={formData.company_email}
                      onChange={(e) => handleInputChange('company_email', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="business_telephone">Business Telephone</Label>
                    <Input
                      id="business_telephone"
                      value={formData.business_telephone}
                      onChange={(e) => handleInputChange('business_telephone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="linkedin_company_url">LinkedIn Company URL</Label>
                    <Input
                      id="linkedin_company_url"
                      value={formData.linkedin_company_url}
                      onChange={(e) => handleInputChange('linkedin_company_url', e.target.value)}
                      placeholder="https://linkedin.com/company/example"
                    />
                  </div>
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Services">Services</SelectItem>
                        <SelectItem value="Retail">Retail</SelectItem>
                        <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="Technology">Technology</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company_size">Company Size</Label>
                    <Select value={formData.company_size} onValueChange={(value) => handleInputChange('company_size', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="startup">Startup (1-10 employees)</SelectItem>
                        <SelectItem value="small">Small (11-50 employees)</SelectItem>
                        <SelectItem value="medium">Medium (51-200 employees)</SelectItem>
                        <SelectItem value="large">Large (201-1000 employees)</SelectItem>
                        <SelectItem value="enterprise">Enterprise (1000+ employees)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="annual_revenue">Annual Revenue</Label>
                    <Input
                      id="annual_revenue"
                      type="number"
                      value={formData.annual_revenue}
                      onChange={(e) => handleInputChange('annual_revenue', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="employees_band_desc">Employee Band</Label>
                    <Select value={formData.employees_band_desc} onValueChange={(value) => handleInputChange('employees_band_desc', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee band..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A: 1 to 4 employees">A: 1 to 4 employees</SelectItem>
                        <SelectItem value="B: 5 to 9 employees">B: 5 to 9 employees</SelectItem>
                        <SelectItem value="C: 10 to 19 employees">C: 10 to 19 employees</SelectItem>
                        <SelectItem value="D: 20 to 49 employees">D: 20 to 49 employees</SelectItem>
                        <SelectItem value="E: 50 to 99 employees">E: 50 to 99 employees</SelectItem>
                        <SelectItem value="F: 100 to 199 employees">F: 100 to 199 employees</SelectItem>
                        <SelectItem value="G: 200 to 499 employees">G: 200 to 499 employees</SelectItem>
                        <SelectItem value="H: 500 to 999 employees">H: 500 to 999 employees</SelectItem>
                        <SelectItem value="I: More than 1000 employees">I: More than 1000 employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="modeled_turnover_band_desc">Turnover Band</Label>
                    <Select value={formData.modeled_turnover_band_desc} onValueChange={(value) => handleInputChange('modeled_turnover_band_desc', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select turnover band..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L: £5m to £7,499,999">L: £5m to £7,499,999</SelectItem>
                        <SelectItem value="M: £7.5m to £9,999,999">M: £7.5m to £9,999,999</SelectItem>
                        <SelectItem value="N: £10m to £24,999,999">N: £10m to £24,999,999</SelectItem>
                        <SelectItem value="O: £25m to £49,999,999">O: £25m to £49,999,999</SelectItem>
                        <SelectItem value="P: £50m to £74,999,999">P: £50m to £74,999,999</SelectItem>
                        <SelectItem value="Q: £75m to £99,999,999">Q: £75m to £99,999,999</SelectItem>
                        <SelectItem value="R: £100m to £249,999,999">R: £100m to £249,999,999</SelectItem>
                        <SelectItem value="S: £250m to £499,999,999">S: £250m to £499,999,999</SelectItem>
                        <SelectItem value="T: £500m to £749,999,999">T: £500m to £749,999,999</SelectItem>
                        <SelectItem value="U: £750m to £999,999,999">U: £750m to £999,999,999</SelectItem>
                        <SelectItem value="V: More than £1bn">V: More than £1bn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sic_07_code">SIC Code</Label>
                    <Select value={formData.sic_07_code} onValueChange={(value) => handleInputChange('sic_07_code', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select SIC code..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="78100">78100 - Activities of employment placement agencies (877)</SelectItem>
                        <SelectItem value="55100">55100 - Hotels and similar accommodation (776)</SelectItem>
                        <SelectItem value="56101">56101 - Licenced restaurants (261)</SelectItem>
                        <SelectItem value="93290">93290 - Other amusement and recreation activities n.e.c. (104)</SelectItem>
                        <SelectItem value="92000">92000 - Gambling and betting activities (103)</SelectItem>
                        <SelectItem value="86102">86102 - Medical nursing home activities (79)</SelectItem>
                        <SelectItem value="62020">62020 - Information technology consultancy activities (54)</SelectItem>
                        <SelectItem value="47410">47410 - Retail sale of computers; peripheral units and software in specialised stores (43)</SelectItem>
                        <SelectItem value="82200">82200 - Activities of call centres (14)</SelectItem>
                        <SelectItem value="61900">61900 - Other telecommunications activities (14)</SelectItem>
                        <SelectItem value="61300">61300 - Satellite telecommunications activities (12)</SelectItem>
                        <SelectItem value="78300">78300 - Human resources provision and management of human resources functions (11)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sic_07_description">SIC Description</Label>
                    <Input
                      id="sic_07_description"
                      value={formData.sic_07_description}
                      disabled
                      className="bg-gray-50 text-gray-600 cursor-not-allowed"
                      placeholder="Auto-filled based on SIC code"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lead_source">Lead Source</Label>
                    <Select value={formData.lead_source} onValueChange={(value) => handleInputChange('lead_source', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Website">Website</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="Social Media">Social Media</SelectItem>
                        <SelectItem value="Manual Entry">Manual Entry</SelectItem>
                        <SelectItem value="Cold Call">Cold Call</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="major_sector_desc">Major Sector</Label>
                    <Input
                      id="major_sector_desc"
                      value={formData.major_sector_desc}
                      onChange={(e) => handleInputChange('major_sector_desc', e.target.value)}
                      placeholder="e.g., Services, Retail"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Contact Person Information</CardTitle>
                    <CardDescription>Primary contact details for the business</CardDescription>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleScanClick}
                      disabled={isScanning}
                      className="flex items-center gap-2"
                    >
                      {isScanning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Scan className="h-4 w-4" />
                      )}
                      {isScanning ? "Scanning..." : "Scan Contact"}
                    </Button>
                    <input
                      ref={contactFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    {scanError && (
                      <p className="text-sm text-red-600">{scanError}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="contact_title">Title</Label>
                    <Select value={formData.contact_title} onValueChange={(value) => handleInputChange('contact_title', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select title..." />
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
                      onChange={(e) => handleInputChange('contact_first_name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_last_name">Last Name *</Label>
                    <Input
                      id="contact_last_name"
                      value={formData.contact_last_name}
                      onChange={(e) => handleInputChange('contact_last_name', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_position">Position</Label>
                    <Input
                      id="contact_position"
                      value={formData.contact_position}
                      onChange={(e) => handleInputChange('contact_position', e.target.value)}
                      placeholder="e.g., CEO, Manager, Director"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_email">Contact Email *</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => handleInputChange('contact_email', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mobile_phone">Mobile Phone</Label>
                    <Input
                      id="mobile_phone"
                      value={formData.mobile_phone}
                      onChange={(e) => handleInputChange('mobile_phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="other_phone">Other Phone</Label>
                    <Input
                      id="other_phone"
                      value={formData.other_phone}
                      onChange={(e) => handleInputChange('other_phone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="salutation">Salutation</Label>
                    <Input
                      id="salutation"
                      value={formData.salutation}
                      onChange={(e) => handleInputChange('salutation', e.target.value)}
                      placeholder="e.g., Dear John"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Goals & Budget</CardTitle>
                <CardDescription>Business objectives and financial information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="goals">Business Goals</Label>
                  <Textarea
                    id="goals"
                    value={formData.goals}
                    onChange={(e) => handleInputChange('goals', e.target.value)}
                    placeholder="Describe the business goals and objectives..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budget">Budget</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={formData.budget}
                      onChange={(e) => handleInputChange('budget', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="budget_frequency">Budget Frequency</Label>
                    <Select value={formData.budget_frequency} onValueChange={(value) => handleInputChange('budget_frequency', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Annually">Annually</SelectItem>
                        <SelectItem value="One-time">One-time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="goal_term">Goal Term</Label>
                    <Select value={formData.goal_term} onValueChange={(value) => handleInputChange('goal_term', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select term..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Short-term">Short-term (1-2 years)</SelectItem>
                        <SelectItem value="Medium-term">Medium-term (3-5 years)</SelectItem>
                        <SelectItem value="Long-term">Long-term (5+ years)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="goal_year">Goal Year</Label>
                    <Input
                      id="goal_year"
                      type="number"
                      value={formData.goal_year}
                      onChange={(e) => handleInputChange('goal_year', e.target.value)}
                      placeholder="2024"
                      min="2024"
                      max="2050"
                    />
                  </div>
                </div>

                  <div>
                    <Label htmlFor="household_income">Household Income</Label>
                    <Input
                      id="household_income"
                      type="number"
                      value={formData.household_income}
                      onChange={(e) => handleInputChange('household_income', e.target.value)}
                      placeholder="0.00"
                    />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Compliance & Communication Preferences</CardTitle>
                <CardDescription>Verification status and communication permissions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div>
                  <Label>Verification Status</Label>
                  <div className="flex flex-col space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="verified_phone"
                        checked={formData.verified_phone}
                        onCheckedChange={(checked) => handleInputChange('verified_phone', !!checked)}
                      />
                      <Label htmlFor="verified_phone">Phone Verified</Label>
                  </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="verified_email"
                        checked={formData.verified_email}
                        onCheckedChange={(checked) => handleInputChange('verified_email', !!checked)}
                      />
                      <Label htmlFor="verified_email">Email Verified</Label>
                  </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tps_checked"
                        checked={formData.tps_checked}
                        onCheckedChange={(checked) => handleInputChange('tps_checked', !!checked)}
                      />
                      <Label htmlFor="tps_checked">TPS Checked</Label>
                </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ctps_checked"
                        checked={formData.ctps_checked}
                        onCheckedChange={(checked) => handleInputChange('ctps_checked', !!checked)}
                      />
                      <Label htmlFor="ctps_checked">CTPS Checked</Label>
                  </div>
                  </div>
                </div>

                <div>
                  <Label>Communication Permissions</Label>
                  <div className="flex flex-col space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allow_email"
                        checked={formData.allow_email}
                        onCheckedChange={(checked) => handleInputChange('allow_email', !!checked)}
                      />
                      <Label htmlFor="allow_email">Allow Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allow_phone"
                        checked={formData.allow_phone}
                        onCheckedChange={(checked) => handleInputChange('allow_phone', !!checked)}
                      />
                      <Label htmlFor="allow_phone">Allow Phone</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allow_mail"
                        checked={formData.allow_mail}
                        onCheckedChange={(checked) => handleInputChange('allow_mail', !!checked)}
                      />
                      <Label htmlFor="allow_mail">Allow Mail</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allow_fax"
                        checked={formData.allow_fax}
                        onCheckedChange={(checked) => handleInputChange('allow_fax', !!checked)}
                      />
                      <Label htmlFor="allow_fax">Allow Fax</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allow_bulk_email"
                        checked={formData.allow_bulk_email}
                        onCheckedChange={(checked) => handleInputChange('allow_bulk_email', !!checked)}
                      />
                      <Label htmlFor="allow_bulk_email">Allow Bulk Email</Label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="preferred_contact_method">Preferred Contact Method</Label>
                    <Select value={formData.preferred_contact_method} onValueChange={(value) => handleInputChange('preferred_contact_method', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Email">Email</SelectItem>
                        <SelectItem value="Phone">Phone</SelectItem>
                        <SelectItem value="Mail">Mail</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="campaign_name">Campaign Name</Label>
                    <Input
                      id="campaign_name"
                      value={formData.campaign_name}
                      onChange={(e) => handleInputChange('campaign_name', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Additional notes about the lead..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
          <div className="flex gap-2">
            {!isFirstTab && (
              <Button 
                variant="outline" 
                onClick={handlePrevious}
                disabled={isSubmitting}
              >
                Previous
              </Button>
            )}
            {!isLastTab ? (
              <Button 
                onClick={handleNext}
                disabled={isSubmitting}
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Lead"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
