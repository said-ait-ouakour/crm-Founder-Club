// RingCentral API Service
// Handles fetching call data from RingCentral webhook

export interface RingCentralCall {
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
  result: 'Call connected' | 'Missed' | 'Voicemail' | 'Hang Up'; // Call result type
  subject?: string | null;
  duration: number; // in seconds
  startTime: string; // ISO date string
  creationTime?: string | null;
}

export interface RingCentralCallSummary {
  totalCalls: number;
  totalDuration: number; // in seconds
  averageCallDuration: number; // in seconds
  incomingCalls: number;
  outgoingCalls: number;
  totalCallTime: string; // formatted as "Xh Ym"
  // Result-specific counts
  connectedCalls: number;
  missedCalls: number;
  voicemailCalls: number;
  hungUpCalls: number;
  // Direction-specific result counts
  inboundConnected: number;
  outboundConnected: number;
  inboundMissed: number;
  outboundMissed: number;
  inboundVoicemail: number;
  outboundVoicemail: number;
  inboundHungUp: number;
  outboundHungUp: number;
}

export class RingCentralService {
  private static readonly WEBHOOK_URL = 'https://hook.eu2.make.com/d6wv58ipkwdtyn93zqg0d9x1dluqhrn6';
  private static lastCallTime: number = 0;
  private static readonly MIN_DELAY_MS = 2000; // 2 seconds minimum between calls

