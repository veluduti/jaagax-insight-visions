import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InterestConfirmationRequest {
  name: string;
  email: string;
  projectName: string;
  leadId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, projectName, leadId }: InterestConfirmationRequest = await req.json();

    console.log("Sending interest confirmation email to:", email);

    // In production, integrate with Resend or another email service
    const emailContent = {
      to: email,
      from: "noreply@yourdomain.com",
      subject: `Thank you for your interest in ${projectName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Thank You for Your Interest!</h2>
          <p>Dear ${name},</p>
          <p>Thank you for expressing interest in <strong>${projectName}</strong>.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">What happens next?</h3>
            <ul style="line-height: 1.8;">
              <li>Our sales team will review your inquiry</li>
              <li>We'll contact you within 24 hours with detailed information</li>
              <li>You'll receive personalized pricing and payment plans</li>
              <li>We can arrange a site visit at your convenience</li>
            </ul>
          </div>

          <p>In the meantime, feel free to explore more projects on our website or contact us directly if you have any questions.</p>
          
          <p><strong>Reference ID:</strong> ${leadId}</p>
          
          <p>Best regards,<br>The Real Estate Team</p>
        </div>
      `,
    };

    console.log("Email would be sent:", emailContent);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Interest confirmation logged (email service not configured)" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-interest-confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
