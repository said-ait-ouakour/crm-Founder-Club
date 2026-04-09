
import { NextRequest } from 'next/server'

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const client = require('twilio')(apiKey, apiSecret, { accountSid });

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
const conversationSid = await Promise.resolve(params.id);
try {
    const messages = await client.conversations.v1.conversations(conversationSid).messages.list({ limit: 100 });
    // Map Twilio messages to a simple format
    const mapped = (messages as any[]).map((msg: any) => {
      let channelType = undefined;
      let sentAt = undefined;
      let delivery = msg.delivery || {};
      if (msg.attributes) {
        try {
            // attributes may be a stringified JSON
            const attrs = typeof msg.attributes === 'string' ? JSON.parse(msg.attributes) : msg.attributes;
            // Twilio sometimes uses 'channel' instead of 'channelType'
            channelType = attrs.channelType || attrs.channel || undefined;
            sentAt = attrs.sentAt || undefined;
        } catch {
            channelType = undefined;
        }

        // If author is not 'system', infer channelType from author
        if (msg.author && msg.author !== 'system') {
            if (msg.author.includes('whatsapp')) {
                channelType = 'whatsapp';
            } else {
                channelType = 'sms';
            }
        }
      }
      // Default to 'sms' if not set
      if (!channelType) channelType = 'sms';
      return {
        id: msg.sid,
        body: msg.body,
        author: msg.author,
        dateCreated: msg.dateCreated instanceof Date ? msg.dateCreated.toISOString() : msg.dateCreated,
        channelType,
        sentAt,
        delivery,
        media: msg.media || undefined,
      };
    });
    return new Response(JSON.stringify({ messages: mapped }), {
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
