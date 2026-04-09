import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { upsertOutlookConnection, encryptToken } from '@/lib/outlook';

export async function GET(req: NextRequest) {
  console.log('Received OAuth callback:', req.url);
  
  try {
    // Get authenticated user from session first
    const supabase = await createClient();
    const {
      data: { user: authenticatedUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !authenticatedUser) {
      console.error('Failed to get authenticated user:', userError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/contacts?` +
        new URLSearchParams({
          emailError: 'authentication_required',
          errorDescription: 'You must be logged in to connect your email account'
        })
      );
    }

    const userId = authenticatedUser.id;
    console.log('Authenticated user ID:', userId);

    // Initialize Supabase with service role for database operations
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const stateParam = searchParams.get('state');
    
    // Try to get code_verifier from state parameter (primary) or cookie (fallback)
    // Debug: Log all available cookies
    const allCookies = Array.from(req.cookies.getAll());
    console.log('Available cookies:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })));
    console.log('State parameter:', stateParam ? stateParam.substring(0, 50) + '...' : 'missing');
    
    let codeVerifier: string | null = null;
    let stateUserId: string | null = null; // For validation only
    
    // UUID validation helper
    const isValidUUID = (str: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };
    
    // Primary: Try to decode from state parameter (most reliable across redirects)
    if (stateParam) {
      try {
        // URL decode first (in case Microsoft encoded it)
        let urlDecoded = decodeURIComponent(stateParam);
        // Convert URL-safe base64 back to standard base64
        urlDecoded = urlDecoded.replace(/-/g, '+').replace(/_/g, '/');
        // Add padding if needed
        while (urlDecoded.length % 4) {
          urlDecoded += '=';
        }
        // Then base64 decode
        const decoded = Buffer.from(urlDecoded, 'base64').toString('utf-8');
        console.log('Decoded state length:', decoded.length);
        console.log('Decoded state (first 100 chars):', decoded.substring(0, 100));
        if (decoded.includes('|')) {
          const parts = decoded.split('|');
          if (parts.length >= 2) {
            const extractedUserId = parts[0].trim();
            const extractedCodeVerifier = parts[1].trim();
            
            // Validate UUID format and extract for validation
            if (isValidUUID(extractedUserId)) {
              stateUserId = extractedUserId;
              codeVerifier = extractedCodeVerifier;
              console.log('✅ Extracted userId and code_verifier from state parameter');
              console.log('State userId (for validation):', stateUserId);
              console.log('Authenticated userId:', userId);
              console.log('Code verifier length:', codeVerifier.length);
              
              // Security check: verify state userId matches authenticated user
              if (stateUserId !== userId) {
                console.error('State userId mismatch! State:', stateUserId, 'Authenticated:', userId);
                return NextResponse.redirect(
                  `${process.env.NEXT_PUBLIC_APP_URL}/contacts?` +
                  new URLSearchParams({
                    emailError: 'state_mismatch',
                    errorDescription: 'State parameter does not match authenticated user'
                  })
                );
              }
            } else {
              console.error('Invalid UUID format in decoded userId:', extractedUserId);
            }
          } else {
            console.warn('State contains | but not enough parts:', parts.length);
          }
        } else {
          // Legacy: state is plain userId, validate it matches authenticated user
          const decodedUserId = decoded.trim();
          if (isValidUUID(decodedUserId)) {
            stateUserId = decodedUserId;
            console.log('State is plain userId (no | delimiter), validating against authenticated user');
            console.log('State userId:', stateUserId, 'Authenticated userId:', userId);
            
            // Security check: verify state userId matches authenticated user
            if (stateUserId !== userId) {
              console.error('State userId mismatch! State:', stateUserId, 'Authenticated:', userId);
              return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/contacts?` +
                new URLSearchParams({
                  emailError: 'state_mismatch',
                  errorDescription: 'State parameter does not match authenticated user'
                })
              );
            }
          } else {
            console.error('Invalid UUID format in plain state:', decoded);
          }
        }
      } catch (e) {
        console.error('State decoding error:', e);
        console.error('State param value:', stateParam.substring(0, 100));
        // If decoding fails, try treating as URL-safe base64 without URL decoding
        try {
          let urlSafeDecoded = stateParam.replace(/-/g, '+').replace(/_/g, '/');
          // Add padding if needed
          while (urlSafeDecoded.length % 4) {
            urlSafeDecoded += '=';
          }
          const decoded = Buffer.from(urlSafeDecoded, 'base64').toString('utf-8');
          if (decoded.includes('|')) {
            const parts = decoded.split('|');
            if (parts.length >= 2) {
              const extractedUserId = parts[0].trim();
              const extractedCodeVerifier = parts[1].trim();
              if (isValidUUID(extractedUserId)) {
                stateUserId = extractedUserId;
                codeVerifier = extractedCodeVerifier;
                console.log('✅ Extracted from state (retry without URL decode)');
                console.log('State userId:', stateUserId, 'Authenticated userId:', userId);
                
                // Security check: verify state userId matches authenticated user
                if (stateUserId !== userId) {
                  console.error('State userId mismatch in retry! State:', stateUserId, 'Authenticated:', userId);
                  return NextResponse.redirect(
                    `${process.env.NEXT_PUBLIC_APP_URL}/contacts?` +
                    new URLSearchParams({
                      emailError: 'state_mismatch',
                      errorDescription: 'State parameter does not match authenticated user'
                    })
                  );
                }
              } else {
                console.error('Invalid UUID format in retry:', extractedUserId);
              }
            }
          } else {
            const decodedUserId = decoded.trim();
            if (isValidUUID(decodedUserId)) {
              stateUserId = decodedUserId;
              console.log('State userId (retry plain):', stateUserId, 'Authenticated userId:', userId);
              
              // Security check: verify state userId matches authenticated user
              if (stateUserId !== userId) {
                console.error('State userId mismatch in retry plain! State:', stateUserId, 'Authenticated:', userId);
                return NextResponse.redirect(
                  `${process.env.NEXT_PUBLIC_APP_URL}/contacts?` +
                  new URLSearchParams({
                    emailError: 'state_mismatch',
                    errorDescription: 'State parameter does not match authenticated user'
                  })
                );
              }
            } else {
              console.error('Invalid UUID format in retry (plain):', decoded);
            }
          }
        } catch (e2) {
          console.error('All decoding attempts failed:', e2);
          // Only validate state as userId if it's a valid UUID
          if (isValidUUID(stateParam.trim())) {
            stateUserId = stateParam.trim();
            console.log('Using state as plain userId (valid UUID) for validation');
            console.log('State userId:', stateUserId, 'Authenticated userId:', userId);
            
            // Security check: verify state userId matches authenticated user
            if (stateUserId !== userId) {
              console.error('State userId mismatch in final fallback! State:', stateUserId, 'Authenticated:', userId);
              return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/contacts?` +
                new URLSearchParams({
                  emailError: 'state_mismatch',
                  errorDescription: 'State parameter does not match authenticated user'
                })
              );
            }
          } else {
            console.error('State is not a valid UUID:', stateParam);
          }
        }
      }
    }
    
    // Fallback: If we don't have code_verifier yet, try cookies (check both possible names)
    if (!codeVerifier) {
      // Try email_code_verifier first (for email-connect flow)
      let cookieVerifier = req.cookies.get('email_code_verifier')?.value;
      // If not found, try outlook_code_verifier (for outlook flow that might be reused)
      if (!cookieVerifier) {
        cookieVerifier = req.cookies.get('outlook_code_verifier')?.value;
      }
      if (cookieVerifier) {
        codeVerifier = cookieVerifier;
        console.log('Using code_verifier from cookie (fallback)');
      }
    }
    
    console.log('Final - userId:', userId ? 'found' : 'missing', 'code_verifier:', codeVerifier ? 'found' : 'missing');
    
    // Validate required environment variables
    const requiredEnvVars = [
      'OUTLOOK_CLIENT_ID',
      'OUTLOOK_CLIENT_SECRET',
      'OUTLOOK_REDIRECT_URI',
      'NEXT_PUBLIC_APP_URL'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', { error, errorDescription });
      const errorResponse = NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/contacts?` + 
        new URLSearchParams({
          emailError: 'oauth_error',
          error,
          errorDescription: errorDescription || ''
        })
      );
      errorResponse.cookies.delete('email_code_verifier');
      return errorResponse;
    }

    // Ensure we have required parameters (code is checked here, userId will be checked after state decoding)
    if (!code) {
      console.error('Missing authorization code');
      const errorResponse = NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/contacts?` +
        new URLSearchParams({
          emailError: 'missing_parameters',
          errorDescription: 'Authorization code is missing from callback'
        })
      );
      errorResponse.cookies.delete('email_code_verifier');
      return errorResponse;
    }

    console.log('Exchanging code for tokens...');
    
    // Exchange authorization code for tokens
    // For personal Microsoft accounts, we need to use the common endpoint
    const tenantId = process.env.OUTLOOK_TENANT_ID || 'common';
    const clientId = process.env.OUTLOOK_CLIENT_ID!.trim();
    const clientSecret = process.env.OUTLOOK_CLIENT_SECRET!.trim();
    const redirectUri = process.env.OUTLOOK_REDIRECT_URI!.trim();
    
    // Validate client secret is not empty and looks like a valid secret (not an ID)
    if (!clientSecret || clientSecret.length < 10) {
      throw new Error('Invalid client secret: secret appears to be too short or empty');
    }
    
    // Check if client secret looks like a GUID (secret ID) instead of the actual secret value
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (guidPattern.test(clientSecret)) {
      throw new Error('Invalid client secret: You appear to be using the Secret ID (GUID) instead of the Secret Value. In Azure Portal, make sure you copy the "Value" column, not the "Secret ID" column.');
    }
    
    // PKCE is required - code_verifier must be provided
    if (!codeVerifier) {
      console.error('Missing code_verifier for PKCE flow');
      console.error('State param was:', stateParam);
      console.error('All cookies:', allCookies.map(c => c.name));
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/contacts?` +
        new URLSearchParams({
          emailError: 'missing_code_verifier',
          errorDescription: 'PKCE code_verifier is required but was not found in state parameter or cookies'
        })
      );
    }
    
    // userId is already validated from authenticated session above
    // Final validation - ensure userId is a valid UUID before database operations
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('Authenticated userId failed validation:', userId);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/contacts?` +
        new URLSearchParams({
          emailError: 'invalid_user_id_format',
          errorDescription: `Authenticated user ID format is invalid: ${userId.substring(0, 50)}`
        })
      );
    }
    
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
        scope: 'openid offline_access Calendars.ReadWrite User.Read',
      }),
    });

    const tokens = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokens);
      const errorResponse = NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/contacts?` +
        new URLSearchParams({
          emailError: 'token_exchange_failed',
          error: tokens.error || 'unknown_error',
          errorDescription: tokens.error_description || ''
        })
      );
      errorResponse.cookies.delete('email_code_verifier');
      return errorResponse;
    }

    console.log('Storing tokens in database...');
    
    // Check if a connection already exists for this user
    const { data: existingConnection, error: findError } = await serviceSupabase
      .from('email_connections')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    console.log('Existing connection:', existingConnection);
    if (findError) {
      console.warn('Find error (non-critical):', findError);
    }

    // Calculate token expiration time
    const expiresAt = tokens.expires_in 
      ? new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()
      : null;

    const connectionData = {
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString()
    };

    // Use upsert since there's a unique constraint on user_id
    // This will update if exists, insert if not
    const { error: dbError } = await serviceSupabase
        .from('email_connections')
      .upsert(connectionData, {
        onConflict: 'user_id'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    // Also create/update Outlook connection since Outlook email and calendar use the same OAuth tokens
    try {
      const tokenPayload = {
        token_type: 'Bearer',
        scope: tokens.scope || 'openid profile email offline_access Mail.Send User.Read Calendars.ReadWrite',
        expires_in: tokens.expires_in || 3600,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      };
      
      await upsertOutlookConnection(userId, tokenPayload);
      console.log('Outlook connection also created/updated for user:', userId);
    } catch (outlookError) {
      console.error('Error creating Outlook connection (non-critical):', outlookError);
      // Don't fail the whole flow if Outlook connection update fails
    }

    console.log('Email connection successful for user:', userId);
    
    // Clear PKCE cookie after successful token exchange
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/contacts?emailSuccess=connected`
    );
    response.cookies.delete('email_code_verifier');
    return response;
    
  } catch (error) {
    console.error('Email connection error:', error);
    const errorResponse = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/contacts?` +
      new URLSearchParams({
        emailError: 'connection_error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    );
    errorResponse.cookies.delete('email_code_verifier');
    return errorResponse;
  }
}