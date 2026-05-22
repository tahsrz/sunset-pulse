import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    const { email, full_name, role } = await req.json()

    console.log(`[WELCOME_EMAIL] Sending tactical briefing to ${email} (${role})`);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Jamie AI <intelligence@sunsetpulse.com>',
        to: [email],
        subject: 'SUNSET PULSE // WELCOME',
        html: `
          <div style="background-color: #020617; color: #f8fafc; font-family: 'Inter', sans-serif; padding: 40px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1); max-width: 600px; margin: 0 auto;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 32px;">
              <div style="width: 12px; height: 12px; background-color: #3b82f6; border-radius: 2px; animation: pulse 2s infinite;"></div>
              <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4em; color: rgba(255,255,255,0.4);">Intelligence_Auth_Success</span>
            </div>
            
            <h1 style="font-size: 32px; font-weight: 900; font-style: italic; letter-spacing: -0.05em; text-transform: uppercase; margin-bottom: 16px;">Identity Verified.</h1>
            
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 32px;">
              Welcome to the grid, <strong>${full_name || 'Operative'}</strong>. Your session has been established and your security profile is now active. Jamie AI has synchronized your reconnaissance data.
            </p>

            <div style="background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 24px; margin-bottom: 32px;">
              <h3 style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #3b82f6; margin-bottom: 16px;">Assigned Sector</h3>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 14px; font-weight: 700;">${role === 'realtor' ? 'Command Post (Advanced HUD)' : 'Consumer Intelligence Grid'}</span>
                <span style="font-size: 10px; font-mono: true; color: rgba(255,255,255,0.2);">SEC_AUTH_${role?.toUpperCase()}</span>
              </div>
            </div>

            <a href="https://sunsetpulse.com/login" style="display: block; width: 100%; padding: 16px 0; background-color: #2563eb; color: #ffffff; text-decoration: none; text-align: center; border-radius: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; font-size: 10px; box-shadow: 0 10px 20px rgba(37,99,235,0.2);">
              Enter Management Console
            </a>

            <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
              <p style="font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; color: rgba(255,255,255,0.2); line-height: 2;">
                Authorized Personnel Only. Access attempts are logged.<br/>
                Sunset Pulse // Powered by Jamie AI Intelligence.
              </p>
            </div>
          </div>
        `,
      }),
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: res.status,
    })
  } catch (err) {
    console.error("[WELCOME_EMAIL_FAILURE]:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
