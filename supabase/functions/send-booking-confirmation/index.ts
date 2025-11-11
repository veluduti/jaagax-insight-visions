import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
  visitorName: string;
  visitorEmail: string;
  projectName: string;
  visitDate: string;
  visitTime: string;
  bookingId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      visitorName, 
      visitorEmail, 
      projectName, 
      visitDate, 
      visitTime,
      bookingId 
    }: BookingConfirmationRequest = await req.json();

    console.log("Sending booking confirmation email to:", visitorEmail);

    // In production, integrate with Resend or another email service
    // For now, we'll log the email content
    const emailContent = {
      to: visitorEmail,
      from: "noreply@yourdomain.com",
      subject: `Site Visit Confirmed - ${projectName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Site Visit Confirmed!</h2>
          <p>Dear ${visitorName},</p>
          <p>Your site visit to <strong>${projectName}</strong> has been successfully scheduled.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Visit Details:</h3>
            <p><strong>Project:</strong> ${projectName}</p>
            <p><strong>Date:</strong> ${visitDate}</p>
            <p><strong>Time:</strong> ${visitTime}</p>
            <p><strong>Booking ID:</strong> ${bookingId}</p>
          </div>

          <p>Our team will contact you shortly to confirm the details and provide directions to the site.</p>
          
          <p>If you need to reschedule or cancel, please contact us at support@yourdomain.com</p>
          
          <p>We look forward to showing you around!</p>
          
          <p>Best regards,<br>The Real Estate Team</p>
        </div>
      `,
    };

    console.log("Email would be sent:", emailContent);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Booking confirmation logged (email service not configured)" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-booking-confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
