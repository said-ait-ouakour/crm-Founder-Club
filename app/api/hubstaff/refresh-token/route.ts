import { NextRequest, NextResponse } from 'next/server';
import { HubstaffServerTokenManager } from '@/lib/hubstaff-server-token-manager';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();
    
    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 400 });
    }

    // Test the new refresh token
    try {
      const formData = new FormData();
      formData.append('refresh_token', refreshToken);
      formData.append('grant_type', 'refresh_token');

      const response = await fetch('https://account.hubstaff.com/access_tokens', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ 
          error: 'Invalid refresh token',
          details: errorText
        }, { status: 400 });
      }

      const data = await response.json();
      
      // Clear any existing token
      HubstaffServerTokenManager.clearToken();
      
      return NextResponse.json({ 
        success: true,
        message: 'Refresh token updated successfully',
        expiresIn: data.expires_in
      });
    } catch (error) {
      return NextResponse.json({ 
        error: 'Failed to validate refresh token',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating refresh token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
