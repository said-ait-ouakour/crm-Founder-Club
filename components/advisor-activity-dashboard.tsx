'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, RefreshCw, Clock, Activity, MousePointer, Keyboard, Grid3X3, Table, ArrowUpDown, ArrowUp, ArrowDown, Phone, PhoneCall, Loader2, Users, Shield, Check, Eye, MessageSquare, Camera, ChevronLeft, ChevronRight, X, Search } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import DateRangePicker from '@/components/date-range-picker';
import { useAuth, useIsRecruiter } from '@/contexts/auth-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

interface ActivitySummary {
  timeIn: string | null;
  timeOut: string | null;
  // Explicit variants; when present, represent times including idle periods
  timeInIncludingIdle?: string | null;
  timeOutIncludingIdle?: string | null;
  timeInActive?: string | null;
  timeOutActive?: string | null;
  hoursWorked: number;
  activityPercentage: number;
  keyboardActivity: number;
  mouseActivity: number;
  overallActivity: number;
  trackedTime: number;
  billableTime: number;
  // Additional metrics for better insights
  activeWorkTime: number;
  idleTime: number;
  activeActivitiesCount: number;
  idleActivitiesCount: number;
}

interface CallSummary {
  totalCalls: number;
  totalDuration: number;
  averageCallDuration: number;
  incomingCalls: number;
  outgoingCalls: number;
  totalCallTime: string;
  connectedCalls: number;
  missedCalls: number;
  voicemailCalls: number;
  hungUpCalls: number;
  inboundConnected: number;
  outboundConnected: number;
  inboundMissed: number;
  outboundMissed: number;
  inboundVoicemail: number;
  outboundVoicemail: number;
  inboundHungUp: number;
  outboundHungUp: number;
  resultCounts?: { [result: string]: number };
  resultCountsByDirection?: { [result: string]: { inbound: number; outbound: number } };
}

interface RingCentralCall {
  to: {
    name?: string;
    phoneNumber: string;
    extensionId?: string;
  };
  from: {
    name?: string;
    phoneNumber: string;
    extensionId?: string;
  };
  result: string; // Can be any call status
  subject?: string | null;
  duration: number;
  startTime: string;
  creationTime?: string | null;
}

interface CallsByResult {
  connected: RingCentralCall[];
  missed: RingCentralCall[];
  voicemail: RingCentralCall[];
  hungUp: RingCentralCall[];
}

interface CallsByResultAndDirection {
  inboundConnected: RingCentralCall[];
  outboundConnected: RingCentralCall[];
  inboundMissed: RingCentralCall[];
  outboundMissed: RingCentralCall[];
  inboundVoicemail: RingCentralCall[];
  outboundVoicemail: RingCentralCall[];
  inboundHungUp: RingCentralCall[];
  outboundHungUp: RingCentralCall[];
}

interface User {
  id: number;
  fullName: string;
  email: string;
  hubstaff_id?: number;
  ringcentral_id?: number;
  role: string;
  user_id?: string;
}

interface HubstaffScreenshot {
  id: number;
  url?: string;
  full_url?: string;
  thumbnail_url?: string;
  thumb_url?: string;
  time_slot: string;
  recorded_at?: string;
  date?: string;
  user_id: number;
  project_id?: number;
  created_at: string;
  updated_at?: string;
  offset_x?: number;
  offset_y?: number;
  width?: number;
  height?: number;
  screen?: number;
}

interface ScreenshotGroup {
  timeSlot: string; // Formatted time slot like "09:00 - 09:10"
  startTime: Date;
  endTime: Date;
  screenshots: HubstaffScreenshot[];
  count: number;
}

interface TeamActivityData {
  user: User;
  activities: any[];
  summary: ActivitySummary;
  calls: any[];
  callSummary: CallSummary;
  callsByResult?: CallsByResult;
  callsByResultAndDirection?: CallsByResultAndDirection;
  followupCount: number;
  newLeadsFollowup?: number;
  followedUpLeadsToday?: number;
  newCalls?: number;
  screenshots?: HubstaffScreenshot[];
}

interface TabLegaUser {
  id: number;
  fullName: string;
  email: string;
  access_granted: boolean;
  role: string;
}

interface Employee {
  id: number;
  fullname: string;
  email: string;
  user_id: string | null;
  role: string;
  is_active: boolean;
  hubstaff_id?: number | null;
  ringcentral_id?: number | null;
  peoplemanager_id?: string | null;
  ringcentral_name?: string | null;
  created_at?: string;
}

interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface ActivityResponse {
  data: TeamActivityData[];
  date: string;
  totalUsers: number;
}

