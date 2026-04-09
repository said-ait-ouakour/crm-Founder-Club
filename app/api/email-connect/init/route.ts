import { NextRequest, NextResponse } from 'next/server';
import { createPkcePair, getOutlookConfig, getAuthorizationScopes } from '@/lib/outlook';

export async function GET(req: NextRequest) {
  const url = new URL(req.nextUrl);
  const userId = url.searchParams.get('user_id');
  if (!userId) {
    return NextResponse.json(
      { error: 'Missing user ID' },
      { status: 400 }
    );
  }

  try {
    const { clientId, tenantId, redirectUri } = getOutlookConfig();
    
    // Generate PKCE pair for secure OAuth flow
    const { codeVerifier, codeChallenge } = createPkcePair();
    
    const authorizationUrl = new URL(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`
    );
    
    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('redirect_uri', redirectUri);
    authorizationUrl.searchParams.set('response_mode', 'query');
    // Use proper scopes - includes Calendars.ReadWrite for creating events
    const scopes = getAuthorizationScopes() + ' Mail.Send User.Read';
    authorizationUrl.searchParams.set('scope', scopes);
    // Validate userId is a valid UUID before encoding
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new Error(`Invalid user ID format: ${userId}. Must be a valid UUID.`);
    }
    
    // Encode userId and code_verifier in state as a fallback (separated by a delimiter)
    // Format: userId|codeVerifier (base64 encoded for safety)
    const statePlain = `${userId}|${codeVerifier}`;
    const stateData = Buffer.from(statePlain, 'utf-8').toString('base64');
    // URL-safe base64 encoding (replace + with - and / with _)
    const urlSafeState = stateData.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    console.log('State encoding - userId:', userId, 'length:', userId.length);
    console.log('State plain (first 50 chars):', statePlain.substring(0, 50) + '...');
    console.log('State encoded (first 50 chars):', urlSafeState.substring(0, 50) + '...');
    authorizationUrl.searchParams.set('state', urlSafeState);
    authorizationUrl.searchParams.set('prompt', 'select_account');
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');

    const response = NextResponse.json({ authUrl: authorizationUrl.toString() });
    const isProduction = process.env.NODE_ENV === 'production';

    // Store code_verifier in cookie for later use in callback
    response.cookies.set('email_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    console.log('Set email_code_verifier cookie, length:', codeVerifier.length);
    console.log('Cookie settings:', { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' });

    return response;
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to initialize email connection' },
      { status: 500 }
    );
  }
}
