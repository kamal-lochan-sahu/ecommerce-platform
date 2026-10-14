# Razorpay webhook setup (do this at launch)

## Why
Today the browser calls `/api/orders/payments/razorpay/verify` after payment. If the customer
pays and then closes the tab (or loses network) before that call, the money is taken but the order
stays "placed / pending". The webhook lets **Razorpay's server** tell our server instead.

The code is already in the repo. It stays **off** until `RAZORPAY_WEBHOOK_SECRET` is set
(until then the endpoint answers 503 and does nothing).

## Steps
1. Razorpay Dashboard -> switch to the right mode (**Test** first, **Live** at launch) -> Settings -> Webhooks -> Add New Webhook.
2. **Webhook URL:** `https://<your-backend-domain>/api/orders/payments/razorpay/webhook`
   (now: `https://luxora-backend-2nyx.onrender.com/api/orders/payments/razorpay/webhook`)
3. Choose a **secret** (long random string) and tick the events **`payment.captured`** and **`order.paid`**
   (`payment.failed` is optional - it is only logged; the order is not cancelled because the customer can retry).
4. Set the same secret as `RAZORPAY_WEBHOOK_SECRET` on Render and redeploy.
5. Test and Live modes have **separate webhooks and secrets** - repeat steps 1-4 with the live keys at launch.

## How it behaves
- Signature is checked on the raw body; a bad/missing signature -> 400.
- The paid amount must equal the order total (INR), otherwise the order is NOT confirmed (logged as an error).
- Verify and webhook can both arrive: the order is marked paid once; the email/notification is sent once.
- If the payment arrives for an order that was already cancelled (e.g. auto-cancelled as stale), the
  order stays cancelled, `paymentStatus` becomes `paid` and the status history says
  "refund required" - the admin must refund it in the Razorpay dashboard. The logs also contain `REFUND NEEDED`.
- Razorpay auto-retries on a non-200 answer. Free Render sleeps (~35 s cold start), so the first delivery can
  time out - Razorpay's retry then succeeds.
