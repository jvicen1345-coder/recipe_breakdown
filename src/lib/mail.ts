import { Resend } from "resend";

// Optional, like ANTHROPIC_API_KEY/OPENAI_API_KEY — without it, verification emails
// are just logged instead of sent, so local dev/testing never needs a real account.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "Cutesy Eats <onboarding@resend.dev>";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  if (!resend) {
    console.warn(
      `[mail] RESEND_API_KEY not set — skipping verification email to ${to}. Confirm link: ${verifyUrl}`,
    );
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: "Confirm your email for Cutesy Eats 🌸",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #b0596f;">Confirm your email 🌸</h2>
          <p>Click below to confirm your email and unlock adding, editing, and cooking recipes on Cutesy Eats.</p>
          <p style="margin: 24px 0;">
            <a href="${verifyUrl}" style="background: linear-gradient(135deg, #ff9a76, #b0596f); color: white; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
              Confirm email
            </a>
          </p>
          <p style="color: #888; font-size: 13px;">If the button doesn't work, paste this link into your browser: ${verifyUrl}</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[mail] failed to send verification email:", err);
  }
}
