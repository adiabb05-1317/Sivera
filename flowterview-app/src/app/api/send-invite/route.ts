import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  const { email, name, job } = await req.json();

  const transporter = nodemailer.createTransport({
    host: 'smtpout.secureserver.net',
    port: 465, // Use 465 for SSL
    secure: true, // true for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `Flowterview Team <${process.env.SMTP_USER}>`,
    to: email,
    subject: `You're Invited: Interview for ${job} at Flowterview!`,
    html: `
      <div style="font-family: Arial, sans-serif; background: #f7f7fa; padding: 32px;">
        <div style="max-width: 540px; margin: auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px #e0e7ff; padding: 32px;">
          <h2 style="color: #4f46e5; margin-bottom: 0.5em;">🎉 Congratulations, ${name}! 🎉</h2>
          <p style="font-size: 1.1em; color: #333;">
            We are excited to invite you for an interview for the <b>${job}</b> position at <b>Flowterview</b>.
          </p>
          <p style="font-size: 1.05em; color: #444;">
            Your skills and experience have impressed our team, and we’d love to get to know you better!
          </p>
          <div style="margin: 24px 0;">
            <a href="mailto:recruiter@flowterview.com" style="display:inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 1.1em; font-weight: bold;">Confirm Interview</a>
          </div>
          <p style="color: #555;">
            We’ll be in touch soon to schedule your interview.<br>
            If you have any questions, just reply to this email.
          </p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 0.95em; color: #888;">
            Best regards,<br>
            The Flowterview Team
          </p>
        </div>
      </div>
    `
  };

  try {
    // Start email sending but don't await it
    // This makes the UI respond immediately
    const emailPromise = transporter.sendMail(mailOptions);
    
    // Return success right away before email completes
    return NextResponse.json({ success: true });
    
    // Email continues sending in the background
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
