import nodemailer from 'nodemailer';

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS, // Gmail App Password
    },
  });
};

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"${process.env.CLIENT_NAME}" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Email error:', error.message);
    return false;
  }
};

// Email templates
export const getOtpEmailTemplate = (otp, clientName) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #6366f1;">${clientName}</h2>
    <h3>Your OTP Code</h3>
    <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; text-align: center;">
      <h1 style="color: #6366f1; letter-spacing: 8px; font-size: 36px;">${otp}</h1>
    </div>
    <p>This OTP is valid for <strong>10 minutes</strong>.</p>
    <p>Do not share this OTP with anyone.</p>
  </div>
`;

export const getWelcomeEmailTemplate = (name, clientName) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #6366f1;">${clientName}</h2>
    <h3>Welcome, ${name}! 🎉</h3>
    <p>Your account has been created successfully.</p>
    <p>Start shopping now and enjoy exclusive deals!</p>
  </div>
`;

export const getPasswordResetTemplate = (resetUrl, clientName) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #6366f1;">${clientName}</h2>
    <h3>Reset Your Password</h3>
    <p>Click the button below to reset your password:</p>
    <a href="${resetUrl}" 
       style="background: #6366f1; color: white; padding: 12px 24px; 
              border-radius: 6px; text-decoration: none; display: inline-block;">
      Reset Password
    </a>
    <p>This link expires in <strong>1 hour</strong>.</p>
    <p>If you didn't request this, ignore this email.</p>
  </div>
`;