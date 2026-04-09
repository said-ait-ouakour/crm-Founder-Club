import { NextResponse } from 'next/server';
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";

// Polly client setup
const pollyClient = new PollyClient({
  region:'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  try {
    const { text, voiceId = 'Ruth', outputFormat = 'mp3', languageCode = 'en-US' } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: outputFormat,
      VoiceId: voiceId,
      LanguageCode: languageCode,
      Engine: 'generative',
    });

    const response = await pollyClient.send(command);

    if (!response.AudioStream) {
      throw new Error('No audio stream received from Polly');
    }

    // Convert stream to buffer
    const audioBuffer = await response.AudioStream.transformToByteArray();

    // Return the audio buffer directly
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error in text-to-speech:', error);
    return NextResponse.json(
      { error: 'Failed to convert text to speech' },
      { status: 500 }
    );
  }
}
