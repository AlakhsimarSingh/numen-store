import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "NUMEN <onboarding@resend.dev>";

export async function sendMagicLinkEmail(to: string, verifyUrl: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Your NUMEN login link",
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 20px; margin-bottom: 8px;">Log in to NUMEN.</h1>
        <p style="color: #555; font-size: 14px; line-height: 1.6;">
          Click the button below to log in. This link expires in 15 minutes and can only be used once.
        </p>
        <a href="${verifyUrl}" style="display: inline-block; margin-top: 20px; background: #C9FF3D; color: #0B0B0C; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Log in to NUMEN
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendAdminMagicLinkEmail(
  to: string,
  verifyUrl: string,
  meta: { ip?: string; userAgent?: string }
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "NUMEN Admin — sign-in request",
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 20px; margin-bottom: 8px;">Admin sign-in request</h1>
        <p style="color: #555; font-size: 14px; line-height: 1.6;">
          A sign-in was requested for the NUMEN admin panel from this email address.
          This link expires in <strong>10 minutes</strong> and can only be used once.
        </p>
        <a href="${verifyUrl}" style="display: inline-block; margin-top: 20px; background: #C9FF3D; color: #0B0B0C; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Sign in to Admin
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          Request details — IP: ${meta.ip ?? "unknown"} · Device: ${meta.userAgent ?? "unknown"}
        </p>
        <p style="color: #999; font-size: 12px;">
          If you didn't request this, someone may be trying to access your admin account. Consider rotating access.
        </p>
      </div>
    `,
  });
}

export async function sendContactNotificationEmail(params: {
  name: string;
  email: string;
  topic: string;
  message: string;
}) {
  const supportInbox = process.env.SUPPORT_INBOX_EMAIL ?? FROM;
  await resend.emails.send({
    from: FROM,
    to: supportInbox,
    replyTo: params.email,
    subject: `[Contact] ${params.topic} — ${params.name}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 18px; margin-bottom: 4px;">New contact message</h1>
        <p style="color: #999; font-size: 12px; margin-top: 0;">${params.topic}</p>
        <p style="font-size: 14px;"><strong>${params.name}</strong> &lt;${params.email}&gt;</p>
        <div style="margin-top: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${params.message}</div>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">Reply directly to this email, or manage it in the admin inbox.</p>
      </div>
    `,
  });
}

export async function sendContactConfirmationEmail(params: { name: string; email: string; topic: string }) {
  await resend.emails.send({
    from: FROM,
    to: params.email,
    subject: "We got your message — NUMEN",
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 20px; margin-bottom: 8px;">Thanks, ${params.name.split(" ")[0]}.</h1>
        <p style="color: #555; font-size: 14px; line-height: 1.6;">
          We've got your message about <strong>${params.topic}</strong> and typically reply within a day.
          We'll get back to you at this email address.
        </p>
      </div>
    `,
  });
}

export async function sendContactReplyEmail(params: { to: string; name: string; originalMessage: string; reply: string }) {
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: "Re: Your message to NUMEN",
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 20px; margin-bottom: 8px;">Hi ${params.name.split(" ")[0]},</h1>
        <p style="color: #333; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${params.reply}</p>
        <div style="margin-top: 24px; padding: 16px; border-left: 3px solid #eee; color: #999; font-size: 12px; white-space: pre-wrap;">
          Your original message:<br />${params.originalMessage}
        </div>
      </div>
    `,
  });
}