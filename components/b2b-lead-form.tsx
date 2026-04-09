"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building2, User, MapPin, Phone, Mail, Globe, Linkedin } from "lucide-react";

interface B2BLeadFormProps {
  lead?: any;
  onSubmit: (lead: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function B2BLeadForm({ lead, onSubmit, onCancel, isLoading = false }: B2BLeadFormProps) {
  const [formData, setFormData] = useState({
    // Business Information
    business_name: lead?.business_name || "",
    business_address_1: lead?.business_address_1 || "",
    business_address_2: lead?.business_address_2 || "",
    business_address_3: lead?.business_address_3 || "",
    business_city: lead?.business_city || "",
    business_county: lead?.business_county || "",
    business_post_code: lead?.business_post_code || "",
    business_telephone: lead?.business_telephone || "",
    company_email: lead?.company_email || "",
    website: lead?.website || "",
    linkedin_company_url: lead?.linkedin_company_url || "",
    
    // Industry Classification
    industry: lead?.industry || "",
    major_sector_desc: lead?.major_sector_desc || "",
    sic_07_code: lead?.sic_07_code || "",
    sic_07_description: lead?.sic_07_description || "",
    
    // Company Metrics
    company_size: lead?.company_size || "",
    annual_revenue: lead?.annual_revenue || "",
    employees_band_desc: lead?.employees_band_desc || "",
    national_employees_band_desc: lead?.national_employees_band_desc || "",
    modeled_turnover_band_desc: lead?.modeled_turnover_band_desc || "",
    
    // Contact Person
    contact_title: lead?.contact_title || "",
    contact_first_name: lead?.contact_first_name || "",
    contact_last_name: lead?.contact_last_name || "",
    contact_position: lead?.contact_position || "",
    contact_email: lead?.contact_email || "",
    
    // Compliance
    tps_checked: lead?.tps_checked || false,
    ctps_checked: lead?.ctps_checked || false,
    
    // Additional B2B Fields
    contact_urn: lead?.contact_urn || "",
    lead_type: lead?.lead_type || "B2B",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const industryOptions = [
    "Technology", "Healthcare", "Finance", "Manufacturing", "Retail",
    "Education", "Construction", "Professional Services", "Real Estate",
    "Transportation", "Energy", "Government", "Non-Profit", "Other"
  ];

  const companySizeOptions = [
    { value: "startup", label: "Startup (1-10 employees)" },
    { value: "small", label: "Small (11-50 employees)" },
    { value: "medium", label: "Medium (51-200 employees)" },
    { value: "large", label: "Large (201-1000 employees)" },
    { value: "enterprise", label: "Enterprise (1000+ employees)" }
  ];

  const employeeBandOptions = [
    "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"
  ];

  const turnoverBandOptions = [
    "Under £100k", "£100k - £500k", "£500k - £1M", "£1M - £5M", "Over £5M"
  ];

  const titleOptions = [
    "Mr", "Mrs", "Ms", "Miss", "Dr", "Prof", "Sir", "Dame"
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.business_name.trim()) {
      newErrors.business_name = "Business name is required";
    }

    if (formData.company_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.company_email)) {
      newErrors.company_email = "Invalid email format";
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = "Invalid email format";
    }

    if (formData.business_post_code && !/^[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][A-Z]{2}$/i.test(formData.business_post_code)) {
      newErrors.business_post_code = "Invalid UK postcode format";
    }

    if (formData.sic_07_code && !/^\d{5}$/.test(formData.sic_07_code)) {
      newErrors.sic_07_code = "SIC code must be 5 digits";
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = "Website must start with http:// or https://";
    }

    if (formData.linkedin_company_url && !/^https?:\/\/.+linkedin\.com\/company\/.+/.test(formData.linkedin_company_url)) {
      newErrors.linkedin_company_url = "Invalid LinkedIn company URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {lead ? "Edit B2B Lead" : "Create New B2B Lead"}
          </h2>
          <p className="text-gray-600 mt-1">
            {lead ? "Update business lead information" : "Add a new business lead to your CRM"}
          </p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Building2 className="w-4 h-4 mr-1" />
          B2B Lead
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name *</Label>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => handleInputChange("business_name", e.target.value)}
                  placeholder="Enter business name"
                  className={errors.business_name ? "border-red-500" : ""}
                />
                {errors.business_name && (
                  <p className="text-sm text-red-500">{errors.business_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_email">Company Email</Label>
                <Input
                  id="company_email"
                  type="email"
                  value={formData.company_email}
                  onChange={(e) => handleInputChange("company_email", e.target.value)}
                  placeholder="company@example.com"
                  className={errors.company_email ? "border-red-500" : ""}
                />
                {errors.company_email && (
                  <p className="text-sm text-red-500">{errors.company_email}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_address_1">Business Address</Label>
              <Input
                id="business_address_1"
                value={formData.business_address_1}
                onChange={(e) => handleInputChange("business_address_1", e.target.value)}
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_city">City</Label>
                <Input
                  id="business_city"
                  value={formData.business_city}
                  onChange={(e) => handleInputChange("business_city", e.target.value)}
                  placeholder="City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_county">County</Label>
                <Input
                  id="business_county"
                  value={formData.business_county}
                  onChange={(e) => handleInputChange("business_county", e.target.value)}
                  placeholder="County"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_post_code">Post Code</Label>
                <Input
                  id="business_post_code"
                  value={formData.business_post_code}
                  onChange={(e) => handleInputChange("business_post_code", e.target.value)}
                  placeholder="SW1A 1AA"
                  className={errors.business_post_code ? "border-red-500" : ""}
                />
                {errors.business_post_code && (
                  <p className="text-sm text-red-500">{errors.business_post_code}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_telephone">Business Telephone</Label>
                <Input
                  id="business_telephone"
                  value={formData.business_telephone}
                  onChange={(e) => handleInputChange("business_telephone", e.target.value)}
                  placeholder="+44 20 7946 0958"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder="https://www.example.com"
                  className={errors.website ? "border-red-500" : ""}
                />
                {errors.website && (
                  <p className="text-sm text-red-500">{errors.website}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin_company_url">LinkedIn Company URL</Label>
              <Input
                id="linkedin_company_url"
                value={formData.linkedin_company_url}
                onChange={(e) => handleInputChange("linkedin_company_url", e.target.value)}
                placeholder="https://www.linkedin.com/company/example"
                className={errors.linkedin_company_url ? "border-red-500" : ""}
              />
              {errors.linkedin_company_url && (
                <p className="text-sm text-red-500">{errors.linkedin_company_url}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Industry & Classification Section */}
        <Card>
          <CardHeader>
            <CardTitle>Industry & Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => handleInputChange("industry", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industryOptions.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_size">Company Size</Label>
                <Select
                  value={formData.company_size}
                  onValueChange={(value) => handleInputChange("company_size", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    {companySizeOptions.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sic_07_code">SIC Code</Label>
                <Input
                  id="sic_07_code"
                  value={formData.sic_07_code}
                  onChange={(e) => handleInputChange("sic_07_code", e.target.value)}
                  placeholder="12345"
                  maxLength={5}
                  className={errors.sic_07_code ? "border-red-500" : ""}
                />
                {errors.sic_07_code && (
                  <p className="text-sm text-red-500">{errors.sic_07_code}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="annual_revenue">Annual Revenue (£)</Label>
                <Input
                  id="annual_revenue"
                  type="number"
                  value={formData.annual_revenue}
                  onChange={(e) => handleInputChange("annual_revenue", e.target.value)}
                  placeholder="1000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="major_sector_desc">Major Sector Description</Label>
              <Input
                id="major_sector_desc"
                value={formData.major_sector_desc}
                onChange={(e) => handleInputChange("major_sector_desc", e.target.value)}
                placeholder="e.g., Financial Services, Technology, Healthcare"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Person Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Contact Person
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_title">Title</Label>
                <Select
                  value={formData.contact_title}
                  onValueChange={(value) => handleInputChange("contact_title", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select title" />
                  </SelectTrigger>
                  <SelectContent>
                    {titleOptions.map((title) => (
                      <SelectItem key={title} value={title}>
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_first_name">First Name</Label>
                <Input
                  id="contact_first_name"
                  value={formData.contact_first_name}
                  onChange={(e) => handleInputChange("contact_first_name", e.target.value)}
                  placeholder="John"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_last_name">Last Name</Label>
                <Input
                  id="contact_last_name"
                  value={formData.contact_last_name}
                  onChange={(e) => handleInputChange("contact_last_name", e.target.value)}
                  placeholder="Smith"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_position">Position</Label>
                <Input
                  id="contact_position"
                  value={formData.contact_position}
                  onChange={(e) => handleInputChange("contact_position", e.target.value)}
                  placeholder="CEO, Manager, Director"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleInputChange("contact_email", e.target.value)}
                  placeholder="john.smith@example.com"
                  className={errors.contact_email ? "border-red-500" : ""}
                />
                {errors.contact_email && (
                  <p className="text-sm text-red-500">{errors.contact_email}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Section */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance & Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="tps_checked"
                  checked={formData.tps_checked}
                  onChange={(e) => handleInputChange("tps_checked", e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="tps_checked">TPS Checked</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="ctps_checked"
                  checked={formData.ctps_checked}
                  onChange={(e) => handleInputChange("ctps_checked", e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="ctps_checked">CTPS Checked</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            {isLoading ? "Saving..." : lead ? "Update Lead" : "Create Lead"}
          </Button>
        </div>
      </form>
    </div>
  );
}

