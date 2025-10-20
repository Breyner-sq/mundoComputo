import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Verify2FARequest {
  email: string;
  code: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { email, code } = await req.json() as Verify2FARequest;
    if (!email || !code) return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase config missing');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Query profile by email
    const profileResp = await fetch(`${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!profileResp.ok) {
      const err = await profileResp.text();
      console.error('Error fetching profile for verify-2fa:', err);
      return new Response(JSON.stringify({ error: 'Could not fetch profile' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const profiles = await profileResp.json();
    const profile = Array.isArray(profiles) && profiles.length > 0 ? profiles[0] : null;
    if (!profile) return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

    const now = new Date();
    const expiresAt = profile.mfa_expires_at ? new Date(profile.mfa_expires_at) : null;

    if (!profile.mfa_code || !expiresAt || now > expiresAt) {
      return new Response(JSON.stringify({ error: 'Code expired or not set' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    if (String(profile.mfa_code) !== String(code)) {
      return new Response(JSON.stringify({ error: 'Invalid code' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Clear code and mark verified
    const updateResp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${profile.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ mfa_code: null, mfa_expires_at: null, mfa_verified: true }),
    });

    if (!updateResp.ok) {
      const err = await updateResp.text();
      console.error('Error updating profile after verify-2fa:', err);
      return new Response(JSON.stringify({ error: 'Could not update profile' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (error: any) {
    console.error('verify-2fa error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});
