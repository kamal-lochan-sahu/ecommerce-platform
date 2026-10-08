import nodemailer from 'nodemailer';
import twilio from 'twilio';
import logger from '../utils/logger.js';
import { isPlaceholderEmail } from '../utils/identity.js';

// ONE place that talks to the outside world for SMS and email.
// Every other file (OTPs, order emails, jobs) calls sendSms() / sendMail(), so going
// live is a CONFIG change (env variables on the server), not a code change:
//
//   SMS_PROVIDER   = console | twilio     (unset + Twilio keys present => twilio)
//   EMAIL_PROVIDER = console | smtp       (unset + SMTP_* or GMAIL_* present => smtp)
//
//   console : prints the message (including OTP codes) in the server log. For
//             development / testing only. It must be chosen explicitly - it is never
//             the silent default, so a forgotten setting cannot fake a delivery.
//   twilio / smtp : real delivery. SMTP works with any provider (SES, SendGrid, Brevo,
//             Postmark, Gmail...), you only change SMTP_HOST / USER / PASS.
//
// Adding another provider (e.g. MSG91 for India) = one new branch in sendSms() below.

const clean = (name) => (process.env[name] || '').trim().toLowerCase();

// ---------------------------------------------------------------- SMTP config
const smtpConfig = () => {
  if (process.env.SMTP_HOST) {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    };
  }
  // Legacy Gmail settings (what production used until now) keep working unchanged.
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD;
  if (user && pass) {
    return { host: 'smtp.gmail.com', port: 587, secure: false, auth: { user, pass } };
  }
  return null;
};

// ------------------------------------------------------------ provider choice
export const getSmsProvider = () => {
  const p = clean('SMS_PROVIDER');
  if (p === 'console' || p === 'twilio') return p;
  if (p) return 'invalid';
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) return 'twilio'; // legacy
  return 'none';
};

export const getMailProvider = () => {
  const p = clean('EMAIL_PROVIDER');
  if (p === 'console') return 'console';
  if (p === 'smtp' || p === 'gmail') return smtpConfig() ? 'smtp' : 'none'; // 'gmail' = legacy name
  if (p) return 'invalid';
  return smtpConfig() ? 'smtp' : 'none';
};

export const messagingStatus = () => ({ sms: getSmsProvider(), email: getMailProvider() });

// Called once at startup (server.js) so a wrong setup is visible immediately.
export const logMessagingStatus = () => {
  const { sms, email } = messagingStatus();
  logger.info(`Messaging providers: SMS=${sms}, EMAIL=${email}`);
  const note = (kind, name, envName) => {
    if (name === 'console') {
      logger.warn(`${kind} provider is "console": messages and OTP codes are printed in the server log. Fine for testing - switch ${envName} before launch.`);
    } else if (name === 'none') {
      logger.warn(`${kind} provider is NOT configured: ${kind === 'SMS' ? 'phone OTP and SMS' : 'email OTP and emails'} will fail until ${envName} is set.`);
    } else if (name === 'invalid') {
      logger.error(`${envName}="${process.env[envName]}" is not a known provider. Allowed: console, ${kind === 'SMS' ? 'twilio' : 'smtp'}.`);
    }
  };
  note('SMS', sms, 'SMS_PROVIDER');
  note('EMAIL', email, 'EMAIL_PROVIDER');
};

// ----------------------------------------------------------------------- SMS
const toE164 = (to) => (String(to).startsWith('+') ? String(to) : `+91${String(to).replace(/^0+/, '')}`);

let twilioClient;
const getTwilio = () => {
  if (!twilioClient) twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return twilioClient;
};

// Returns { success, provider, messageId?, error? } - never throws.
export const sendSms = async ({ to, body }) => {
  const provider = getSmsProvider();
  if (provider === 'console') {
    logger.warn(`[SMS:console] to=${toE164(to)} :: ${body}`);
    return { success: true, provider };
  }
  if (provider === 'twilio') {
    try {
      const msg = await getTwilio().messages.create({
        body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: toE164(to),
      });
      return { success: true, provider, messageId: msg.sid };
    } catch (error) {
      logger.error(`SMS send failed: ${error.message}`);
      return { success: false, provider, error: error.message };
    }
  }
  return {
    success: false,
    provider,
    error: provider === 'invalid' ? `Unknown SMS_PROVIDER "${process.env.SMS_PROVIDER}"` : 'SMS provider is not configured',
  };
};

// --------------------------------------------------------------------- Email
let cachedTransport;
let cachedKey;
const getTransport = (cfg) => {
  const key = JSON.stringify(cfg);
  if (!cachedTransport || cachedKey !== key) {
    cachedTransport = nodemailer.createTransport({
      ...cfg,
      // Cloud hosts like Render often have no outbound IPv6 route; force IPv4.
      family: 4,
      // Fail fast instead of hanging a request if the SMTP port is blocked/unreachable.
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
    cachedKey = key;
  }
  return cachedTransport;
};

const fromAddress = () => {
  const name = process.env.EMAIL_FROM_NAME || process.env.CLIENT_NAME || 'Luxora';
  const addr = process.env.EMAIL_FROM || process.env.GMAIL_USER || process.env.SMTP_USER || 'noreply@localhost';
  return `"${name}" <${addr}>`;
};

const stripTags = (html = '') => String(html).replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// Returns { success, provider, messageId?, skipped?, error? } - never throws.
export const sendMail = async ({ to, subject, html, text }) => {
  // Phone-only accounts carry a fake placeholder address (phone_X@luxora.local).
  const recipients = (Array.isArray(to) ? to : [to]).filter((a) => a && !isPlaceholderEmail(a));
  if (recipients.length === 0) {
    return { success: false, skipped: true, error: 'No deliverable recipient (placeholder or empty address)' };
  }

  const provider = getMailProvider();
  if (provider === 'console') {
    logger.warn(`[MAIL:console] to=${recipients.join(', ')} subject="${subject}" :: ${text || stripTags(html)}`);
    return { success: true, provider };
  }
  if (provider === 'smtp') {
    try {
      const info = await getTransport(smtpConfig()).sendMail({
        from: fromAddress(),
        to: recipients.join(', '),
        subject,
        html,
        text: text || stripTags(html),
      });
      logger.info(`Email sent to ${recipients.join(', ')}: ${info.messageId}`);
      return { success: true, provider, messageId: info.messageId };
    } catch (error) {
      logger.error(`Email send failed: ${error.message}`);
      return { success: false, provider, error: error.message };
    }
  }
  return {
    success: false,
    provider,
    error: provider === 'invalid' ? `Unknown EMAIL_PROVIDER "${process.env.EMAIL_PROVIDER}"` : 'Email provider is not configured',
  };
};
