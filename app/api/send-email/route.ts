import { createServerClient } from '@supabase/ssr'

type EmailAttachment = {
  content: string;
  filename: string;
  type: string;
  disposition: string;
  contentId: string;
  size: number;
};

type SendEmailRequest = {
  to: string | string[];
  subject: string;
  content: string;
  leadId: string;
  contactId?: string;
  conversationId?: string | number;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  templateId?: string;
};


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;


// Initialize SendGrid with API key
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function POST(request: Request) {
  try {
    const body: SendEmailRequest = await request.json();
    const { to, subject, content, leadId, contactId, conversationId, cc, bcc, attachments, templateId } = body;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return '' // Return the cookie value if it exists
          },
          set(name: string, value: string, options: any) {
            // Set the cookie
          },
          remove(name: string, options: any) {
            // Remove the cookie
          }
        }
      }
    );
    
    // 1. Resolve lead id (lead inbox provides leadId; contact inbox may provide contactId)
    let resolvedLeadId =
      leadId !== undefined && leadId !== null && String(leadId).trim() !== ""
        ? String(leadId)
        : null;

    if (!resolvedLeadId && contactId) {
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .select("lead_id")
        .eq("id", contactId)
        .maybeSingle();

      if (contactError) {
        throw new Error(`Failed to resolve contact lead: ${contactError.message}`);
      }

      if (contact?.lead_id) {
        resolvedLeadId = String(contact.lead_id);
      }
    }

    if (!resolvedLeadId) {
      throw new Error("Unable to resolve lead ID for email conversation.");
    }

    // 2. Get lead information (optional - for logging/audit purposes)
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('contact_first_name, contact_last_name, business_name')
      .eq('id', resolvedLeadId)
      .single();

    if (leadError || !lead) {
      console.warn('Lead not found for email sending:', leadError);
      // Continue anyway - we have the email address to send to
    }

    // 3. Ensure lead has an email conversation before sending
    let resolvedConversationId: string | number | null =
      conversationId !== undefined && conversationId !== null && String(conversationId).trim() !== ""
        ? conversationId
        : null;

    if (!resolvedConversationId) {
      const { data: existingConversation, error: existingConversationError } = await supabase
        .from("email_conversation")
        .select("id")
        .eq("lead_id", resolvedLeadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConversationError) {
        throw new Error(`Failed to load email conversation: ${existingConversationError.message}`);
      }

      if (existingConversation?.id) {
        resolvedConversationId = existingConversation.id;
      } else {
        const { data: newConversation, error: createConversationError } = await supabase
          .from("email_conversation")
          .insert([
            {
              lead_id: resolvedLeadId,
              created_at: new Date().toISOString(),
            },
          ])
          .select("id")
          .single();

        if (createConversationError && !newConversation?.id) {
          // Handle race: another request may have created the conversation.
          const { data: retryConversation, error: retryConversationError } = await supabase
            .from("email_conversation")
            .select("id")
            .eq("lead_id", resolvedLeadId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!retryConversationError && retryConversation?.id) {
            resolvedConversationId = retryConversation.id;
          } else {
            throw new Error(
              `Failed to create email conversation: ${createConversationError?.message || "Unknown error"}`
            );
          }
        } else if (!newConversation?.id) {
          throw new Error(
            `Failed to create email conversation: ${createConversationError?.message || "Unknown error"}`
          );
        } else {
          resolvedConversationId = newConversation.id;
        }
      }
    }

    // 4. Prepare email message
    let htmlContent = content;
    let textContent = content.replace(/<[^>]*>?/gm, '');
    // If templateId is provided, you could fetch and render the template here
    // For now, just pass through the content as html
    // In production, you might want to fetch template from DB or file system

    const msg = {
      to,
      from: 'info@peoplemanager.co',
      subject,
      text: textContent,
      html: htmlContent,
      cc,
      bcc,
      replyTo: 'info@reply.peoplemanager.co',
      attachments,
      // Optionally, you could add custom_args or templateId for SendGrid dynamic templates
      // custom_args: templateId ? { templateId } : undefined,
    };

    // 5. Send email using SendGrid
    const [response] = await sgMail.send(msg);
    const messageId = response.headers['x-message-id'];

    // 6. Save message to email_messages table
    let savedMessage = null;
    const { data: messageData, error: msgError } = await supabase
      .from('email_messages')
      .insert([{
        message_id: messageId,
        conversation_id: resolvedConversationId,
        direction: 'Outbound',
        status: 'sent',
        last_update: new Date().toISOString(),
        content: content,
        subject: subject,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (msgError) {
      console.error('Error saving email message:', msgError);
      // Don't fail the request - email was sent successfully
    } else {
      savedMessage = messageData;
    }

    return new Response(
      JSON.stringify({ message: savedMessage, conversationId: resolvedConversationId }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}