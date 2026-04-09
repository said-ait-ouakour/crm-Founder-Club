import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { lead_id, name, content, subject, brochureType } = await request.json()

    if (!lead_id || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: lead_id and name' },
        { status: 400 }
      )
    }

    // Prepare webhook payload
    const webhookPayload: any = {
      lead_id,
      name
    }

    // Only include content if it's been customized
    if (content) {
      // Convert \n to actual newlines for proper formatting
      webhookPayload.content = content.replace(/\\n/g, '\n')
    }

    // Include subject if provided
    if (subject) {
      webhookPayload.subject = subject
    }

    // Include brochure type if provided
    if (brochureType) {
      webhookPayload.brochure = brochureType
    }

    // Send data to the webhook
    const webhookUrl = 'https://n8n.aipersonalassistants.ai/webhook/31329694-43f2-4d60-9b53-189fd7f15db4'
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    })

    if (!webhookResponse.ok) {
      throw new Error(`Webhook request failed: ${webhookResponse.status} ${webhookResponse.statusText}`)
    }

    const webhookResult = await webhookResponse.json()

    return NextResponse.json({
      success: true,
      message: 'Brochure sent successfully',
      webhookResponse: webhookResult
    })

  } catch (error) {
    console.error('Error sending brochure:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send brochure',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
