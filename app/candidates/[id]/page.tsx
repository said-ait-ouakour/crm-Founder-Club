"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth, useIsAdmin, useIsRecruiter } from "@/contexts/auth-context";
import { ArrowLeft, Edit, User, Mail, Phone, MapPin, Briefcase, GraduationCap, Calendar, DollarSign, ExternalLink, PhoneCall } from "lucide-react";
import { CandidateCommunicationPanel } from "@/components/candidate-communication-panel";

interface Candidate {
  id: number;
  created_at: string;
  full_name: string | null;
  phone_number: string | null;
  email: string | null;
  recruiter: number | null;
  position: string | null;
  general_location: string | null;
  zip_code: string | null;
  headline: string | null;
  current_title: string | null;
  current_company: string | null;
  current_position_start_date: string | null;
  education_degree: string | null;
  education_institution: string | null;
  profile_url: string | null;
  date_applied: string | null;
  current_stage: string | null;
  job_id: number | null;
  job_url: string | null;
  ats_job_id: string | null;
  minimum_salary: number | null;
  maximum_salary: number | null;
  currency_code: string | null;
  compensation_period: string | null;
  hiring_project_id: number | null;
  hiring_project_title: string | null;
  contract_id: number | null;
  contract_name: string | null;
  screening_questions: string | null;
  meeting_date: string | null;
  interviewer_email: string | null;
  recruiter_name: string | null;
  meeting_link_sent: string | null;
  notes: string | null;
  application_form_submission: string | null;
  meeting_link: string | null;
}

interface User {
  id: number;
  fullName: string;
  email: string;
  user_id: string;
}

// Helper functions for notes JSON handling
const parseNotesJson = (notesString: string): Array<{datetime: string, note: string, author_id?: string | null, author_name?: string}> => {
  if (!notesString) return [];
  try {
    // Handle the JSON format: {"datetime1":"note1","datetime2":"note2"} (legacy)
    // or {"datetime1":{"note":"note1","author_id":"...","author_name":"..."}} (new format)
    const parsed = JSON.parse(notesString);
    return Object.entries(parsed).map(([datetime, value]) => {
      if (typeof value === 'string') {
        // Legacy format: just a string
        return {
          datetime,
          note: value,
          author_id: null,
          author_name: 'Unknown'
        };
      } else if (typeof value === 'object' && value !== null) {
        // New format: object with note, author_id, author_name
        return {
          datetime,
          note: (value as any).note || '',
          author_id: (value as any).author_id || null,
          author_name: (value as any).author_name || 'Unknown'
        };
      } else {
        // Fallback
        return {
          datetime,
          note: String(value),
          author_id: null,
          author_name: 'Unknown'
        };
      }
    }).sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
  } catch {
    // Handle legacy format - convert to new format using current date
    const fallbackDate = new Date().toISOString();
    return notesString ? [{
      datetime: fallbackDate,
      note: notesString,
      author_id: null,
      author_name: 'Unknown'
    }] : [];
  }
};

