import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface Send2FARequest {
  email: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not set');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const { email } = await req.json() as Send2FARequest;
    if (!email) return new Response(JSON.stringify({ error: 'Missing email' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

    // Generate code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Update profile with code
    // Use Supabase REST to update profile (we rely on SERVICE_ROLE to be available via env if needed in deployment)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase config missing');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Upsert code into profiles table by email
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ mfa_code: code, mfa_expires_at: expiresAt, mfa_verified: false }),
    });

    if (!updateResponse.ok) {
      const err = await updateResponse.text();
      console.error('Error updating profile for 2FA:', err);
      return new Response(JSON.stringify({ error: 'Could not set 2FA code' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Send email via Resend
    const emailBody = {
      from: 'MundoComputo <auth@email.juanchito.me>',
      to: [email],
      subject: 'Código de verificación (MundoComputo)',
      html: `<p>Tu código de verificación es: <strong>${escapeHtml(code)}</strong></p><p>Caduca en 10 minutos.</p>`,
    };

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailBody),
    });

    if (!resendResp.ok) {
      const err = await resendResp.text();
      console.error('Resend error sending 2FA:', err);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (error: any) {
    console.error('send-2fa error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});
