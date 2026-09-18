#!/usr/bin/env python3
"""
Fix — non-blocking email sends in register/forgotPassword (auth.controller.js)

Run this from the root of your ecommerce-platform repo:
    python3 fix_blocking_email.py

THE BUG YOU HIT:
  forgotPassword() awaited sendEmail() (Gmail SMTP via nodemailer)
  before responding. If Gmail SMTP is slow, misconfigured, or
  unreachable from Render, that await could hang or fail for a long
  time — and since axios never got a proper HTTP response, the
  frontend's generic catch-all fallback ("Email not found.") fired,
  which looks exactly like "this email isn't registered" even though
  it has nothing to do with whether the email exists.

  register() had the same pattern (awaiting 2 emails before
  responding) — this is a bigger risk than just your own password
  reset, because it means ANY new user's signup could hang/fail the
  same way if Gmail SMTP has a bad moment.

What this script does:
  1. email.js — adds connectionTimeout/greetingTimeout/socketTimeout
     (10s each) to the nodemailer transporter, so a bad SMTP
     connection fails fast instead of hanging indefinitely.
  2. auth.controller.js — makes the welcome/OTP emails in register()
     and the reset email in forgotPassword() fire-and-forget (not
     awaited) instead of blocking the HTTP response. The response now
     goes out immediately once the DB write (OTP/reset token) is
     saved, regardless of whether the email actually sends. Failures
     are still logged via logger.error() for visibility.

This does NOT touch backend/src/jobs/loyaltyExpiry.job.js, which also
calls sendEmail — that's a background cron job, not a live user
request, so blocking there doesn't hang anyone's browser.

Verified locally: `node --check` on both touched files passes.

Safe to re-run: skips if already patched.
"""
import os
import sys

ROOT = os.getcwd()
EMAIL_UTIL_PATH = os.path.join(ROOT, "backend", "src", "utils", "email.js")
AUTH_CONTROLLER_PATH = os.path.join(ROOT, "backend", "src", "controllers", "auth.controller.js")


def patch_email_util():
    with open(EMAIL_UTIL_PATH, "r") as f:
        content = f.read()

    if "connectionTimeout" in content:
        print("[skip] email.js — already has timeouts")
        return

    old = """      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS, // Gmail App Password
    },
  });"""
    new = """      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS, // Gmail App Password
    },
    // Agar Gmail SMTP unreachable/slow hai (galat App Password, blocked
    // outbound port, etc.), ye fail-fast karta hai instead of hanging
    // indefinitely and blocking whichever request called sendEmail().
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });"""

    if old not in content:
        print("[WARN] email.js — transporter block not found as expected, check manually")
        return

    content = content.replace(old, new, 1)
    with open(EMAIL_UTIL_PATH, "w") as f:
        f.write(content)
    print(f"[OK] patched {EMAIL_UTIL_PATH}")


def patch_auth_controller():
    with open(AUTH_CONTROLLER_PATH, "r") as f:
        content = f.read()

    changed = False

    # ── register() ──────────────────────────────────────────────────
    old_register = """  // Welcome email bhejo
  await sendEmail({
    to: email,
    subject: `Welcome to ${process.env.CLIENT_NAME}!`,
    html: getWelcomeEmailTemplate(name, process.env.CLIENT_NAME),
  });

  // OTP email bhejo
  await sendEmail({
    to: email,
    subject: 'Verify your email',
    html: getOtpEmailTemplate(otp, process.env.CLIENT_NAME),
  });

  sendTokenResponse(res, user, 201, 'Registration successful! Please verify your email.');"""

    new_register = """  // Welcome + OTP email — fire-and-forget, non-blocking. Registration
  // shouldn't hang or fail just because Gmail SMTP is slow/unreachable;
  // the OTP is already saved to the user doc above, so the verify-otp
  // flow works regardless of whether this email actually lands.
  sendEmail({
    to: email,
    subject: `Welcome to ${process.env.CLIENT_NAME}!`,
    html: getWelcomeEmailTemplate(name, process.env.CLIENT_NAME),
  }).catch((err) => logger.error('Welcome email failed', err));

  sendEmail({
    to: email,
    subject: 'Verify your email',
    html: getOtpEmailTemplate(otp, process.env.CLIENT_NAME),
  }).catch((err) => logger.error('OTP email failed', err));

  sendTokenResponse(res, user, 201, 'Registration successful! Please verify your email.');"""

    if "fire-and-forget, non-blocking. Registration" in content:
        print("[skip] auth.controller.js: register() — already patched")
    elif old_register not in content:
        print("[WARN] auth.controller.js: register() block not found as expected, check manually")
    else:
        content = content.replace(old_register, new_register, 1)
        changed = True
        print("[OK] auth.controller.js: register() — emails now non-blocking")

    # ── forgotPassword() ────────────────────────────────────────────
    old_forgot = """  await sendEmail({
    to: email,
    subject: 'Password Reset Request',
    html: getPasswordResetTemplate(resetUrl, process.env.CLIENT_NAME),
  });

  res.json(new ApiResponse(200, null, 'Password reset link sent to your email.'));"""

    new_forgot = """  // Fire-and-forget — this was hanging/failing the whole request when
  // Gmail SMTP was slow, which is exactly the bug Kamal hit. The reset
  // token is already saved above regardless of email delivery.
  sendEmail({
    to: email,
    subject: 'Password Reset Request',
    html: getPasswordResetTemplate(resetUrl, process.env.CLIENT_NAME),
  }).catch((err) => logger.error('Password reset email failed', err));

  res.json(new ApiResponse(200, null, 'Password reset link sent to your email.'));"""

    if "hanging/failing the whole request" in content:
        print("[skip] auth.controller.js: forgotPassword() — already patched")
    elif old_forgot not in content:
        print("[WARN] auth.controller.js: forgotPassword() block not found as expected, check manually")
    else:
        content = content.replace(old_forgot, new_forgot, 1)
        changed = True
        print("[OK] auth.controller.js: forgotPassword() — email now non-blocking")

    if changed:
        with open(AUTH_CONTROLLER_PATH, "w") as f:
            f.write(content)


def main():
    if not os.path.isfile(EMAIL_UTIL_PATH) or not os.path.isfile(AUTH_CONTROLLER_PATH):
        print("[ERROR] Run this script from the repo root (the folder that contains "
              "'frontend/' and 'backend/').")
        sys.exit(1)

    patch_email_util()
    patch_auth_controller()

    print("\nNow verify with:")
    print("  node --check backend/src/utils/email.js")
    print("  node --check backend/src/controllers/auth.controller.js")
    print()
    print("After deploying, also double-check on Render -> Environment:")
    print("  GMAIL_USER and GMAIL_PASS are set correctly (GMAIL_PASS must be a")
    print("  16-character Gmail App Password, not your normal Gmail password —")
    print("  App Passwords require 2FA enabled on the Gmail account, generated at")
    print("  https://myaccount.google.com/apppasswords). If these are wrong or")
    print("  missing, emails will still silently fail to send — but with this")
    print("  fix, at least registration/password-reset won't hang because of it.")


if __name__ == "__main__":
    main()
