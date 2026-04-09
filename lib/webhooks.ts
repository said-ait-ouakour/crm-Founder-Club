/**
 * Webhook utility functions
 */

// Get webhook URL from environment variable (must use NEXT_PUBLIC_ prefix for client-side access)
const WEBHOOK_URL = process.env.NEXT_PUBLIC_PM_DEMO_WEBHOOK || 'https://hook.eu2.make.com/013excjmy1cjofhx2rhio12pvb0phex4';

// User IDs that should trigger the webhook
const WEBHOOK_TRIGGER_USER_IDS = [
  '00b3a42b-652f-4cd3-b566-9a66b755c4ae',
  'a85380ff-148a-4ae1-8fe1-5cbea2b79c42',
  '9ef8fe6e-3e43-46b1-afd3-89d914924ca4',
  'bb0d9f46-5e87-4972-b6dd-1003fb74a0ec',
  'f47d6b92-5086-4451-9fca-03df24bc01a5',
  'd72a9dc4-5a0e-44b2-9f68-77d2b32b3109',
  '7c5614c7-21f4-4bea-9c4d-5d41efbd88cb'
];

export interface MeetingWebhookPayload {
  meeting_id: number;
  lead_id: string;
  meeting: {
    date: string; // ISO format with timezone
  };
  lead: {
    name: string;
    email: string;
  };
  name: string; // Same as lead.name
  email: string; // Same as lead.email
  advisor: {
    name: string;
    email: string;
  };
}

/**
 * Default advisor ID for meetings created by webhook trigger users
 */
export const DEFAULT_ADVISOR_ID_FOR_WEBHOOK_USERS = 'a85380ff-148a-4ae1-8fe1-5cbea2b79c42';

/**
 * Check if a user ID should trigger the webhook
 */
export function shouldTriggerWebhook(userId: string | undefined | null): boolean {
  if (!userId) return false;
  return WEBHOOK_TRIGGER_USER_IDS.includes(userId);
}

/**
 * Get the advisor ID to use for a meeting based on the user creating it
 * If the user is in the webhook trigger list, always use the default advisor ID
 */
export function getAdvisorIdForMeeting(
  userId: string | undefined | null,
  selectedAdvisorId: string | number | null | undefined
): string | number | null {
  if (shouldTriggerWebhook(userId)) {
    return DEFAULT_ADVISOR_ID_FOR_WEBHOOK_USERS;
  }
  return selectedAdvisorId ?? null;
}

/**
 * Trigger the meeting webhook
 */
export async function triggerMeetingWebhook(
  payload: MeetingWebhookPayload
): Promise<void> {
  try {
    console.log('[Webhook] Triggering meeting webhook for meeting_id:', payload.meeting_id);
    console.log('[Webhook] Using URL:', WEBHOOK_URL ? WEBHOOK_URL.substring(0, 50) + '...' : 'NOT SET');
    
    if (!WEBHOOK_URL) {
      console.error('[Webhook] NEXT_PUBLIC_PM_DEMO_WEBHOOK environment variable is not set');
      throw new Error('Webhook URL is not configured');
    }
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([payload]), // Webhook expects an array
    });

    // Success is 200 (as configured in Make pipeline); wait for webhook response before considering success
    if (response.status !== 200) {
      const errorText = await response.text();
      console.error('[Webhook] Request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        meeting_id: payload.meeting_id,
      });
      throw new Error(`Webhook did not respond with success (expected 200, got ${response.status}). ${errorText || response.statusText}`);
    }

    console.log('[Webhook] Successfully triggered for meeting_id:', payload.meeting_id);
  } catch (error) {
    // Log the error for debugging but don't break the meeting creation
    console.error('[Webhook] Error triggering webhook:', {
      error: error instanceof Error ? error.message : error,
      meeting_id: payload.meeting_id,
      lead_id: payload.lead_id,
      advisor: payload.advisor?.name,
    });
    // Re-throw so caller can also handle/log if needed
    throw error;
  }
}

