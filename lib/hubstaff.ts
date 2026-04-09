// Hubstaff API Service
// Handles authentication and activity data fetching

import { HubstaffTokenManager } from './hubstaff-token-manager';
import { HubstaffServerTokenManager } from './hubstaff-server-token-manager';

interface HubstaffActivity {
  id: number;
  date: string;
  created_at: string;
  updated_at: string;
  time_slot: string;
  starts_at: string;
  user_id: number;
  project_id: number;
  task_id: number | null;
  keyboard: number;
  mouse: number;
  overall: number;
  tracked: number;
  input_tracked: number;
  tracks_input: boolean;
  billable: boolean;
  paid: boolean;
  client_invoiced: boolean;
  team_invoiced: boolean;
  immutable: boolean;
  time_type: string;
  client: string;
}

interface HubstaffActivitiesResponse {
  activities: HubstaffActivity[];
  pagination?: {
    next_page_start_id?: number | null;
  };
}

interface HubstaffDailyActivity {
  id: number;
  date: string;
  user_id: number;
  project_id: number;
  task_id: number;
  keyboard: number;
  mouse: number;
  overall: number;
  tracked: number;
  input_tracked: number;
  manual: number;
  idle: number;
  resumed: number;
  billable: number;
  work_break: number;
  created_at: string;
  updated_at: string;
}

interface HubstaffDailyActivitiesResponse {
  daily_activities: HubstaffDailyActivity[];
  pagination?: {
    next_page_start_id?: number | null;
  };
}

interface HubstaffScreenshot {
  id: number;
  full_url?: string;
  thumb_url?: string;
  url?: string; // Alias for full_url for backward compatibility
  thumbnail_url?: string; // Alias for thumb_url for backward compatibility
  date: string;
  created_at: string;
  updated_at: string;
  time_slot: string;
  recorded_at: string;
  user_id: number;
  project_id?: number;
  offset_x?: number;
  offset_y?: number;
  width?: number;
  height?: number;
  screen?: number;
}

interface HubstaffScreenshotsResponse {
  screenshots: HubstaffScreenshot[];
  pagination?: {
    next_page_start_id?: number | null;
  };
}

export class HubstaffService {
  private static readonly ORGANIZATION_ID = "4482";
  private static readonly N8N_VARIABLES_ENDPOINT = 'https://n8n.aipersonalassistants.ai/webhook/variables';
  
  // Token caching to prevent multiple requests
  private static cachedToken: string | null = null;
  private static tokenExpiry: number = 0;
  private static readonly TOKEN_CACHE_DURATION = 50 * 60 * 1000; // 50 minutes (tokens typically last 1 hour)

  /**
   * Get the current UK timezone offset in hours
   * UK switches between GMT (UTC+0) and BST (UTC+1)
   */
  private static getUKTimezoneOffset(date: Date): number {
    // Create a date in UK timezone to determine if it's GMT or BST
    const ukDate = new Date(date.toLocaleString("en-US", {timeZone: "Europe/London"}));
    const utcDate = new Date(date.toLocaleString("en-US", {timeZone: "UTC"}));
    
    // Calculate the difference in hours
    const offsetMs = ukDate.getTime() - utcDate.getTime();
    const offsetHours = offsetMs / (1000 * 60 * 60);
    
    return offsetHours;
  }

  /**
   * Adjust date for UK timezone using dynamic offset calculation
   */
  private static adjustDateForUKTimezone(dateString: string): string {
    const date = new Date(dateString);
    const ukOffset = this.getUKTimezoneOffset(date);
    
    console.log(`Timezone adjustment for ${dateString}: UK offset = ${ukOffset} hours`);
    
    // Adjust the date by the UK timezone offset
    date.setHours(date.getHours() + ukOffset);
    const adjustedDate = date.toISOString().split('T')[0];
    
    console.log(`Date adjusted from ${dateString} to ${adjustedDate}`);
    return adjustedDate;
  }

