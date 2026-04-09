// Hubstaff Token Manager
// Handles access token storage and refresh logic

interface HubstaffToken {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
  created_at: number; // Unix timestamp
}

export class HubstaffTokenManager {
  private static readonly STORAGE_KEY = 'hubstaff_token';
  // This should be updated with a fresh refresh token when needed
  private static readonly REFRESH_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6ImRlZmF1bHQifQ.eyJqdGkiOiJVRktvME93USIsImlzcyI6Imh0dHBzOi8vYWNjb3VudC5odWJzdGFmZi5jb20iLCJleHAiOjE3NjQ3NzkyNTAsImlhdCI6MTc1Njk5OTY1MCwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCBodWJzdGFmZjpyZWFkIGh1YnN0YWZmOndyaXRlIn0.IGUBlD601msyqilTXRgfZIOvSWegYOb18odgr5bC6x83PYEsvv53wjazuAuWA8W2iwWKSZIcU_S_46q05IvLVGLnXNFU1G94y4ieK7I21qFyfEPHtUGjOYN4e8_J9TW2LASdKuz-cAchg0QCOLwUBqYmjMarVhVqs2OgF-0dISCGQYuLQYv0TWv6x6bQ4PT4WME0pRqwalWDGmOtVsX5WrAjM_EAqufLNcRka6yPRjggifZVGs900ZfdAX6B8kqdM3JItF7yGjLxRf2SX0wxHMCb-bQhPeVqj_0jn-LgghV9tExfn46GZ1HRlqxNFq1aipj3isNpO8k-6awwrInbXg";

  /**
   * Get stored token from localStorage
   */
  private static getStoredToken(): HubstaffToken | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error reading stored token:', error);
      return null;
    }
  }

  /**
   * Store token in localStorage
   */
  private static storeToken(token: HubstaffToken): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(token));
    } catch (error) {
      console.error('Error storing token:', error);
    }
  }

  /**
   * Clear stored token
   */
  private static clearStoredToken(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing stored token:', error);
    }
  }

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
        throw new Error(`Failed to get access token: ${response.statusText}`);
      }

      const data = await response.json();
      const now = Math.floor(Date.now() / 1000);
      
      const token: HubstaffToken = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: now + data.expires_in,
        created_at: now
      };

      this.storeToken(token);
      return token;
    } catch (error) {
      console.error('Error refreshing Hubstaff access token:', error);
      throw error;
    }
  }

  /**
   * Get a valid access token (either from storage or by refreshing)
   */
  static async getValidAccessToken(): Promise<string> {
    try {
      // Try to get stored token
      const storedToken = this.getStoredToken();
      
      if (storedToken && !this.isTokenExpired(storedToken)) {
        return storedToken.access_token;
      }

      // Token is expired or doesn't exist, refresh it
      const newToken = await this.refreshAccessToken();
      return newToken.access_token;
    } catch (error) {
      console.error('Error getting valid access token:', error);
      // Clear any invalid stored token
      this.clearStoredToken();
      throw error;
    }
  }

  /**
   * Clear stored token (useful for logout or errors)
   */
  static clearToken(): void {
    this.clearStoredToken();
  }

  /**
   * Check if we have a valid token stored
   */
  static hasValidToken(): boolean {
    const token = this.getStoredToken();
    return token !== null && !this.isTokenExpired(token);
  }
}