export default function CandidateViewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isRecruiter = useIsRecruiter();
  
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInboxExpanded, setIsInboxExpanded] = useState(false);

  // Check if user has access to view candidates
  const hasAccess = isAdmin || isRecruiter;

  // If user doesn't have access, show unauthorized message
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to view candidates.
          </p>
          <p className="text-sm text-gray-500">
            Only recruiters and managers can view candidates.
          </p>
        </div>
      </div>
    );
  }

  // Load candidate data
  useEffect(() => {
    async function loadCandidate() {
      setLoading(true);
      try {
        const response = await fetch(`/api/candidates/${params.id}`);
        const result = await response.json();
        
        if (response.ok) {
          setCandidate(result.data);
        } else {
          console.error("Error loading candidate:", result.error);
        }
      } catch (error) {
        console.error("Error loading candidate:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCandidate();
  }, [params.id]);

  // Load users for recruiter name
  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch("/api/users");
        const result = await response.json();
        
        if (response.ok) {
          setUsers(result.data);
        }
      } catch (error) {
        console.error("Error loading users:", error);
      }
    }

    loadUsers();
  }, []);

  // Get recruiter name from users table
  const getRecruiterName = (recruiterId: number | null) => {
    if (!recruiterId) return "Unassigned";
    const user = users.find(u => u.id === recruiterId);
    return user ? user.fullName : `User ID: ${recruiterId}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading candidate...</p>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Candidate Not Found</h1>
          <p className="text-gray-600 mb-4">
            The candidate you're looking for doesn't exist.
          </p>
          <Button onClick={() => router.push('/recruitment')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Recruitment
          </Button>
        </div>
      </div>
    );
  }

  const notes = parseNotesJson(candidate.notes || "");

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-2 py-4 space-y-4 h-full flex flex-col">
        {/* Header with back button and actions */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/recruitment')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {candidate.full_name || "Unnamed Candidate"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">
                  {candidate.current_stage || "Unknown"}
                </Badge>
                {candidate.position && (
                  <Badge variant="outline">
                    {candidate.position}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push(`/candidates/${candidate.id}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Candidate
              </Button>
              {candidate.phone_number && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(`tel:${candidate.phone_number}`, '_self')}
                >
                  <PhoneCall className="h-4 w-4 mr-2" />
                  Call
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 flex-1 min-h-0">
          {/* Left Column - Candidate Details */}
          <div className={`${isInboxExpanded ? 'hidden' : 'w-1/2'} space-y-3 overflow-y-auto pr-1`}>
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
                    <p className="text-sm">{candidate.full_name || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <p className="text-sm">{candidate.email || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {candidate.phone_number ? (
                        <div className="flex items-center gap-2">
                          <p className="text-sm">{candidate.phone_number}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`tel:${candidate.phone_number}`, '_self')}
                            className="h-6 w-6 p-0"
                          >
                            <PhoneCall className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm">-</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <p className="text-sm">{candidate.general_location || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Zip Code</label>
                    <p className="text-sm">{candidate.zip_code || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Headline</label>
                    <p className="text-sm">{candidate.headline || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Professional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Position Applied For</label>
                    <p className="text-sm">{candidate.position || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Current Title</label>
                    <p className="text-sm">{candidate.current_title || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Current Company</label>
                    <p className="text-sm">{candidate.current_company || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Position Start Date</label>
                    <p className="text-sm">{candidate.current_position_start_date || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Current Stage</label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {candidate.current_stage || "Unknown"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Assigned Recruiter</label>
                    <p className="text-sm">{getRecruiterName(candidate.recruiter)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Education
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Degree</label>
                    <p className="text-sm">{candidate.education_degree || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Institution</label>
                    <p className="text-sm">{candidate.education_institution || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Compensation & Additional Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Min Salary</label>
                    <p className="text-sm">
                      {candidate.minimum_salary ? `${candidate.currency_code || ''} ${candidate.minimum_salary}` : "-"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Max Salary</label>
                    <p className="text-sm">
                      {candidate.maximum_salary ? `${candidate.currency_code || ''} ${candidate.maximum_salary}` : "-"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Compensation Period</label>
                    <p className="text-sm">{candidate.compensation_period || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Profile URL</label>
                    {candidate.profile_url ? (
                      <a 
                        href={candidate.profile_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        View Profile <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="text-sm">-</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Meeting Date</label>
                    <p className="text-sm">
                      {candidate.meeting_date ? formatDateTime(candidate.meeting_date) : "-"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Interviewer Email</label>
                    <p className="text-sm">{candidate.interviewer_email || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Meeting Link</label>
                    {candidate.meeting_link ? (
                      <a 
                        href={candidate.meeting_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        Join Meeting <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="text-sm">-</p>
                    )}
                  </div>
                </div>
                {candidate.screening_questions && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Screening Questions</label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{candidate.screening_questions}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Date Applied</label>
                  <p className="text-sm">{candidate.date_applied ? formatDate(candidate.date_applied) : "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created At</label>
                  <p className="text-sm">{formatDate(candidate.created_at)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Notes Card */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
                <CardDescription>
                  {notes.length} note{notes.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {notes.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {notes.map((noteItem, index) => (
                      <div key={index} className="border rounded p-3 bg-gray-50">
                        <div className="text-xs text-gray-500 mb-2">
                          {new Date(noteItem.datetime).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })} at {new Date(noteItem.datetime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {noteItem.author_name && noteItem.author_name !== 'Unknown' && noteItem.author_name !== 'Unknown User' && (
                            <span className="ml-2 text-gray-600">by {noteItem.author_name}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{noteItem.note}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No notes available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Full Width Inbox (mirrors /inbox UI) */}
          <div className={`${isInboxExpanded ? 'w-full' : 'w-1/2'} h-full min-h-0 overflow-y-auto`}>
            <CandidateCommunicationPanel 
              candidateId={candidate.id}
              candidateName={candidate.full_name || "Unnamed Candidate"}
              candidateEmail={candidate.email || undefined}
              candidatePhone={candidate.phone_number || undefined}
              isExpanded={isInboxExpanded}
              onToggleExpand={() => setIsInboxExpanded(!isInboxExpanded)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
