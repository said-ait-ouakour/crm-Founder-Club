import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const candidateId = parseInt(id, 10);

    if (isNaN(candidateId)) {
      return NextResponse.json(
        { error: 'Invalid candidate ID' },
        { status: 400 }
      );
    }

    // Get n8n webhook URL from environment variable or use default
    const webhookUrl = process.env.N8N_ONBOARDING_WEBHOOK_URL || 
      'https://n8n.aipersonalassistants.ai/webhook/onboarding';

    // Prepare webhook payload
    const webhookPayload = {
      candidate_id: candidateId,
      timestamp: new Date().toISOString(),
    };

    // Send to n8n webhook and wait for response
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    // Wait for and parse webhook response
    let webhookResult;
    const contentType = webhookResponse.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      webhookResult = await webhookResponse.json();
    } else {
      const textResponse = await webhookResponse.text();
      webhookResult = textResponse ? { message: textResponse } : {};
    }

    // Check if webhook response indicates success
    if (!webhookResponse.ok) {
      const errorText = webhookResult?.message || webhookResult?.error || webhookResponse.statusText;
      console.error('n8n webhook returned error:', {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        errorText,
        candidateId,
        webhookResult,
      });

      return NextResponse.json(
        { 
          error: `Webhook returned ${webhookResponse.status}: ${errorText}`,
          success: false,
          webhook_response: webhookResult,
        },
        { status: webhookResponse.status }
      );
    }

    // Webhook responded successfully - return success with webhook response
    console.log('Successfully triggered n8n onboarding webhook:', {
      status: webhookResponse.status,
      candidateId,
      webhookResult,
    });

    return NextResponse.json({
      success: true,
      message: 'Candidate added to onboarding successfully',
      candidate_id: candidateId,
      webhook_response: webhookResult,
    });

  } catch (error) {
    console.error('Error calling onboarding webhook:', error);
    return NextResponse.json(
      {
        error: 'Failed to add candidate to onboarding',
        message: error instanceof Error ? error.message : String(error),
        success: false
      },
      { status: 500 }
    );
  }
}
