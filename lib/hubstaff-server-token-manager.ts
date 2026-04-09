// Hubstaff Server Token Manager
// Handles access token storage and refresh logic for server-side operations

interface HubstaffToken {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
  created_at: number; // Unix timestamp
}

export class HubstaffServerTokenManager {
  // This should be updated with a fresh refresh token when needed
  private static readonly REFRESH_TOKEN = process.env.HUBSTAFF_REFRESH_TOKEN || "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6ImRlZmF1bHQifQ.eyJqdGkiOiJVRktvME93USIsImlzcyI6Imh0dHBzOi8vYWNjb3VudC5odWJzdGFmZi5jb20iLCJleHAiOjE3NjQ3NzkyNTAsImlhdCI6MTc1Njk5OTY1MCwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCBodWJzdGFmZjpyZWFkIGh1YnN0YWZmOndyaXRlIn0.IGUBlD601msyqilTXRgfZIOvSWegYOb18odgr5bC6x83PYEsvv53wjazuAuWA8W2iwWKSZIcU_S_46q05IvLVGLnXNFU1G94y4ieK7I21qFyfEPHtUGjOYN4e8_J9TW2LASdKuz-cAchg0QCOLwUBqYmjMarVhVqs2OgF-0dISCGQYuLQYv0TWv6x6bQ4PT4WME0pRqwalWDGmOtVsX5WrAjM_EAqufLNcRka6yPRjggifZVGs900ZfdAX6B8kqdM3JItF7yGjLxRf2SX0wxHMCb-bQhPeVqj_0jn-LgghV9tExfn46GZ1HRlqxNFq1aipj3isNpO8k-6awwrInbXg";
  
  // In-memory token storage for server-side operations
  private static currentToken: HubstaffToken | null = null;

  /**
   * Check if token is expired (with 5 minute buffer)
   */
  private static isTokenExpired(token: HubstaffToken): boolean {
    const now = Math.floor(Date.now() / 1000);
    const buffer = 5 * 60; // 5 minutes buffer
    return token.expires_at <= (now + buffer);
  }

  /**
   * Get a fresh access token using the refresh token
   */
  private static async refreshAccessToken(): Promise<HubstaffToken> {
    try {
      const formData = new FormData();
      formData.append('refresh_token', this.REFRESH_TOKEN);
      formData.append('grant_type', 'refresh_token');

      const response = await fetch('https://account.hubstaff.com/access_tokens', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Hubstaff API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        if (response.status === 400) {
          throw new Error('Refresh token is invalid or expired. Please update the refresh token.');
        }
        
        throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const now = Math.floor(Date.now() / 1000);
      
      const token: HubstaffToken = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: now + data.expires_in,
        created_at: now
      };

      this.currentToken = token;
      return token;
    } catch (error) {
      console.error('Error refreshing Hubstaff access token:', error);
      throw error;
    }
  }

  /**
   * Get a valid access token (either from memory or by refreshing)
   */
  static async getValidAccessToken(): Promise<string> {
    try {
      // Check if we have a valid token in memory
      if (this.currentToken && !this.isTokenExpired(this.currentToken)) {
        return this.currentToken.access_token;
      }

      // Token is expired or doesn't exist, refresh it
      const newToken = await this.refreshAccessToken();
      return newToken.access_token;
    } catch (error) {
      console.error('Error getting valid access token:', error);
      // Clear any invalid stored token
      this.currentToken = null;
      throw error;
    }
  }

  /**
   * Clear stored token (useful for logout or errors)
   */
  static clearToken(): void {
    this.currentToken = null;
  }

  /**
   * Check if we have a valid token stored
   */
  static hasValidToken(): boolean {
    return this.currentToken !== null && !this.isTokenExpired(this.currentToken);
  }
}
