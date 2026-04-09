import sgMail from '@sendgrid/mail'

// Make sure to set SENDGRID_API_KEY in your environment variables
sgMail.setApiKey(process.env.SENDGRID_API_KEY as string)

/**
 * Send an email using SendGrid
 */
export async function sendEmail({
  to,
  from,
  subject,
  text,
  html,
}: {
  to: string
  from: string
  subject: string
  text?: string
  html?: string
}) {
  const msg = {
    to,
    from,
    subject,
    text,
    html,
  }
  return sgMail.send(msg)
}

/**
 * Fetch a message by ID using SendGrid's Web API
 * Note: This requires the Web API, not the mail SDK
 */
export async function fetchMessageById(messageId: string) {
  const apiKey = process.env.SENDGRID_API_KEY || ''
  if (!apiKey) throw new Error('SENDGRID_API_KEY not set')
  const response = await fetch(`https://api.sendgrid.com/v3/messages/${messageId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  )
  console.log(response)
  if (!response.ok) throw new Error(`SendGrid fetch failed: ${response}`)
  return response.json()
}
