// Phone-only accounts have a fake placeholder email in the database
// (phone_XXXXXXXXXX@luxora.local). It must never be shown to the user.
export const PHONE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

export const isPlaceholderEmail = (email = "") => /@luxora\.local$/i.test(email);

// The email to show for a user, or "" if they only have the placeholder.
export const displayEmail = (user) =>
  user?.email && !isPlaceholderEmail(user.email) ? user.email : "";

// One login box accepts "email OR phone". Tidy up what the person typed
// (spaces, dashes, +91) and say which one it is.
export const parseIdentifier = (raw = "") => {
  const trimmed = String(raw).trim();
  let digits = trimmed.replace(/[\s-]/g, "");
  if (/^\+91\d{10}$/.test(digits)) digits = digits.slice(3);
  if (PHONE_RE.test(digits)) return { type: "phone", value: digits };
  if (EMAIL_RE.test(trimmed)) return { type: "email", value: trimmed.toLowerCase() };
  return { type: "invalid", value: trimmed };
};
