import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "re_NSsSUdAo_L3Ae665nppgUThqTyHnFTJoV";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceRequest {
  clientEmail: string;
  clientName: string;
  invoiceNumber: string;
  items: Array<{
    product: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  total: number;
  date: string;
}

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientEmail, clientName, invoiceNumber, items, total, date }: InvoiceRequest = await req.json();

    // Basic validation
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error: RESEND_API_KEY missing' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!clientEmail || !emailRegex.test(clientEmail)) {
      return new Response(JSON.stringify({ error: 'Invalid clientEmail' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Items must be a non-empty array' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${escapeHtml(String(item.product || ''))}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${Number(item.quantity)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">$${Number(item.price).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">$${Number(item.subtotal).toFixed(2)}</td>
      </tr>
    `).join('');

    const emailBody = {
      from: "Sistema de Ventas <ventas@email.juanchito.me>",
      to: [clientEmail],
      subject: `Factura #${invoiceNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Factura</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">Factura</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Número: ${invoiceNumber}</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 20px; border-left: 1px solid #ddd; border-right: 1px solid #ddd;">
              <p style="margin: 0 0 10px 0;"><strong>Cliente:</strong> ${clientName}</p>
              <p style="margin: 0;"><strong>Fecha:</strong> ${new Date(date).toLocaleDateString('es-ES')}</p>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 10px 10px;">
              <h2 style="color: #667eea; margin-top: 0;">Detalles de la Venta</h2>
              
              <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                  <tr style="background-color: #667eea; color: white;">
                    <th style="padding: 12px; text-align: left;">Producto</th>
                    <th style="padding: 12px; text-align: center;">Cantidad</th>
                    <th style="padding: 12px; text-align: right;">Precio</th>
                    <th style="padding: 12px; text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #667eea;">
                <p style="text-align: right; font-size: 20px; margin: 0;">
                  <strong>Total: $${total.toFixed(2)}</strong>
                </p>
              </div>
              
              <div style="margin-top: 30px; padding: 15px; background: #f0f4ff; border-radius: 5px;">
                <p style="margin: 0; text-align: center; color: #666;">
                  Gracias por su compra. Si tiene alguna pregunta, no dude en contactarnos.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    // Timeout setup for fetch
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(emailBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const contentType = emailResponse.headers.get('content-type') || '';
      const emailData = contentType.includes('application/json') ? await emailResponse.json() : { status: emailResponse.status };

      if (!emailResponse.ok) {
        console.error('Resend API returned error', emailResponse.status, emailData);
        return new Response(JSON.stringify({ error: 'Error sending email', details: emailData }), { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }

      // Success
      console.log('Invoice email sent successfully');
      return new Response(JSON.stringify(emailData), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        console.error('Resend request timed out');
        return new Response(JSON.stringify({ error: 'External service timeout' }), { status: 504, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      throw err;
    }
  } catch (error: any) {
    console.error("Error sending invoice:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);