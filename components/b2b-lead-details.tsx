"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Linkedin, 
  Edit, 
  CheckCircle, 
  XCircle,
  Calendar,
  TrendingUp,
  Users,
  DollarSign
} from "lucide-react";
import { B2BLeadForm } from "./b2b-lead-form";

interface B2BLeadDetailsProps {
  lead: any;
  onUpdate: (lead: any) => void;
  onClose: () => void;
}

export function B2BLeadDetails({ lead, onUpdate, onClose }: B2BLeadDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getCompanySizeColor = (size: string) => {
    const colors = {
      startup: "bg-green-100 text-green-800",
      small: "bg-blue-100 text-blue-800",
      medium: "bg-yellow-100 text-yellow-800",
      large: "bg-orange-100 text-orange-800",
      enterprise: "bg-red-100 text-red-800"
    };
    return colors[size as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getIndustryColor = (industry: string) => {
    const colors = {
      Technology: "bg-blue-100 text-blue-800",
      Healthcare: "bg-green-100 text-green-800",
      Finance: "bg-purple-100 text-purple-800",
      Manufacturing: "bg-orange-100 text-orange-800",
      Retail: "bg-pink-100 text-pink-800",
      Education: "bg-indigo-100 text-indigo-800",
      Construction: "bg-yellow-100 text-yellow-800",
      "Professional Services": "bg-gray-100 text-gray-800"
    };
    return colors[industry as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (isEditing) {
    return (
      <B2BLeadForm
        lead={lead}
        onSubmit={(updatedLead) => {
          onUpdate(updatedLead);
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{lead.business_name}</h2>
          <p className="text-gray-600 mt-1">
            {lead.contact_first_name} {lead.contact_last_name}
            {lead.contact_position && ` • ${lead.contact_position}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Building2 className="w-4 h-4 mr-1" />
            B2B Lead
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Business Name</label>
                  <p className="text-sm text-gray-900">{lead.business_name || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Company Email</label>
                  <p className="text-sm text-gray-900 flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {lead.company_email || "Not provided"}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Business Address</label>
                <p className="text-sm text-gray-900 flex items-start gap-1">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    {[
                      lead.business_address_1,
                      lead.business_address_2,
                      lead.business_city,
                      lead.business_county,
                      lead.business_post_code
                    ].filter(Boolean).join(", ") || "Not provided"}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Business Telephone</label>
                  <p className="text-sm text-gray-900 flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {lead.business_telephone || "Not provided"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Website</label>
                  <p className="text-sm text-gray-900 flex items-center gap-1">
                    <Globe className="w-4 h-4" />
                    {lead.website ? (
                      <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {lead.website}
                      </a>
                    ) : "Not provided"}
                  </p>
                </div>
              </div>

              {lead.linkedin_company_url && (
                <div>
                  <label className="text-sm font-medium text-gray-500">LinkedIn Company</label>
                  <p className="text-sm text-gray-900 flex items-center gap-1">
                    <Linkedin className="w-4 h-4" />
                    <a href={lead.linkedin_company_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      View Company Profile
                    </a>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Person */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Contact Person
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-sm text-gray-900">
                    {lead.contact_title && `${lead.contact_title} `}
                    {lead.contact_first_name} {lead.contact_last_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Position</label>
                  <p className="text-sm text-gray-900">{lead.contact_position || "Not provided"}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Contact Email</label>
                <p className="text-sm text-gray-900 flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {lead.contact_email || "Not provided"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Industry & Classification */}
          <Card>
            <CardHeader>
              <CardTitle>Industry & Classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.industry && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Industry</label>
                  <div className="mt-1">
                    <Badge className={getIndustryColor(lead.industry)}>
                      {lead.industry}
                    </Badge>
                  </div>
                </div>
              )}

              {lead.company_size && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Company Size</label>
                  <div className="mt-1">
                    <Badge className={getCompanySizeColor(lead.company_size)}>
                      {lead.company_size.charAt(0).toUpperCase() + lead.company_size.slice(1)}
                    </Badge>
                  </div>
                </div>
              )}

              {lead.sic_07_code && (
                <div>
                  <label className="text-sm font-medium text-gray-500">SIC Code</label>
                  <p className="text-sm text-gray-900">{lead.sic_07_code}</p>
                </div>
              )}

              {lead.major_sector_desc && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Major Sector</label>
                  <p className="text-sm text-gray-900">{lead.major_sector_desc}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Company Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Company Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.annual_revenue && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Annual Revenue</label>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(lead.annual_revenue)}
                    </p>
                  </div>
                </div>
              )}

              {lead.employees_band_desc && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Employee Band</label>
                    <p className="text-sm font-semibold text-gray-900">{lead.employees_band_desc}</p>
                  </div>
                </div>
              )}

              {lead.modeled_turnover_band_desc && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Turnover Band</label>
                    <p className="text-sm font-semibold text-gray-900">{lead.modeled_turnover_band_desc}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">TPS Checked</span>
                {lead.tps_checked ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">CTPS Checked</span>
                {lead.ctps_checked ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lead Information */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Lead Type</label>
                <p className="text-sm text-gray-900">{lead.lead_type || "B2B"}</p>
              </div>
              {lead.created_on && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-sm text-gray-900 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(lead.created_on)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-6 border-t">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
          <Edit className="w-4 h-4 mr-1" />
          Edit Lead
        </Button>
      </div>
    </div>
  );
}