  /**
   * Get a valid access token using n8n variables endpoint with basic authentication
   * Includes caching to prevent multiple requests
   */
  static async getAccessToken(retryCount: number = 0, maxRetries: number = 3): Promise<string> {
    // Check if we have a valid cached token
    if (this.cachedToken && Date.now() < this.tokenExpiry) {
      console.log('Using cached access token');
      return this.cachedToken;
    }
    
    const timeout = 10000; // 10 seconds timeout
    
    try {
      console.log(`Attempting to get access token (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Create basic auth header
      const credentials = btoa('n8nvariables@2025:n8nvariables@2025');
      
      const response = await fetch(`${this.N8N_VARIABLES_ENDPOINT}?name=access_token`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to get access token from variables endpoint: ${response.statusText} (Status: ${response.status})`);
      }

      const data = await response.json();
      console.log('Access token data:', data);
      if (!data.value) {
        throw new Error('No access token received from variables endpoint');
      }

      // Cache the token
      this.cachedToken = data.value;
      this.tokenExpiry = Date.now() + this.TOKEN_CACHE_DURATION;
      
      console.log('Successfully retrieved and cached access token');
      return data.value;
    } catch (error) {
      console.error(`Error getting access token (attempt ${retryCount + 1}):`, error);
      
      // Retry logic for network errors or timeouts
      if (retryCount < maxRetries && (
        (error as Error).name === 'AbortError' || 
        (error as Error).message.includes('fetch') ||
        (error as Error).message.includes('timeout') ||
        (error as Error).message.includes('network')
      )) {
        console.log(`Retrying in ${(retryCount + 1) * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return this.getAccessToken(retryCount + 1, maxRetries);
      }
      
      // If all retries failed, throw a more descriptive error
      throw new Error(`Failed to get access token after ${maxRetries + 1} attempts: ${(error as Error).message}`);
    }
  }

  /**
   * Clear the cached access token (useful for testing or when token becomes invalid)
   */
  static clearTokenCache(): void {
    this.cachedToken = null;
    this.tokenExpiry = 0;
    console.log('Access token cache cleared');
  }

  /**
   * Get activities for a specific user and date range
   */
  static async getUserActivities(
    hubstaffUserId: number,
    startDate: string,
    endDate: string
  ): Promise<HubstaffActivity[]> {
    try {
      console.log(`Getting activities for user ${hubstaffUserId} from ${startDate} to ${endDate}`);
      
      const accessToken = await this.getAccessToken();
      console.log('Access token retrieved successfully, proceeding with API call');
      
      return await this.getUserActivitiesWithToken(hubstaffUserId, startDate, endDate, accessToken);
    } catch (error) {
      console.error(`Error getting Hubstaff activities for user ${hubstaffUserId}:`, error);
      
      // Return empty array instead of throwing to prevent the entire request from failing
      // This ensures the page doesn't become empty when Hubstaff API is unavailable
      console.log(`Returning empty activities array for user ${hubstaffUserId} due to error`);
      return [];
    }
  }

  /**
   * Get activities for a specific user and date range using a provided access token
   * Uses daily endpoint for date ranges > 1 day (more efficient, supports up to 31 days)
   * Uses regular activities endpoint for single day (today/current activity)
   */
  static async getUserActivitiesWithToken(
    hubstaffUserId: number,
    startDate: string,
    endDate: string,
    accessToken: string,
    maxDaysPerRequest: number = 7  // Not used anymore, kept for backward compatibility
  ): Promise<HubstaffActivity[]> {
    try {
      // Calculate the number of days in the range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
      
      // For single day (today/current activity), use regular activities endpoint
      if (daysDiff === 1) {
        console.log(`Single day query - using regular activities endpoint`);
        return await this.fetchActivitiesForDateRange(hubstaffUserId, startDate, endDate, accessToken); // Single user ID
      }
      
      // For date ranges (2-31 days), use daily endpoint (more efficient)
      // Date picker limits ranges to 31 days max, so we don't need to handle > 31 days
      console.log(`Date range query (${daysDiff} days) - using daily activities endpoint`);
      const dailyActivities = await this.fetchDailyActivitiesForDateRange(
        hubstaffUserId, // Single user ID
        startDate,
        endDate,
        accessToken
      );
      // Convert daily activities to regular activities format for compatibility
      return this.convertDailyActivitiesToActivities(dailyActivities);
    } catch (error) {
      console.error(`Error in getUserActivitiesWithToken for user ${hubstaffUserId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch activities for a specific date range (internal method)
   * Handles rate limiting and retries
   * Supports single user ID or multiple user IDs (array bracket notation)
   */
  private static async fetchActivitiesForDateRange(
    hubstaffUserIds: number | number[],
    startDate: string,
    endDate: string,
    accessToken: string,
    retryCount: number = 0,
    maxRetries: number = 3
  ): Promise<HubstaffActivity[]> {
    try {
      // Adjust dates for UK timezone
      const adjustedStartDate = this.adjustDateForUKTimezone(startDate);
      const adjustedEndDate = this.adjustDateForUKTimezone(endDate);
      
      // Format as ISO 8601 datetime strings (start of day and end of day)
      // Activities API requires time_slot parameters with full datetime format
      // For single day: start at 00:00:00 and end at 23:59:59 to include the entire day
      const startDateTime = `${adjustedStartDate}T00:00:00Z`;
      const endDateTime = `${adjustedEndDate}T23:59:59Z`;
      
      // Verify date range is valid
      if (adjustedStartDate > adjustedEndDate) {
        throw new Error(`Invalid date range: start date (${adjustedStartDate}) is after end date (${adjustedEndDate})`);
      }
      
      // Build user_ids parameter - support both single ID and multiple IDs
      let userIdsParam: string;
      if (Array.isArray(hubstaffUserIds)) {
        // Multiple user IDs: user_ids[]=123&user_ids[]=456
        userIdsParam = hubstaffUserIds.map(id => `user_ids[]=${id}`).join('&');
      } else {
        // Single user ID: user_ids=123 (backward compatibility)
        userIdsParam = `user_ids=${hubstaffUserIds}`;
      }
      
      // Use time_slot[start] and time_slot[stop] as per Hubstaff API v2 documentation
      // The API requires time_slot parameters (not date parameters) for activities endpoint
      // time_slot[stop] is inclusive (includes activities up to and including the end time)
      const baseUrl = `https://api.hubstaff.com/v2/organizations/${this.ORGANIZATION_ID}/activities?time_slot[start]=${encodeURIComponent(startDateTime)}&time_slot[stop]=${encodeURIComponent(endDateTime)}&${userIdsParam}`;
      
      console.log(`Fetching activities from Hubstaff API: ${baseUrl.replace(accessToken, '***').substring(0, 200)}...`);

      const allActivities: HubstaffActivity[] = [];
      let pageStartId: number | null = null;
      let page = 0;
      const MAX_PAGES = 50; // safety cap

      while (page < MAX_PAGES) {
        const url = pageStartId ? `${baseUrl}&page_start_id=${pageStartId}` : baseUrl;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        });

        // Handle specific error codes as per Hubstaff API documentation
        if (response.status === 400) {
          const errorText = await response.text().catch(() => 'Bad Request');
          throw new Error(`Bad Request (400): Invalid parameters - ${errorText}`);
        }
        
        if (response.status === 401) {
          throw new Error('Unauthorized (401): Access token is invalid or expired. Please refresh the token.');
        }
        
        if (response.status === 403) {
          throw new Error('Forbidden (403): You do not have permission to access this resource.');
        }
        
        if (response.status === 404) {
          throw new Error('Not Found (404): The requested resource does not exist.');
        }
        
        // Handle rate limiting (429)
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : (retryCount + 1) * 2000;
          
          if (retryCount < maxRetries) {
            console.warn(`Rate limit hit (429), waiting ${waitTime}ms before retry ${retryCount + 1}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return this.fetchActivitiesForDateRange(hubstaffUserIds, startDate, endDate, accessToken, retryCount + 1, maxRetries);
          } else {
            throw new Error(`Rate limit exceeded (429) after ${maxRetries} retries. Please try again later.`);
          }
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to get activities: ${response.statusText} (Status: ${response.status}) - ${errorText}`);
        }

        const data: HubstaffActivitiesResponse = await response.json();
        const pageActivities = data.activities || [];
        allActivities.push(...pageActivities);

        const nextId = data.pagination?.next_page_start_id ?? null;
        if (!nextId || pageActivities.length === 0) {
          break;
        }
        pageStartId = nextId;
        page += 1;
        
        // Small delay between pages to avoid overwhelming the API
        if (nextId) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return allActivities;
    } catch (error) {
      console.error(`Error fetching activities for date range ${startDate} to ${endDate}:`, error);
      throw error;
    }
  }

  /**
   * Fetch daily activities for a date range using the daily endpoint
   * This is more efficient for date ranges as it returns pre-aggregated data
   * Date range limit: 31 days (as per Hubstaff API documentation)
   * Supports single user ID or multiple user IDs (array bracket notation)
   */
  private static async fetchDailyActivitiesForDateRange(
    hubstaffUserIds: number | number[],
    startDate: string,
    endDate: string,
    accessToken: string
  ): Promise<HubstaffDailyActivity[]> {
    try {
      // Adjust dates for UK timezone
      const adjustedStartDate = this.adjustDateForUKTimezone(startDate);
      const adjustedEndDate = this.adjustDateForUKTimezone(endDate);
      
      // Verify date range is valid
      if (adjustedStartDate > adjustedEndDate) {
        throw new Error(`Invalid date range: start date (${adjustedStartDate}) is after end date (${adjustedEndDate})`);
      }
      
      // Build user_ids parameter - support both single ID and multiple IDs
      let userIdsParam: string;
      if (Array.isArray(hubstaffUserIds)) {
        // Multiple user IDs: user_ids[]=123&user_ids[]=456
        userIdsParam = hubstaffUserIds.map(id => `user_ids[]=${id}`).join('&');
      } else {
        // Single user ID: user_ids=123 (backward compatibility)
        userIdsParam = `user_ids=${hubstaffUserIds}`;
      }
      
      // Daily endpoint uses date[start] and date[stop] parameters (not time_slot)
      // Note: date[stop] is inclusive according to Hubstaff API documentation
      const url = `https://api.hubstaff.com/v2/organizations/${this.ORGANIZATION_ID}/activities/daily?date[start]=${encodeURIComponent(adjustedStartDate)}&date[stop]=${encodeURIComponent(adjustedEndDate)}&${userIdsParam}`;
      
      console.log(`Fetching daily activities from Hubstaff API: ${url.replace(accessToken, '***')}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      // Handle specific error codes
      if (response.status === 400) {
        const errorText = await response.text().catch(() => 'Bad Request');
        throw new Error(`Bad Request (400): Invalid parameters - ${errorText}`);
      }
      
      if (response.status === 401) {
        throw new Error('Unauthorized (401): Access token is invalid or expired. Please refresh the token.');
      }
      
      if (response.status === 403) {
        throw new Error('Forbidden (403): You do not have permission to access this resource.');
      }
      
      if (response.status === 404) {
        throw new Error('Not Found (404): The requested resource does not exist.');
      }

      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
        console.warn(`Rate limit hit (429) on daily endpoint, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        // Retry once
        return this.fetchDailyActivitiesForDateRange(hubstaffUserIds, startDate, endDate, accessToken);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to get daily activities: ${response.statusText} (Status: ${response.status}) - ${errorText}`);
      }

      const data: HubstaffDailyActivitiesResponse = await response.json();
      let allDailyActivities = data.daily_activities || [];
      
      // Handle pagination - fetch all pages if there are more results
      let pageStartId: number | null = data.pagination?.next_page_start_id ?? null;
      let page = 0;
      const MAX_PAGES = 50; // safety cap
      
      while (pageStartId && page < MAX_PAGES) {
        page++;
        const paginatedUrl = `${url}&page_start_id=${pageStartId}`;
        
        console.log(`Fetching daily activities page ${page + 1} (page_start_id: ${pageStartId})`);
        
        const pageResponse = await fetch(paginatedUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        });

        if (!pageResponse.ok) {
          const errorText = await pageResponse.text().catch(() => 'Unknown error');
          console.warn(`Failed to get paginated daily activities page ${page + 1}: ${pageResponse.statusText} (Status: ${pageResponse.status}) - ${errorText}`);
          break; // Stop pagination on error, but return what we have
        }

        const pageData: HubstaffDailyActivitiesResponse = await pageResponse.json();
        const pageActivities = pageData.daily_activities || [];
        
        if (pageActivities.length === 0) {
          break; // No more data
        }
        
        allDailyActivities = allDailyActivities.concat(pageActivities);
        pageStartId = pageData.pagination?.next_page_start_id ?? null;
        
        console.log(`Page ${page + 1}: Fetched ${pageActivities.length} entries (total: ${allDailyActivities.length})`);
      }
      
      if (page >= MAX_PAGES) {
        console.warn(`Reached maximum page limit (${MAX_PAGES}) for daily activities. Some data may be missing.`);
      }
      
      // Log summary of fetched data for verification
      const userCount = Array.isArray(hubstaffUserIds) ? hubstaffUserIds.length : 1;
      console.log(`Daily activities fetched: ${allDailyActivities.length} total entries for ${userCount} user(s) from ${adjustedStartDate} to ${adjustedEndDate} (${page + 1} page(s))`);
      
      // Verify we got data for all requested users
      if (Array.isArray(hubstaffUserIds)) {
        const uniqueUserIds = new Set(allDailyActivities.map(a => a.user_id));
        const missingUsers = hubstaffUserIds.filter(id => !uniqueUserIds.has(id));
        if (missingUsers.length > 0) {
          console.warn(`Warning: No daily activities found for user IDs: ${missingUsers.join(', ')}`);
        }
      }
      
      return allDailyActivities;
    } catch (error) {
      console.error(`Error fetching daily activities for date range ${startDate} to ${endDate}:`, error);
      throw error;
    }
  }

  /**
   * Convert daily activities to regular activities format for compatibility
   * Daily activities are already aggregated, so we create one activity per day
   */
  private static convertDailyActivitiesToActivities(dailyActivities: HubstaffDailyActivity[]): HubstaffActivity[] {
    return dailyActivities.map(daily => {
      // For daily activities, we need to estimate starts_at based on the date
      // Since daily activities are aggregated, we use the start of the day
      const startsAt = `${daily.date}T00:00:00Z`;
      
      return {
        id: daily.id,
        date: daily.date,
        created_at: daily.created_at,
        updated_at: daily.updated_at,
        time_slot: `${daily.date}T00:00:00Z/${daily.date}T23:59:59Z`,
        starts_at: startsAt,
        user_id: daily.user_id,
        project_id: daily.project_id,
        task_id: daily.task_id,
        keyboard: daily.keyboard,
        mouse: daily.mouse,
        overall: daily.overall,
        tracked: daily.tracked,
        input_tracked: daily.input_tracked,
        tracks_input: daily.input_tracked > 0,
        billable: daily.billable > 0,
        paid: false,
        client_invoiced: false,
        team_invoiced: false,
        immutable: false,
        // Daily activities include idle time separately, so we mark as normal
        // The idle time is already accounted for in the tracked field
        time_type: 'normal',
        client: ''
      };
    });
  }

  /**
   * Helper function to determine if a date range is a single day (daily)
   * Only daily ranges use first/last activity times; all others use averages
   */
  private static isDailyRange(fromDate: string, toDate: string): boolean {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    // Calculate difference in days
    const diffTime = to.getTime() - from.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Daily: exactly 1 day (0 days difference means same day)
    return diffDays === 0;
  }

  /**
   * Calculate daily activity summary from activities
   */
  static calculateDailySummary(activities: HubstaffActivity[]) {
    console.log('calculateDailySummary called with activities:', activities.length);
    
    if (activities.length === 0) {
      return {
        timeIn: null,
        timeOut: null,
        hoursWorked: 0,
        activityPercentage: 0,
        keyboardActivity: 0,
        mouseActivity: 0,
        overallActivity: 0,
        trackedTime: 0,
        billableTime: 0,
        // Additional metrics for better insights
        activeWorkTime: 0,
        idleTime: 0,
        activeActivitiesCount: 0,
        idleActivitiesCount: 0
      };
    }

    // Sort activities by start time
    const sortedActivities = activities.sort((a, b) => 
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );

    const firstActivity = sortedActivities[0];
    const lastActivity = sortedActivities[sortedActivities.length - 1];

    // Filter only active work activities (exclude idle time)
    // Check for different possible time_type values
    const activeActivities = activities.filter(activity => 
      activity.time_type === "normal" || 
      activity.time_type === "active" || 
      (activity.time_type !== "idle" && activity.time_type !== "break")
    );
    const idleActivities = activities.filter(activity => 
      activity.time_type === "idle" || 
      activity.time_type === "break"
    );


    // Calculate totals for all activities
    const totalKeyboard = activities.reduce((sum, activity) => sum + activity.keyboard, 0);
    const totalMouse = activities.reduce((sum, activity) => sum + activity.mouse, 0);
    const totalOverall = activities.reduce((sum, activity) => sum + activity.overall, 0);
    const totalTracked = activities.reduce((sum, activity) => sum + activity.tracked, 0);
    const totalBillable = activities.reduce((sum, activity) => 
      sum + (activity.billable ? activity.tracked : 0), 0
    );

    // Calculate actual worked time (only from active work, excluding idle time)
    const activeTrackedSeconds = activeActivities.reduce((sum, activity) => sum + activity.tracked, 0);
    const idleTrackedSeconds = idleActivities.reduce((sum, activity) => sum + activity.tracked, 0);
    const hoursWorked = activeTrackedSeconds / 3600;


    // Calculate time in/out (for display purposes, still using first/last activity)
    const timeIn = new Date(firstActivity.starts_at);
    const timeOut = new Date(lastActivity.starts_at);
    timeOut.setSeconds(timeOut.getSeconds() + lastActivity.tracked);

    // Calculate activity percentage (average of overall activity)
    const activityPercentage = activities.length > 0 
      ? Math.round(totalOverall / activities.length) 
      : 0;

    // Format times in UK timezone for consistent display
    const timeInFormatted = timeIn.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/London'
    });
    const timeOutFormatted = timeOut.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/London'
    });

    console.log(`Time calculation: First activity at ${firstActivity.starts_at}, Last activity at ${lastActivity.starts_at}`);
    console.log(`Formatted times: Time In = ${timeInFormatted}, Time Out = ${timeOutFormatted}, Hours Worked = ${Math.round(hoursWorked * 100) / 100}`);

    return {
      timeIn: timeInFormatted,
      timeOut: timeOutFormatted,
      hoursWorked: Math.round(hoursWorked * 100) / 100,
      activityPercentage,
      keyboardActivity: totalKeyboard,
      mouseActivity: totalMouse,
      overallActivity: totalOverall,
      trackedTime: totalTracked,
      billableTime: totalBillable,
      // Additional metrics for better insights
      activeWorkTime: Math.round((activeTrackedSeconds / 3600) * 100) / 100,
      idleTime: Math.round((idleActivities.reduce((sum, activity) => sum + activity.tracked, 0) / 3600) * 100) / 100,
      activeActivitiesCount: activeActivities.length,
      idleActivitiesCount: idleActivities.length
    };
  }

  /**
   * Get activities for multiple users in a single request (batch fetch)
   * Uses daily endpoint for date ranges > 1 day (more efficient)
   * Uses regular activities endpoint for single day (today/current activity)
   * Returns activities grouped by user_id
   */
  static async getMultipleUsersActivitiesWithToken(
    hubstaffUserIds: number[],
    startDate: string,
    endDate: string,
    accessToken: string
  ): Promise<{ [userId: number]: HubstaffActivity[] }> {
    try {
      // Calculate the number of days in the range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      let allActivities: HubstaffActivity[] = [];
      
      // For single day (today/current activity), use regular activities endpoint
      if (daysDiff === 1) {
        console.log(`Batch single day query for ${hubstaffUserIds.length} users - using regular activities endpoint`);
        console.log(`Date: ${startDate} (single day, inclusive)`);
        allActivities = await this.fetchActivitiesForDateRange(hubstaffUserIds, startDate, endDate, accessToken);
        console.log(`Received ${allActivities.length} activity entries from Hubstaff API for single day`);
      } else {
        // For date ranges (2-31 days), use daily endpoint (more efficient)
        console.log(`Batch date range query (${daysDiff} days) for ${hubstaffUserIds.length} users - using daily activities endpoint`);
        console.log(`Date range: ${startDate} to ${endDate} (inclusive)`);
        const dailyActivities = await this.fetchDailyActivitiesForDateRange(
          hubstaffUserIds, // Multiple user IDs
          startDate,
          endDate,
          accessToken
        );
        console.log(`Received ${dailyActivities.length} daily activity entries from Hubstaff API`);
        
        // Convert daily activities to regular activities format for compatibility
        allActivities = this.convertDailyActivitiesToActivities(dailyActivities);
        console.log(`Converted to ${allActivities.length} activity entries`);
      }
      
      // Group activities by user_id
      const activitiesByUser: { [userId: number]: HubstaffActivity[] } = {};
      for (const activity of allActivities) {
        if (!activitiesByUser[activity.user_id]) {
          activitiesByUser[activity.user_id] = [];
        }
        activitiesByUser[activity.user_id].push(activity);
      }
      
      // Verify date range coverage for each user
      if (daysDiff > 1) {
        const uniqueDates = new Set(allActivities.map(a => a.date));
        console.log(`Date range verification: Found activities for ${uniqueDates.size} unique dates (expected up to ${daysDiff} days)`);
        console.log(`Date range: ${startDate} to ${endDate}`);
        
        // Log per-user activity count
        for (const userId of hubstaffUserIds) {
          const userActivities = activitiesByUser[userId] || [];
          const userDates = new Set(userActivities.map(a => a.date));
          console.log(`User ${userId}: ${userActivities.length} activities across ${userDates.size} dates`);
        }
      }
      
      // Ensure all requested users have an entry (even if empty)
      for (const userId of hubstaffUserIds) {
        if (!activitiesByUser[userId]) {
          activitiesByUser[userId] = [];
        }
      }
      
      return activitiesByUser;
    } catch (error) {
      console.error(`Error in getMultipleUsersActivitiesWithToken for users ${hubstaffUserIds.join(', ')}:`, error);
      throw error;
    }
  }

  /**
   * Calculate date range activity summary from activities (aggregates across multiple days)
   */
  static calculateDateRangeSummary(activities: HubstaffActivity[], fromDate: string, toDate: string) {
    if (activities.length === 0) {
      return {
        timeIn: null,
        timeOut: null,
        timeInIncludingIdle: null,
        timeOutIncludingIdle: null,
        timeInActive: null,
        timeOutActive: null,
        hoursWorked: 0,
        activityPercentage: 0,
        keyboardActivity: 0,
        mouseActivity: 0,
        overallActivity: 0,
        trackedTime: 0,
        billableTime: 0,
        activeWorkTime: 0,
        idleTime: 0,
        activeActivitiesCount: 0,
        idleActivitiesCount: 0
      };
    }

    const isDaily = this.isDailyRange(fromDate, toDate);

    const activeActivities = activities.filter(activity => 
      activity.time_type === "normal" || 
      activity.time_type === "active" || 
      (activity.time_type !== "idle" && activity.time_type !== "break")
    );
    const idleActivities = activities.filter(activity => 
      activity.time_type === "idle" || 
      activity.time_type === "break"
    );

    const totalKeyboard = activities.reduce((sum, activity) => sum + activity.keyboard, 0);
    const totalMouse = activities.reduce((sum, activity) => sum + activity.mouse, 0);
    const totalOverall = activities.reduce((sum, activity) => sum + activity.overall, 0);
    const totalTracked = activities.reduce((sum, activity) => sum + activity.tracked, 0);
    const totalBillable = activities.reduce((sum, activity) => 
      sum + (activity.billable ? activity.tracked : 0), 0
    );

    const activeTrackedSeconds = activeActivities.reduce((sum, activity) => sum + activity.tracked, 0);
    const idleTrackedSeconds = idleActivities.reduce((sum, activity) => sum + activity.tracked, 0);
    const hoursWorked = activeTrackedSeconds / 3600;

    let timeInFormatted = null;
    let timeOutFormatted = null;
    let timeInIncludingIdleFormatted = null;
    let timeOutIncludingIdleFormatted = null;
    let timeInActiveFormatted = null;
    let timeOutActiveFormatted = null;

    if (isDaily) {
      const sortedActivities = activities.sort((a, b) => 
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      );
      const firstActivity = sortedActivities[0];
      const lastActivity = sortedActivities[sortedActivities.length - 1];

      const timeIn = new Date(firstActivity.starts_at);
      const timeOut = new Date(lastActivity.starts_at);
      timeOut.setSeconds(timeOut.getSeconds() + lastActivity.tracked);

      timeInFormatted = timeIn.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/London' });
      timeOutFormatted = timeOut.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/London' });

      // Calculate time in/out including idle periods
      const sortedAllActivities = activities.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
      if (sortedAllActivities.length > 0) {
        const firstOverallActivity = sortedAllActivities[0];
        const lastOverallActivity = sortedAllActivities[sortedAllActivities.length - 1];
        const timeInOverall = new Date(firstOverallActivity.starts_at);
        const timeOutOverall = new Date(lastOverallActivity.starts_at);
        timeOutOverall.setSeconds(timeOutOverall.getSeconds() + lastOverallActivity.tracked);
        timeInIncludingIdleFormatted = timeInOverall.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/London' });
        timeOutIncludingIdleFormatted = timeOutOverall.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/London' });
      }

      // Calculate time in/out for active periods only
      const sortedActiveActivities = activeActivities.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
      if (sortedActiveActivities.length > 0) {
        const firstActiveActivity = sortedActiveActivities[0];
        const lastActiveActivity = sortedActiveActivities[sortedActiveActivities.length - 1];
        const timeInActive = new Date(firstActiveActivity.starts_at);
        const timeOutActive = new Date(lastActiveActivity.starts_at);
        timeOutActive.setSeconds(timeOutActive.getSeconds() + lastActiveActivity.tracked);
        timeInActiveFormatted = timeInActive.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/London' });
        timeOutActiveFormatted = timeOutActive.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/London' });
      }
    }

    const activityPercentage = activities.length > 0 
      ? Math.round(totalOverall / activities.length) 
      : 0;

    return {
      timeIn: timeInFormatted,
      timeOut: timeOutFormatted,
      timeInIncludingIdle: timeInIncludingIdleFormatted,
      timeOutIncludingIdle: timeOutIncludingIdleFormatted,
      timeInActive: timeInActiveFormatted,
      timeOutActive: timeOutActiveFormatted,
      hoursWorked: Math.round(hoursWorked * 100) / 100,
      activityPercentage,
      keyboardActivity: totalKeyboard,
      mouseActivity: totalMouse,
      overallActivity: totalOverall,
      trackedTime: totalTracked,
      billableTime: totalBillable,
      activeWorkTime: Math.round((activeTrackedSeconds / 3600) * 100) / 100,
      idleTime: Math.round((idleTrackedSeconds / 3600) * 100) / 100,
      activeActivitiesCount: activeActivities.length,
      idleActivitiesCount: idleActivities.length
    };
  }

  /**
   * Get activity data for multiple users on a specific date
   * Optimized to use a single access token for all users
   */
  static async getTeamActivity(date: string): Promise<Record<number, any>> {
    try {
      console.log(`Getting team activity for date: ${date}`);
      
      // Get access token once for all users
      const accessToken = await this.getAccessToken();
      console.log('Access token retrieved successfully for team activity');
      
      // First, get all users with hubstaff_id from the database
      const { data: users } = await fetch('/api/users').then(res => res.json());
      
      const teamActivity: Record<number, any> = {};
      
      // Get activity for each user with hubstaff_id using the same access token
      for (const user of users) {
        if (user.hubstaff_id) {
          try {
            console.log(`Getting activities for user ${user.id} (hubstaff_id: ${user.hubstaff_id})`);
            
            // Use the optimized method with the shared access token
            const activities = await this.getUserActivitiesWithToken(user.hubstaff_id, date, date, accessToken);
            const summary = this.calculateDailySummary(activities);
            
            console.log(`Successfully retrieved ${activities.length} activities for user ${user.id}`);
            
            teamActivity[user.id] = {
              user,
              activities,
              summary
            };
          } catch (error) {
            console.error(`Error getting activity for user ${user.id}:`, error);
            teamActivity[user.id] = {
              user,
              activities: [],
              summary: this.calculateDailySummary([])
            };
          }
        }
      }
      
      console.log(`Team activity retrieval completed for ${Object.keys(teamActivity).length} users`);
      return teamActivity;
    } catch (error) {
      console.error('Error getting team activity:', error);
      throw error;
    }
  }

  /**
   * Get screenshots for a specific user and date range
   * Note: Date range cannot exceed 7 days according to Hubstaff API
   */
  static async getUserScreenshots(
    hubstaffUserId: number,
    startDate: string,
    endDate: string
  ): Promise<HubstaffScreenshot[]> {
    try {
      const accessToken = await this.getAccessToken();
      return await this.getUserScreenshotsWithToken(hubstaffUserId, startDate, endDate, accessToken);
    } catch (error) {
      console.error('Error fetching screenshots:', error);
      return [];
    }
  }

  /**
   * Get screenshots for a specific user and date range using a provided access token
   */
  static async getUserScreenshotsWithToken(
    hubstaffUserId: number,
    startDate: string,
    endDate: string,
    accessToken: string
  ): Promise<HubstaffScreenshot[]> {
    try {
      // Adjust dates for UK timezone and format as ISO 8601
      const adjustedStartDate = new Date(startDate);
      const adjustedEndDate = new Date(endDate);
      
      // Set to start of day (00:00:00) and end of day (23:59:59) in UK timezone
      adjustedStartDate.setHours(0, 0, 0, 0);
      adjustedEndDate.setHours(23, 59, 59, 999);
      
      // Format as ISO 8601 with timezone
      const startTime = adjustedStartDate.toISOString();
      const endTime = adjustedEndDate.toISOString();

      // Build URL with correct parameter names as per Hubstaff API v2 documentation
      // time_slot[start] and time_slot[stop] are required, user_ids is optional
      const baseUrl = `https://api.hubstaff.com/v2/organizations/${this.ORGANIZATION_ID}/screenshots?time_slot[start]=${encodeURIComponent(startTime)}&time_slot[stop]=${encodeURIComponent(endTime)}&user_ids=${hubstaffUserId}`;

      const allScreenshots: HubstaffScreenshot[] = [];
      let pageStartId: number | null = null;
      let page = 0;
      const MAX_PAGES = 50; // safety cap

      while (page < MAX_PAGES) {
        const url = pageStartId ? `${baseUrl}&page_start_id=${pageStartId}` : baseUrl;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        });

        // Handle specific error codes as per Hubstaff API documentation
        if (response.status === 400) {
          const errorText = await response.text().catch(() => 'Bad Request');
          throw new Error(`Bad Request (400): Invalid parameters for screenshots - ${errorText}`);
        }
        
        if (response.status === 401) {
          throw new Error('Unauthorized (401): Access token is invalid or expired for screenshots.');
        }
        
        if (response.status === 403) {
          throw new Error('Forbidden (403): You do not have permission to access screenshots.');
        }
        
        if (response.status === 404) {
          throw new Error('Not Found (404): Screenshots not found for the specified date range.');
        }
        
        if (response.status === 429) {
          throw new Error('Rate limit exceeded (429): Too many requests. Please try again later.');
        }

        if (!response.ok) {
          // Try to get error details from response
          let errorMessage = `Failed to get screenshots: ${response.statusText} (Status: ${response.status})`;
          try {
            const errorData = await response.json();
            if (errorData.error) {
              errorMessage += ` - ${errorData.error}`;
            }
            if (errorData.code) {
              errorMessage += ` [${errorData.code}]`;
            }
          } catch (e) {
            // If we can't parse error, use default message
          }
          throw new Error(errorMessage);
        }

        const data: HubstaffScreenshotsResponse = await response.json();
        const pageScreenshots = data.screenshots || [];
        // Map API response to our interface (add aliases for url and thumbnail_url)
        const mappedScreenshots = pageScreenshots.map((screenshot: any) => ({
          ...screenshot,
          url: screenshot.full_url, // Alias for backward compatibility
          thumbnail_url: screenshot.thumb_url, // Alias for backward compatibility
        }));
        allScreenshots.push(...mappedScreenshots);

        const nextId = data.pagination?.next_page_start_id ?? null;
        if (!nextId || pageScreenshots.length === 0) {
          break;
        }
        pageStartId = nextId;
        page += 1;
      }

      return allScreenshots;
    } catch (error) {
      console.error('Error fetching screenshots with token:', error);
      throw error;
    }
  }
}
