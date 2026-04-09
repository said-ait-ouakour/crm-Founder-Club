"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserPlus,
  Target,
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  BarChart3,
  Activity,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Minus,
  BarChart,
  Car,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useIsAdmin, useIsAdvisor, useIsRecruiter } from "@/contexts/auth-context";

import AdvisorsFollowUpAnalysis from "@/components/advisors-followup-analysis";
import { useDashboardCache } from '@/hooks/use-dashboard-cache';
import { PipelineKpiSection } from "@/components/pipeline-kpi-section";
import { CentralLeadsHub } from "@/components/central-leads-hub";

interface DashboardStats {
  activeLeads: number;
  totalContacts: number;
  openOpportunities: number;
  totalOpportunityValue: number;
}

interface LeadAnalytics {
  sentimentAnalysis: {
    positive: number;
    negative: number;
    neutral: number;
    total: number;
  };
  engagementStatus: {
    engaged: number;
    notEngaged: number;
    total: number;
  };
  callStatus: {
    called: number;
    notCalled: number;
    total: number;
  };
  omnichannelProgress: {
    email: number;
    sms: number;
    whatsapp: number;
    call: number;
    total: number;
  };
}

interface EmailAnalytics {
  totalEmails: number;
  inboundEmails: number;
  outboundEmails: number;
  totalOpens: number;
  totalClicks: number;
  mppOpens: number;
  nonMppOpens: number;
  spamCount: number;
  unsubscribedCount: number;
  openRate: number;
  clickRate: number;
  mppOpenRate: number;
  nonMppOpenRate: number;
}

interface RecentCall {
  id: string;
  lead_name: string;
  created_at: string;
  advisor_name: string;
  call_score: number;
  summary: string;
}

interface LeadByDate {
  date: string;
  count: number;
}

interface AdminKpis {
  deliveries: {
    emailDelivered: number;
    smsDelivered: number;
    whatsappDelivered: number;
    whatsappSeen: number;
  };
  emailLeads: {
    contacted: number;
    opened: number;
    clicked: number;
    replied: number;
  };
  smsLeads: {
    contacted: number;
    replied: number;
  };
  whatsappLeads: {
    contacted: number;
    seen: number;
    replied: number;
  };
  vapi: {
    answered: number;
    voicemail: number;
    noAnswer: number;
    failed: number;
    assistantEnded: number;
    customerEnded: number;
    score0To4: number;
    score4To7: number;
    score7To10: number;
  };
}

