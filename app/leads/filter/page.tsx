"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Filter, ChevronDown, Columns, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useIsAdmin } from "@/contexts/auth-context";
import { Checkbox } from "@/components/ui/checkbox";

const FILTER_STORAGE_KEY = 'leads-page-filters';

const saveFiltersToSession = (searchTerm: string, filters: any) => {
  if (typeof window !== 'undefined') {
    try {
      const filterData = { searchTerm, filters, timestamp: Date.now() };
      sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filterData));
    } catch {}
  }
};

const loadFiltersFromSession = () => {
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(FILTER_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        return { searchTerm: data.searchTerm || '', filters: data.filters || {} };
      }
    } catch {}
  }
  return null;
};

export default function LeadsFilterPage() {
  const router = useRouter();
  const isAdmin = useIsAdmin();

  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [advisors, setAdvisors] = useState<Array<{ user_id: string; fullname: string | null; email: string | null }>>([]);
  const [leadSources, setLeadSources] = useState<string[]>([]);
  const [calledByOptions, setCalledByOptions] = useState<string[]>([]);

  const [filters, setFilters] = useState({
    // Lead Management
    current_status: "",
    current_progress: "",
    lead_source: "",
    type_of_lead: "",
    customer_type: "",
    engaged: null as boolean | null,
    owner: "",
    
    // Business Information
    business_name: "",
    company_email: "",
    business_telephone: "",
    website: "",
    linkedin_company_url: "",
    industry: "",
    company_size: "",
    annual_revenue_range: [0, 10000000] as [number, number],
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
    tps_checked: null as boolean | null,
    ctps_checked: null as boolean | null,
    verified_phone: null as boolean | null,
    verified_email: null as boolean | null,
    
    // Personal Information
    salutation: "",
    date_of_birth: { from: undefined as Date | undefined, to: undefined as Date | undefined },
    
    // Goals & Budget
    goals: "",
    budget_range: [0, 10000000] as [number, number],
    budget_frequency: "",
    goal_term: "",
    goal_year: "",
    household_income_range: [0, 10000000] as [number, number],
    
    // Communication Preferences
    preferred_contact_method: "",
    allow_email: null as boolean | null,
    allow_phone: null as boolean | null,
    allow_fax: null as boolean | null,
    allow_mail: null as boolean | null,
    allow_bulk_email: null as boolean | null,
    
    // Marketing
    marketing_materials_sent: null as boolean | null,
    added_to_marketing_list: null as boolean | null,
    campaign_name: "",
    last_campaign_date: { from: undefined as Date | undefined, to: undefined as Date | undefined },
    
    // System Fields
    created_on: { from: undefined as Date | undefined, to: undefined as Date | undefined },
    form_submitted: { from: undefined as Date | undefined, to: undefined as Date | undefined },
    active_duration_days_range: [0, 365] as [number, number],
    easy_id: "",
    easy_description: "",
    
    // Independent Account Manager Assignment
    advisor_id: "",
    visibility_scope: "all" as "all" | "assigned_to_me" | "shared_with_me" | "shared_by_me",
    share_status: "any" as "any" | "shared" | "not_shared",
    
    // Communication Status (from related tables)
    email_opened: null as boolean | null,
    sms_answered: null as boolean | null,
    whatsapp_answered: null as boolean | null,
    inbound_email: null as string | null, // "has_messages" | "has_outbound" | "no_messages" | null
    inbound_whatsapp: null as string | null, // "has_messages" | "has_outbound" | "no_messages" | null
    vapi_score: null as string | null,
    followed_up: null as boolean | null,
    not_called_yet: null as boolean | null,
    booked: null as boolean | null,
    last_called: null as boolean | null,
    has_call: null as boolean | null,
    has_notes: null as boolean | null,
    sentiment_analysis: null as string | null,
    
    // Brochure/Guide Filters
    guide_sent: "",
    
    called_by: [] as string[],
  });

  useEffect(() => {
    const stored = loadFiltersFromSession();
    if (stored) {
      setSearchTerm(stored.searchTerm || "");
      const loaded = { ...stored.filters };
      if (!isAdmin) {
        loaded.advisor_id = "";
      }
      if (!loaded.visibility_scope) loaded.visibility_scope = "all";
      if (!loaded.share_status) loaded.share_status = "any";
      if (loaded.guide_sent === "any") loaded.guide_sent = "";
      setFilters((f) => ({ ...f, ...loaded }));
    }
  }, [isAdmin]);

  // Fetch advisors (users with advisor role only) for the advisor filter
  useEffect(() => {
    if (!isAdmin) {
      setAdvisors([]);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("user_id, fullname, email, role");
        if (error) return;
        if (!mounted || !data) return;
        const list = data
          .filter((u: any) => {
            const userId = String(u.user_id || '').trim();
            return userId !== '' && userId.length > 0 && (u.role === "advisor" || u.role === "manager");
          })
          .map((u: any) => {
            const userId = String(u.user_id || '').trim();
            return { user_id: userId, fullname: u.fullname ?? null, email: u.email ?? null };
          })
          .filter((u): u is { user_id: string; fullname: string | null; email: string | null } => u.user_id !== '');
        setAdvisors(list);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [isAdmin]);

  // Fetch unique lead_source values from the database
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("leads")
          .select("lead_source");
        if (error) {
          return;
        }
        if (!mounted || !data) return;
        
        // Get unique, non-null lead_source values
        const uniqueSources = Array.from(
          new Set(
            data
              .map((lead: any) => lead.lead_source)
              .filter((source: any) => source !== null && source !== undefined && source !== "")
          )
        ).sort() as string[];
        
        setLeadSources(uniqueSources);
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Fetch unique advisor_name values from calls table
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("calls")
          .select("advisor_name");
        if (error) return;
        if (!mounted || !data) return;
        
        const uniqueAdvisors = Array.from(
          new Set(
            data
              .map((c: any) => c.advisor_name)
              .filter((name: any) => name !== null && name !== undefined && name !== "")
          )
        ).sort() as string[];
        
        setCalledByOptions(uniqueAdvisors);
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const handleApply = async () => {
    try {
      setIsSearching(true);
      saveFiltersToSession(searchTerm, filters);
      router.push('/leads');
    } finally {
      setIsSearching(false);
    }
  };

  const statusOptions = ["New","Contacted","Qualified","Disqualified","Converted","vapi_called"];
  const progressOptions = ["email","whatsapp","sms","call","not_called_yet"];
  const leadSourceOptions = ["Website","Referral","Social Media","Email","Phone","Typeform","dynamics","Manual Entry","Other"];
  
  // B2B Filter Options - Based on actual dataset
  const industryOptions = [
    "Services", "Retail"
  ];
  
  const companySizeOptions = [
    { value: "startup", label: "Startup (1-10 employees)" },
    { value: "small", label: "Small (11-50 employees)" },
    { value: "medium", label: "Medium (51-200 employees)" },
    { value: "large", label: "Large (201-1000 employees)" },
    { value: "enterprise", label: "Enterprise (1000+ employees)" }
  ];
  
  // Employee Band Options - Based on actual dataset
  const employeeBandOptions = [
    { value: "A", label: "A: 1 to 4 employees" },
    { value: "B", label: "B: 5 to 9 employees" },
    { value: "C", label: "C: 10 to 19 employees" },
    { value: "D", label: "D: 20 to 49 employees" },
    { value: "E", label: "E: 50 to 99 employees" },
    { value: "F", label: "F: 100 to 199 employees" },
    { value: "G", label: "G: 200 to 499 employees" },
    { value: "H", label: "H: 500 to 999 employees" },
    { value: "I", label: "I: More than 1000 employees" }
  ];
  
  // Turnover Band Options - Based on actual dataset
  const turnoverBandOptions = [
    { value: "L: £5m to £7,499,999", label: "L: £5m to £7,499,999" },
    { value: "M: £7.5m to £9,999,999", label: "M: £7.5m to £9,999,999" },
    { value: "N: £10m to £24,999,999", label: "N: £10m to £24,999,999" },
    { value: "O: £25m to £49,999,999", label: "O: £25m to £49,999,999" },
    { value: "P: £50m to £74,999,999", label: "P: £50m to £74,999,999" },
    { value: "Q: £75m to £99,999,999", label: "Q: £75m to £99,999,999" },
    { value: "R: £100m to £249,999,999", label: "R: £100m to £249,999,999" },
    { value: "S: £250m to £499,999,999", label: "S: £250m to £499,999,999" },
    { value: "T: £500m to £749,999,999", label: "T: £500m to £749,999,999" },
    { value: "U: £750m to £999,999,999", label: "U: £750m to £999,999,999" },
    { value: "V: More than £1bn", label: "V: More than £1bn" }
  ];

  // SIC Code Options - Based on actual dataset
  const sicCodeOptions = [
    { value: "78100", label: "78100 - Activities of employment placement agencies (877)" },
    { value: "55100", label: "55100 - Hotels and similar accommodation (776)" },
    { value: "56101", label: "56101 - Licenced restaurants (261)" },
    { value: "93290", label: "93290 - Other amusement and recreation activities n.e.c. (104)" },
    { value: "92000", label: "92000 - Gambling and betting activities (103)" },
    { value: "86102", label: "86102 - Medical nursing home activities (79)" },
    { value: "62020", label: "62020 - Information technology consultancy activities (54)" },
    { value: "47410", label: "47410 - Retail sale of computers; peripheral units and software in specialised stores (43)" },
    { value: "82200", label: "82200 - Activities of call centres (14)" },
    { value: "61900", label: "61900 - Other telecommunications activities (14)" },
    { value: "61300", label: "61300 - Satellite telecommunications activities (12)" },
    { value: "78300", label: "78300 - Human resources provision and management of human resources functions (11)" }
  ];
  
  const leadTypeOptions = [
    { value: "B2B", label: "B2B" },
    { value: "B2C", label: "B2C" }
  ];
  
  const customerTypeOptions = [
    "Prospect", "Customer", "Partner", "Vendor", "Other"
  ];
  
  const salutationOptions = [
    "Mr", "Mrs", "Ms", "Miss", "Dr", "Prof", "Sir", "Lady"
  ];
  
  const budgetFrequencyOptions = [
    "Monthly", "Quarterly", "Annually", "One-time", "Other"
  ];
  
  const goalTermOptions = [
    "Short-term (1-2 years)", "Medium-term (3-5 years)", "Long-term (5+ years)"
  ];
  
  const booleanOptions = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "", label: "Any" },
  ];
  
  const brochureOptions = [
    { value: "any", label: "Any Guide" },
    { value: "brochure1", label: "PEOPLEMANAGER TRAIN. TRACK. TRANSFORM." },
    { value: "brochure2", label: "PEOPLEMANAGER: The End of Inconsistency" },
    { value: "brochure3", label: "PeopleManager: Verified Results & Case Studies" },
  ];

  // Filter only by category: New or Contacting (Contacting includes contacting, busy_wants_callback, wants_to_book, voicemail, needs_to_be_rescheduled)
  const currentProgressFilterOptions: { value: string; label: string; description: string }[] = [
    { value: "__any__", label: "Any progress", description: "" },
    { value: "new", label: "New", description: "Just entered the system. No action taken." },
    { value: "contacting", label: "Contacting", description: "Outbound in progress: Contacting, Busy wants callback, Wants to book, Voicemail, Needs to be rescheduled." },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Refine Leads</h1>
            <p className="text-gray-600 mt-2">Set filters, then view results</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/leads')}>Cancel</Button>
            <Button onClick={handleApply} disabled={isSearching} className="bg-blue-600 hover:bg-blue-700">
              {isSearching ? 'Applying...' : 'Apply Filters'}
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Quick Filters</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced((s) => !s)}
                className="flex items-center gap-1"
              >
                <Filter className="h-4 w-4" />
                {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label>Search</Label>
                <Input 
                  placeholder="Search company, email, phone..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>

              {/* Lead Source */}
              <div className="space-y-2">
                <Label>Lead Source</Label>
                <Select 
                  value={filters.lead_source || 'Any Source'} 
                  onValueChange={(v) => setFilters((f) => ({ ...f, lead_source: v === 'Any Source' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Any source" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Any Source">Any Source</SelectItem>
                    {leadSources.map((source) => (
                      <SelectItem key={source} value={source}>{source}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* IAMs (Managers Only) */}
              {isAdmin && (
                <div className="space-y-2">
                  <Label>IAMs</Label>
                  <Select
                    value={filters.advisor_id || 'any'}
                    onValueChange={(v) => setFilters((f) => ({ ...f, advisor_id: v === 'any' ? '' : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Any IAM" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any IAM</SelectItem>
                      <SelectItem value="__unassigned__">Unassigned</SelectItem>
                      {advisors
                        .filter((u) => u.user_id && u.user_id.trim() !== '')
                        .map((u) => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.fullname || u.email || u.user_id}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Visibility Scope */}
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={filters.visibility_scope || "all"}
                  onValueChange={(v) =>
                    setFilters((f) => ({
                      ...f,
                      visibility_scope: (v || "all") as "all" | "assigned_to_me" | "shared_with_me" | "shared_by_me",
                    }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="All visible leads" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All visible leads</SelectItem>
                    <SelectItem value="assigned_to_me">Assigned to me</SelectItem>
                    <SelectItem value="shared_with_me">Shared with me</SelectItem>
                    <SelectItem value="shared_by_me">Shared by me</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Share Status */}
              <div className="space-y-2">
                <Label>Share Status</Label>
                <Select
                  value={filters.share_status || "any"}
                  onValueChange={(v) =>
                    setFilters((f) => ({
                      ...f,
                      share_status: (v || "any") as "any" | "shared" | "not_shared",
                    }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="shared">Shared only</SelectItem>
                    <SelectItem value="not_shared">Not shared</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Current progress */}
              <div className="space-y-2">
                <Label>Current progress</Label>
                <Select
                  value={filters.current_progress && filters.current_progress.trim() !== '' ? filters.current_progress : '__any__'}
                  onValueChange={(v) => setFilters((f) => ({ ...f, current_progress: v === '__any__' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Any progress" /></SelectTrigger>
                  <SelectContent>
                    {currentProgressFilterOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                          {opt.description ? <span className="text-xs text-muted-foreground font-normal">{opt.description}</span> : null}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Industry */}
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={filters.industry || 'Any Industry'} onValueChange={(v) => setFilters((f) => ({ ...f, industry: v === 'Any Industry' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Any industry" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Any Industry">Any Industry</SelectItem>
                    {industryOptions.map((i) => (<SelectItem key={i} value={i}>{i}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* SIC Code */}
              <div className="space-y-2">
                <Label>SIC Code</Label>
                <Select value={filters.sic_07_code || 'Any Code'} onValueChange={(v) => setFilters((f) => ({ ...f, sic_07_code: v === 'Any Code' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Any SIC code" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Any Code">Any SIC Code</SelectItem>
                    {sicCodeOptions.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* Employee Band */}
              <div className="space-y-2">
                <Label>Employee Band</Label>
                <Select value={filters.employees_band_desc || 'Any Band'} onValueChange={(v) => setFilters((f) => ({ ...f, employees_band_desc: v === 'Any Band' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Any band" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Any Band">Any Band</SelectItem>
                    {employeeBandOptions.map((b) => (<SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* Turnover Band */}
              <div className="space-y-2">
                <Label>Turnover Band</Label>
                <Select value={filters.modeled_turnover_band_desc || 'Any Band'} onValueChange={(v) => setFilters((f) => ({ ...f, modeled_turnover_band_desc: v === 'Any Band' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Any band" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Any Band">Any Band</SelectItem>
                    {turnoverBandOptions.map((b) => (<SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* Email Opened */}
              <div className="space-y-2">
                <Label>Email Opened</Label>
                <Select
                  value={filters.email_opened === null ? 'all' : filters.email_opened ? 'opened' : 'not_opened'}
                  onValueChange={(v) => setFilters((f) => ({ ...f, email_opened: v === 'all' ? null : v === 'opened' }))}
                >
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="opened">Opened</SelectItem>
                    <SelectItem value="not_opened">Not Opened</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Email Messages */}
              <div className="space-y-2">
                <Label>Email Messages</Label>
                <Select
                  value={filters.inbound_email || 'all'}
                  onValueChange={(v) => setFilters((f) => ({ ...f, inbound_email: v === 'all' ? null : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="has_messages">Has Inbound Email Messages</SelectItem>
                    <SelectItem value="has_outbound">Has Outbound Email Messages</SelectItem>
                    <SelectItem value="no_messages">No Email Messages</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* WhatsApp Messages */}
              <div className="space-y-2">
                <Label>WhatsApp Messages</Label>
                <Select
                  value={filters.inbound_whatsapp || 'all'}
                  onValueChange={(v) => setFilters((f) => ({ ...f, inbound_whatsapp: v === 'all' ? null : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="has_messages">Has Inbound WhatsApp Messages</SelectItem>
                    <SelectItem value="has_outbound">Has Outbound WhatsApp Messages</SelectItem>
                    <SelectItem value="no_messages">No WhatsApp Messages</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Called By Filter */}
              <div className="space-y-2">
                <Label>Called By</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between items-center text-left font-normal bg-card">
                      {filters.called_by && filters.called_by.length > 0 
                        ? `${filters.called_by.length} selected`
                        : "Any Advisor"}
                      <ChevronDown className="h-4 w-4 opacity-50 ml-1 flex-shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-2 space-y-3 max-h-[300px] overflow-y-auto">
                    {calledByOptions.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-2 text-center">Loading...</div>
                    ) : (
                      calledByOptions.map((adv) => (
                        <div key={adv} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`called_by_${adv}`}
                            checked={filters.called_by?.includes(adv)}
                            onCheckedChange={(checked) => {
                              setFilters((f) => {
                                const current = f.called_by || [];
                                const next = checked 
                                  ? [...current, adv]
                                  : current.filter((a: string) => a !== adv);
                                return { ...f, called_by: next };
                              });
                            }}
                          />
                          <Label htmlFor={`called_by_${adv}`} className="text-sm font-normal py-0.5 cursor-pointer flex-1">
                            {adv}
                          </Label>
                        </div>
                      ))
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Annual Revenue */}
              <div className="space-y-2">
                <Label>Annual Revenue: £{filters.annual_revenue_range[0].toLocaleString()} - £{filters.annual_revenue_range[1].toLocaleString()}</Label>
                <Slider
                  value={filters.annual_revenue_range}
                  onValueChange={(value) => setFilters((f) => ({ ...f, annual_revenue_range: value as [number, number] }))}
                  min={0}
                  max={10000000}
                  step={10000}
                  className="flex-1"
                />
              </div>

              {/* Sentiment */}
              <div className="space-y-2">
                <Label>Sentiment</Label>
                <Select
                  value={filters.sentiment_analysis || 'all'}
                  onValueChange={(v) => setFilters((f) => ({ ...f, sentiment_analysis: v === 'all' ? null : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Any sentiment" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Sentiment</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Engagement */}
              <div className="space-y-2">
                <Label>Engagement</Label>
                <Select
                  value={filters.engaged === null ? 'all' : filters.engaged ? 'engaged' : 'not_engaged'}
                  onValueChange={(value) => setFilters((f) => ({ ...f, engaged: value === 'all' ? null : value === 'engaged' }))}
                >
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="engaged">Engaged</SelectItem>
                    <SelectItem value="not_engaged">Not Engaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Guide sent - always visible so users can clear the filter */}
              <div className="space-y-2">
                <Label>Guide sent</Label>
                <Select
                  value={filters.guide_sent && filters.guide_sent.trim() !== '' ? filters.guide_sent : 'any'}
                  onValueChange={(value) => setFilters((f) => ({ ...f, guide_sent: value === 'any' ? '' : value }))}
                >
                  <SelectTrigger><SelectValue placeholder="Any Guide" /></SelectTrigger>
                  <SelectContent>
                    {brochureOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-6 border-t mt-6">
                {/* Business Information */}
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input placeholder="Filter by business name..." value={filters.business_name}
                    onChange={(e) => setFilters((f) => ({ ...f, business_name: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <Label>Company Email</Label>
                  <Input placeholder="Filter by company email..." value={filters.company_email}
                    onChange={(e) => setFilters((f) => ({ ...f, company_email: e.target.value.trim() }))} />
                </div>

                <div className="space-y-2">
                  <Label>Business Phone</Label>
                  <Input placeholder="Filter by business phone..." value={filters.business_telephone}
                    onChange={(e) => setFilters((f) => ({ ...f, business_telephone: e.target.value.trim() }))} />
                </div>

                <div className="space-y-2">
                  <Label>Contact First Name</Label>
                  <Input placeholder="Filter by contact first name..." value={filters.contact_first_name}
                    onChange={(e) => setFilters((f) => ({ ...f, contact_first_name: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <Label>Contact Last Name</Label>
                  <Input placeholder="Filter by contact last name..." value={filters.contact_last_name}
                    onChange={(e) => setFilters((f) => ({ ...f, contact_last_name: e.target.value }))} />
                </div>
                
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input placeholder="Filter by contact email..." value={filters.contact_email}
                    onChange={(e) => setFilters((f) => ({ ...f, contact_email: e.target.value.trim() }))} />
                </div>

                <div className="space-y-2">
                  <Label>Owner</Label>
                  <Input placeholder="Filter by owner..." value={filters.owner}
                    onChange={(e) => setFilters((f) => ({ ...f, owner: e.target.value.trim() }))} />
                </div>

                {/* Independent Account Manager Assignment */}
                <div className="space-y-2">
                  <Label>Independent Account Manager</Label>
                  <Select
                    value={filters.advisor_id || 'any'}
                    onValueChange={(v) => setFilters((f) => ({ ...f, advisor_id: v === 'any' ? '' : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Any IAM" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any IAM</SelectItem>
                      <SelectItem value="__unassigned__">Unassigned</SelectItem>
                      {advisors
                        .filter((u) => u.user_id && u.user_id.trim() !== '')
                        .map((u) => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.fullname || u.email || u.user_id}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>


                {/* Business Information */}
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select value={filters.industry || 'Any Industry'} onValueChange={(v) => setFilters((f) => ({ ...f, industry: v === 'Any Industry' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Any industry" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Any Industry">Any Industry</SelectItem>
                      {industryOptions.map((i) => (<SelectItem key={i} value={i}>{i}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Company Size</Label>
                  <Select value={filters.company_size || 'Any Size'} onValueChange={(v) => setFilters((f) => ({ ...f, company_size: v === 'Any Size' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Any size" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Any Size">Any Size</SelectItem>
                      {companySizeOptions.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>


                <div className="space-y-2">
                  <Label>Major Sector</Label>
                  <Input placeholder="Filter by major sector..." value={filters.major_sector_desc}
                    onChange={(e) => setFilters((f) => ({ ...f, major_sector_desc: e.target.value.trim() }))} />
                </div>

                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input placeholder="Filter by website..." value={filters.website}
                    onChange={(e) => setFilters((f) => ({ ...f, website: e.target.value.trim() }))} />
                </div>

                <div className="space-y-2">
                  <Label>LinkedIn URL</Label>
                  <Input placeholder="Filter by LinkedIn URL..." value={filters.linkedin_company_url}
                    onChange={(e) => setFilters((f) => ({ ...f, linkedin_company_url: e.target.value.trim() }))} />
                </div>

                {/* Business Address */}
                <div className="space-y-2">
                  <Label>Business Address 1</Label>
                  <Input placeholder="Filter by address..." value={filters.business_address_1}
                    onChange={(e) => setFilters((f) => ({ ...f, business_address_1: e.target.value.trim() }))} />
                </div>

                <div className="space-y-2">
                  <Label>Business Town</Label>
                  <Input placeholder="Filter by town..." value={filters.business_town}
                    onChange={(e) => setFilters((f) => ({ ...f, business_town: e.target.value.trim() }))} />
                </div>

                <div className="space-y-2">
                  <Label>Business County</Label>
                  <Input placeholder="Filter by county..." value={filters.business_county}
                    onChange={(e) => setFilters((f) => ({ ...f, business_county: e.target.value.trim() }))} />
                </div>

                <div className="space-y-2">
                  <Label>Business Post Code</Label>
                  <Input placeholder="Filter by post code..." value={filters.business_post_code}
                    onChange={(e) => setFilters((f) => ({ ...f, business_post_code: e.target.value.trim() }))} />
                </div>

                {/* Contact Person Details */}
                <div className="space-y-2">
                  <Label>Contact Title</Label>
                  <Select value={filters.contact_title || 'Any Title'} onValueChange={(v) => setFilters((f) => ({ ...f, contact_title: v === 'Any Title' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Any title" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Any Title">Any Title</SelectItem>
                      {salutationOptions.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Contact Position</Label>
                  <Input placeholder="Filter by position..." value={filters.contact_position}
                    onChange={(e) => setFilters((f) => ({ ...f, contact_position: e.target.value.trim() }))} />
                </div>

                <div className="space-y-2">
                  <Label>Mobile Phone</Label>
                  <Input placeholder="Filter by mobile phone..." value={filters.mobile_phone}
                    onChange={(e) => setFilters((f) => ({ ...f, mobile_phone: e.target.value.trim() }))} />
                </div>

                <div className="space-y-2">
                  <Label>Other Phone</Label>
                  <Input placeholder="Filter by other phone..." value={filters.other_phone}
                    onChange={(e) => setFilters((f) => ({ ...f, other_phone: e.target.value.trim() }))} />
                </div>

                {/* National Employee Band */}
                <div className="space-y-2">
                  <Label>National Employee Band</Label>
                  <Select value={filters.national_employees_band_desc || 'Any Band'} onValueChange={(v) => setFilters((f) => ({ ...f, national_employees_band_desc: v === 'Any Band' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Any band" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Any Band">Any Band</SelectItem>
                      {employeeBandOptions.map((b) => (<SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Compliance */}
                <div className="space-y-2">
                  <Label>TPS Checked</Label>
                  <Select
                    value={filters.tps_checked === null ? 'all' : filters.tps_checked ? 'yes' : 'no'}
                    onValueChange={(v) => setFilters((f) => ({ ...f, tps_checked: v === 'all' ? null : v === 'yes' }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem value="yes">Checked</SelectItem>
                      <SelectItem value="no">Not Checked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>CTPS Checked</Label>
                  <Select
                    value={filters.ctps_checked === null ? 'all' : filters.ctps_checked ? 'yes' : 'no'}
                    onValueChange={(v) => setFilters((f) => ({ ...f, ctps_checked: v === 'all' ? null : v === 'yes' }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem value="yes">Checked</SelectItem>
                      <SelectItem value="no">Not Checked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Phone Verified</Label>
                  <Select
                    value={filters.verified_phone === null ? 'all' : filters.verified_phone ? 'yes' : 'no'}
                    onValueChange={(v) => setFilters((f) => ({ ...f, verified_phone: v === 'all' ? null : v === 'yes' }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem value="yes">Verified</SelectItem>
                      <SelectItem value="no">Not Verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Email Verified</Label>
                  <Select
                    value={filters.verified_email === null ? 'all' : filters.verified_email ? 'yes' : 'no'}
                    onValueChange={(v) => setFilters((f) => ({ ...f, verified_email: v === 'all' ? null : v === 'yes' }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem value="yes">Verified</SelectItem>
                      <SelectItem value="no">Not Verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>



                <div className="space-y-2">
                  <Label>Budget: £{filters.budget_range[0].toLocaleString()} - £{filters.budget_range[1].toLocaleString()}</Label>
                  <Slider
                    value={filters.budget_range}
                    onValueChange={(value) => setFilters((f) => ({ ...f, budget_range: value as [number, number] }))}
                    min={0}
                    max={10000000}
                    step={10000}
                    className="flex-1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Household Income: £{filters.household_income_range[0].toLocaleString()} - £{filters.household_income_range[1].toLocaleString()}</Label>
                  <Slider
                    value={filters.household_income_range}
                    onValueChange={(value) => setFilters((f) => ({ ...f, household_income_range: value as [number, number] }))}
                    min={0}
                    max={10000000}
                    step={10000}
                    className="flex-1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Active Duration: {filters.active_duration_days_range[0]} - {filters.active_duration_days_range[1]} days</Label>
                  <Slider
                    value={filters.active_duration_days_range}
                    onValueChange={(value) => setFilters((f) => ({ ...f, active_duration_days_range: value as [number, number] }))}
                    min={0}
                    max={365}
                    step={1}
                    className="flex-1"
                  />
                </div>


                {/* SMS Answered */}
                <div className="space-y-2">
                  <Label>SMS Answered</Label>
                  <Select
                    value={filters.sms_answered === null ? 'all' : filters.sms_answered ? 'answered' : 'not_answered'}
                    onValueChange={(v) => setFilters((f) => ({ ...f, sms_answered: v === 'all' ? null : v === 'answered' }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem value="answered">Answered</SelectItem>
                      <SelectItem value="not_answered">Not Answered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Charlotte Fox Score (VAPI) */}
                <div className="space-y-2">
                  <Label>Charlotte Fox Score</Label>
                  <Select
                    value={filters.vapi_score || 'all'}
                    onValueChange={(v) => setFilters((f) => ({ ...f, vapi_score: v === 'all' ? null : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Score</SelectItem>
                      <SelectItem value="0-4">Negative (0-4)</SelectItem>
                      <SelectItem value="4-7">Neutral (4-7)</SelectItem>
                      <SelectItem value="7-10">Positive (7-10)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Follow-Up */}
                <div className="space-y-2">
                  <Label>Follow-Up</Label>
                  <Select
                    value={filters.followed_up === null ? 'all' : filters.followed_up ? 'yes' : 'no'}
                    onValueChange={(v) => setFilters((f) => ({ ...f, followed_up: v === 'all' ? null : v === 'yes' }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem value="yes">Follow-Up Sent</SelectItem>
                      <SelectItem value="no">No Follow-Up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Booked */}
                <div className="space-y-2">
                  <Label>Booked</Label>
                  <Select
                    value={filters.booked === null ? 'all' : filters.booked ? 'yes' : 'no'}
                    onValueChange={(v) => setFilters((f) => ({ ...f, booked: v === 'all' ? null : v === 'yes' }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem value="yes">Booked</SelectItem>
                      <SelectItem value="no">Not Booked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Not Called Yet */}
                <div className="space-y-2">
                  <Label>Not Called Yet</Label>
                  <Select
                    value={filters.not_called_yet === null ? 'all' : filters.not_called_yet ? 'yes' : 'no'}
                    onValueChange={(v) => setFilters((f) => ({ ...f, not_called_yet: v === 'all' ? null : v === 'yes' }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem value="yes">Not Called Yet</SelectItem>
                      <SelectItem value="no">Called</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Has Notes */}
                <div className="space-y-2">
                  <Label>Has Notes</Label>
                  <Select
                    value={filters.has_notes === null ? 'all' : filters.has_notes ? 'yes' : 'no'}
                    onValueChange={(v) => setFilters((f) => ({ ...f, has_notes: v === 'all' ? null : v === 'yes' }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem value="yes">Has Notes</SelectItem>
                      <SelectItem value="no">No Notes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Preferred Contact Method */}
                <div className="space-y-2">
                  <Label>Preferred Contact Method</Label>
                  <Select
                    value={filters.preferred_contact_method || 'any'}
                    onValueChange={(v) => setFilters((f) => ({ ...f, preferred_contact_method: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Verification */}
                <div className="space-y-2">
                  <Label>Verification</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Select
                        value={filters.verified_email === null ? 'all' : filters.verified_email ? 'yes' : 'no'}
                        onValueChange={(v) => setFilters((f) => ({ ...f, verified_email: v === 'all' ? null : v === 'yes' }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any</SelectItem>
                          <SelectItem value="yes">Verified</SelectItem>
                          <SelectItem value="no">Not Verified</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone</Label>
                      <Select
                        value={filters.verified_phone === null ? 'all' : filters.verified_phone ? 'yes' : 'no'}
                        onValueChange={(v) => setFilters((f) => ({ ...f, verified_phone: v === 'all' ? null : v === 'yes' }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any</SelectItem>
                          <SelectItem value="yes">Verified</SelectItem>
                          <SelectItem value="no">Not Verified</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Sort by Last Called */}
                <div className="space-y-2">
                  <Label>Sort by Last Called</Label>
                  <Select
                    value={filters.last_called === true ? 'on' : 'off'}
                    onValueChange={(v) => setFilters((f) => ({ ...f, last_called: v === 'on' ? true : null }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Off" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="on">On</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.push('/leads')}>Cancel</Button>
          <Button onClick={handleApply} disabled={isSearching} className="bg-blue-600 hover:bg-blue-700">
            {isSearching ? 'Applying...' : 'Apply Filters'}
          </Button>
        </div>
      </div>
    </div>
  );
}
