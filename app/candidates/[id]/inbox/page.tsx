"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, PhoneCall, User } from "lucide-react";
import { CandidateCommunicationPanel } from "@/components/candidate-communication-panel";

interface Candidate {
  id: number;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  position?: string | null;
  current_stage?: string | null;
}

export default function CandidateInboxPage() {
  const params = useParams();
  const router = useRouter();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function loadCandidate() {
      if (!params?.id) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/candidates/${params.id}`);
        if (!res.ok) throw new Error("Failed to load candidate");
        const data = await res.json();
        setCandidate(data as Candidate);
      } catch (e) {
        console.error(e);
        router.push("/recruitment");
      } finally {
        setLoading(false);
      }
    }
    loadCandidate();
  }, [params?.id, router]);

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading candidate inbox...</div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold">Candidate not found</div>
          <Button className="mt-4" onClick={() => router.push("/recruitment")}>Back to Recruitment</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 overflow-hidden relative">
      {!isExpanded && (
        <div className="container mx-auto px-2 py-4 space-y-4 h-full flex flex-col">
          {/* Header with back button and actions */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => router.push(`/candidates/${candidate.id}`)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {candidate.full_name || "Unnamed Candidate"}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{candidate.current_stage || "Unknown"}</Badge>
                  {candidate.position && (
                    <Badge variant="outline">{candidate.position}</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
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

          <div className="flex-1 min-h-0">
            <CandidateCommunicationPanel 
              candidateId={candidate.id}
              candidateName={candidate.full_name || "Unnamed Candidate"}
              candidateEmail={candidate.email || undefined}
              candidatePhone={candidate.phone_number || undefined}
              isExpanded={isExpanded}
              onToggleExpand={() => setIsExpanded(!isExpanded)}
            />
          </div>
        </div>
      )}

      {/* Expanded inbox overlay */}
      {isExpanded && (
        <div className="absolute inset-0 z-50 bg-white">
          <CandidateCommunicationPanel 
            key={candidate.id}
            candidateId={candidate.id}
            candidateName={candidate.full_name || "Unnamed Candidate"}
            candidateEmail={candidate.email || undefined}
            candidatePhone={candidate.phone_number || undefined}
            isExpanded={isExpanded}
            onToggleExpand={() => setIsExpanded(!isExpanded)}
          />
        </div>
      )}
    </div>
  );
}


