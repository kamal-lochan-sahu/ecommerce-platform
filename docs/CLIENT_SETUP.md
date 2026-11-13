# Setting up Luxora for a new client

One client = one deployment (own backend, own database, own storefront). Everything that is
specific to the client lives in **two places**:

| Who fills it | Where | Changes need |
|---|---|---|
| **The client** (you guide them) | Admin panel: **Settings** and **Store Pages** | Nothing. Save and it is live. |
| **You (developer)** | Environment variables on Render (backend) and Vercel (storefront), two small files | A redeploy |

Rule of thumb: if a customer reads it on the site, in an email or on the invoice, it comes from
**Admin -> Settings**. If it is a secret, a provider or an app icon, it is a deployment setting.

---

## 1. Collect this from the client first

- Store name, and the **legal business name** to print on invoices
- **GSTIN** (if registered), business address
- Support email, support phone, support hours
- Logo (square or wide, as a public `https://` image link)
- Delivery fee, the order value above which delivery is free, GST rate
- Return window in days (0 if they do not take returns)
- Social links (Instagram, Facebook, X, YouTube), optional
- Payment: Razorpay account (key id, key secret, webhook secret), and whether cash on delivery is allowed
- SMS: a DLT-registered sender and OTP template (India), or a Twilio number
- Email: a sending domain and an SMTP provider
- App icons (see section 2.3)

## 2. Deployment settings (you)

### 2.1 Backend (Render -> Environment)

Everything is listed with comments in `backend/.env.example`. The ones that matter for a new client:

| Variable | What it is |
|---|---|
| `MONGODB_URI` | The client's own database |
| `FRONTEND_URL`, `CLIENT_URL`, `ADMIN_URL` | The storefront address (CORS and email links use it) |
| `SITE_URL` | Optional. Storefront address used in `sitemap.xml`. Falls back to `CLIENT_URL` |
| `CLIENT_NAME` | Fallback brand name only. The real name is Admin -> Settings -> Store Name |
| `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `OTP_SECRET` | Long random secrets, different for every client |
| `SMS_PROVIDER`, `TWILIO_*`, `SMS_OTP_TEMPLATE` | Real SMS. `console` is for testing only. See `docs/MESSAGING_SETUP.md` |
| `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `SMTP_*` | Real email. `EMAIL_FROM` must be on a domain the provider has verified |
| `RAZORPAY_*`, `COD_ENABLED` | Payments. Webhook steps are in `docs/RAZORPAY_WEBHOOK.md` |
| `CLOUDINARY_*` | Product image uploads |
| `STORE_TIMEZONE` | For the admin dashboard "today" and monthly reports |

The email sender name (`EMAIL_FROM_NAME`) and the SMS template are sender identity, so they stay
here. Everything else a customer sees in emails (store name, support email and phone) comes from
Admin -> Settings.

### 2.2 Storefront (Vercel -> Environment Variables, then redeploy)

See `frontend/.env.example`. These are read at **build time**.

| Variable | What it does |
|---|---|
| `VITE_API_URL` | Backend address, ending in `/api` |
| `VITE_CLIENT_NAME` | Browser tab title at build time and the "install app" name |
| `VITE_CLIENT_DESCRIPTION` | Description in the install-app manifest |
| `VITE_PRIMARY_COLOR`, `VITE_SECONDARY_COLOR` | Theme colours |
| `VITE_RAZORPAY_KEY_ID` | Public Razorpay key id |

Also edit **`frontend/vercel.json`**: replace the backend address in the two `rewrites` for
`/robots.txt` and `/sitemap.xml` with this client's backend. This is what makes
`https://<their-domain>/sitemap.xml` and `/robots.txt` work.

### 2.3 App icons

The install-app (PWA) name and icons are created when the site is built, so they cannot be
changed from the admin panel. Replace the images in `frontend/public/icons/` (and the two
screenshots listed in `frontend/vite.config.js`) with the client's own, then redeploy.

