#!/usr/bin/env python3
"""
Luxora — Fix critical cross-domain cookie auth bug (401 after login)

Root cause: refreshToken cookie was set with sameSite: 'strict', which
browsers refuse to send on cross-site requests (Vercel frontend -> Render
backend are different domains). This made every authenticated request after
login fail with 401, breaking wishlist, addresses, admin, refresh, orders.

Fix:
  - sameSite: 'none' in production (required for cross-domain cookies,
    only works together with secure: true, which is already set based on
    NODE_ENV === 'production')
  - sameSite: 'lax' in development (localhost, same-site, no need for 'none')
  - Both clearCookie() calls updated to pass the SAME options used when
    setting the cookie, since browsers match on path/secure/sameSite when
    clearing — mismatched options can silently fail to clear the cookie.

Run this from the root of your cloned repo:
    cd ~/projects/ecommerce-platform
    python3 fix_cross_domain_cookie.py
"""
import re
import sys
from pathlib import Path

REPO_ROOT = Path.cwd()
AUTH_CONTROLLER = REPO_ROOT / "backend" / "src" / "controllers" / "auth.controller.js"
USER_CONTROLLER = REPO_ROOT / "backend" / "src" / "controllers" / "user.controller.js"


def patch_auth_controller():
    if not AUTH_CONTROLLER.exists():
        sys.exit(f"❌ Not found: {AUTH_CONTROLLER}\n   Run this script from the repo root.")

    text = AUTH_CONTROLLER.read_text()

    old_cookie_options = """  // Cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };"""

    new_cookie_options = """  // Cookie options
  // Cross-domain (Vercel frontend + Render backend) needs sameSite: 'none'
  // in production — 'strict'/'lax' block the cookie on cross-site requests.
  // sameSite: 'none' MUST be paired with secure: true or browsers reject it.
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };"""

    if old_cookie_options not in text:
        if "sameSite: isProd ? 'none' : 'lax'" in text:
            print("✅ auth.controller.js — cookieOptions already patched, skipping.")
        else:
            sys.exit(
                "❌ Could not find the expected cookieOptions block in "
                f"{AUTH_CONTROLLER}\nFile may have changed — patch it manually or paste it back to Claude."
            )
    else:
        text = text.replace(old_cookie_options, new_cookie_options)
        print("✅ auth.controller.js — cookieOptions patched (sameSite: 'none' in prod).")

    # Fix logout's clearCookie to use matching options
    old_logout_clear = """  // Cookie clear karo
  res
    .clearCookie('refreshToken')
    .json(new ApiResponse(200, null, 'Logged out successfully'));"""

    new_logout_clear = """  // Cookie clear karo — same options jo set karte waqt diye the,
  // warna browser cookie ko match/clear nahi kar payega
  const isProdClear = process.env.NODE_ENV === 'production';
  res
    .clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProdClear,
      sameSite: isProdClear ? 'none' : 'lax',
    })
    .json(new ApiResponse(200, null, 'Logged out successfully'));"""

    if old_logout_clear in text:
        text = text.replace(old_logout_clear, new_logout_clear)
        print("✅ auth.controller.js — logout clearCookie patched.")
    elif "sameSite: isProdClear ? 'none' : 'lax'" in text:
        print("✅ auth.controller.js — logout clearCookie already patched, skipping.")
    else:
        print("⚠️  Could not find logout's clearCookie block — check manually.")

    AUTH_CONTROLLER.write_text(text)


def patch_user_controller():
    if not USER_CONTROLLER.exists():
        sys.exit(f"❌ Not found: {USER_CONTROLLER}")

    text = USER_CONTROLLER.read_text()

    old_delete_clear = """  res
    .clearCookie('refreshToken')
    .json(new ApiResponse(200, null, 'Account deleted successfully'));"""

    new_delete_clear = """  const isProdClear = process.env.NODE_ENV === 'production';
  res
    .clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProdClear,
      sameSite: isProdClear ? 'none' : 'lax',
    })
    .json(new ApiResponse(200, null, 'Account deleted successfully'));"""

    if old_delete_clear in text:
        text = text.replace(old_delete_clear, new_delete_clear)
        USER_CONTROLLER.write_text(text)
        print("✅ user.controller.js — delete-account clearCookie patched.")
    elif "sameSite: isProdClear ? 'none' : 'lax'" in text:
        print("✅ user.controller.js — delete-account clearCookie already patched, skipping.")
    else:
        print("⚠️  Could not find delete-account clearCookie block — check manually.")


if __name__ == "__main__":
    patch_auth_controller()
    patch_user_controller()
    print("\nDone. Verify with:")
    print("  grep -n \"sameSite\" backend/src/controllers/auth.controller.js backend/src/controllers/user.controller.js")
    print("\nThen commit + push (Render will auto-deploy):")
    print("  git add -A && git commit -m 'fix: sameSite=none for cross-domain cookie auth' && git push")
