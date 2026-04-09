import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();
    const { channel, template_id, message, subject, variables } = body as {
      channel: 'email' | 'sms' | 'whatsapp';
      template_id?: string | null;
      message: string;
      subject?: string | null;
      variables?: Record<string, unknown>;
    };

    if (!channel || !message) {
      return NextResponse.json({ 
        error: 'Channel and message are required' 
      }, { status: 400 });
    }

    // Validate channel
    const validChannels = ['email', 'sms', 'whatsapp'];
    if (!validChannels.includes(channel)) {
      return NextResponse.json({ 
        error: 'Invalid channel. Must be email, sms, or whatsapp' 
      }, { status: 400 });
    }

    // Get candidate information
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id, full_name, email, phone_number')
      .eq('id', id)
      .single();

    if (candidateError || !candidate) {
      return NextResponse.json({ 
        error: 'Candidate not found' 
      }, { status: 404 });
    }

    // Validate recipient information based on channel
    if (channel === 'email' && !candidate.email) {
      return NextResponse.json({ 
        error: 'Candidate has no email address' 
      }, { status: 400 });
    }

    if ((channel === 'sms' || channel === 'whatsapp') && !candidate.phone_number) {
      return NextResponse.json({ 
        error: 'Candidate has no phone number' 
      }, { status: 400 });
    }

    // Create webhook payload (email sends composed content only; sms/whatsapp may include template)
    const webhookPayload: Record<string, unknown> = {
      candidate_id: candidate.id,
      channel,
      recipient: channel === 'email' ? candidate.email : candidate.phone_number,
      timestamp: new Date().toISOString(),
    };

    // Resolve placeholders in the message body using provided variables and candidate data
    const resolvedVariables: Record<string, string> = {
      name: candidate.full_name || '',
      ...(variables || {}),
    } as Record<string, string>;

    const resolvePlaceholders = (text: string | null | undefined, vars: Record<string, string>) => {
      if (!text) return '';
      let resolved = text;
      
      // Handle numbered placeholders ({{1}}, {{2}}, {{3}}) - used for Twilio templates
      resolved = resolved
        .replace(/\{\{\s*1\s*\}\}/g, vars["1"] || vars.name || candidate.full_name || '')
        .replace(/\{\{\s*2\s*\}\}/g, vars["2"] || '')
        .replace(/\{\{\s*3\s*\}\}/g, vars["3"] || '');
      
      // Handle named placeholders ({{name}}, {{my_name}})
      resolved = resolved
        .replace(/\{\{\s*name\s*\}\}/gi, vars.name || candidate.full_name || '')
        .replace(/\{\{\s*my_name\s*\}\}/gi, (vars.my_name as string) || '');
      
      return resolved;
    };

    const resolvedMessage = resolvePlaceholders(message, resolvedVariables);

    if (channel === 'email') {
      webhookPayload.message = resolvedMessage;
      webhookPayload.subject = subject || null;
    } else {
      webhookPayload.message = resolvedMessage;
      if (template_id) {
        webhookPayload.template_id = template_id;
        if (variables && typeof variables === 'object') {
          webhookPayload.variables = variables;
        }
      }
    }

    // For emails, save the message to database immediately with correct direction
    let savedEmailMessage = null;
    if (channel === 'email') {
      try {
        // Get or create conversation for this candidate
        let { data: conversation, error: convError } = await supabase
          .from('candidates_conversation')
          .select('id')
          .eq('candidate_id', candidate.id)
          .single();

        // If no conversation exists, create one
        if (convError || !conversation) {
          const { data: newConversation, error: createConvError } = await supabase
            .from('candidates_conversation')
            .insert({
              candidate_id: candidate.id,
              created_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (createConvError) {
            console.error('Error creating conversation:', createConvError);
          } else {
            conversation = newConversation;
          }
        }

        // Save email message with direction='Outbound'
        if (conversation?.id) {
          const { data: emailMsg, error: emailError } = await supabase
            .from('candidate_email_messages')
            .insert({
              conversation_id: conversation.id,
              direction: 'Outbound', // Explicitly set as outbound
              content: resolvedMessage,
              subject: subject || null,
              status: 'sent',
              created_at: new Date().toISOString(),
              last_update: new Date().toISOString(),
            })
            .select()
            .single();

          if (emailError) {
            console.error('Error saving email message:', emailError);
            // Continue anyway - webhook will handle sending
          } else {
            savedEmailMessage = emailMsg;
            console.log('Email message saved as outbound:', emailMsg);
          }
        }
      } catch (emailSaveError) {
        console.error('Error in email save process:', emailSaveError);
        // Continue anyway - webhook will handle sending
      }
    }

    // Send to n8n webhook
    try {
      const webhookResponse = await fetch('https://n8n.aipersonalassistants.ai/webhook/115b6dee-9b72-4d17-88d4-a528d5a003fb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!webhookResponse.ok) {
        console.error('Webhook failed:', webhookResponse.status, webhookResponse.statusText);
        // If we saved the email, still return success since it's in the database
        if (savedEmailMessage) {
          return NextResponse.json({ 
            success: true,
            message: 'Message saved successfully (webhook may have failed)',
            saved_message: savedEmailMessage
          });
        }
        return NextResponse.json({ 
          error: 'Failed to send message via webhook' 
        }, { status: 500 });
      }

      const webhookResult = await webhookResponse.json();
      console.log('Webhook response:', webhookResult);

      return NextResponse.json({ 
        success: true,
        message: 'Message sent successfully',
        webhook_response: webhookResult,
        saved_message: savedEmailMessage
      });

    } catch (webhookError) {
      console.error('Error calling webhook:', webhookError);
      return NextResponse.json({ 
        error: 'Failed to send message via webhook' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in send-message webhook:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
