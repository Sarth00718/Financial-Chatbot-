/**
 * Email Service
 * Handles sending emails using Nodemailer
 */

import nodemailer from "nodemailer";

/**
 * Create email transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.ethereal.email",
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER || "ethereal.user@ethereal.email",
      pass: process.env.EMAIL_PASS || "ethereal.pass",
    },
  });
};

/**
 * Send email
 * @param {Object} options - Email options
 */
export const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || "FinChatBot <noreply@finchatbot.com>",
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);

    // Log preview URL for development
    if (process.env.NODE_ENV !== "production") {
      console.log("📧 Email sent:", nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (error) {
    console.error("Email sending failed:", error);
    if (process.env.NODE_ENV !== "production") {
      console.log("⚠️ (Dev Mode) Ignoring email sending error so the flow can continue.");
      return null;
    }
    throw new Error("Failed to send email");
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, name, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n========================================`);
    console.log(`🔐 PASSWORD RESET LINK (Dev Mode)`);
    console.log(`🔗 ${resetUrl}`);
    console.log(`========================================\n`);
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>You requested to reset your password for your FinChatBot account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} FinChatBot. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: "Password Reset Request - FinChatBot",
    html,
    text: `Hi ${name}, You requested to reset your password. Visit this link: ${resetUrl}`,
  });
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (email, name) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to FinChatBot!</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>Welcome to FinChatBot - Your financial document analysis platform!</p>
          <p>You can now:</p>
          <ul>
            <li>📄 Upload and analyze financial documents</li>
            <li>💬 Ask questions and get instant answers</li>
            <li>📊 Generate insights and analytical reports</li>
            <li>📈 Extract data from charts, tables, and scanned PDFs</li>
          </ul>
          <p>Get started by logging in to your account.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} FinChatBot. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: "Welcome to FinChatBot!",
    html,
    text: `Hi ${name}, Welcome to FinChatBot! Start analyzing your financial documents today.`,
  });
};
