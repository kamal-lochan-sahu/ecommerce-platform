# SMS + Email setup (OTPs, order emails)

All SMS and email go through **one file**: `backend/src/services/messaging.service.js`.
Which provider is used is decided by **environment variables only**. Going live is a config
change on the server, not a code change.

## 1. While testing (now)

Set these on the server (Render -> Environment):

```
SMS_PROVIDER=console
EMAIL_PROVIDER=console
```

`console` does not send anything. It prints the message, **including the OTP code**, in the
server log. To get a code: Render dashboard -> your backend service -> **Logs** -> search for
`[SMS:console]` or `[MAIL:console]`.

On startup the server prints which providers are active and warns if one is `console` or
not configured. Check the first lines of the log after every deploy.

> `console` must never be the setting at launch: anyone with log access could read every OTP
> and every password-reset link.

## 2. Going live

### SMS (Twilio)
1. Create the Twilio account, buy/verify a sender number. For Indian numbers you must complete
   **DLT registration** and register your OTP message template.
2. Set `SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.
3. Set `SMS_OTP_TEMPLATE` to your DLT-approved text, using `{{brand}}` and `{{otp}}` as
   placeholders (the default is `{{brand}} OTP: {{otp}}. Valid for 10 minutes. Do not share it with anyone.`).
4. Using another provider (e.g. MSG91)? Add one branch in `sendSms()` in `messaging.service.js`
   and set `SMS_PROVIDER` to its name. Nothing else changes.

### Email (any SMTP provider)
1. Pick a provider (Amazon SES, SendGrid, Brevo, Postmark, Gmail...). Verify your sending domain
   (SPF/DKIM) with them.
2. Set `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`,
   `EMAIL_FROM` (must be an address the provider has verified) and `EMAIL_FROM_NAME`.
3. Render's **free** instances block outbound SMTP ports. Use a paid instance.

### Launch checklist
- [ ] `SMS_PROVIDER` is `twilio` (not `console`) and a real OTP SMS reaches a phone
- [ ] `EMAIL_PROVIDER` is `smtp` (not `console`) and a real OTP email reaches an inbox
- [ ] Server log on startup shows no messaging warnings
- [ ] `OTP_SECRET` is set to a long random value (it is used to hash OTP codes)

## 3. How OTPs behave (same rules for phone login, phone verify, email verify, add email)
- 6 digits, valid 10 minutes, usable once, stored only as a hash
- 5 wrong tries, then the code is destroyed and a new one is needed
- 30 seconds between sends, max 5 sends per hour per phone/email
- If the SMS/email cannot be delivered the user gets a clear error (never a fake "sent")
