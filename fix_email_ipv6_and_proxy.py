#!/usr/bin/env python3
"""
Fix — Gmail SMTP IPv6 ENETUNREACH + Express trust proxy warning

Run this from the root of your ecommerce-platform repo (AFTER
fix_blocking_email.py):
    python3 fix_email_ipv6_and_proxy.py

THE BUG YOU HIT:
  Render logs showed:
    ❌ Email error: connect ENETUNREACH 2404:6800:4003:c02::6c:465

  That's an IPv6 address. Render's containers can resolve Gmail's SMTP
  hostname to an IPv6 address, but don't have outbound IPv6 routing —
  so every single connection attempt fails. This is why "OTP sent" /
  "Registration successful" showed up (the earlier non-blocking fix
  stopped it from hanging) but no email ever actually arrived — the
  send was silently failing every time, not intermittently.

What this script does:
  1. email.js — adds `family: 4` to the nodemailer transporter, which
     forces IPv4-only DNS resolution for the SMTP connection.
  2. app.js — adds `app.set('trust proxy', 1)`, since Render sits
     behind a reverse proxy that sets X-Forwarded-For. Without this,
     express-rate-limit can't reliably identify per-client IPs (this
     showed up as a ValidationError in your logs, separate from the
     email issue but worth fixing at the same time).

Verified locally: `node --check` on both touched files passes. I
could not verify actual SMTP delivery from my sandbox (no network
path to smtp.gmail.com there) — please confirm after deploying by
signing up with a fresh email and checking that the OTP actually
arrives, plus checking Render logs for "📧 Email sent:" instead of
"❌ Email error:".

Safe to re-run: skips if already patched.
"""
import os
import sys

ROOT = os.getcwd()
EMAIL_UTIL_PATH = os.path.join(ROOT, "backend", "src", "utils", "email.js")
APP_JS_PATH = os.path.join(ROOT, "backend", "src", "app.js")


def patch_email_util():
    with open(EMAIL_UTIL_PATH, "r") as f:
        content = f.read()

    if "family: 4" in content:
        print("[skip] email.js — already forces IPv4")
        return

    old = """    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS, // Gmail App Password
    },
    // Agar Gmail SMTP unreachable/slow hai"""
    new = """    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS, // Gmail App Password
    },
    // Render's outbound IPv6 route to Gmail's SMTP servers is unreachable
    // (ENETUNREACH on 2404:6800:...:465), so force IPv4 for the connection.
    family: 4,
    // Agar Gmail SMTP unreachable/slow hai"""

    if old not in content:
        print("[WARN] email.js — expected transporter block not found, check manually "
              "(maybe fix_blocking_email.py hasn't been run yet? run that first)")
        return

    content = content.replace(old, new, 1)
    with open(EMAIL_UTIL_PATH, "w") as f:
        f.write(content)
    print(f"[OK] patched {EMAIL_UTIL_PATH} — SMTP now forces IPv4")


def patch_app_js():
    with open(APP_JS_PATH, "r") as f:
        content = f.read()

    if "trust proxy" in content:
        print("[skip] app.js — trust proxy already set")
        return

    old = "const app = express();"
    new = """const app = express();

// Render (aur zyadatar hosting platforms) ek reverse proxy ke peeche chalta
// hai jo X-Forwarded-For header set karta hai. Iske bina express-rate-limit
// sahi se real client IP identify nahi kar pata.
app.set('trust proxy', 1);"""

    if old not in content:
        print("[WARN] app.js — 'const app = express();' line not found, check manually")
        return

    content = content.replace(old, new, 1)
    with open(APP_JS_PATH, "w") as f:
        f.write(content)
    print(f"[OK] patched {APP_JS_PATH} — trust proxy set")


def main():
    if not os.path.isfile(EMAIL_UTIL_PATH) or not os.path.isfile(APP_JS_PATH):
        print("[ERROR] Run this script from the repo root (the folder that contains "
              "'frontend/' and 'backend/').")
        sys.exit(1)

    patch_email_util()
    patch_app_js()

    print("\nNow verify with:")
    print("  node --check backend/src/utils/email.js")
    print("  node --check backend/src/app.js")
    print()
    print("Then commit, push, let Render redeploy, and test:")
    print("  1. Sign up with a fresh email")
    print("  2. Check Render logs — should now show '📧 Email sent: <messageId>'")
    print("     instead of '❌ Email error: ... ENETUNREACH'")
    print("  3. Check that the OTP actually arrives in the inbox")


if __name__ == "__main__":
    main()
