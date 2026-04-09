import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { text } = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const response = await fetch('https://api.fish.audio/v1/tts', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer 08ad8f7ae1514ca1a649ef078932efff',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                reference_id: 'a6d40bc0dd934ddc97bea77c249ff7f3',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Fish.audio API error:', errorText);
            return NextResponse.json(
                { error: `Failed to convert text to speech: ${response.statusText}` },
                { status: response.status }
            );
        }

        const audioBuffer = await response.arrayBuffer();
        
        if (!audioBuffer || audioBuffer.byteLength === 0) {
            return NextResponse.json(
                { error: 'Received empty audio data from fish.audio' },
                { status: 500 }
            );
        }

        // Return the audio data with appropriate headers
        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.byteLength.toString(),
            },
        });
    } catch (error) {
        console.error('Error in fish.audio text-to-speech:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
