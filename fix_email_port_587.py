#!/usr/bin/env python3
"""
Fix v3 — switch Gmail SMTP from port 465 to port 587 (STARTTLS)

Run this from the root of your ecommerce-platform repo (after the
previous two email fix scripts):
    python3 fix_email_port_587.py

WHAT HAPPENED:
  The IPv6 fix worked — no more ENETUNREACH. But now the connection
  times out instead:
      ❌ Email error: Connection timeout

  This means the IPv4 route exists, but the TCP handshake to port 465
  (implicit TLS — what nodemailer's `service: 'gmail'` shorthand uses
  by default) never completes. This is a common pattern on PaaS free
  tiers: port 465 gets silently filtered/dropped on the network level
  (anti-spam policy), while port 587 (STARTTLS, the standard mail
  submission port) is left open.

What this script does:
  Replaces the `service: 'gmail'` shorthand with an explicit
  host/port/secure config: smtp.gmail.com:587 with secure: false
  (STARTTLS upgrades the connection after the initial plaintext
  connect, instead of connecting over TLS from the start like port
  465 does). Everything else (family: 4, timeouts, auth) stays as-is.

Verified locally: `node --check backend/src/utils/email.js` passes. I
could not verify actual SMTP connectivity from my sandbox (no network
path to smtp.gmail.com there) — please confirm after deploying.

If port 587 ALSO times out, that would mean Render is blocking
outbound SMTP entirely on this plan, and the real fix would be
switching to an HTTP-API-based email provider (Resend, SendGrid,
Postmark, etc.) instead of raw SMTP — those work over normal HTTPS
(port 443), which is never blocked. Worth keeping in mind as a
fallback if this doesn't resolve it.

Safe to re-run: skips if already patched.
"""
import os
import sys

ROOT = os.getcwd()
EMAIL_UTIL_PATH = os.path.join(ROOT, "backend", "src", "utils", "email.js")


def main():
    if not os.path.isfile(EMAIL_UTIL_PATH):
        print("[ERROR] Run this script from the repo root (the folder that contains "
              "'frontend/' and 'backend/').")
        sys.exit(1)

    with open(EMAIL_UTIL_PATH, "r") as f:
        content = f.read()

    if "port: 587" in content:
        print("[skip] email.js — already on port 587")
        return

    old = """const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS, // Gmail App Password
    },"""

    new = """const createTransporter = () => {
  return nodemailer.createTransport({
    // Port 465 (implicit TLS, what 'service: gmail' shorthand uses) was
    // timing out — likely filtered on Render's network. Port 587 with
    // STARTTLS is the more commonly-open submission port for cloud hosts.
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS — upgrades the connection after connecting
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS, // Gmail App Password
    },"""

    if old not in content:
        print("[WARN] email.js — expected transporter block not found, check manually "
              "(maybe the earlier email fix scripts haven't been run yet?)")
        sys.exit(1)

    content = content.replace(old, new, 1)
    with open(EMAIL_UTIL_PATH, "w") as f:
        f.write(content)

    print(f"[OK] patched {EMAIL_UTIL_PATH} — SMTP now uses port 587 (STARTTLS)")
    print("\nNow verify with:")
    print("  node --check backend/src/utils/email.js")
    print()
    print("Then commit, push, let Render redeploy, and test:")
    print("  1. Sign up with a fresh email")
    print("  2. Check Render logs for '📧 Email sent:' vs '❌ Email error:'")
    print("  3. Check that the OTP actually arrives in the inbox")


if __name__ == "__main__":
    main()