export default function AdvisorActivityDashboard() {
  const { isAdmin, profile } = useAuth();
  const isRecruiter = useIsRecruiter();
  const { toast } = useToast();
  const [activityData, setActivityData] = useState<TeamActivityData[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date())
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortField, setSortField] = useState<keyof TeamActivityData['summary'] | keyof TeamActivityData['callSummary'] | 'user.fullName' | 'followupCount'>('user.fullName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [loadingCalls, setLoadingCalls] = useState<Set<number>>(new Set());
  const [loadingMeetings, setLoadingMeetings] = useState<Set<number>>(new Set());
  const [followupCounts, setFollowupCounts] = useState<{ [userId: string]: number }>({});
  const [followupDataLoaded, setFollowupDataLoaded] = useState(false);
  const [loadingFollowup, setLoadingFollowup] = useState(false);
  const [loadingFollowupByUser, setLoadingFollowupByUser] = useState<Set<number>>(new Set());
  const [followupDataLoadedByUser, setFollowupDataLoadedByUser] = useState<Set<number>>(new Set());
  const [meetingsByUser, setMeetingsByUser] = useState<{ [userId: number]: { today_meetings: number; booked_meetings: number } }>({});
  
  // Lead Distribution Control state
  const [isDistributionDialogOpen, setIsDistributionDialogOpen] = useState(false);
  const [tabLegaUsers, setTabLegaUsers] = useState<TabLegaUser[]>([]);
  const [loadingTabLegaUsers, setLoadingTabLegaUsers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  
  // Screenshot state
  const [screenshotsDialogOpen, setScreenshotsDialogOpen] = useState(false);
  const [selectedUserScreenshots, setSelectedUserScreenshots] = useState<HubstaffScreenshot[]>([]);
  const [screenshotGroups, setScreenshotGroups] = useState<ScreenshotGroup[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedUserForScreenshots, setSelectedUserForScreenshots] = useState<User | null>(null);
  const [currentScreenshotIndex, setCurrentScreenshotIndex] = useState(0);
  const [loadingScreenshots, setLoadingScreenshots] = useState<Set<number>>(new Set());
  
  // Attendance filter state
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'present' | 'absent'>('all');
  
  // Manage Employees state
  const [isManageEmployeesDialogOpen, setIsManageEmployeesDialogOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [deactivatingUserId, setDeactivatingUserId] = useState<number | null>(null);
  const [isDeactivateConfirmDialogOpen, setIsDeactivateConfirmDialogOpen] = useState(false);
  const [employeeToDeactivate, setEmployeeToDeactivate] = useState<Employee | null>(null);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');

  const fetchFollowupCounts = async (range: DateRange) => {
    if (!range.from || !range.to) return { followupCounts: {}, newLeadsFollowup: {}, followedUpLeadsToday: {}, newCalls: {} };
    
    setLoadingFollowup(true);
    try {
      const fromDateString = format(range.from, 'yyyy-MM-dd');
      const toDateString = format(range.to, 'yyyy-MM-dd');
      
      // Use POST for date ranges to avoid URL length issues, GET for single days
      const isDateRange = fromDateString !== toDateString;
      const usePost = isDateRange;
      
      let response: Response;
      if (usePost) {
        // Use POST for date ranges to avoid URL length limits
        response = await fetch('/api/advisors/followup-count', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fromDate: fromDateString,
            toDate: toDateString,
            userId: isAdmin ? undefined : profile?.id
          })
        });
      } else {
        // Use GET for single day (backward compatibility)
        const url = isAdmin 
          ? `/api/advisors/followup-count?fromDate=${fromDateString}&toDate=${toDateString}`
          : `/api/advisors/followup-count?fromDate=${fromDateString}&toDate=${toDateString}&userId=${profile?.id}`;
        response = await fetch(url);
      }
      
      if (!response.ok) {
        return { followupCounts: {}, newLeadsFollowup: {}, followedUpLeadsToday: {}, newCalls: {} };
      }
      
      const result = await response.json();
      const followupData = {
        followupCounts: result.followupCounts || {},
        newLeadsFollowup: result.newLeadsFollowup || {},
        followedUpLeadsToday: result.followedUpLeadsToday || {},
        newCalls: result.newCalls || {}
      };
      
      setFollowupCounts(followupData.followupCounts);
      
      // Update activity data with follow-up counts
      setActivityData(prev => prev.map(item => ({
        ...item,
        followupCount: followupData.followupCounts[item.user.id] || 0,
        newLeadsFollowup: followupData.newLeadsFollowup[item.user.id] || 0,
        followedUpLeadsToday: followupData.followedUpLeadsToday[item.user.id] || 0,
        newCalls: followupData.newCalls[item.user.id] || 0
      })));
      
      setFollowupDataLoaded(true);
      // Mark all users as loaded
      setFollowupDataLoadedByUser(new Set(activityData.map(item => item.user.id)));
      return followupData;
    } catch (err) {
      return { followupCounts: {}, newLeadsFollowup: {}, followedUpLeadsToday: {}, newCalls: {} };
    } finally {
      setLoadingFollowup(false);
    }
  };

  const fetchFollowupCountsForUser = async (userId: number, userUserId: string, range: DateRange) => {
    if (!userUserId || !range.from || !range.to) {
      console.error('Cannot fetch follow-up counts: missing user_id or date range for user', userId);
      return;
    }
    
    setLoadingFollowupByUser(prev => new Set(prev).add(userId));
    try {
      const fromDateString = format(range.from, 'yyyy-MM-dd');
      const toDateString = format(range.to, 'yyyy-MM-dd');
      
      // Use POST for date ranges to avoid URL length issues, GET for single days
      const isDateRange = fromDateString !== toDateString;
      const usePost = isDateRange;
      
      let response: Response;
      if (usePost) {
        // Use POST for date ranges to avoid URL length limits
        response = await fetch('/api/advisors/followup-count', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fromDate: fromDateString,
            toDate: toDateString,
            userId: userUserId
          })
        });
      } else {
        // Use GET for single day (backward compatibility)
        const url = `/api/advisors/followup-count?fromDate=${fromDateString}&toDate=${toDateString}&userId=${userUserId}`;
        response = await fetch(url);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching follow-up counts for user ${userId}:`, response.status, errorText);
        return;
      }
      
      const result = await response.json();
      const followupData = {
        followupCounts: result.followupCounts || {},
        newLeadsFollowup: result.newLeadsFollowup || {},
        followedUpLeadsToday: result.followedUpLeadsToday || {},
        newCalls: result.newCalls || {}
      };
      
      // Update activity data with follow-up counts for this specific user
      setActivityData(prev => prev.map(item => {
        if (item.user.id === userId) {
          return {
            ...item,
            followupCount: followupData.followupCounts[userId] || 0,
            newLeadsFollowup: followupData.newLeadsFollowup[userId] || 0,
            followedUpLeadsToday: followupData.followedUpLeadsToday[userId] || 0,
            newCalls: followupData.newCalls[userId] || 0
          };
        }
        return item;
      }));
      
      setFollowupDataLoadedByUser(prev => new Set(prev).add(userId));
    } catch (err) {
      console.error('Error fetching follow-up counts for user:', err);
    } finally {
      setLoadingFollowupByUser(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const fetchActivityData = async (range: DateRange) => {
    if (!range.from || !range.to) return;
    
    setLoading(true);
    setError(null);
    setActivityData([]); // Clear existing data immediately
    
    try {
      const fromDateString = format(range.from, 'yyyy-MM-dd');
      const toDateString = format(range.to, 'yyyy-MM-dd');
      
      // Use POST for date ranges to avoid URL length issues, GET for single days
      const isDateRange = fromDateString !== toDateString;
      const usePost = isDateRange;
      
      let response: Response;
      if (usePost) {
        // Use POST for date ranges to avoid URL length limits
        response = await fetch('/api/hubstaff/activity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fromDate: fromDateString,
            toDate: toDateString,
            userId: isAdmin ? undefined : profile?.id
          })
        });
      } else {
        // Use GET for single day (backward compatibility)
      const url = isAdmin 
          ? `/api/hubstaff/activity?fromDate=${fromDateString}&toDate=${toDateString}`
          : `/api/hubstaff/activity?fromDate=${fromDateString}&toDate=${toDateString}&userId=${profile?.id}`;
        response = await fetch(url);
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to fetch activity data (Status: ${response.status})`;
        console.error('Error fetching activity data:', errorMessage, errorData);
        throw new Error(errorMessage);
      }
      
      const data: ActivityResponse = await response.json();
      
      // Check if we got empty data and log a warning
      if (data.data.length === 0) {
        console.warn('No activity data returned for date range:', fromDateString, 'to', toDateString);
      }
      
      // Don't fetch follow-up counts automatically - user must click button
      // Add default values for follow-up counts (will be loaded on demand)
      const enrichedData = data.data.map(item => ({
        ...item,
        followupCount: 0,
        newLeadsFollowup: 0,
        followedUpLeadsToday: 0,
        newCalls: 0
      }));
      
      setActivityData(enrichedData);
      setFollowupDataLoaded(false); // Reset when new activity data is loaded
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error in fetchActivityData:', err);
      setError(errorMessage);
      
      // Show toast notification for better user feedback
      toast({
        title: 'Error fetching activity data',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Quick filter functions
  const setQuickFilter = (filter: 'today' | 'thisWeek' | 'lastWeek' | 'lastMonth') => {
    const today = new Date();
    let from: Date, to: Date;

    switch (filter) {
      case 'today':
        from = startOfDay(today);
        to = endOfDay(today);
        break;
      case 'thisWeek':
        from = startOfDay(startOfWeek(today, { weekStartsOn: 1 })); // Monday
        to = endOfDay(today);
        break;
      case 'lastWeek':
        const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        const lastWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        from = startOfDay(lastWeekStart);
        to = endOfDay(lastWeekEnd);
        break;
      case 'lastMonth':
        const lastMonthStart = startOfMonth(subMonths(today, 1));
        const lastMonthEnd = endOfMonth(subMonths(today, 1));
        from = startOfDay(lastMonthStart);
        to = endOfDay(lastMonthEnd);
        break;
    }

    setDateRange({ from, to });
  };

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      fetchActivityData(dateRange);
    }
  }, [dateRange.from, dateRange.to]);

  const getActivityColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100 text-green-800';
    if (percentage >= 60) return 'bg-yellow-100 text-yellow-800';
    if (percentage >= 40) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getTimeColor = (timeIn: string | null, timeOut: string | null) => {
    if (!timeIn || !timeOut) return 'text-gray-500';
    
    const timeInHour = parseInt(timeIn.split(':')[0]);
    const timeInMinute = parseInt(timeIn.split(':')[1] || '0');
    const timeOutHour = parseInt(timeOut.split(':')[0]);
    const timeOutMinute = parseInt(timeOut.split(':')[1] || '0');
    
    // Working hours: 9am-6pm (9:00 to 18:00)
    const timeInMinutes = timeInHour * 60 + timeInMinute;
    const timeOutMinutes = timeOutHour * 60 + timeOutMinute;
    const workStartMinutes = 9 * 60; // 9:00 AM
    const workEndMinutes = 18 * 60; // 6:00 PM (18:00)
    
    // Check if within working hours
    if (timeInMinutes >= workStartMinutes && timeOutMinutes <= workEndMinutes) {
      return 'text-green-600';
    }
    // Check if slightly outside (within 1 hour)
    if (timeInMinutes >= workStartMinutes - 60 && timeOutMinutes <= workEndMinutes + 60) {
      return 'text-yellow-600';
    }
    return 'text-red-600';
  };

  // Get working hours warning message
  // Working hours: 9:00am - 6:00pm
  // Rules:
  // - timeIn < 09:00 → Good (early start, no warning)
  // - timeIn = 09:00 → Good (on time, no warning)
  // - timeIn > 09:00 → Not good (late start, show warning) - STRICT: > not >=
  // - timeOut < 18:00 → Not good (left early, show warning) - STRICT: < not <=
  // - timeOut = 18:00 → Good (on time, no warning)
  // - timeOut > workEndMinutes → Good (worked past end time, no warning)
  // For PM CRM: Standard hours are 9am-1pm, except Andre who works 9am-6pm
  const getWorkingHoursWarning = (timeIn: string | null, timeOut: string | null, userName?: string | null): string | null => {
    if (!timeIn || !timeOut) return null;
    
    const timeInHour = parseInt(timeIn.split(':')[0]);
    const timeInMinute = parseInt(timeIn.split(':')[1] || '0');
    const timeOutHour = parseInt(timeOut.split(':')[0]);
    const timeOutMinute = parseInt(timeOut.split(':')[1] || '0');
    
    const timeInMinutes = timeInHour * 60 + timeInMinute;
    const timeOutMinutes = timeOutHour * 60 + timeOutMinute;
    const workStartMinutes = 9 * 60; // 9:00 AM (540 minutes)
    
    // Check if user is Andre Brown (case-insensitive check)
    // For PM CRM: Andre Brown (id: 5, fullname: "Andre Brown") works 9am-6pm, all others work 9am-1pm
    const isAndre = userName && userName.toLowerCase().trim() === 'andre brown';
    
    // Standard hours: 9am-1pm (13:00), except Andre: 9am-6pm (18:00)
    const workEndMinutes = isAndre ? 18 * 60 : 13 * 60; // 6:00 PM for Andre, 1:00 PM for others
    const workEndTime = isAndre ? '6:00pm' : '1:00pm';
    
    // Strict comparisons: > 9am for late start, < workEndMinutes for early finish
    const isLateStart = timeInMinutes > workStartMinutes; // Strict: > not >=
    const isEarlyFinish = timeOutMinutes < workEndMinutes; // Strict: < not <=
    
    // Only show warning if there's an issue
    if (isLateStart && isEarlyFinish) {
      return `Late start (after 9:00am) & Left early (before ${workEndTime})`;
    } else if (isLateStart) {
      return 'Late start (after 9:00am)';
    } else if (isEarlyFinish) {
      return `Left early (before ${workEndTime})`;
    }
    
    // Early start (before 9am) and late finish (after workEndMinutes) are good - no warning
    return null;
  };

  // Determine attendance status
  const getAttendanceStatus = (hoursWorked: number): 'present' | 'absent' => {
    return hoursWorked > 0 ? 'present' : 'absent';
  };

  const getCallStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('connected')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (statusLower.includes('missed')) return 'bg-red-50 text-red-700 border-red-200';
    if (statusLower.includes('voicemail')) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (statusLower.includes('hang up') || statusLower.includes('hangup')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (statusLower.includes('busy')) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (statusLower.includes('rejected')) return 'bg-pink-50 text-pink-700 border-pink-200';
    if (statusLower.includes('no answer') || statusLower.includes('noanswer')) return 'bg-gray-50 text-gray-700 border-gray-200';
    if (statusLower.includes('failed')) return 'bg-red-100 text-red-800 border-red-300';
    if (statusLower.includes('blocked')) return 'bg-slate-50 text-slate-700 border-slate-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getCallStatusDotColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('connected')) return 'bg-blue-500';
    if (statusLower.includes('missed')) return 'bg-red-500';
    if (statusLower.includes('voicemail')) return 'bg-yellow-500';
    if (statusLower.includes('hang up') || statusLower.includes('hangup')) return 'bg-purple-500';
    if (statusLower.includes('busy')) return 'bg-orange-500';
    if (statusLower.includes('rejected')) return 'bg-pink-500';
    if (statusLower.includes('no answer') || statusLower.includes('noanswer')) return 'bg-gray-500';
    if (statusLower.includes('failed')) return 'bg-red-600';
    if (statusLower.includes('blocked')) return 'bg-slate-500';
    return 'bg-gray-500';
  };

  const getCallStatusTextColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('connected')) return 'text-blue-600';
    if (statusLower.includes('missed')) return 'text-red-600';
    if (statusLower.includes('voicemail')) return 'text-yellow-600';
    if (statusLower.includes('hang up') || statusLower.includes('hangup')) return 'text-purple-600';
    if (statusLower.includes('busy')) return 'text-orange-600';
    if (statusLower.includes('rejected')) return 'text-pink-600';
    if (statusLower.includes('no answer') || statusLower.includes('noanswer')) return 'text-gray-600';
    if (statusLower.includes('failed')) return 'text-red-700';
    if (statusLower.includes('blocked')) return 'text-slate-600';
    return 'text-gray-600';
  };

  const formatHours = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatTime = (time: string | null) => {
    if (!time) return '--:--';
    return time;
  };

  const handleSort = (field: keyof TeamActivityData['summary'] | keyof TeamActivityData['callSummary'] | 'user.fullName' | 'followupCount') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedData = () => {
    return [...activityData].sort((a, b) => {
      let aValue: any, bValue: any;
      
      if (sortField === 'user.fullName') {
        aValue = a.user.fullName.toLowerCase();
        bValue = b.user.fullName.toLowerCase();
      } else if (sortField === 'followupCount') {
        aValue = a.followupCount;
        bValue = b.followupCount;
      } else if (sortField in a.callSummary) {
        aValue = a.callSummary[sortField as keyof CallSummary];
        bValue = b.callSummary[sortField as keyof CallSummary];
      } else {
        aValue = a.summary[sortField as keyof ActivitySummary];
        bValue = b.summary[sortField as keyof ActivitySummary];
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const fetchCallsForUser = async (userId: number) => {
    if (!dateRange.from || !dateRange.to) return;
    
    setLoadingCalls(prev => new Set(prev).add(userId));
    
    try {
      const fromDateString = format(dateRange.from, 'yyyy-MM-dd');
      const toDateString = format(dateRange.to, 'yyyy-MM-dd');
      const response = await fetch(
        `/api/ringcentral/calls?userId=${userId}&fromDate=${fromDateString}&toDate=${toDateString}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch calls');
      }
      
      const data = await response.json();
      
      // Update the activity data with the new call information
      setActivityData(prev => prev.map(item => 
        item.user.id === userId 
          ? { 
              ...item, 
              calls: data.calls, 
              callSummary: data.callSummary, 
              callsByResult: data.callsByResult,
              callsByResultAndDirection: data.callsByResultAndDirection
            }
          : item
      ));
    } catch (error) {
      // You could add a toast notification here
    } finally {
      setLoadingCalls(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const postMeetingsWebhook = async (advisorName: string, fromDateISO: string, toDateISO: string) => {
    // Using the same webhook as calls (duplicated here intentionally per requirement)
    const WEBHOOK_URL = 'https://hook.eu2.make.com/d6wv58ipkwdtyn93zqg0d9x1dluqhrn6';
    const payload = {
      type: 'meetings',
      advisor_name: advisorName,
      from_date: fromDateISO,
      to_date: toDateISO,
    } as const;
    const resp = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText);
      throw new Error(text);
    }
    // Some webhooks return text/plain; parse defensively
    const raw = await resp.text();
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Attempt to convert Python-like single-quoted JSON to valid JSON
      try {
        const fixed = raw
          .trim()
          .replace(/None/g, 'null')
          .replace(/True/g, 'true')
          .replace(/False/g, 'false')
          .replace(/'\s*:\s*'/g, '":"')
          .replace(/'\s*:\s*(\d+)/g, '":$1')
          .replace(/'([A-Za-z0-9_]+)'/g, '"$1"');
        parsed = JSON.parse(fixed);
      } catch {
        // leave parsed as {}
      }
    }
    return parsed ?? {};
  };

  const extractMeetingsCounts = (result: any): { today: number; booked: number } => {
    if (!result) return { today: 0, booked: 0 };
    // If array, use first element
    const obj = Array.isArray(result) ? result[0] : result;
    // Handle various possible shapes/keys and string numbers
    const candidates: Array<[any, any]> = [
      [obj.today_meetings, obj.booked_meetings],
      [obj?.data?.today_meetings, obj?.data?.booked_meetings],
      [obj.todayMeetings, obj.bookedMeetings],
      [obj.meetings_today, obj.meetings_booked],
    ];
    for (const [t, b] of candidates) {
      const todayNum = Number(t);
      const bookedNum = Number(b);
      if (!Number.isNaN(todayNum) || !Number.isNaN(bookedNum)) {
        return { today: Number.isNaN(todayNum) ? 0 : todayNum, booked: Number.isNaN(bookedNum) ? 0 : bookedNum };
      }
    }
    return { today: 0, booked: 0 };
  };

  const fetchMeetingsForUser = async (userId: number, advisorName: string) => {
    if (!dateRange.from || !dateRange.to) return;
    
    setLoadingMeetings(prev => new Set(prev).add(userId));
    try {
      const fromDateString = format(dateRange.from, 'yyyy-MM-dd');
      const toDateString = format(dateRange.to, 'yyyy-MM-dd');
      const result = await postMeetingsWebhook(advisorName, fromDateString, toDateString);
      const { today, booked } = extractMeetingsCounts(result);
      setMeetingsByUser(prev => ({ ...prev, [userId]: { today_meetings: today, booked_meetings: booked } }));
    } catch (error) {
    } finally {
      setLoadingMeetings(prev => {
        const ns = new Set(prev);
        ns.delete(userId);
        return ns;
      });
    }
  };

  /**
   * Group screenshots by 10-minute intervals
   */
  const groupScreenshotsByTimeSlot = (screenshots: HubstaffScreenshot[]): ScreenshotGroup[] => {
    if (screenshots.length === 0) return [];

    // Sort screenshots by time
    const sorted = [...screenshots].sort((a, b) => {
      const timeA = new Date(a.recorded_at || a.time_slot).getTime();
      const timeB = new Date(b.recorded_at || b.time_slot).getTime();
      return timeA - timeB;
    });

    const groups: ScreenshotGroup[] = [];
    const groupMap = new Map<string, HubstaffScreenshot[]>();

    // Group by 10-minute intervals
    sorted.forEach((screenshot) => {
      const timestamp = new Date(screenshot.recorded_at || screenshot.time_slot);
      
      // Round down to nearest 10 minutes
      const minutes = timestamp.getMinutes();
      const roundedMinutes = Math.floor(minutes / 10) * 10;
      const slotStart = new Date(timestamp);
      slotStart.setMinutes(roundedMinutes, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + 10);

      // Create a key for this time slot
      const slotKey = `${format(slotStart, 'HH:mm')} - ${format(slotEnd, 'HH:mm')}`;

      if (!groupMap.has(slotKey)) {
        groupMap.set(slotKey, []);
      }
      groupMap.get(slotKey)!.push(screenshot);
    });

    // Convert map to array of groups
    groupMap.forEach((screenshotsInSlot, slotKey) => {
      const firstScreenshot = screenshotsInSlot[0];
      const timestamp = new Date(firstScreenshot.recorded_at || firstScreenshot.time_slot);
      const minutes = timestamp.getMinutes();
      const roundedMinutes = Math.floor(minutes / 10) * 10;
      const slotStart = new Date(timestamp);
      slotStart.setMinutes(roundedMinutes, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + 10);

      groups.push({
        timeSlot: slotKey,
        startTime: slotStart,
        endTime: slotEnd,
        screenshots: screenshotsInSlot,
        count: screenshotsInSlot.length,
      });
    });

    // Sort groups by start time
    return groups.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  };

  const fetchScreenshotsForUser = async (user: User) => {
    if (!user.hubstaff_id || !user.user_id || !dateRange.from || !dateRange.to) {
      toast({
        title: 'Error',
        description: 'User does not have Hubstaff ID configured or date range is missing',
        variant: 'destructive',
      });
      return;
    }

    // Only allow screenshots for single day (daily range)
    // Compare dates by normalizing to start of day to ignore time differences
    const fromDateNormalized = startOfDay(dateRange.from);
    const toDateNormalized = startOfDay(dateRange.to);
    const isDailyRange = fromDateNormalized.getTime() === toDateNormalized.getTime();
    if (!isDailyRange) {
      toast({
        title: 'Screenshots Unavailable',
        description: 'Screenshots are only available for single day selections. Please select a single date.',
        variant: 'destructive',
      });
      return;
    }

    setLoadingScreenshots(prev => new Set(prev).add(user.id));
    try {
      const fromDateString = format(dateRange.from, 'yyyy-MM-dd');
      const toDateString = format(dateRange.to, 'yyyy-MM-dd');
      // Use date range parameters for API call
      const response = await fetch(
        `/api/hubstaff/screenshots?fromDate=${fromDateString}&toDate=${toDateString}&userId=${user.user_id}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch screenshots');
      }

      const data = await response.json();
      const screenshots: HubstaffScreenshot[] = data.screenshots || [];

      if (screenshots.length === 0) {
        toast({
          title: 'No Screenshots',
          description: `No screenshots available for ${user.fullName} on ${format(dateRange.from, 'MMM dd, yyyy')}`,
        });
        return;
      }

      // Group screenshots by 10-minute intervals
      const groups = groupScreenshotsByTimeSlot(screenshots);
      
      // Set initial state: show first group by default
      setScreenshotGroups(groups);
      setSelectedUserForScreenshots(user);
      setCurrentScreenshotIndex(0);
      
      if (groups.length > 0) {
        setSelectedTimeSlot(groups[0].timeSlot);
        setSelectedUserScreenshots(groups[0].screenshots);
      }
      
      setScreenshotsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching screenshots:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch screenshots. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingScreenshots(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.id);
        return newSet;
      });
    }
  };

  const handleTimeSlotClick = (timeSlot: string) => {
    const group = screenshotGroups.find(g => g.timeSlot === timeSlot);
    if (group) {
      setSelectedTimeSlot(timeSlot);
      setSelectedUserScreenshots(group.screenshots);
      setCurrentScreenshotIndex(0);
    }
  };

  const handlePreviousScreenshot = () => {
    setCurrentScreenshotIndex(prev => 
      prev > 0 ? prev - 1 : selectedUserScreenshots.length - 1
    );
  };

  const handleNextScreenshot = () => {
    setCurrentScreenshotIndex(prev => 
      prev < selectedUserScreenshots.length - 1 ? prev + 1 : 0
    );
  };

  // Keyboard navigation for screenshots
  useEffect(() => {
    if (!screenshotsDialogOpen || selectedUserScreenshots.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentScreenshotIndex(prev => 
          prev > 0 ? prev - 1 : selectedUserScreenshots.length - 1
        );
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentScreenshotIndex(prev => 
          prev < selectedUserScreenshots.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setScreenshotsDialogOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screenshotsDialogOpen, selectedUserScreenshots.length]);

  // Lead Distribution Control functions
  const fetchTabLegaUsers = async () => {
    setLoadingTabLegaUsers(true);
    try {
      const response = await fetch('/api/users/tab-lega');
      if (!response.ok) {
        throw new Error('Failed to fetch tab-lega users');
      }
      const data = await response.json();
      setTabLegaUsers(data.users || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load tab-lega users",
        variant: "destructive",
      });
    } finally {
      setLoadingTabLegaUsers(false);
    }
  };

  const handleEnableLeadAssignment = async (userId: number, currentStatus: boolean) => {
    setUpdatingUserId(userId);
    try {
      const response = await fetch('/api/users/update-access', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          accessGranted: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user access');
      }

      const data = await response.json();
      
      // Update local state
      setTabLegaUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, access_granted: !currentStatus }
          : user
      ));

      toast({
        title: "Success",
        description: data.message,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user access",
        variant: "destructive",
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleOpenDistributionDialog = () => {
    setIsDistributionDialogOpen(true);
    fetchTabLegaUsers();
  };

  // Manage Employees functions
  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      const data = await response.json();
      setEmployees(data.data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive",
      });
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleDeactivateClick = (employee: Employee) => {
    setEmployeeToDeactivate(employee);
    setIsDeactivateConfirmDialogOpen(true);
  };

  const handleDeactivateEmployee = async () => {
    if (!employeeToDeactivate) return;

    setDeactivatingUserId(employeeToDeactivate.id);
    try {
      const response = await fetch('/api/users/deactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: employeeToDeactivate.id,
          employeeName: employeeToDeactivate.fullname,
          employeeEmail: employeeToDeactivate.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to deactivate employee');
      }

      const data = await response.json();
      
      // Update local state
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeToDeactivate.id 
          ? { ...emp, is_active: false }
          : emp
      ));

      toast({
        title: "Success",
        description: data.message || "Employee deactivated successfully",
      });

      setIsDeactivateConfirmDialogOpen(false);
      setEmployeeToDeactivate(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deactivate employee",
        variant: "destructive",
      });
    } finally {
      setDeactivatingUserId(null);
    }
  };

  const handleOpenManageEmployeesDialog = () => {
    setIsManageEmployeesDialogOpen(true);
    setEmployeeSearchQuery('');
    fetchEmployees();
  };

  // Filter employees by search query
  const filteredEmployees = useMemo(() => {
    if (!employeeSearchQuery.trim()) {
      return employees;
    }
    
    const query = employeeSearchQuery.toLowerCase().trim();
    return employees.filter(emp => 
      emp.fullname?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.role?.toLowerCase().includes(query)
    );
  }, [employees, employeeSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
                  <h1 className="text-3xl font-bold tracking-tight">
          {isAdmin ? 'Team Performance Dashboard' : 'My Performance Dashboard'}
        </h1>
        <p className="text-muted-foreground">
          {isAdmin 
            ? 'Monitor team productivity, work hours, and activity metrics'
            : isRecruiter
            ? 'Track your recruitment performance and activity metrics'
            : 'Track your daily productivity, work hours, and activity metrics'
          }
        </p>
          {isAdmin && viewMode === 'table' && sortField && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <span>Sorted by:</span>
              <Badge variant="outline" className="text-xs">
                                 {sortField === 'user.fullName' ? 'Advisor Name' : 
                  sortField === 'timeIn' ? 'Time In' :
                  sortField === 'timeOut' ? 'Time Out' :
                  sortField === 'hoursWorked' ? 'Hours Worked' :
                  sortField === 'activityPercentage' ? 'Activity %' :
                  sortField === 'keyboardActivity' ? 'Keyboard' :
                  sortField === 'mouseActivity' ? 'Mouse' :
                  sortField === 'trackedTime' ? 'Tracked Time' :
                  sortField === 'totalCalls' ? 'Total Calls' :
                  sortField === 'totalDuration' ? 'Call Duration' :
                  sortField === 'incomingCalls' ? 'Incoming Calls' :
                  sortField === 'outgoingCalls' ? 'Outgoing Calls' :
                  sortField === 'hungUpCalls' ? 'Hang Up Calls' :
                  sortField === 'followupCount' ? 'Follow-ups' : sortField}
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              </Badge>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Lead Distribution Control - Only for Admins */}
          {isAdmin && (
            <Button
              onClick={handleOpenDistributionDialog}
              variant="outline"
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              Lead Distribution Control
            </Button>
          )}

          {/* Manage Employees - Only for Admins */}
          {isAdmin && (
            <Button
              onClick={handleOpenManageEmployeesDialog}
              variant="outline"
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              Manage Employees
            </Button>
          )}

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-2 border rounded-md p-1">
              <Button 
              variant="ghost"
              size="sm"
              onClick={() => setQuickFilter('today')}
                disabled={loading}
              className="h-8 text-xs"
              >
              Today
              </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQuickFilter('thisWeek')}
              disabled={loading}
              className="h-8 text-xs"
            >
              This Week
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQuickFilter('lastWeek')}
              disabled={loading}
              className="h-8 text-xs"
            >
              Last Week
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQuickFilter('lastMonth')}
              disabled={loading}
              className="h-8 text-xs"
            >
              Last Month
            </Button>
          </div>

          {/* Date Range Picker */}
          <DateRangePicker
            dateRange={dateRange}
            onSelect={(range) => {
              if (!loading && range.from && range.to) {
                setDateRange(range);
                  }
                }}
                disabled={loading}
              />
          
          <Button 
            onClick={() => dateRange.from && dateRange.to && fetchActivityData(dateRange)}
            disabled={loading || !dateRange.from || !dateRange.to}
            variant="outline"
            size="icon"
            className={cn(loading && "opacity-50")}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>

          {/* Fetch Follow-up Metrics Button */}
          <Button 
            onClick={() => dateRange.from && dateRange.to && fetchFollowupCounts(dateRange)}
            disabled={loadingFollowup || loading || !activityData.length || !dateRange.from || !dateRange.to}
            variant="outline"
            className="gap-2"
          >
            <Users className={cn("h-4 w-4", loadingFollowup && "animate-spin")} />
            {loadingFollowup ? 'Loading...' : followupDataLoaded ? 'Refresh Follow-ups' : 'Fetch Follow-ups'}
          </Button>

          {/* Attendance Filter - Only show for managers */}
          {isAdmin && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Users className="h-4 w-4" />
                  {attendanceFilter === 'all' ? 'All' : attendanceFilter === 'present' ? 'Present' : 'Absent'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="space-y-1">
                  <Button
                    variant={attendanceFilter === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setAttendanceFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={attendanceFilter === 'present' ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setAttendanceFilter('present')}
                  >
                    Present
                  </Button>
                  <Button
                    variant={attendanceFilter === 'absent' ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setAttendanceFilter('absent')}
                  >
                    Absent
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* View Toggle - Only show for managers */}
          {isAdmin && (
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                disabled={loading}
                className="rounded-r-none border-0"
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                disabled={loading}
                className="rounded-l-none border-0"
              >
                <Table className="h-4 w-4 mr-2" />
                Table
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Activity Data - Show based on view mode and user role */}
      {!loading && activityData.length > 0 && (
        <>
          {isAdmin ? (
            // Manager view - show cards/table for all users
            viewMode === 'cards' ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activityData
                  .filter((item) => {
                    const status = getAttendanceStatus(item.summary.hoursWorked);
                    if (attendanceFilter === 'all') return true;
                    return status === attendanceFilter;
                  })
                  .map((item) => {
                    const attendanceStatus = getAttendanceStatus(item.summary.hoursWorked);
                    const timeIn = item.summary.timeInActive ?? item.summary.timeInIncludingIdle ?? item.summary.timeIn;
                    const timeOut = item.summary.timeOutActive ?? item.summary.timeOutIncludingIdle ?? item.summary.timeOut;
                    const workingHoursWarning = getWorkingHoursWarning(timeIn, timeOut, item.user.fullName || (item.user as any).fullname);
                    
                    return (
                  <Card 
                    key={item.user.id} 
                    className={cn(
                      "hover:shadow-md transition-shadow",
                      attendanceStatus === 'absent' && "border-red-300",
                      attendanceStatus === 'present' && "border-green-300"
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold">
                          {item.user.fullName}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              attendanceStatus === 'present'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                            }
                          >
                            {attendanceStatus === 'present' ? 'Present' : 'Absent'}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {item.user.role}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.user.email}</p>
                      {workingHoursWarning && (
                        <Badge variant="outline" className="mt-1 bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                          ⚠️ {workingHoursWarning}
                        </Badge>
                      )}
                    </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Time Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Time In
                        </div>
                        <p className={cn(
                          "font-medium",
                          getTimeColor(
                            item.summary.timeInActive ?? item.summary.timeInIncludingIdle ?? item.summary.timeIn,
                            item.summary.timeOutActive ?? item.summary.timeOutIncludingIdle ?? item.summary.timeOut
                          )
                        )}>
                          {formatTime(item.summary.timeInActive ?? item.summary.timeInIncludingIdle ?? item.summary.timeIn)}
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Time Out
                        </div>
                        <p className={cn(
                          "font-medium",
                          getTimeColor(
                            item.summary.timeInActive ?? item.summary.timeInIncludingIdle ?? item.summary.timeIn,
                            item.summary.timeOutActive ?? item.summary.timeOutIncludingIdle ?? item.summary.timeOut
                          )
                        )}>
                          {formatTime(item.summary.timeOutActive ?? item.summary.timeOutIncludingIdle ?? item.summary.timeOut)}
                        </p>
                      </div>
                    </div>

                    {/* Hours Worked */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Hours Worked
                      </div>
                      <p className="text-2xl font-bold">
                        {formatHours(item.summary.hoursWorked)}
                      </p>
                    </div>

                    {/* Activity Percentage */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Activity className="h-3 w-3" />
                        Activity
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getActivityColor(item.summary.activityPercentage)}>
                          {item.summary.activityPercentage}%
                        </Badge>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(item.summary.activityPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Activity Details */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Keyboard className="h-3 w-3" />
                          Keyboard
                        </div>
                        <p className="text-sm font-medium">{item.summary.keyboardActivity}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MousePointer className="h-3 w-3" />
                          Mouse
                        </div>
                        <p className="text-sm font-medium">{item.summary.mouseActivity}</p>
                      </div>
                    </div>

                    {/* Additional Metrics */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Tracked Time</div>
                        <p className="text-sm font-medium">
                          {Math.round(item.summary.trackedTime / 60)}m
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Billable Time</div>
                        <p className="text-sm font-medium">
                          {Math.round(item.summary.billableTime / 60)}m
                        </p>
                      </div>
                    </div>

                    {/* Follow-up Metrics */}
                    <div className="pt-2 border-t space-y-2">
                      {!followupDataLoaded && !followupDataLoadedByUser.has(item.user.id) ? (
                        <div className="text-center py-2 space-y-2">
                          <p className="text-xs text-muted-foreground">Follow-up metrics not loaded</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (item.user.user_id && dateRange.from && dateRange.to) {
                                fetchFollowupCountsForUser(item.user.id, item.user.user_id, dateRange);
                              } else {
                                toast({
                                  title: 'Error',
                                  description: 'Missing user ID or date range. Please try again.',
                                  variant: 'destructive',
                                });
                              }
                            }}
                            disabled={loadingFollowupByUser.has(item.user.id)}
                            className="h-7 px-2 text-xs w-full"
                          >
                            {loadingFollowupByUser.has(item.user.id) ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                <Users className="h-3 w-3 mr-1" />
                                Fetch Follow-ups
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Users className="h-3 w-3" />
                              New Leads Follow-up
                            </div>
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              {item.newLeadsFollowup ?? 0}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MessageSquare className="h-3 w-3" />
                              Followed Up Leads
                            </div>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {item.followedUpLeadsToday ?? 0}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              New Calls
                            </div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {item.newCalls ?? 0}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (item.user.user_id && dateRange.from && dateRange.to) {
                                fetchFollowupCountsForUser(item.user.id, item.user.user_id, dateRange);
                              }
                            }}
                            disabled={loadingFollowupByUser.has(item.user.id)}
                            className="h-7 px-2 text-xs w-full mt-2"
                          >
                            {loadingFollowupByUser.has(item.user.id) ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Refreshing...
                              </>
                            ) : (
                              'Refresh Follow-ups'
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                    
                    {/* Screenshots and Link to detailed page */}
                    <div className="pt-2 border-t space-y-2">
                      {item.user.hubstaff_id && dateRange.from && dateRange.to && startOfDay(dateRange.from).getTime() === startOfDay(dateRange.to).getTime() && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            fetchScreenshotsForUser(item.user);
                          }}
                          disabled={loadingScreenshots.has(item.user.id)}
                        >
                          {loadingScreenshots.has(item.user.id) ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <Camera className="h-4 w-4 mr-2" />
                              View Screenshots
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        asChild
                      >
                        <a href={`/advisors/${item.user.user_id || item.user.id}`} className="flex items-center justify-center gap-2">
                          <Eye className="h-4 w-4" />
                          View Detailed Report
                        </a>
                      </Button>
                    </div>

                    {/* Call Metrics */}
                    {item.user.ringcentral_id && (
                      <>
                      <div className="pt-2 border-t">
                        {item.callSummary.totalCalls > 0 ? (
                          <>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                              <Phone className="h-3 w-3" />
                              Call Activity
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Total Calls</div>
                                <p className="text-sm font-medium">{item.callSummary.totalCalls}</p>
                              </div>
                              
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Call Time</div>
                                <p className="text-sm font-medium">{item.callSummary.totalCallTime}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <PhoneCall className="h-3 w-3" />
                                  Incoming
                                </div>
                                <p className="text-sm font-medium">{item.callSummary.incomingCalls}</p>
                              </div>
                              
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  Outgoing
                                </div>
                                <p className="text-sm font-medium">{item.callSummary.outgoingCalls}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t">
                              {/* Display all call statuses dynamically */}
                              {item.callSummary.resultCounts && Object.keys(item.callSummary.resultCounts).length > 0 ? (
                                Object.entries(item.callSummary.resultCounts)
                                  .sort(([a], [b]) => a.localeCompare(b))
                                  .map(([status, count]) => {
                                    const directionData = item.callSummary.resultCountsByDirection?.[status] || { inbound: 0, outbound: 0 };
                                    return (
                                      <div key={status} className="space-y-1">
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <div className={cn("w-2 h-2 rounded-full", getCallStatusDotColor(status))}></div>
                                          {status}
                                        </div>
                                        <p className={cn("text-sm font-medium", getCallStatusTextColor(status))}>
                                          {count}
                                        </p>
                                        {(directionData.inbound > 0 || directionData.outbound > 0) && (
                                          <div className="flex gap-1 text-xs">
                                            <span className="text-blue-500">In: {directionData.inbound}</span>
                                            <span className="text-green-500">Out: {directionData.outbound}</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                              ) : (
                                // Fallback to original display for backward compatibility
                                <>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                      Connected
                                    </div>
                                    <p className="text-sm font-medium text-blue-600">{item.callSummary.connectedCalls}</p>
                                    <div className="flex gap-1 text-xs">
                                      <span className="text-blue-500">In: {item.callSummary.inboundConnected}</span>
                                      <span className="text-green-500">Out: {item.callSummary.outboundConnected}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                      Missed
                                    </div>
                                    <p className="text-sm font-medium text-red-600">{item.callSummary.missedCalls}</p>
                                    <div className="flex gap-1 text-xs">
                                      <span className="text-red-500">In: {item.callSummary.inboundMissed}</span>
                                      <span className="text-orange-500">Out: {item.callSummary.outboundMissed}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                      Voicemail
                                    </div>
                                    <p className="text-sm font-medium text-yellow-600">{item.callSummary.voicemailCalls}</p>
                                    <div className="flex gap-1 text-xs">
                                      <span className="text-yellow-500">In: {item.callSummary.inboundVoicemail}</span>
                                      <span className="text-amber-500">Out: {item.callSummary.outboundVoicemail}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                      Hang Up
                                    </div>
                                    <p className="text-sm font-medium text-purple-600">{item.callSummary.hungUpCalls}</p>
                                    <div className="flex gap-1 text-xs">
                                      <span className="text-purple-500">In: {item.callSummary.inboundHungUp}</span>
                                      <span className="text-violet-500">Out: {item.callSummary.outboundHungUp}</span>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              Call Data
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fetchCallsForUser(item.user.id)}
                                disabled={loadingCalls.has(item.user.id)}
                                className="h-7 px-2 text-xs"
                              >
                                {loadingCalls.has(item.user.id) ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Loading...
                                  </>
                                ) : (
                                  'Show Calls'
                                )}
                              </Button>
                            </div>
                          </div>
                          
                        )}
                      </div>
                      {/* Meetings Data section under Call Data */}
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            Meetings Data
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fetchMeetingsForUser(item.user.id, item.user.fullName || item.user.email || '')}
                            disabled={loadingMeetings.has(item.user.id)}
                            className="h-7 px-2 text-xs"
                          >
                            {loadingMeetings.has(item.user.id) ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              'View Meetings'
                            )}
                          </Button>
                        </div>
                        {meetingsByUser[item.user.id] && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <div>
                              Today's Meetings: <span className="font-medium text-gray-900">{meetingsByUser[item.user.id].today_meetings}</span>
                            </div>
                            <div>
                              Booked Meetings: <span className="font-medium text-gray-900">{meetingsByUser[item.user.id].booked_meetings}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      </>
                    )}
                  </CardContent>
                </Card>
                    );
                  })}
              </div>
            ) : (
              // Manager table view
              <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('user.fullName')}
                            className="h-auto p-0 font-medium text-gray-500 hover:text-gray-700 hover:bg-transparent"
                          >
                            <div className="flex items-center gap-1">
                              Advisor
                              {sortField === 'user.fullName' ? (
                                sortDirection === 'asc' ? (
                                  <ArrowUp className="h-3 w-3" />
                                ) : (
                                  <ArrowDown className="h-3 w-3" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-gray-400" />
                              )}
                            </div>
                          </Button>
                        </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attendance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('timeIn')}
                          className="h-auto p-0 font-medium text-gray-500 hover:text-gray-700 hover:bg-transparent"
                        >
                          <div className="flex items-center gap-1">
                            Time In
                            {sortField === 'timeIn' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('timeOut')}
                          className="h-auto p-0 font-medium text-gray-500 hover:text-gray-700 hover:bg-transparent"
                        >
                          <div className="flex items-center gap-1">
                            Time Out
                            {sortField === 'timeOut' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('hoursWorked')}
                          className="h-auto p-0 font-medium text-gray-500 hover:text-gray-700 hover:bg-transparent"
                        >
                          <div className="flex items-center gap-1">
                            Hours
                            {sortField === 'hoursWorked' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('activityPercentage')}
                          className="h-auto p-0 font-medium text-gray-500 hover:text-gray-700 hover:bg-transparent"
                        >
                          <div className="flex items-center gap-1">
                            Activity
                            {sortField === 'activityPercentage' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('keyboardActivity')}
                          className="h-auto p-0 font-medium text-gray-500 hover:text-gray-700 hover:bg-transparent"
                        >
                          <div className="flex items-center gap-1">
                            Keyboard
                            {sortField === 'keyboardActivity' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('mouseActivity')}
                          className="h-auto p-0 font-medium text-gray-500 hover:text-gray-700 hover:bg-transparent"
                        >
                          <div className="flex items-center gap-1">
                            Mouse
                            {sortField === 'mouseActivity' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('trackedTime')}
                          className="h-auto p-0 font-medium text-gray-500 hover:text-gray-700 hover:bg-transparent"
                        >
                          <div className="flex items-center gap-1">
                            Tracked
                            {sortField === 'trackedTime' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('totalCalls')}
                          className="h-auto p-0 font-medium text-gray-500 hover:text-gray-700 hover:bg-transparent"
                        >
                          <div className="flex items-center gap-1">
                            Calls
                            {sortField === 'totalCalls' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('totalDuration')}
                          className="h-auto p-0 font-medium text-gray-500 hover:text-gray-700 hover:bg-transparent"
                        >
                          <div className="flex items-center gap-1">
                            Call Time
                            {sortField === 'totalDuration' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex flex-col gap-1">
                          <span>Follow-up Metrics</span>
                          <span className="text-xs font-normal normal-case text-gray-400">New / Followed / Calls</span>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('connectedCalls')}
                          className="h-auto p-0 font-medium text-gray-500 hover:text-gray-700 hover:bg-transparent"
                        >
                          <div className="flex items-center gap-1">
                            Connected
                            {sortField === 'connectedCalls' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('missedCalls')}
                          className="h-auto p-0 font-medium text-gray-500 hover:text-gray-700 hover:bg-transparent"
                        >
                          <div className="flex items-center gap-1">
                            Missed
                            {sortField === 'missedCalls' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('voicemailCalls')}
                          className="h-auto p-0 font-medium text-gray-500 hover:text-gray-700 hover:bg-transparent"
                        >
                          <div className="flex items-center gap-1">
                            Voicemail
                            {sortField === 'voicemailCalls' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('hungUpCalls')}
                          className="h-auto p-0 font-medium text-gray-500 hover:text-gray-700 hover:bg-transparent"
                        >
                          <div className="flex items-center gap-1">
                            Hang Up
                            {sortField === 'hungUpCalls' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('inboundConnected')}
                          className="h-auto p-0 font-medium text-gray-500 hover:text-gray-700 hover:bg-transparent"
                        >
                          <div className="flex items-center gap-1">
                            Inbound Connected
                            {sortField === 'inboundConnected' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('outboundConnected')}
                          className="h-auto p-0 font-medium text-gray-500 hover:text-gray-700 hover:bg-transparent"
                        >
                          <div className="flex items-center gap-1">
                            Outbound Connected
                            {sortField === 'outboundConnected' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getSortedData()
                      .filter((item) => {
                        const status = getAttendanceStatus(item.summary.hoursWorked);
                        if (attendanceFilter === 'all') return true;
                        return status === attendanceFilter;
                      })
                      .map((item) => {
                        const attendanceStatus = getAttendanceStatus(item.summary.hoursWorked);
                        const timeIn = item.summary.timeInActive ?? item.summary.timeInIncludingIdle ?? item.summary.timeIn;
                        const timeOut = item.summary.timeOutActive ?? item.summary.timeOutIncludingIdle ?? item.summary.timeOut;
                        const workingHoursWarning = getWorkingHoursWarning(timeIn, timeOut, item.user.fullName || (item.user as any).fullname);
                        
                        return (
                      <tr 
                        key={item.user.id} 
                        className={cn(
                          "hover:bg-gray-50",
                          attendanceStatus === 'absent' && "bg-red-50",
                          attendanceStatus === 'present' && "bg-white"
                        )}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.user.fullName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.user.email}
                            </div>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {item.user.role}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <Badge
                              className={
                                attendanceStatus === 'present'
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : 'bg-red-100 text-red-800 border-red-200'
                              }
                            >
                              {attendanceStatus === 'present' ? 'Present' : 'Absent'}
                            </Badge>
                            {workingHoursWarning && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                                ⚠️ {workingHoursWarning}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn(
                            "text-sm font-medium",
                            getTimeColor(
                              item.summary.timeInActive ?? item.summary.timeInIncludingIdle ?? item.summary.timeIn,
                              item.summary.timeOutActive ?? item.summary.timeOutIncludingIdle ?? item.summary.timeOut
                            )
                          )}>
                            {formatTime(item.summary.timeInActive ?? item.summary.timeInIncludingIdle ?? item.summary.timeIn)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn(
                            "text-sm font-medium",
                            getTimeColor(
                              item.summary.timeInActive ?? item.summary.timeInIncludingIdle ?? item.summary.timeIn,
                              item.summary.timeOutActive ?? item.summary.timeOutIncludingIdle ?? item.summary.timeOut
                            )
                          )}>
                            {formatTime(item.summary.timeOutActive ?? item.summary.timeOutIncludingIdle ?? item.summary.timeOut)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            {formatHours(item.summary.hoursWorked)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Badge className={getActivityColor(item.summary.activityPercentage)}>
                              {item.summary.activityPercentage}%
                            </Badge>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(item.summary.activityPercentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.summary.keyboardActivity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.summary.mouseActivity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Math.round(item.summary.trackedTime / 60)}m
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.callSummary.totalCalls}</span>
                            {item.callSummary.totalCalls > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span className="text-green-600">↗{item.callSummary.outgoingCalls}</span>
                                <span className="text-blue-600">↙{item.callSummary.incomingCalls}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.callSummary.totalCalls > 0 ? (
                            <div>
                              <div className="font-medium">{item.callSummary.totalCallTime}</div>
                              <div className="text-xs text-muted-foreground">
                                Avg: {Math.round(item.callSummary.averageCallDuration)}s
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {!followupDataLoaded && !followupDataLoadedByUser.has(item.user.id) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (item.user.user_id && dateRange.from && dateRange.to) {
                                    fetchFollowupCountsForUser(item.user.id, item.user.user_id, dateRange);
                                  }
                                }}
                                disabled={loadingFollowupByUser.has(item.user.id)}
                                className="h-7 px-2 text-xs"
                              >
                                {loadingFollowupByUser.has(item.user.id) ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Loading...
                                  </>
                                ) : (
                                  <>
                                    <Users className="h-3 w-3 mr-1" />
                                    Fetch
                                  </>
                                )}
                              </Button>
                            ) : (
                              <>
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                                  New Leads: {item.newLeadsFollowup ?? 0}
                                </Badge>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                  Followed Up: {item.followedUpLeadsToday ?? 0}
                                </Badge>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                  New Calls: {item.newCalls ?? 0}
                                </Badge>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {item.callSummary.connectedCalls}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {item.callSummary.missedCalls}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            {item.callSummary.voicemailCalls}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            {item.callSummary.hungUpCalls}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                              In: {item.callSummary.inboundConnected}
                            </Badge>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                              Out: {item.callSummary.outboundConnected}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-2">
                            {/* Link to detailed page */}
                            <Button
                              size="sm"
                              variant="default"
                              asChild
                              className="h-7 px-2 text-xs"
                            >
                              <a href={`/advisors/${item.user.user_id || item.user.id}`} className="flex items-center justify-center gap-1">
                                <Eye className="h-3 w-3" />
                                View Details
                              </a>
                            </Button>
                            {/* Calls row */}
                            <div className="flex items-center gap-2">
                            {item.user.ringcentral_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fetchCallsForUser(item.user.id)}
                                disabled={loadingCalls.has(item.user.id)}
                                className="h-7 px-2 text-xs"
                              >
                                {loadingCalls.has(item.user.id) ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Loading...
                                  </>
                                ) : (
                                  'Show Calls'
                                )}
                              </Button>
                            )}
                            </div>
                            {/* Screenshots row */}
                            {item.user.hubstaff_id && dateRange.from && dateRange.to && startOfDay(dateRange.from).getTime() === startOfDay(dateRange.to).getTime() && (
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    fetchScreenshotsForUser(item.user);
                                  }}
                                  disabled={loadingScreenshots.has(item.user.id)}
                                  className="h-7 px-2 text-xs cursor-pointer"
                                >
                                  {loadingScreenshots.has(item.user.id) ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Loading...
                                    </>
                                  ) : (
                                    <>
                                      <Camera className="h-3 w-3 mr-1" />
                                      Screenshots
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                            {/* Meetings row */}
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => fetchMeetingsForUser(item.user.id, item.user.fullName)}
                                  disabled={loadingMeetings.has(item.user.id)}
                                  className="h-7 px-2 text-xs"
                                >
                                  {loadingMeetings.has(item.user.id) ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Sending...
                                    </>
                                  ) : (
                                    'View Meetings'
                                  )}
                                </Button>
                              </div>
                              {meetingsByUser[item.user.id] && (
                                <div className="text-xs text-muted-foreground">
                                  <div>
                                    Today's Meetings: <span className="font-medium text-gray-900">{meetingsByUser[item.user.id].today_meetings}</span>
                                  </div>
                                  <div>
                                    Booked Meetings: <span className="font-medium text-gray-900">{meetingsByUser[item.user.id].booked_meetings}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )
          ) : (
            // Advisor/Recruiter view - show personal dashboard
            activityData.length > 0 && (
              <div className="space-y-6">
                {activityData.map((item) => (
                  <div key={item.user.id} className="space-y-6">
                    {/* Main Activity Dashboard */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
                      {/* Hours Worked */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Hours Worked</p>
                              <p className="text-3xl font-bold">{formatHours(item.summary.hoursWorked)}</p>
                            </div>
                            <Clock className="h-8 w-8 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Activity Percentage */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Activity</p>
                              <p className="text-3xl font-bold">{item.summary.activityPercentage}%</p>
                            </div>
                            <Activity className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div className="mt-4">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(item.summary.activityPercentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Keyboard Activity */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Keyboard</p>
                              <p className="text-3xl font-bold">{item.summary.keyboardActivity}</p>
                            </div>
                            <Keyboard className="h-8 w-8 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Mouse Activity */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Mouse</p>
                              <p className="text-3xl font-bold">{item.summary.mouseActivity}</p>
                            </div>
                            <MousePointer className="h-8 w-8 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>

                      {/* New Leads Follow-up */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">New Leads Follow-up</p>
                              {followupDataLoaded || followupDataLoadedByUser.has(item.user.id) ? (
                                <p className="text-3xl font-bold text-orange-600">{item.newLeadsFollowup ?? 0}</p>
                              ) : (
                                <p className="text-lg text-muted-foreground">--</p>
                              )}
                            </div>
                            <Users className="h-8 w-8 text-orange-600" />
                          </div>
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">
                              {followupDataLoaded || followupDataLoadedByUser.has(item.user.id) ? 'First call today' : 'Click button below'}
                            </p>
                            {!followupDataLoaded && !followupDataLoadedByUser.has(item.user.id) && item.user.user_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (item.user.user_id && dateRange.from && dateRange.to) {
                                    fetchFollowupCountsForUser(item.user.id, item.user.user_id, dateRange);
                                  }
                                }}
                                disabled={loadingFollowupByUser.has(item.user.id)}
                                className="h-7 px-2 text-xs w-full mt-2"
                              >
                                {loadingFollowupByUser.has(item.user.id) ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Loading...
                                  </>
                                ) : (
                                  'Fetch Follow-ups'
                                )}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Followed Up Leads */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Followed Up Leads</p>
                              {followupDataLoaded || followupDataLoadedByUser.has(item.user.id) ? (
                                <p className="text-3xl font-bold text-blue-600">{item.followedUpLeadsToday ?? 0}</p>
                              ) : (
                                <p className="text-lg text-muted-foreground">--</p>
                              )}
                            </div>
                            <MessageSquare className="h-8 w-8 text-blue-600" />
                          </div>
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">
                              {followupDataLoaded || followupDataLoadedByUser.has(item.user.id) ? 'Leads called today' : 'Click button above'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* New Calls */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">New Calls</p>
                              {followupDataLoaded || followupDataLoadedByUser.has(item.user.id) ? (
                                <p className="text-3xl font-bold text-green-600">{item.newCalls ?? 0}</p>
                              ) : (
                                <p className="text-lg text-muted-foreground">--</p>
                              )}
                            </div>
                            <Phone className="h-8 w-8 text-green-600" />
                          </div>
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">
                              {followupDataLoaded || followupDataLoadedByUser.has(item.user.id) ? 'First-time calls today' : 'Click button above'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Time Information */}
                    <div className="grid gap-6 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Time Tracking</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Time In</p>
                              <p className={cn(
                                "text-lg font-semibold",
                                getTimeColor(
                                  item.summary.timeInActive ?? item.summary.timeInIncludingIdle ?? item.summary.timeIn,
                                  item.summary.timeOutActive ?? item.summary.timeOutIncludingIdle ?? item.summary.timeOut
                                )
                              )}>
                                {formatTime(item.summary.timeInActive ?? item.summary.timeInIncludingIdle ?? item.summary.timeIn)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Time Out</p>
                              <p className={cn(
                                "text-lg font-semibold",
                                getTimeColor(
                                  item.summary.timeInActive ?? item.summary.timeInIncludingIdle ?? item.summary.timeIn,
                                  item.summary.timeOutActive ?? item.summary.timeOutIncludingIdle ?? item.summary.timeOut
                                )
                              )}>
                                {formatTime(item.summary.timeOutActive ?? item.summary.timeOutIncludingIdle ?? item.summary.timeOut)}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                            <div>
                              <p className="text-sm text-muted-foreground">Tracked Time</p>
                              <p className="text-lg font-semibold">
                                {Math.round(item.summary.trackedTime / 60)}m
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Billable Time</p>
                              <p className="text-lg font-semibold">
                                {Math.round(item.summary.billableTime / 60)}m
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Call Activity */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Call Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {item.user.ringcentral_id ? (
                            item.callSummary.totalCalls > 0 ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Total Calls</p>
                                    <p className="text-2xl font-bold">{item.callSummary.totalCalls}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Call Time</p>
                                    <p className="text-2xl font-bold">{item.callSummary.totalCallTime}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Incoming</p>
                                    <p className="text-lg font-semibold">{item.callSummary.incomingCalls}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Outgoing</p>
                                    <p className="text-lg font-semibold">{item.callSummary.outgoingCalls}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                  {/* Display all call statuses dynamically */}
                                  {item.callSummary.resultCounts && Object.keys(item.callSummary.resultCounts).length > 0 ? (
                                    Object.entries(item.callSummary.resultCounts)
                                      .sort(([a], [b]) => a.localeCompare(b))
                                      .map(([status, count]) => {
                                        const directionData = item.callSummary.resultCountsByDirection?.[status] || { inbound: 0, outbound: 0 };
                                        return (
                                          <div key={status}>
                                            <p className="text-sm text-muted-foreground">{status}</p>
                                            <p className={cn("text-lg font-semibold", getCallStatusTextColor(status))}>{count}</p>
                                            {(directionData.inbound > 0 || directionData.outbound > 0) && (
                                              <div className="flex gap-2 mt-1">
                                                <span className="text-xs text-blue-500">In: {directionData.inbound}</span>
                                                <span className="text-xs text-green-500">Out: {directionData.outbound}</span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })
                                  ) : (
                                    // Fallback to original display for backward compatibility
                                    <>
                                      <div>
                                        <p className="text-sm text-muted-foreground">Connected</p>
                                        <p className="text-lg font-semibold text-blue-600">{item.callSummary.connectedCalls}</p>
                                        <div className="flex gap-2 mt-1">
                                          <span className="text-xs text-blue-500">In: {item.callSummary.inboundConnected}</span>
                                          <span className="text-xs text-green-500">Out: {item.callSummary.outboundConnected}</span>
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">Missed</p>
                                        <p className="text-lg font-semibold text-red-600">{item.callSummary.missedCalls}</p>
                                        <div className="flex gap-2 mt-1">
                                          <span className="text-xs text-red-500">In: {item.callSummary.inboundMissed}</span>
                                          <span className="text-xs text-orange-500">Out: {item.callSummary.outboundMissed}</span>
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">Voicemail</p>
                                        <p className="text-lg font-semibold text-yellow-600">{item.callSummary.voicemailCalls}</p>
                                        <div className="flex gap-2 mt-1">
                                          <span className="text-xs text-yellow-500">In: {item.callSummary.inboundVoicemail}</span>
                                          <span className="text-xs text-amber-500">Out: {item.callSummary.outboundVoicemail}</span>
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">Hang Up</p>
                                        <p className="text-lg font-semibold text-purple-600">{item.callSummary.hungUpCalls}</p>
                                        <div className="flex gap-2 mt-1">
                                          <span className="text-xs text-purple-500">In: {item.callSummary.inboundHungUp}</span>
                                          <span className="text-xs text-violet-500">Out: {item.callSummary.outboundHungUp}</span>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground mb-3">No call data available</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => fetchCallsForUser(item.user.id)}
                                  disabled={loadingCalls.has(item.user.id)}
                                >
                                  {loadingCalls.has(item.user.id) ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Loading...
                                    </>
                                  ) : (
                                    'Load Call Data'
                                  )}
                                </Button>
                              </div>
                            )
                          ) : (
                            <div className="text-center py-4">
                              <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">RingCentral ID not configured</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && activityData.length === 0 && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Activity Data</h3>
              <p className="text-muted-foreground">
                No activity data found for {dateRange.from && dateRange.to ? (
                  dateRange.from.getTime() === dateRange.to.getTime() 
                    ? format(dateRange.from, 'PPP', { locale: enGB })
                    : `${format(dateRange.from, 'PPP', { locale: enGB })} - ${format(dateRange.to, 'PPP', { locale: enGB })}`
                ) : 'selected date range'}. 
                {isAdmin 
                  ? 'Make sure users have tracking IDs configured. Call data is available on-demand.'
                  : isRecruiter
                  ? 'Make sure you have a tracking ID configured for recruitment activities. Call data is available on-demand.'
                  : 'Make sure you have a tracking ID configured. Call data is available on-demand.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
              <p className="text-muted-foreground">Loading activity data for {dateRange.from && dateRange.to ? (
                dateRange.from.getTime() === dateRange.to.getTime() 
                  ? format(dateRange.from, 'PPP', { locale: enGB })
                  : `${format(dateRange.from, 'PPP', { locale: enGB })} - ${format(dateRange.to, 'PPP', { locale: enGB })}`
              ) : 'selected date range'}...</p>
              <p className="text-sm text-muted-foreground mt-2">
                {isAdmin 
                  ? 'Fetching activity data for all team members...'
                  : isRecruiter
                  ? 'Fetching your recruitment activity data...'
                  : 'Fetching your activity data...'
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Note: Call data is available on-demand via "Show Calls" buttons
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lead Distribution Control Dialog */}
      <Dialog open={isDistributionDialogOpen} onOpenChange={setIsDistributionDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Lead Distribution Control
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {loadingTabLegaUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : tabLegaUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tab-lega users found
              </div>
            ) : (
              <div className="space-y-2">
                {tabLegaUsers.map((user) => (
                  <Card key={user.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{user.fullName}</h4>
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                          {user.access_granted && (
                            <Badge className="bg-green-500 text-white text-xs gap-1">
                              <Check className="h-3 w-3" />
                              Access Granted
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Button
                        onClick={() => handleEnableLeadAssignment(user.id, user.access_granted)}
                        disabled={updatingUserId === user.id}
                        variant={user.access_granted ? "outline" : "default"}
                        className={cn(
                          "ml-4",
                          user.access_granted 
                            ? "hover:bg-red-50 hover:text-red-600 hover:border-red-300" 
                            : "bg-green-600 hover:bg-green-700"
                        )}
                      >
                        {updatingUserId === user.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : user.access_granted ? (
                          "Revoke Access"
                        ) : (
                          "Enable Lead Assignment"
                        )}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total Users: {tabLegaUsers.length}</span>
              <span>Access Granted: {tabLegaUsers.filter(u => u.access_granted).length}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Employees Dialog */}
      <Dialog open={isManageEmployeesDialogOpen} onOpenChange={(open) => {
        setIsManageEmployeesDialogOpen(open);
        if (!open) {
          setEmployeeSearchQuery('');
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Manage Employees
            </DialogTitle>
          </DialogHeader>
          
          {/* Search Bar */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees by name, email, or role..."
              value={employeeSearchQuery}
              onChange={(e) => setEmployeeSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-4 mt-4">
            {loadingEmployees ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {employeeSearchQuery.trim() 
                  ? "No employees found matching your search"
                  : "No employees found"}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEmployees.map((employee) => (
                  <Card key={employee.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{employee.fullname}</h4>
                          <Badge variant="outline" className="text-xs">
                            {employee.role}
                          </Badge>
                          {employee.is_active === true ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                              Deactivated
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{employee.email}</p>
                      </div>
                      <Button
                        onClick={() => handleDeactivateClick(employee)}
                        disabled={employee.is_active === false || deactivatingUserId === employee.id}
                        variant={employee.is_active === false ? "outline" : "destructive"}
                        className="ml-4"
                      >
                        {deactivatingUserId === employee.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deactivating...
                          </>
                        ) : employee.is_active === false ? (
                          "Deactivated"
                        ) : (
                          "Deactivate"
                        )}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total Employees: {employees.length}</span>
              <span>Active: {employees.filter(e => e.is_active === true).length}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={isDeactivateConfirmDialogOpen} onOpenChange={setIsDeactivateConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-600" />
              Deactivate Employee
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently deactivate the employee account and remove their authentication.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Warning Section */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="font-semibold text-yellow-900 mb-2">This action will:</p>
              <ul className="list-disc list-inside space-y-1 text-yellow-800 text-sm">
                <li>Deactivate the employee account</li>
                <li>Permanently remove their authentication (cannot log in again)</li>
                <li>Revoke access to lead assignment</li>
              </ul>
            </div>

            {/* Employee Details */}
            {employeeToDeactivate && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <p className="font-medium mb-2">Employee Details:</p>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Email:</span> {employeeToDeactivate.email}</p>
                  <p><span className="font-medium">Role:</span> {employeeToDeactivate.role}</p>
                </div>
              </div>
            )}

            <p className="text-sm text-gray-600">
              This action is permanent. The employee's authentication will be permanently removed and they will not be able to log in again.
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateEmployee}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deactivatingUserId !== null}
            >
              {deactivatingUserId !== null ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                "Yes, Deactivate"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Screenshots Dialog */}
      <Dialog open={screenshotsDialogOpen} onOpenChange={setScreenshotsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Screenshots - {selectedUserForScreenshots?.fullName}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({dateRange.from && dateRange.to ? (
                  dateRange.from.getTime() === dateRange.to.getTime() 
                    ? format(dateRange.from, 'MMM dd, yyyy')
                    : `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
                ) : 'Date range'})
              </span>
            </DialogTitle>
          </DialogHeader>
          
          {screenshotGroups.length > 0 && (
            <div className="flex flex-col gap-4 mt-4">
              {/* Time Slot Groups */}
              <div className="border-b pb-3">
                <div className="text-sm font-medium text-muted-foreground mb-2">Time Slots (10-minute intervals)</div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {screenshotGroups.map((group) => (
                    <button
                      key={group.timeSlot}
                      onClick={() => handleTimeSlotClick(group.timeSlot)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                        selectedTimeSlot === group.timeSlot
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      {group.timeSlot}
                      <span className={cn(
                        "ml-2 px-1.5 py-0.5 rounded text-xs",
                        selectedTimeSlot === group.timeSlot
                          ? "bg-blue-700 text-white"
                          : "bg-gray-200 text-gray-600"
                      )}>
                        {group.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Screenshot Navigation Info */}
              {selectedUserScreenshots.length > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
                    <span>
                      Screenshot {currentScreenshotIndex + 1} of {selectedUserScreenshots.length} in {selectedTimeSlot}
                    </span>
                    {selectedUserScreenshots[currentScreenshotIndex] && (
                      <span>
                        {format(new Date(selectedUserScreenshots[currentScreenshotIndex].recorded_at || selectedUserScreenshots[currentScreenshotIndex].time_slot), 'HH:mm:ss')}
                      </span>
                    )}
                  </div>

                  {/* Screenshot Display */}
                  <div className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center min-h-[500px]">
                    {selectedUserScreenshots[currentScreenshotIndex] && (
                      <>
                        <img
                          src={(selectedUserScreenshots[currentScreenshotIndex] as any).url || (selectedUserScreenshots[currentScreenshotIndex] as any).full_url}
                          alt={`Screenshot ${currentScreenshotIndex + 1}`}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            const screenshot = selectedUserScreenshots[currentScreenshotIndex] as any;
                            const fallbackUrl = screenshot.thumbnail_url || screenshot.thumb_url || '';
                            if (fallbackUrl && target.src !== fallbackUrl) {
                              target.src = fallbackUrl;
                            }
                          }}
                        />
                        
                        {/* Navigation Arrows */}
                        {selectedUserScreenshots.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                              onClick={handlePreviousScreenshot}
                            >
                              <ChevronLeft className="h-6 w-6" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                              onClick={handleNextScreenshot}
                            >
                              <ChevronRight className="h-6 w-6" />
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  {/* Thumbnail Strip */}
                  {selectedUserScreenshots.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 pt-2 border-t">
                      {selectedUserScreenshots.map((screenshot, index) => (
                        <button
                          key={screenshot.id}
                          onClick={() => setCurrentScreenshotIndex(index)}
                          className={cn(
                            "flex-shrink-0 w-24 h-16 rounded border-2 overflow-hidden transition-all",
                            currentScreenshotIndex === index
                              ? "border-blue-500 ring-2 ring-blue-200"
                              : "border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100"
                          )}
                        >
                          <img
                            src={(screenshot as any).thumbnail_url || (screenshot as any).thumb_url || (screenshot as any).url || (screenshot as any).full_url}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {screenshotGroups.length === 0 && selectedUserScreenshots.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No screenshots available for this time period
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Attendance List Section - At the bottom */}
      {isAdmin && !loading && activityData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Attendance List
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => dateRange.from && dateRange.to && fetchActivityData(dateRange)}
                  disabled={loading || !dateRange.from || !dateRange.to}
                  className="gap-2"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  Refresh Attendance
                </Button>
                <div className="flex items-center gap-2 border rounded-md p-1">
                  <Button
                    variant={attendanceFilter === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setAttendanceFilter('all')}
                    className="h-8 text-xs"
                  >
                    All
                  </Button>
                  <Button
                    variant={attendanceFilter === 'present' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setAttendanceFilter('present')}
                    className="h-8 text-xs bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                  >
                    Present
                  </Button>
                  <Button
                    variant={attendanceFilter === 'absent' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setAttendanceFilter('absent')}
                    className="h-8 text-xs bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                  >
                    Absent
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Advisor</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Time In</th>
                    <th className="text-left py-3 px-4 font-semibold">Time Out</th>
                    <th className="text-left py-3 px-4 font-semibold">Hours Worked</th>
                    <th className="text-left py-3 px-4 font-semibold">Working Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {activityData
                    .filter((item) => {
                      const status = getAttendanceStatus(item.summary.hoursWorked);
                      if (attendanceFilter === 'all') return true;
                      return status === attendanceFilter;
                    })
                    .map((item) => {
                      const status = getAttendanceStatus(item.summary.hoursWorked);
                      const timeIn = item.summary.timeInActive ?? item.summary.timeInIncludingIdle ?? item.summary.timeIn;
                      const timeOut = item.summary.timeOutActive ?? item.summary.timeOutIncludingIdle ?? item.summary.timeOut;
                      const workingHoursWarning = getWorkingHoursWarning(timeIn, timeOut, item.user.fullName || (item.user as any).fullname);
                      
                      return (
                        <tr key={item.user.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">{item.user.fullName || (item.user as any).fullname}</td>
                          <td className="py-3 px-4">
                            <Badge
                              className={
                                status === 'present'
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : 'bg-red-100 text-red-800 border-red-200'
                              }
                            >
                              {status === 'present' ? 'Present' : 'Absent'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {timeIn ? formatTime(timeIn) : '--'}
                          </td>
                          <td className="py-3 px-4">
                            {timeOut ? formatTime(timeOut) : '--'}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {formatHours(item.summary.hoursWorked)}
                          </td>
                          <td className="py-3 px-4">
                            {item.summary.hoursWorked > 0 ? (
                              workingHoursWarning ? (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                  {workingHoursWarning}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Within Hours
                                </Badge>
                              )
                            ) : (
                              <span className="text-muted-foreground text-sm">--</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
