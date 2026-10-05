// Phone-first signup (OTP) creates an account before we know the person's email,
// but the User schema requires a unique email. We give those accounts a clearly
// fake placeholder address. It must NEVER be shown to the user or emailed.
export const PLACEHOLDER_EMAIL_DOMAIN = 'luxora.local';

export const placeholderEmailFor = (phone) => `phone_${phone}@${PLACEHOLDER_EMAIL_DOMAIN}`;

export const isPlaceholderEmail = (email) =>
  typeof email === 'string' && email.trim().toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