## 3. Admin -> Settings (client fills, you guide)

| Section | Field | Where the customer sees it |
|---|---|---|
| Store Information | Store Name | Navbar, footer, login page, emails, SMS, tab title, Razorpay popup |
| | Support Email / Phone / Hours | Footer, Contact page, emails, invoice |
| | Store Address | Footer, Contact page, invoice |
| Business & Invoice | Legal Business Name | Invoice header, footer copyright |
| | GSTIN | Invoice, footer |
| | Invoice Number Prefix | Invoice number, for example `INV-` |
| | Return Window (days) | "Easy Returns" badge, Returns page, FAQs. `0` hides the badge and changes the text to "no returns" |
| Branding & Social | Tagline | Footer, tab title, home page when there is no banner |
| | Logo URL | Navbar, footer, login page. Empty = icon + store name |
| | Social links | Footer icons (only the ones filled in appear) |
| Delivery / tax | Delivery fee, Free delivery above, Tax rate | Cart, checkout, orders, badges, Shipping page |
| Checkout | Allow guest checkout | Checkout page, FAQ |
| Maintenance | Maintenance mode | Notice on the store, pauses new orders |

Anything left empty simply does not show, so nothing fake appears on the site.

## 4. Admin -> Store Pages (client reviews)

Terms, Privacy, Shipping, Returns and the FAQs start as **templates built from the Settings
above**. They update by themselves when Settings change. The client can rewrite any of them
(a line starting with `## ` is a heading, a blank line starts a new paragraph) and press
**Reset to default** to go back.

These are templates, not legal advice. Ask the client to have a lawyer or CA read them before launch.

## 5. Store content

Categories, products (with images), banners and coupons are added from the admin panel.
Make sure the client has an admin login (a user whose role is `admin`).

## 6. Go-live checklist

- [ ] Delete every **test banner**, test product, test category, test coupon and test order/account
- [ ] Replace the placeholder values in Admin -> Settings with the client's real ones (the sample `GSTIN` is fake)
- [ ] `SMS_PROVIDER` and `EMAIL_PROVIDER` are **not** `console`; send yourself a real OTP and a real order email
- [ ] Razorpay is in live mode: live keys, webhook created, `RAZORPAY_WEBHOOK_SECRET` set (`docs/RAZORPAY_WEBHOOK.md`)
- [ ] Place one real cash-on-delivery order and one online order; download the invoice and read it
- [ ] Open `/terms`, `/privacy`, `/shipping-policy`, `/returns-policy`, `/faq`, `/contact` and read them
- [ ] Open `https://<their-domain>/robots.txt` and `/sitemap.xml`; add the sitemap in Google Search Console
- [ ] Browser tab title, navbar, footer and invoice show the client's name (not Luxora)
- [ ] Install-app icons and name are the client's
- [ ] Maintenance mode is off

## 7. Ask the client's CA or lawyer

- **Invoice numbers.** GST rules expect a consecutive series. Today the number is the prefix plus
  the order number (for example `INV-41214921-681`), so cancelled orders leave gaps. The single place
  to change it is `formatInvoiceNumber()` in `backend/src/utils/brandSettings.js`.
- **Tax.** Prices are shown before GST and GST is added at checkout. Confirm this is right for the client.
  The invoice shows one GST line; a CGST + SGST / IGST split and HSN codes are not included.
- **Refund time and policy wording** in the Returns and Shipping pages.
- **Terms and Privacy** text in general.

## 8. Good to know (current limits)

- **Search engines and link previews.** The storefront is a single-page app. Google can read it, but link
  previews (WhatsApp, Facebook) will not show a product's image or title. Server-side rendering would fix this.
- **Contact page** shows email, phone, hours and address. There is no message form.
- **Returns** are handled by the client's support team by email or phone; there is no return request screen.
- Sitemap and robots.txt come from the backend through the `vercel.json` rewrites, so the very first
  request after a quiet period can take a few seconds while a free Render instance wakes up.