const createEmptyAdminKpis = (): AdminKpis => ({
  deliveries: {
    emailDelivered: 0,
    smsDelivered: 0,
    whatsappDelivered: 0,
    whatsappSeen: 0,
  },
  emailLeads: {
    contacted: 0,
    opened: 0,
    clicked: 0,
    replied: 0,
  },
  smsLeads: {
    contacted: 0,
    replied: 0,
  },
  whatsappLeads: {
    contacted: 0,
    seen: 0,
    replied: 0,
  },
  vapi: {
    answered: 0,
    voicemail: 0,
    noAnswer: 0,
    failed: 0,
    assistantEnded: 0,
    customerEnded: 0,
    score0To4: 0,
    score4To7: 0,
    score7To10: 0,
  },
});

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = useIsAdmin();
  const isAdvisor = useIsAdvisor();
  const isRecruiter = useIsRecruiter();
  const router = useRouter();

  // Add cache hook
  const { getCachedData, setCachedData, clearCache, invalidateByAdvisor, cacheStats } = useDashboardCache();

  // Handle password reset redirect from Supabase
  useEffect(() => {
    // Check if we have recovery hash fragments in the URL
    if (typeof window !== 'undefined') {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      if (accessToken && type === 'recovery') {
        // Redirect to reset password page with the hash fragments preserved
        window.location.href = `/auth/reset-password${window.location.hash}`;
      }
    }
  }, []);

  // Add cache stats display (optional)
  const renderCacheStats = () => {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded text-xs">
          Cache: {cacheStats.size}/{cacheStats.maxSize}
        </div>
      );
    }
    return null;
  };

  const [stats, setStats] = useState<DashboardStats>({
    activeLeads: 0,
    totalContacts: 0,
    openOpportunities: 0,
    totalOpportunityValue: 0,
  });

  const [analytics, setAnalytics] = useState<LeadAnalytics>({
    sentimentAnalysis: { positive: 0, negative: 0, neutral: 0, total: 0 },
    engagementStatus: { engaged: 0, notEngaged: 0, total: 0 },
    callStatus: { called: 0, notCalled: 0, total: 0 },
    omnichannelProgress: { email: 0, sms: 0, whatsapp: 0, call: 0, total: 0 },
  });
  const [emailAnalytics, setEmailAnalytics] = useState<EmailAnalytics | null>(null);
  const [omnichannelReplies, setOmnichannelReplies] = useState<{
    email: number;
    sms: number;
    whatsapp: number;
    vapi: number;
    total: number;
  } | null>(null);

  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [leadsByDate, setLeadsByDate] = useState<LeadByDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminKpis, setAdminKpis] = useState<AdminKpis | null>(null);
  // Gate AFTER hooks so effects still run
  if (isRecruiter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the dashboard.
          </p>
          <p className="text-sm text-gray-500">
            Recruiters can only access the recruitment page.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    console.log("start dashboard effect");
    async function loadDashboardData() {
      try {
        const advisorId = isAdvisor && user?.id ? user.id : undefined;

        // Check cache first
        const cachedData = getCachedData('dashboard', advisorId, isAdmin);
        if (cachedData) {
          console.log('Using cached dashboard data');
          setStats(cachedData.stats);
          setAnalytics(cachedData.analytics);
          setEmailAnalytics(cachedData.emailAnalytics);
          setOmnichannelReplies(cachedData.omnichannelReplies);
          setRecentCalls(cachedData.recentCalls);
          setLeadsByDate(cachedData.leadsByDate);
          setAdminKpis(isAdmin ? (cachedData.adminKpis ?? createEmptyAdminKpis()) : null);
          setLoading(false);
          return;
        }

        console.log('Fetching pre-calculated dashboard metrics...');

        // Fetch pre-calculated metrics from the API
        console.log(`Fetching dashboard metrics for advisorId: ${advisorId}, isAdmin: ${isAdmin}`);
        const response = await fetch(`/api/dashboard-metrics?advisorId=${advisorId || ''}&isAdmin=${isAdmin}`);
        
        console.log('API Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Using pre-calculated metrics:', data);
          
          // Ensure all data exists before setting
          setStats(data.stats || {
            activeLeads: 0,
            totalContacts: 0,
            openOpportunities: 0,
            totalOpportunityValue: 0,
          });
          
          setAnalytics(data.analytics || {
            sentimentAnalysis: { positive: 0, negative: 0, neutral: 0, total: 0 },
            engagementStatus: { engaged: 0, notEngaged: 0, total: 0 },
            callStatus: { called: 0, notCalled: 0, total: 0 },
            omnichannelProgress: { email: 0, sms: 0, whatsapp: 0, call: 0, total: 0 },
          });
          
          setEmailAnalytics(data.emailAnalytics || {
            totalEmails: 0,
            inboundEmails: 0,
            outboundEmails: 0,
            totalOpens: 0,
            totalClicks: 0,
            mppOpens: 0,
            nonMppOpens: 0,
            spamCount: 0,
            unsubscribedCount: 0,
            openRate: 0,
            clickRate: 0,
            mppOpenRate: 0,
            nonMppOpenRate: 0,
          });
          
          setOmnichannelReplies(data.omnichannelReplies || {
            email: 0,
            sms: 0,
            whatsapp: 0,
            vapi: 0,
            total: 0,
          });
          
          setRecentCalls(data.recentCalls || []);
          setLeadsByDate(data.leadsByDate || []);
          const adminData = isAdmin ? (data.adminKpis ?? createEmptyAdminKpis()) : null;
          setAdminKpis(adminData);
          
          // Cache the pre-calculated data
          const cacheData = {
            stats: data.stats,
            analytics: data.analytics,
            emailAnalytics: data.emailAnalytics,
            omnichannelReplies: data.omnichannelReplies,
            recentCalls: data.recentCalls || [],
            leadsByDate: data.leadsByDate || [],
            adminKpis: adminData,
            advisorId,
            isAdmin,
          };
          setCachedData('dashboard', cacheData, advisorId, isAdmin);
          
          setLoading(false);
          return;
        } else {
          console.error('Failed to fetch dashboard metrics:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('Error response:', errorText);
          
          // Set empty data if API fails
          setStats({
            activeLeads: 0,
            totalContacts: 0,
            openOpportunities: 0,
            totalOpportunityValue: 0,
          });
          setAnalytics({
            sentimentAnalysis: { positive: 0, negative: 0, neutral: 0, total: 0 },
            engagementStatus: { engaged: 0, notEngaged: 0, total: 0 },
            callStatus: { called: 0, notCalled: 0, total: 0 },
            omnichannelProgress: { email: 0, sms: 0, whatsapp: 0, call: 0, total: 0 },
          });
          setEmailAnalytics({
            totalEmails: 0,
            inboundEmails: 0,
            outboundEmails: 0,
            totalOpens: 0,
            totalClicks: 0,
            mppOpens: 0,
            nonMppOpens: 0,
            spamCount: 0,
            unsubscribedCount: 0,
            openRate: 0,
            clickRate: 0,
            mppOpenRate: 0,
            nonMppOpenRate: 0,
          });
          setOmnichannelReplies({
            email: 0,
            sms: 0,
            whatsapp: 0,
            vapi: 0,
            total: 0,
          });
          setRecentCalls([]);
          setLeadsByDate([]);
          setAdminKpis(isAdmin ? createEmptyAdminKpis() : null);
        }

      } catch (error) {
        console.error("Error loading dashboard data:", error);
        // Set empty data on error
        setStats({
          activeLeads: 0,
          totalContacts: 0,
          openOpportunities: 0,
          totalOpportunityValue: 0,
        });
        setAnalytics({
          sentimentAnalysis: { positive: 0, negative: 0, neutral: 0, total: 0 },
          engagementStatus: { engaged: 0, notEngaged: 0, total: 0 },
          callStatus: { called: 0, notCalled: 0, total: 0 },
          omnichannelProgress: { email: 0, sms: 0, whatsapp: 0, call: 0, total: 0 },
        });
        setEmailAnalytics(null);
        setOmnichannelReplies(null);
        setRecentCalls([]);
        setLeadsByDate([]);
        setAdminKpis(isAdmin ? createEmptyAdminKpis() : null);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
    console.log("done");
  }, [isAdvisor, user?.id, getCachedData, setCachedData, isAdmin]);
  // These handlers are no longer needed since we get all data from pre-calculated metrics
  // const handleLoadEmailAnalytics = async () => {
  //   // No longer needed - data comes from pre-calculated metrics
  // };

  // const handleLoadOmnichannelReplies = async () => {
  //   // No longer needed - data comes from pre-calculated metrics
  // };

  // Old calculation functions removed - now using pre-calculated metrics from API

  // Old loadRecentCalls function removed - now using pre-calculated metrics

  // Old loadLeadsByDate function removed - now using pre-calculated metrics

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-6 text-lg font-semibold text-gray-700 animate-pulse">
            Gathering your Insights data...
          </p>
          <p className="text-gray-500">This may take a moment. Thank you for your patience.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">CRM Dashboard</h1>
          <p className="text-gray-600 mt-2">
            {isAdvisor
              ? "Your assigned leads and opportunities"
              : "Manage your leads, contacts, and opportunities"}
          </p>
        </div>

        {/* Quick Stats & Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/leads">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-blue-600" /> Leads
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs text-muted-foreground">
                    {isAdvisor
                      ? "View your assigned leads"
                      : "Manage and qualify new leads"}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-2xl font-bold">{stats.activeLeads}</div>
                  <span className="text-xs text-muted-foreground">Total</span>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full bg-white text-gray-900 group-hover:bg-blue-50 transition"
                >
                  View Leads
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/contacts">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" /> Contacts
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs text-muted-foreground">
                    Manage client relationships
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-2xl font-bold">
                    {stats.totalContacts}
                  </div>
                  <span className="text-xs text-muted-foreground">Total</span>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full bg-white text-gray-900 group-hover:bg-green-50 transition"
                >
                  View Contacts
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/opportunities">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" /> Opportunities
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs text-muted-foreground">
                    Track sales opportunities
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-2xl font-bold">
                    {stats.openOpportunities}
                  </div>
                  <span className="text-xs text-muted-foreground">Open</span>
                  <span className="text-xs text-muted-foreground">
                    £{(stats.totalOpportunityValue / 1000).toFixed(0)}K
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full bg-white text-gray-900 group-hover:bg-purple-50 transition"
                >
                  View Opportunities
                </Button>
              </CardContent>
            </Card>
          </Link>

        </div>

        {isAdmin && adminKpis && (
          <div className="mb-8 space-y-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold text-gray-900">Admin KPIs</h2>
              <p className="text-sm text-muted-foreground">
                Detailed delivery and engagement metrics across channels.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    Delivery Performance
                  </CardTitle>
                  <CardDescription>Delivered messages across channels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Email Delivered</p>
                      <p className="mt-2 text-2xl font-semibold text-blue-600">
                        {adminKpis.deliveries.emailDelivered}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">SMS Delivered</p>
                      <p className="mt-2 text-2xl font-semibold text-green-600">
                        {adminKpis.deliveries.smsDelivered}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">WhatsApp Delivered</p>
                      <p className="mt-2 text-2xl font-semibold text-emerald-600">
                        {adminKpis.deliveries.whatsappDelivered}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">WhatsApp Seen</p>
                      <p className="mt-2 text-2xl font-semibold text-emerald-600">
                        {adminKpis.deliveries.whatsappSeen}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    Email Engagement Funnel
                  </CardTitle>
                  <CardDescription>Track email touchpoints with leads</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Contacted</p>
                      <p className="mt-2 text-2xl font-semibold text-blue-600">
                        {adminKpis.emailLeads.contacted}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Opened</p>
                      <p className="mt-2 text-2xl font-semibold text-blue-600">
                        {adminKpis.emailLeads.opened}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Clicked</p>
                      <p className="mt-2 text-2xl font-semibold text-blue-600">
                        {adminKpis.emailLeads.clicked}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Replied</p>
                      <p className="mt-2 text-2xl font-semibold text-blue-600">
                        {adminKpis.emailLeads.replied}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    SMS Engagement
                  </CardTitle>
                  <CardDescription>SMS touchpoints and replies</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Contacted</p>
                      <p className="mt-2 text-2xl font-semibold text-green-600">
                        {adminKpis.smsLeads.contacted}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Replied</p>
                      <p className="mt-2 text-2xl font-semibold text-green-600">
                        {adminKpis.smsLeads.replied}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-emerald-600" />
                    WhatsApp Engagement
                  </CardTitle>
                  <CardDescription>WhatsApp delivery and engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Contacted</p>
                      <p className="mt-2 text-2xl font-semibold text-emerald-600">
                        {adminKpis.whatsappLeads.contacted}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Seen</p>
                      <p className="mt-2 text-2xl font-semibold text-emerald-600">
                        {adminKpis.whatsappLeads.seen}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Replied</p>
                      <p className="mt-2 text-2xl font-semibold text-emerald-600">
                        {adminKpis.whatsappLeads.replied}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Phone className="h-5 w-5 text-purple-600" />
                    VAPI Call Outcomes
                  </CardTitle>
                  <CardDescription>
                    Automated assistant performance breakdown
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-8">
                  {/* === Section 1: Call Status === */}
                  <div>
                    <h4 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Call Status
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: "Answered", value: adminKpis.vapi.answered },
                        { label: "Voicemail", value: adminKpis.vapi.voicemail },
                        { label: "No Answer", value: adminKpis.vapi.noAnswer },
                        { label: "Failed", value: adminKpis.vapi.failed },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex flex-col rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            {item.label}
                          </p>
                          <p className="mt-2 text-2xl font-bold text-purple-600">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* === Section 2: End Reasons & Scores === */}
                  <div>
                    <h4 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      End & Scoring Details
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {[
                        { label: "Assistant Ended", value: adminKpis.vapi.assistantEnded },
                        { label: "Customer Ended", value: adminKpis.vapi.customerEnded },
                        { label: "Scores 0 - 4", value: adminKpis.vapi.score0To4 },
                        { label: "Scores 4 - 7", value: adminKpis.vapi.score4To7 },
                        { label: "Scores 7 - 10", value: adminKpis.vapi.score7To10 },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex flex-col rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            {item.label}
                          </p>
                          <p className="mt-2 text-xl font-bold text-purple-600">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        )}

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sentiment Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Sentiment Analysis
              </CardTitle>
              <CardDescription>Lead sentiment distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Positive</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-blue-600">
                      {analytics?.sentimentAnalysis?.positive || 0}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (
                      {(analytics?.sentimentAnalysis?.total || 0) > 0
                        ? (
                            ((analytics?.sentimentAnalysis?.positive || 0) /
                              (analytics?.sentimentAnalysis?.total || 1)) *
                            100
                          ).toFixed(1)
                        : 0}
                      %)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        (analytics?.sentimentAnalysis?.total || 0) > 0
                          ? ((analytics?.sentimentAnalysis?.positive || 0) /
                              (analytics?.sentimentAnalysis?.total || 1)) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Minus className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">Neutral</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-600">
                      {analytics?.sentimentAnalysis?.neutral || 0}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (
                      {(analytics?.sentimentAnalysis?.total || 0) > 0
                        ? (
                            ((analytics?.sentimentAnalysis?.neutral || 0) /
                              (analytics?.sentimentAnalysis?.total || 1)) *
                            100
                          ).toFixed(1)
                        : 0}
                      %)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gray-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        (analytics?.sentimentAnalysis?.total || 0) > 0
                          ? ((analytics?.sentimentAnalysis?.neutral || 0) /
                              (analytics?.sentimentAnalysis?.total || 1)) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="h-4 w-4 text-black" />
                    <span className="text-sm font-medium">Negative</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-black">
                      {analytics?.sentimentAnalysis?.negative || 0}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (
                      {(analytics?.sentimentAnalysis?.total || 0) > 0
                        ? (
                            ((analytics?.sentimentAnalysis?.negative || 0) /
                              (analytics?.sentimentAnalysis?.total || 1)) *
                            100
                          ).toFixed(1)
                        : 0}
                      %)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-black h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        (analytics?.sentimentAnalysis?.total || 0) > 0
                          ? ((analytics?.sentimentAnalysis?.negative || 0) /
                              (analytics?.sentimentAnalysis?.total || 1)) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Engagement & Call Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                Engagement & Call Status
              </CardTitle>
              <CardDescription>
                Lead engagement and call activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {/* Engagement Status */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    Engagement Status
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Engaged</span>
                      <span className="text-sm font-bold text-blue-600">
                        {analytics?.engagementStatus?.engaged || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Not Engaged</span>
                      <span className="text-sm font-bold text-black">
                        {analytics?.engagementStatus?.notEngaged || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Call Status */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    Call Status
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Called</span>
                      <span className="text-sm font-bold text-blue-600">
                        {analytics?.callStatus?.called || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Not Called</span>
                      <span className="text-sm font-bold text-black">
                        {analytics?.callStatus?.notCalled || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leads by Date Chart */}
        {/* <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-blue-600" />
                Leads Created by Date (Last 30 Days)
              </CardTitle>
              <CardDescription>Daily lead creation trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-1 px-4 relative">

                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-full border-t border-gray-200"
                      style={{ top: `${(i + 1) * 20}%` }}
                    />
                  ))}
                </div>
                
                {leadsByDate.length > 0 ? (
                  (() => {
                    // Calculate max count once
                    const maxCount = Math.max(...leadsByDate.map(d => d.count));
                    console.log('Max count for chart:', maxCount);
                    
                    return leadsByDate.map((item, index) => {
                      // Calculate height based on actual data
                      let height;
                      if (item.count === 0) {
                        height = 4; // Zero leads = small bar
                      } else if (maxCount === 0) {
                        height = 4; // No data = small bar
                      } else {
                        // Calculate percentage and ensure it's a number
                        const percentage = (item.count / maxCount) * 100;
                        console.log(`${item.date}: ${item.count}/${maxCount} = ${percentage}%`);
                        
                        // Ensure height is between 8% and 95%
                        height = Math.max(8, Math.min(95, percentage));
                      }
                      
                      console.log(`Final height for ${item.date}: ${height}% (count: ${item.count})`);
                      const isToday = new Date(item.date).toDateString() === new Date().toDateString();
                      
                      return (
                        <div key={item.date} className="flex flex-col items-center flex-1 min-w-0">
                          <div className="text-xs text-gray-600 mb-1 text-center font-medium">
                            {item.count}
                          </div>
                          <div 
                            className={`w-full rounded-t transition-all duration-300 border border-blue-300 ${
                              isToday 
                                ? 'bg-blue-600 shadow-md' 
                                : item.count > 0
                                ? 'bg-blue-500 hover:bg-blue-600 hover:shadow-sm'
                                : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                            style={{ 
                              height: `${height}%`,
                              minHeight: '8px',
                              maxHeight: '95%'
                            }}
                            title={`${item.date}: ${item.count} leads (${height}% height)`}
                          />
                          <div className="text-xs text-gray-500 mt-1 text-center font-medium">
                            {new Date(item.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-gray-500">
                    <div className="text-center">
                      <BarChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No lead data available</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div> */}

        {/* Email Analytics & Omnichannel Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Email Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Email Analytics
              </CardTitle>
              <CardDescription>
                Email performance metrics with MPP tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailAnalytics === null ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Email analytics will be loaded automatically
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Email Counts */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{emailAnalytics?.totalEmails || 0}</div>
                      <div className="text-xs text-muted-foreground">Total Emails</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{emailAnalytics?.outboundEmails || 0}</div>
                      <div className="text-xs text-muted-foreground">Outbound</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{emailAnalytics?.inboundEmails || 0}</div>
                      <div className="text-xs text-muted-foreground">Inbound</div>
                    </div>
                  </div>

                  {/* Open Rates */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Open Rates (Excluding MPP)</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Non-MPP Opens</span>
                        <span className="text-sm font-bold text-blue-600">
                          {(emailAnalytics?.openRate || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(emailAnalytics?.openRate || 0, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* MPP vs Non-MPP */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">MPP vs Non-MPP Opens</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">MPP Opens</span>
                        <span className="text-sm font-bold text-purple-600">
                          {(emailAnalytics?.mppOpenRate || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(emailAnalytics?.mppOpenRate || 0, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Non-MPP Opens</span>
                        <span className="text-sm font-bold text-blue-600">
                          {(emailAnalytics?.nonMppOpenRate || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(emailAnalytics?.nonMppOpenRate || 0, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Click Rate */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Click Rate</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Click Rate</span>
                        <span className="text-sm font-bold text-green-600">
                          {(emailAnalytics?.clickRate || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(emailAnalytics?.clickRate || 0, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Issues */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Issues</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{emailAnalytics?.spamCount || 0}</div>
                        <div className="text-xs text-muted-foreground">Marked as Spam</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{emailAnalytics?.unsubscribedCount || 0}</div>
                        <div className="text-xs text-muted-foreground">Unsubscribed</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Omnichannel Progress (Old Version) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Omni-Flow Progress
              </CardTitle>
              <CardDescription>
                Progression of leads through each channel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-blue-600">
                      {analytics?.omnichannelProgress?.email || 0}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (
                      {(analytics?.omnichannelProgress?.total || 0) > 0
                        ? (
                            ((analytics?.omnichannelProgress?.email || 0) /
                              (analytics?.omnichannelProgress?.total || 1)) *
                            100
                          ).toFixed(1)
                        : 0}
                      %)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        (analytics?.omnichannelProgress?.total || 0) > 0
                          ? ((analytics?.omnichannelProgress?.email || 0) /
                              (analytics?.omnichannelProgress?.total || 1)) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">SMS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-green-600">
                      {analytics?.omnichannelProgress?.sms || 0}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (
                      {(analytics?.omnichannelProgress?.total || 0) > 0
                        ? (
                            ((analytics?.omnichannelProgress?.sms || 0) /
                              (analytics?.omnichannelProgress?.total || 1)) *
                            100
                          ).toFixed(1)
                        : 0}
                      %)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        (analytics?.omnichannelProgress?.total || 0) > 0
                          ? ((analytics?.omnichannelProgress?.sms || 0) /
                              (analytics?.omnichannelProgress?.total || 1)) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 448 512"
                      fill="currentColor"
                      className="h-4 w-4 text-green-500"
                    >
                      <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zM223.9 439.6c-38.2 0-73.4-12.4-102.6-33.8L48 443.4l29.7-87.9C60.2 322.8 48 285.3 48 246.1c0-97.2 79.2-176 176-176s176 78.8 176 176c0 97.2-79.2 176-176 176zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                    </svg>
                    <span className="text-sm font-medium">WhatsApp</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-green-500">
                      {analytics?.omnichannelProgress?.whatsapp || 0}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (
                      {(analytics?.omnichannelProgress?.total || 0) > 0
                        ? (
                            ((analytics?.omnichannelProgress?.whatsapp || 0) /
                              (analytics?.omnichannelProgress?.total || 1)) *
                            100
                          ).toFixed(1)
                        : 0}
                      %)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        (analytics?.omnichannelProgress?.total || 0) > 0
                          ? ((analytics?.omnichannelProgress?.whatsapp || 0) /
                              (analytics?.omnichannelProgress?.total || 1)) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">VAPI Call</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-purple-600">
                      {analytics?.omnichannelProgress?.call || 0}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (
                      {(analytics?.omnichannelProgress?.total || 0) > 0
                        ? (
                            ((analytics?.omnichannelProgress?.call || 0) /
                              (analytics?.omnichannelProgress?.total || 1)) *
                            100
                          ).toFixed(1)
                        : 0}
                      %)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        (analytics?.omnichannelProgress?.total || 0) > 0
                          ? ((analytics?.omnichannelProgress?.call || 0) /
                              (analytics?.omnichannelProgress?.total || 1)) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Omnichannel Progress (Replies) - Load on demand */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Omni-Flow Replies
              </CardTitle>
              <CardDescription>
                Inbound replies received from leads via each channel
              </CardDescription>
            </CardHeader>
            <CardContent>
              {omnichannelReplies === null ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Omnichannel replies will be loaded automatically
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Email */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Email</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-blue-600">
                        {omnichannelReplies?.email || 0}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (
                        {(analytics?.omnichannelProgress?.email || 0) > 0
                          ? (
                              ((omnichannelReplies?.email || 0) /
                                (analytics?.omnichannelProgress?.email || 1)) *
                              100
                            ).toFixed(1)
                          : 0}
                        %)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (analytics?.omnichannelProgress?.email || 0) > 0
                            ? ((omnichannelReplies?.email || 0) /
                                (analytics?.omnichannelProgress?.email || 1)) *
                              100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>

                  {/* SMS */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">SMS</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-green-600">
                        {omnichannelReplies?.sms || 0}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (
                        {(analytics?.omnichannelProgress?.sms || 0) > 0
                          ? (
                              ((omnichannelReplies?.sms || 0) /
                                (analytics?.omnichannelProgress?.sms || 1)) *
                              100
                            ).toFixed(1)
                          : 0}
                        %)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (analytics?.omnichannelProgress?.sms || 0) > 0
                            ? ((omnichannelReplies?.sms || 0) /
                                (analytics?.omnichannelProgress?.sms || 1)) *
                              100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>

                  {/* WhatsApp */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* WhatsApp SVG */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 448 512"
                        fill="currentColor"
                        className="h-4 w-4 text-green-500"
                      >
                        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zM223.9 439.6c-38.2 0-73.4-12.4-102.6-33.8L48 443.4l29.7-87.9C60.2 322.8 48 285.3 48 246.1c0-97.2 79.2-176 176-176s176 78.8 176 176c0 97.2-79.2 176-176 176zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                      </svg>
                      <span className="text-sm font-medium">WhatsApp</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-green-500">
                        {omnichannelReplies?.whatsapp || 0}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (
                        {(analytics?.omnichannelProgress?.whatsapp || 0) > 0
                          ? (
                              ((omnichannelReplies?.whatsapp || 0) /
                                (analytics?.omnichannelProgress?.whatsapp || 1)) *
                              100
                            ).toFixed(1)
                          : 0}
                        %)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (analytics?.omnichannelProgress?.whatsapp || 0) > 0
                            ? ((omnichannelReplies?.whatsapp || 0) /
                                (analytics?.omnichannelProgress?.whatsapp || 1)) *
                              100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>

                  {/* VAPI Call */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">VAPI Call</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-purple-600">
                        {omnichannelReplies?.vapi || 0}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (
                        {(analytics?.omnichannelProgress?.call || 0) > 0
                          ? (
                              ((omnichannelReplies?.vapi || 0) /
                                (analytics?.omnichannelProgress?.call || 1)) *
                              100
                            ).toFixed(1)
                          : 0}
                        %)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (analytics?.omnichannelProgress?.call || 0) > 0
                            ? ((omnichannelReplies?.vapi || 0) /
                                (analytics?.omnichannelProgress?.call || 1)) *
                              100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Calls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-red-600" />
                Recent Calls
              </CardTitle>
              <CardDescription>Latest call activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCalls.length > 0 ? (
                  recentCalls.map((call) => (
                    <div
                      key={call.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">
                          {call.lead_name}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(call.created_at).toLocaleDateString()}
                          </span>
                          <div
                            className={`px-2 py-1 rounded-full text-xs ${
                              call.call_score >= 8
                                ? "bg-green-100 text-green-800"
                                : call.call_score >= 6
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            Score: {call.call_score}/10
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {call.advisor_name}
                      </p>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {call.summary}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recent calls found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          {(isAdmin) && (
            <Card className="lg:col-span-4">
              <CardHeader>
                <div className="mb-8">
                  <AdvisorsFollowUpAnalysis />
                </div>
              </CardHeader>
            </Card>
          )}
        </div>

        {/* Central Leads Hub — unassigned leads queue */}
        {!isRecruiter && (
          <div className="mt-6 mb-8">
            <CentralLeadsHub />
          </div>
        )}

        {/* Omniflow Pipeline KPIs — visible to managers and advisors */}
        {!isRecruiter && (
          <div className="mt-6">
            <PipelineKpiSection />
          </div>
        )}
      </div>
      {renderCacheStats()}
    </div>
  );
}
