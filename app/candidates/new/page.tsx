"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, useIsAdmin, useIsRecruiter } from "@/contexts/auth-context";
import { ArrowLeft, Save, User, Mail, Phone, MapPin, Briefcase, GraduationCap, Calendar, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface User {
  id: number;
  fullName: string;
  email: string;
  user_id: string;
}

export default function NewCandidatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isRecruiter = useIsRecruiter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    general_location: "",
    zip_code: "",
    headline: "",
    position: "",
    current_title: "",
    current_company: "",
    current_position_start_date: "",
    current_stage: "",
    recruiter: null as number | null,
    education_degree: "",
    education_institution: "",
    minimum_salary: null as number | null,
    maximum_salary: null as number | null,
    currency_code: "",
    compensation_period: "",
    profile_url: "",
    meeting_date: "",
    interviewer_email: "",
    meeting_link: "",
    screening_questions: "",
    date_applied: "",
  });

  // Check if user has access to create candidates
  const hasAccess = isAdmin || isRecruiter;

  // If user doesn't have access, show unauthorized message
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to create candidates.
          </p>
          <p className="text-sm text-gray-500">
            Only recruiters and managers can create candidates.
          </p>
        </div>
      </div>
    );
  }

  // Load users for recruiter dropdown
  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch("/api/users");
        const result = await response.json();
        
        if (response.ok) {
          setUsers(result.data || []);
        } else {
          console.error("Error loading users:", result.error);
          setUsers([]);
        }
      } catch (error) {
        console.error("Error loading users:", error);
        setUsers([]);
      }
    }

    loadUsers();
  }, []);

  const handleInputChange = (field: string, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    // Basic validation
    if (!formData.full_name || !formData.email) {
      toast({
        title: "Validation Error",
        description: "Full name and email are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/candidates", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Candidate created successfully",
        });
        router.push('/recruitment');
      } else {
        console.error("Error creating candidate:", result.error);
        toast({
          title: "Error",
          description: result.error || "Failed to create candidate",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating candidate:", error);
      toast({
        title: "Error",
        description: "Failed to create candidate",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/recruitment')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Create Candidate</h1>
            <p className="text-gray-600 mt-2">
              Add a new candidate to the recruitment system
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter email address"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone_number">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                    placeholder="Enter phone number"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="general_location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="general_location"
                    value={formData.general_location}
                    onChange={(e) => handleInputChange('general_location', e.target.value)}
                    placeholder="Enter location"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="zip_code">Zip Code</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  placeholder="Enter zip code"
                />
              </div>

              <div>
                <Label htmlFor="headline">Headline</Label>
                <Input
                  id="headline"
                  value={formData.headline}
                  onChange={(e) => handleInputChange('headline', e.target.value)}
                  placeholder="Professional headline"
                />
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Professional Information
              </CardTitle>
              <CardDescription>
                Current job and career details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="position">Position Applied For</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  placeholder="Position applied for"
                />
              </div>

              <div>
                <Label htmlFor="current_title">Current Title</Label>
                <Input
                  id="current_title"
                  value={formData.current_title}
                  onChange={(e) => handleInputChange('current_title', e.target.value)}
                  placeholder="Current job title"
                />
              </div>

              <div>
                <Label htmlFor="current_company">Current Company</Label>
                <Input
                  id="current_company"
                  value={formData.current_company}
                  onChange={(e) => handleInputChange('current_company', e.target.value)}
                  placeholder="Current company"
                />
              </div>

              <div>
                <Label htmlFor="current_position_start_date">Position Start Date</Label>
                <Input
                  id="current_position_start_date"
                  type="date"
                  value={formData.current_position_start_date}
                  onChange={(e) => handleInputChange('current_position_start_date', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="current_stage">Current Stage</Label>
                <Select 
                  value={formData.current_stage} 
                  onValueChange={(value) => handleInputChange('current_stage', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="screening">Screening</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="recruiter">Assigned Recruiter</Label>
                <Select 
                  value={formData.recruiter?.toString() || 'unassigned'} 
                  onValueChange={(value) => handleInputChange('recruiter', value === 'unassigned' ? null : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recruiter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Education
              </CardTitle>
              <CardDescription>
                Educational background and qualifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="education_degree">Degree</Label>
                <Input
                  id="education_degree"
                  value={formData.education_degree}
                  onChange={(e) => handleInputChange('education_degree', e.target.value)}
                  placeholder="Degree or qualification"
                />
              </div>

              <div>
                <Label htmlFor="education_institution">Institution</Label>
                <Input
                  id="education_institution"
                  value={formData.education_institution}
                  onChange={(e) => handleInputChange('education_institution', e.target.value)}
                  placeholder="Educational institution"
                />
              </div>
            </CardContent>
          </Card>

          {/* Compensation & Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Compensation & Additional Info
              </CardTitle>
              <CardDescription>
                Salary expectations and additional details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minimum_salary">Min Salary</Label>
                  <Input
                    id="minimum_salary"
                    type="number"
                    value={formData.minimum_salary || ''}
                    onChange={(e) => handleInputChange('minimum_salary', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Minimum salary"
                  />
                </div>
                <div>
                  <Label htmlFor="maximum_salary">Max Salary</Label>
                  <Input
                    id="maximum_salary"
                    type="number"
                    value={formData.maximum_salary || ''}
                    onChange={(e) => handleInputChange('maximum_salary', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Maximum salary"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="currency_code">Currency</Label>
                <Select 
                  value={formData.currency_code} 
                  onValueChange={(value) => handleInputChange('currency_code', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="compensation_period">Compensation Period</Label>
                <Select 
                  value={formData.compensation_period} 
                  onValueChange={(value) => handleInputChange('compensation_period', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="profile_url">Profile URL</Label>
                <Input
                  id="profile_url"
                  value={formData.profile_url}
                  onChange={(e) => handleInputChange('profile_url', e.target.value)}
                  placeholder="LinkedIn or other profile URL"
                />
              </div>

              <div>
                <Label htmlFor="meeting_date">Meeting Date</Label>
                <Input
                  id="meeting_date"
                  type="datetime-local"
                  value={formData.meeting_date}
                  onChange={(e) => handleInputChange('meeting_date', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="interviewer_email">Interviewer Email</Label>
                <Input
                  id="interviewer_email"
                  type="email"
                  value={formData.interviewer_email}
                  onChange={(e) => handleInputChange('interviewer_email', e.target.value)}
                  placeholder="Interviewer email address"
                />
              </div>

              <div>
                <Label htmlFor="meeting_link">Meeting Link</Label>
                <Input
                  id="meeting_link"
                  value={formData.meeting_link}
                  onChange={(e) => handleInputChange('meeting_link', e.target.value)}
                  placeholder="Meeting or interview link"
                />
              </div>

              <div>
                <Label htmlFor="screening_questions">Screening Questions</Label>
                <Textarea
                  id="screening_questions"
                  value={formData.screening_questions}
                  onChange={(e) => handleInputChange('screening_questions', e.target.value)}
                  placeholder="Screening questions and responses"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="date_applied">Date Applied</Label>
                <Input
                  id="date_applied"
                  type="date"
                  value={formData.date_applied}
                  onChange={(e) => handleInputChange('date_applied', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Candidate
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
