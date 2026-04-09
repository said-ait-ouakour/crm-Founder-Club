import { NextRequest } from 'next/server'

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const client = require('twilio')(apiKey, apiSecret, { accountSid });

export async function POST(req: NextRequest) {
  try {
    const { body, channel, contactId, to, templateSid } = await req.json();
    
    if (!templateSid) {
      return new Response(JSON.stringify({ error: 'Template SID is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!to) {
      return new Response(JSON.stringify({ error: 'Recipient number is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Determine the correct from number based on channel
    const fromNumber = channel === "whatsapp" ? "whatsapp:+447367835651" : "+447367835651";
    const toNumber = channel === "whatsapp" && !to.startsWith("whatsapp:") ? `whatsapp:${to}` : to;
    
    // Send using template for business-initiated messages (outside 24-hour window)
    const message = await client.messages.create({
      body,
      from: fromNumber,
      to: toNumber,
      contentSid: templateSid, // Use the template SID for business-initiated messages
    });
    
    return new Response(JSON.stringify({ 
      success: true,
      message: {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        body: message.body
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    let message = 'Unknown error';
    if (error && typeof error === 'object' && 'message' in error) {
      message = (error as any).message;
    }
    return new Response(JSON.stringify({ error: message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
