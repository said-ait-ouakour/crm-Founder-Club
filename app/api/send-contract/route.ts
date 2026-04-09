import { NextRequest, NextResponse } from 'next/server'

const CONTRACT_WEBHOOK_URL = process.env.CONTRACT_WEBHOOK_URL

export async function POST(request: NextRequest) {
  try {
    const { lead_id, name, package_type, date, to_email, client } = await request.json()

    if (!lead_id || !package_type) {
      return NextResponse.json(
        { error: 'Missing required fields: lead_id, package_type' },
        { status: 400 }
      )
    }

    if (!CONTRACT_WEBHOOK_URL) {
      console.error('Missing CONTRACT_WEBHOOK_URL environment variable')
      return NextResponse.json(
        { error: 'Contract webhook not configured' },
        { status: 500 }
      )
    }

    const payload: Record<string, unknown> = {
      lead_id,
      package_type,
      name,
      date,
      to_email,
      client,
    }

    const webhookResponse = await fetch(CONTRACT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      throw new Error(`Webhook request failed: ${webhookResponse.status} ${webhookResponse.statusText} - ${errorText}`)
    }

    let webhookResult: unknown = null
    const responseContentType = webhookResponse.headers.get('content-type')
    if (responseContentType?.includes('application/json')) {
      webhookResult = await webhookResponse.json()
    } else {
      webhookResult = await webhookResponse.text()
    }

    return NextResponse.json({
      success: true,
      message: 'Contract sent successfully',
      webhookResponse: webhookResult,
    })
  } catch (error) {
    console.error('Error sending contract:', error)
    return NextResponse.json(
      {
        error: 'Failed to send contract',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