  /**
   * Get call data for a specific user and date range
   */
  static async getUserCalls(
    ringcentralId: number,
    startDate: string,
    endDate: string,
    advisorName?: string
  ): Promise<RingCentralCall[]> {
    try {
      // Rate limiting: ensure minimum delay between API calls
      const now = Date.now();
      const timeSinceLastCall = now - this.lastCallTime;
      
      if (timeSinceLastCall < this.MIN_DELAY_MS) {
        const delayNeeded = this.MIN_DELAY_MS - timeSinceLastCall;
        console.log(`Rate limiting: waiting ${delayNeeded}ms before RingCentral API call...`);
        await new Promise(resolve => setTimeout(resolve, delayNeeded));
      }
      
      this.lastCallTime = Date.now();
      
      const response = await fetch(this.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'calls',
          advisor_name: advisorName,
          id: ringcentralId,
          start_date: startDate,
          end_date: endDate
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw new Error(`Failed to get RingCentral calls: ${response.statusText}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format from RingCentral webhook');
      }

      return data;
    } catch (error) {
      console.error('Error getting RingCentral calls:', error);
      throw error;
    }
  }

  /**
   * Calculate daily call summary from call data
   */
  static calculateDailyCallSummary(calls: RingCentralCall[]): RingCentralCallSummary {
    if (calls.length === 0) {
      return {
        totalCalls: 0,
        totalDuration: 0,
        averageCallDuration: 0,
        incomingCalls: 0,
        outgoingCalls: 0,
        totalCallTime: '0m',
        connectedCalls: 0,
        missedCalls: 0,
        voicemailCalls: 0,
        hungUpCalls: 0,
        inboundConnected: 0,
        outboundConnected: 0,
        inboundMissed: 0,
        outboundMissed: 0,
        inboundVoicemail: 0,
        outboundVoicemail: 0,
        inboundHungUp: 0,
        outboundHungUp: 0
      };
    }

    const totalDuration = calls.reduce((sum, call) => sum + call.duration, 0);
    // Some webhook records may have null `to`/`from` - guard with optional chaining
    const incomingCalls = calls.filter(call => call.to?.extensionId).length;
    const outgoingCalls = calls.filter(call => call.from?.extensionId).length;

    // Result-specific counts
    const connectedCalls = calls.filter(call => call.result === 'Call connected').length;
    const missedCalls = calls.filter(call => call.result === 'Missed').length;
    const voicemailCalls = calls.filter(call => call.result === 'Voicemail').length;
    const hungUpCalls = calls.filter(call => call.result === 'Hang Up').length;

    // Direction-specific result counts
    const inboundConnected = calls.filter(call => 
      call.result === 'Call connected' && call.to?.extensionId
    ).length;
    const outboundConnected = calls.filter(call => 
      call.result === 'Call connected' && call.from?.extensionId
    ).length;
    const inboundMissed = calls.filter(call => 
      call.result === 'Missed' && call.to?.extensionId
    ).length;
    const outboundMissed = calls.filter(call => 
      call.result === 'Missed' && call.from?.extensionId
    ).length;
    const inboundVoicemail = calls.filter(call => 
      call.result === 'Voicemail' && call.to?.extensionId
    ).length;
    const outboundVoicemail = calls.filter(call => 
      call.result === 'Voicemail' && call.from?.extensionId
    ).length;
    const inboundHungUp = calls.filter(call => 
      call.result === 'Hang Up' && call.to?.extensionId
    ).length;
    const outboundHungUp = calls.filter(call => 
      call.result === 'Hang Up' && call.from?.extensionId
    ).length;

    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    const totalCallTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return {
      totalCalls: calls.length,
      totalDuration,
      averageCallDuration: Math.round(totalDuration / calls.length),
      incomingCalls,
      outgoingCalls,
      totalCallTime,
      connectedCalls,
      missedCalls,
      voicemailCalls,
      hungUpCalls,
      inboundConnected,
      outboundConnected,
      inboundMissed,
      outboundMissed,
      inboundVoicemail,
      outboundVoicemail,
      inboundHungUp,
      outboundHungUp
    };
  }

  /**
   * Format call duration in a human-readable format
   */
  static formatCallDuration(seconds: number): string {
    if (seconds === 0) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  }

  /**
   * Get call direction (incoming/outgoing) from call data
   */
  static getCallDirection(call: RingCentralCall): 'incoming' | 'outgoing' {
    // If the call has a 'to' extensionId, it's an incoming call (someone calling TO the extension)
    // If the call has a 'from' extensionId, it's an outgoing call (the extension calling FROM somewhere)
    if (call.to?.extensionId) return 'incoming';
    if (call.from?.extensionId) return 'outgoing';
    
    // Default to outgoing if we can't determine
    return 'outgoing';
  }

  /**
   * Filter calls by result type
   */
  static filterCallsByResult(calls: RingCentralCall[], result: 'Call connected' | 'Missed' | 'Voicemail' | 'Hang Up'): RingCentralCall[] {
    return calls.filter(call => call.result === result);
  }

  /**
   * Get calls grouped by result type
   */
  static getCallsByResult(calls: RingCentralCall[]): {
    connected: RingCentralCall[];
    missed: RingCentralCall[];
    voicemail: RingCentralCall[];
    hungUp: RingCentralCall[];
  } {
    return {
      connected: this.filterCallsByResult(calls, 'Call connected'),
      missed: this.filterCallsByResult(calls, 'Missed'),
      voicemail: this.filterCallsByResult(calls, 'Voicemail'),
      hungUp: this.filterCallsByResult(calls, 'Hang Up')
    };
  }

  /**
   * Get calls grouped by result and direction
   */
  static getCallsByResultAndDirection(calls: RingCentralCall[]): {
    inboundConnected: RingCentralCall[];
    outboundConnected: RingCentralCall[];
    inboundMissed: RingCentralCall[];
    outboundMissed: RingCentralCall[];
    inboundVoicemail: RingCentralCall[];
    outboundVoicemail: RingCentralCall[];
    inboundHungUp: RingCentralCall[];
    outboundHungUp: RingCentralCall[];
  } {
    return {
      inboundConnected: calls.filter(call => 
        call.result === 'Call connected' && call.to?.extensionId
      ),
      outboundConnected: calls.filter(call => 
        call.result === 'Call connected' && call.from?.extensionId
      ),
      inboundMissed: calls.filter(call => 
        call.result === 'Missed' && call.to?.extensionId
      ),
      outboundMissed: calls.filter(call => 
        call.result === 'Missed' && call.from?.extensionId
      ),
      inboundVoicemail: calls.filter(call => 
        call.result === 'Voicemail' && call.to?.extensionId
      ),
      outboundVoicemail: calls.filter(call => 
        call.result === 'Voicemail' && call.from?.extensionId
      ),
      inboundHungUp: calls.filter(call => 
        call.result === 'Hang Up' && call.to?.extensionId
      ),
      outboundHungUp: calls.filter(call => 
        call.result === 'Hang Up' && call.from?.extensionId
      )
    };
  }
}
