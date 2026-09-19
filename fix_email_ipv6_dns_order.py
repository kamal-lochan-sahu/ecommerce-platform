#!/usr/bin/env python3
"""
Fix v2 — force IPv4-first DNS resolution at the Node level (server.js)

Run this from the root of your ecommerce-platform repo (AFTER
fix_email_ipv6_and_proxy.py — that one is still fine to have applied,
this just adds a more reliable fix on top):
    python3 fix_email_ipv6_dns_order.py

WHY THE PREVIOUS FIX (family: 4 in email.js) DIDN'T WORK:
  Your Render logs showed the exact same ENETUNREACH error on the
  SAME IPv6 address even after that deploy. nodemailer's `family`
  option apparently doesn't reliably propagate through the `service:
  'gmail'` shorthand's internal connection setup.

THE MORE RELIABLE FIX:
  Node.js 17+ changed default DNS resolution ordering, so
  dns.lookup() can return an IPv6 address first even when the host
  (Render's container, in this case) has no outbound IPv6 route —
  causing ENETUNREACH on the very first connection attempt, for
  every single request. Node has a built-in, process-wide fix for
  exactly this:

      dns.setDefaultResultOrder('ipv4first')

  This forces every DNS lookup in the process (not just nodemailer's)
  to prefer IPv4 addresses. It's called once, at the very top of
  server.js, before anything else runs.

Verified locally: `node --check backend/src/server.js` passes, and
`dns.setDefaultResultOrder('ipv4first')` is a valid, callable Node API
(available since Node 17 — Render is running Node 24.x per your
deploy logs, well above that). I could not verify actual SMTP
connectivity from my sandbox (no network path to smtp.gmail.com
there) — please confirm after deploying.

Safe to re-run: skips if already patched.
"""
import os
import sys

ROOT = os.getcwd()
SERVER_JS_PATH = os.path.join(ROOT, "backend", "src", "server.js")


def main():
    if not os.path.isfile(SERVER_JS_PATH):
        print("[ERROR] Run this script from the repo root (the folder that contains "
              "'frontend/' and 'backend/').")
        sys.exit(1)

    with open(SERVER_JS_PATH, "r") as f:
        content = f.read()

    if "setDefaultResultOrder" in content:
        print("[skip] server.js — already forces IPv4-first DNS resolution")
        return

    old = """import logger from './utils/logger.js';
import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import { connectRedis } from './config/redis.js';
import { connectCloudinary } from './config/cloudinary.js';
import { getRazorpay } from './config/razorpay.js';
import { getStripe } from './config/stripe.js';
import { startCronJobs } from './jobs/index.js';

const PORT = process.env.PORT || 5000;"""

    new = """import dns from 'node:dns';
import logger from './utils/logger.js';
import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import { connectRedis } from './config/redis.js';
import { connectCloudinary } from './config/cloudinary.js';
import { getRazorpay } from './config/razorpay.js';
import { getStripe } from './config/stripe.js';
import { startCronJobs } from './jobs/index.js';

// Render's containers don't have outbound IPv6 routing, but Node 17+ can
// still resolve hostnames (like Gmail's SMTP server) to an IPv6 address
// first, causing ENETUNREACH on every outbound connection attempt. This
// forces IPv4 first for all DNS lookups in this process — a plain
// nodemailer `family: 4` option didn't reliably propagate through the
// 'gmail' service shorthand, so this is the safer, process-wide fix.
dns.setDefaultResultOrder('ipv4first');

const PORT = process.env.PORT || 5000;"""

    if old not in content:
        print("[WARN] server.js — expected import block not found as expected, check manually")
        sys.exit(1)

    content = content.replace(old, new, 1)
    with open(SERVER_JS_PATH, "w") as f:
        f.write(content)

    print(f"[OK] patched {SERVER_JS_PATH}")
    print("\nNow verify with:")
    print("  node --check backend/src/server.js")
    print()
    print("Then commit, push, let Render redeploy, and test:")
    print("  1. Sign up with a fresh email")
    print("  2. Check Render logs — should now show '📧 Email sent: <messageId>'")
    print("     instead of '❌ Email error: ... ENETUNREACH'")
    print("  3. Check that the OTP actually arrives in the inbox")


if __name__ == "__main__":
    main()
