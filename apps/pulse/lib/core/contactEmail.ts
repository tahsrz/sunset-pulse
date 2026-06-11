type ContactEmailResult =
  | { success: true; id: string | null }
  | { success: false; reason: string; status?: number };

type ContactEmailInput = {
  name: string;
  email?: string;
  message: string;
};

export async function sendContactEmail({ name, email, message }: ContactEmailInput): Promise<ContactEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[CONTACT_EMAIL_ERROR]: Missing RESEND_API_KEY');
    return { success: false, reason: 'Missing RESEND_API_KEY.', status: 503 };
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'tahsrz@gmail.com';
  const from = process.env.RESEND_FROM_EMAIL || 'Sunset Pulse <no-reply@sunsetpulse.ai>';
  
  const subject = `New Contact Form Submission from ${name}`;
  const text = [
    `You have received a new message from the Sunset Pulse contact form.`,
    ``,
    `Name: ${name}`,
    `Email: ${email || 'Not provided'}`,
    ``,
    `Message:`,
    message,
    ``,
    `---`,
    `This email was sent from the Sunset Pulse website contact form.`,
  ].join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [adminEmail],
        subject,
        text,
        reply_to: email || undefined,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('[CONTACT_EMAIL_RESEND_ERROR]:', payload);
      return {
        success: false,
        reason: payload?.message || 'Failed to send contact email.',
        status: response.status,
      };
    }

    return { success: true, id: payload?.id || null };
  } catch (error: any) {
    console.error('[CONTACT_EMAIL_FETCH_ERROR]:', error);
    return { success: false, reason: 'Internal server error while sending email.', status: 500 };
  }
}
