import { NextRequest, NextResponse } from 'next/server';
import { Twilio } from 'twilio';

type TwilioMediaInstance = {
  sid: string;
  accountSid: string;
  parentAccountSid: string;
  messageSid: string;
  uri: string;
  dateCreated: Date;
  dateUpdated: Date;
  contentType: string;
  [key: string]: any;
};

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;

if (!accountSid || !apiKey || !apiSecret) {
  throw new Error('Twilio credentials are not properly configured');
}

const client = require('twilio')(apiKey, apiSecret, { accountSid });

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const mediaSid = params.id;
  const { searchParams } = new URL(request.url);
  const messageSid = searchParams.get('messageSid');
  const conversationSid = searchParams.get('conversationSid');

  if (!mediaSid || !messageSid || !conversationSid) {
    return NextResponse.json(
      { error: 'Media SID, message SID, and conversation SID are required' },
      { status: 400 }
    );
  }

  try {
    // Fetch media metadata from Twilio MCS REST API
    const mcsUrl = `https://mcs.us1.twilio.com/v1/Services/ISed98db6b02ce427d8c1c26b7f56c5ed5/Media/${mediaSid}`;
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const mcsRes = await fetch(mcsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });
    if (!mcsRes.ok) {
      const err = await mcsRes.text();
      return NextResponse.json({ success: false, error: 'Failed to fetch media from MCS', details: err }, { status: mcsRes.status });
    }
    const media = await mcsRes.json();
    // Return the direct temporary URL and metadata
    return NextResponse.json({
      success: true,
      media: {
        sid: media.sid,
        contentType: media.content_type,
        filename: media.file_name || `media-${media.sid}`,
        size: media.size,
        url: media.links?.content_direct_temporary || media.links?.content,
        expires: null,
      }
    });
  } catch (error: any) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch media',
        details: error.message 
      },
      { status: error.status || 500 }
    );
  }
}