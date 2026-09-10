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

/**
 * Notifies the firm's configured inbox about a new internship application.
 */
export async function sendInternshipNotification(params: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}) {
  const to = process.env.FIRM_NOTIFICATION_EMAIL;

  if (!isConfigured() || !to) {
    console.log(
      `[mailer] Resend not configured — skipping notification for new internship application from ${params.email}.`
    );
    return;
  }

  const text = [
    "A new internship application was submitted on the website.",
    "",
    `Name: ${params.firstName} ${params.lastName}`,
    `Email: ${params.email}`,
    `Phone: ${params.phone}`,
    "",
    "View the application and attached files from the admin dashboard under Internships.",
  ].join("\n");

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: [to],
      replyTo: params.email,
      subject: `New Internship Application — ${params.firstName} ${params.lastName}`,
      text,
    });

    if (error) {
      console.error("[mailer] Resend error (internship notification):", error);
      return;
    }

    console.log(`[mailer] Internship notification sent successfully. Email ID: ${data?.id}`);
  } catch (error) {
    console.error("[mailer] Failed to send email:", error);
  }
}

/**
 * Sends the applicant a short thank-you/confirmation email once their
 * internship application has been received.
 */
export async function sendInternshipApplicantThankYou(params: {
  firstName: string;
  email: string;
  firmName?: string;
}) {
  if (!isConfigured()) {
    console.log(
      `[mailer] Resend not configured — skipping applicant thank-you email to ${params.email}.`
    );
    return;
  }

  const firmName = params.firmName ?? "our firm";

  const text = [
    `Dear ${params.firstName},`,
    "",
    `Thank you for applying to the Internship Programme at ${firmName}.`,
    "We have received your application, including your attached documents, and our team will review it shortly. If your profile matches what we're looking for, we will reach out to you directly.",
    "",
    "We appreciate your interest in joining our firm.",
    "",
    "Warm regards,",
    firmName,
  ].join("\n");

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: [params.email],
      subject: "We've received your internship application",
      text,
    });

    if (error) {
      console.error("[mailer] Resend error (applicant thank-you):", error);
      return;
    }

    console.log(`[mailer] Applicant thank-you email sent successfully. Email ID: ${data?.id}`);
  } catch (error) {
    console.error("[mailer] Failed to send applicant thank-you email:", error);
  }
}