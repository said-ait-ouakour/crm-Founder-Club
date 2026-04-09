import { NextRequest } from 'next/server'

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const client = require('twilio')(apiKey, apiSecret, { accountSid });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const conversationSid = params.id;
  try {
    const { body, channel, contactId, to, templateSid } = await req.json();
    
    let message;
    
    // If templateSid is provided, use Twilio Messages API for business-initiated templates
    if (templateSid && (channel === "whatsapp" || channel === "sms")) {
      const fromNumber = channel === "whatsapp" ? "whatsapp:+447367835651" : "+447367835651";
      const toNumber = channel === "whatsapp" && !to.startsWith("whatsapp:") ? `whatsapp:${to}` : to;
      
      // Send using template for business-initiated messages (outside 24-hour window)
      message = await client.messages.create({
        body,
        from: fromNumber,
        to: toNumber,
        contentSid: templateSid, // Use the template SID for business-initiated messages
      });
      
      // Also add to conversation for consistency
      try {
        await client.conversations.conversations(conversationSid).messages.create({
          body,
          author: 'system',
          attributes: JSON.stringify({ 
            channelType: channel,
            contactId: contactId || null,
            to: to || null,
            templateSid: templateSid,
            messageSid: message.sid
          })
        });
      } catch (convError) {
        console.warn('Failed to add message to conversation:', convError);
        // Don't fail the whole request if conversation update fails
      }
    } else {
      // Regular message sending through Conversations API
      message = await client.conversations.conversations(conversationSid).messages.create({
        body,
        author: 'system',
        attributes: JSON.stringify({ 
          channelType: channel,
          contactId: contactId || null,
          to: to || null
        })
      });
    }
    
    return new Response(JSON.stringify({ message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    let message = 'Unknown error';
    if (error && typeof error === 'object' && 'message' in error) {
      message = (error as any).message;
    }
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
