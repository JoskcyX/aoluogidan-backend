import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function isConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY &&
    process.env.FIRM_NOTIFICATION_EMAIL &&
    process.env.EMAIL_FROM
  );
}

/**
 * Notifies the firm's configured inbox about a new enquiry.
 *
 * Uses the Resend HTTPS API instead of SMTP/Nodemailer.
 * This works much better with Render's free service because
 * it does not require an outbound SMTP connection.
 *
 * If email isn't configured, the enquiry remains safely stored
 * in the database and the email is simply skipped.
 */
export async function sendEnquiryNotification(params: {
  type: "Contact" | "Consultation";
  fullName: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  areaOfLaw?: string | null;
  message: string;
}) {
  const to = process.env.FIRM_NOTIFICATION_EMAIL;

  if (!isConfigured() || !to) {
    console.log(
      `[mailer] Resend not configured — skipping email notification for new ${params.type.toLowerCase()} enquiry from ${params.email}.`
    );
    return;
  }

  const subjectLine = `New ${params.type} Enquiry — ${params.fullName}`;

  const text = [
    `A new ${params.type.toLowerCase()} enquiry was submitted on the website.`,
    "",
    `Name: ${params.fullName}`,
    `Email: ${params.email}`,
    params.phone ? `Phone: ${params.phone}` : null,
    params.subject ? `Subject: ${params.subject}` : null,
    params.areaOfLaw ? `Area of law: ${params.areaOfLaw}` : null,
    "",
    "Message:",
    params.message,
    "",
    "View and respond to this enquiry from the admin dashboard under Enquiries.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: [to],
      replyTo: params.email,
      subject: subjectLine,
      text,
    });

    if (error) {
      console.error("[mailer] Resend error:", error);
      return;
    }

    console.log(
      `[mailer] ${params.type} notification sent successfully. Email ID: ${data?.id}`
    );
  } catch (error) {
    console.error("[mailer] Failed to send email:", error);
  }
}