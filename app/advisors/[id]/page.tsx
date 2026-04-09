"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { Search, Phone, Users, Activity, MessageSquare, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  current_progress: string;
  sentiment_analysis?: string;
}

interface Call {
  id: string;
  created_at: string;
  advisor_name: string;
  lead_id: string;
  summary: string;
  call_score?: number;
  transcript?: string
}

export default function AdvisorFollowUpPage({ params }: { params: { id: string } }) {
  const advisorId = params.id;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [advisor, setAdvisor] = useState<any>(null);
  const [todayCalls, setTodayCalls] = useState<Call[]>([]);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  const handleViewTranscript = (call: Call) => {
    setSelectedCall(call);
    setIsTranscriptOpen(true);
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      // Get advisor info
      const { data: advisorData } = await supabase
        .from("users")
        .select("id, fullName, email, user_id")
        .eq("id", advisorId)
        .single();
      setAdvisor(advisorData);

      // Get assigned leads with vapi_call_made
      const { data: userLeads } = await supabase
        .from("users_leads")
        .select("lead_id")
        .eq("user_id", advisorId);

      const leadIds = userLeads?.map((ul: any) => ul.lead_id) || [];

      if (leadIds.length === 0) {
        setLeads([]);
        setCalls([]);
        setLoading(false);
        return;
      }

      // Replace the leads fetching logic with this:
      const { data: leadsData } = await supabase
        .from("leads")
        .select("id, first_name, last_name, email, current_progress, lead_situation(sentiment_analysis)")
        .in("id", leadIds)
        // .ilike("current_progress", "%vapi_call_made%")
        .limit(1000); // Explicitly set a higher limit

      // Flatten sentiment_analysis
      const leadsWithSentiment = (leadsData || []).map((lead: any) => ({
        ...lead,
        sentiment_analysis: lead.lead_situation?.[0]?.sentiment_analysis || "Neutral"
      }));
      setLeads(leadsWithSentiment);

      // Get calls made by advisor for these leads (include call_score)
      const { data: callsData } = await supabase
        .from("calls")
        .select("id, created_at, advisor_name, lead_id, summary, call_score, transcript")
        .in("lead_id", (leadsData || []).map((l: any) => l.id))
        .eq("advisor_name", advisorData?.fullName);
      setCalls(callsData || []);

      // Get today's calls
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCallsList = (callsData || []).filter((call: any) => {
        const callDate = new Date(call.created_at);
        return callDate >= today;
      });
      setTodayCalls(todayCallsList);

      setLoading(false);
    }
    fetchData();
  }, [advisorId]);

  // Helper: get follow-up state and call count for each lead
  function getLeadCallInfo(lead: Lead) {
    const leadCalls = calls.filter((c) => c.lead_id === lead.id);
    return {
      status: leadCalls.length > 0 ? "Followed Up" : "Needs Follow Up",
      callCount: leadCalls.length
    };
  }

  const getScoreBadge = (score?: number) => {
    if (score === undefined || score === null) {
      return <Badge className="bg-white text-muted-foreground">N/A</Badge>;
    }
    
    let bgColor: string;
    if (score >= 7) bgColor = 'bg-green-500';
    else if (score >= 5) bgColor = 'bg-orange-500';
    else bgColor = 'bg-red-500';
    
    return (
      <Badge className={`${bgColor} text-white`}>
        {score.toFixed(1)}
      </Badge>
    );
  };

  const getSentimentBadge = (sentiment?: string) => {
    const sentimentLower = sentiment?.toLowerCase() || 'neutral';
    let bgColor: string;
    
    if (sentimentLower === 'positive') bgColor = 'bg-green-500';
    else if (sentimentLower === 'neutral') bgColor = 'bg-yellow-500';
    else bgColor = 'bg-red-500';
    
    return (
      <Badge className={`${bgColor} text-white capitalize`}>
        {sentimentLower}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Advisor Dashboard</h1>
        {advisor && (
          <p className="text-muted-foreground">
            {advisor.fullName} • {advisor.email}
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCalls.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Follow-ups</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leads.filter(lead => getLeadCallInfo(lead).status === 'Needs Follow Up').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Call Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calls.length > 0
                ? (calls.reduce((acc, call) => acc + (call.call_score || 0), 0) / calls.length).toFixed(1)
                : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Calls Section */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Calls</CardTitle>
        </CardHeader>
        <CardContent>
          {todayCalls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No calls made today
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="w-1/3">Summary</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayCalls.map((call) => {
                    const lead = leads.find(l => l.id === call.lead_id);
                    return (
                      <TableRow key={call.id}>
                        <TableCell className="font-medium">
                          {lead ? `${lead.first_name} ${lead.last_name}` : 'Unknown Lead'}
                        </TableCell>
                        <TableCell>
                          {new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          {getScoreBadge(call.call_score)}
                        </TableCell>
                        <TableCell className="whitespace-normal break-words max-w-[300px]">
                          <div className="line-clamp-2">
                            {call.summary || 'No summary available'}
                          </div>
                        </TableCell>
                        <TableCell>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewTranscript(call);
                            }}
                          >
                            View Transcript
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leads Needing Follow-up</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Calls</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => {
                  const { status, callCount } = getLeadCallInfo(lead);
                  
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        {lead.first_name} {lead.last_name}
                      </TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>
                        <Badge variant={status === "Followed Up" ? "default" : "secondary"}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {callCount} {callCount === 1 ? 'call' : 'calls'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getSentimentBadge(lead.sentiment_analysis)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/leads/${lead.id}`} className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            View
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isTranscriptOpen} onOpenChange={setIsTranscriptOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call Transcript</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCall && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Call Time</h4>
                    <p>{new Date(selectedCall.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Call Score</h4>
                    {getScoreBadge(selectedCall.call_score)}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Summary</h4>
                  <p className="whitespace-pre-wrap">{selectedCall.summary || 'No summary available'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Transcript</h4>
                  <div className="bg-muted/50 p-4 rounded-md">
                    {selectedCall.transcript ? (
                      <div className="space-y-4">
                        {selectedCall.transcript.split('\n\n').map((paragraph, i) => (
                          <p key={i} className="whitespace-pre-wrap">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No transcript available</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
