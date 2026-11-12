// Legal / help pages (Terms, Privacy, Shipping, Returns, FAQs) ka default text.
// Text store ke Admin Settings se banta hai (naam, legal naam, contact, delivery fee, return days),
// isliye settings badalte hi pages khud update ho jaate hain. Client chahe to Admin -> Store Pages se
// apna text daal sakta hai (custom text default ko replace karta hai; khali chhodo = default).
// NOTE: ye templates hain, legal salah nahi. Launch se pehle vakeel/CA se dikhwa lo (docs/CLIENT_SETUP.md).
//
// Format: "## Heading" wali line heading hai, khali line se paragraph alag hota hai. Koi HTML nahi.

export const PAGE_KEYS = ['terms', 'privacy', 'shipping', 'returns'];

export const PAGE_META = {
  terms: { title: 'Terms & Conditions', path: '/terms', field: 'policyTerms' },
  privacy: { title: 'Privacy Policy', path: '/privacy', field: 'policyPrivacy' },
  shipping: { title: 'Shipping Policy', path: '/shipping-policy', field: 'policyShipping' },
  returns: { title: 'Return & Refund Policy', path: '/returns-policy', field: 'policyReturns' },
};

const SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
const money = (n, currency) => `${SYMBOLS[currency] || (currency ? `${currency} ` : '₹')}${Number(n || 0).toLocaleString('en-IN')}`;

const contextFrom = (s = {}) => {
  const name = (s.storeName || 'our store').trim();
  const legal = (s.legalName || '').trim() || name;
  const email = (s.storeEmail || '').trim();
  const phone = (s.storePhone || '').trim();
  const reach = [email && `email ${email}`, phone && `phone ${phone}`].filter(Boolean).join(' or ');
  return {
    name,
    legal,
    email,
    phone,
    hours: (s.supportHours || '').trim(),
    address: (s.storeAddress || '').trim(),
    reach: reach || 'using the details on our Contact page',
    returnDays: Number(s.returnWindowDays ?? 7),
    fee: Number(s.deliveryFee ?? 0),
    freeAbove: Number(s.freeDeliveryAbove ?? 0),
    currency: s.currency || 'INR',
    guest: s.allowGuestCheckout !== false,
  };
};

const deliveryLine = (c) =>
  c.fee === 0 || c.freeAbove === 0
    ? 'Delivery is free on all orders.'
    : `Delivery is free on orders of ${money(c.freeAbove, c.currency)} or more. Below that, a delivery charge of ${money(c.fee, c.currency)} applies. The exact amount is always shown at checkout before you pay.`;

const operator = (c) => `${c.legal}${c.address ? `, ${c.address}` : ''}`;

const terms = (c) => `## About these terms
These terms apply to your use of the ${c.name} website and to every purchase you make from it. The website is operated by ${operator(c)}. By using the website or placing an order you agree to these terms.

## Orders and pricing
The full price you pay (product price, applicable taxes and any delivery charge) is shown at checkout before you place the order. An order is confirmed when you receive our confirmation message. We may cancel or refuse an order if a product is unavailable, if there is a pricing or listing error, or if we suspect fraud. If you have already paid for a cancelled order, we refund the full amount.

## Your account
You are responsible for keeping your password safe and for the activity on your account. Please give accurate details. We may suspend accounts that are misused.

## Payments
Online payments are processed by third-party payment providers. We do not store your card, UPI or bank details. Cash on delivery is available on eligible orders where offered at checkout.

## Delivery, cancellations and returns
Delivery is covered in our Shipping Policy. Cancellations, returns and refunds are covered in our Return & Refund Policy. Both form part of these terms.

## Coupons and offers
Coupons and offers are valid only as described when they are applied. They may be limited per customer, to certain products or categories, or to a period, and can be withdrawn at any time.

## Intellectual property
All content on this website, including text, images and logos, belongs to ${c.legal} or its licensors and may not be copied or reused without permission.

## Limitation of liability
To the extent permitted by law, we are not liable for indirect or consequential losses arising from the use of the website or the products. Nothing in these terms limits rights you have under applicable consumer protection law.

## Governing law
These terms are governed by the laws of India, and the courts of competent jurisdiction in India will handle any dispute.

## Contact us
${operator(c)}. You can reach us by ${c.reach}.`;

const privacy = (c) => `## Who we are
${operator(c)} runs the ${c.name} website. This policy explains what personal information we collect, why, and the choices you have.

## What we collect
Your name, email address and phone number, delivery addresses, order history, items in your cart and wishlist, and anything you send to our support. Our servers also log technical information such as your browser type and IP address for security.

## How we use it
To process and deliver your orders, to send order updates by email and SMS, to verify your phone number or email with one-time codes, to prevent fraud, and to improve the store. We send marketing emails only to customers who have not opted out. Every marketing email has an unsubscribe link, and you can switch them off any time in your Profile.

## Payments
Payments are handled by payment providers. Your card, UPI or bank details go to them directly and are never stored by us.

## Who we share it with
Only with the services needed to serve you: delivery partners, payment providers, and our SMS and email providers. We do not sell your personal information. We may share it when the law requires.

## Cookies and browser storage
We use cookies and similar browser storage to keep you signed in, remember your cart and preferences, and keep the website secure.

## How long we keep it
We keep order records for as long as needed for accounting, tax and legal reasons. You can delete your account from your Profile; your sign-in details are then removed, and order records are kept only as the law requires.

## Your rights
You can ask to see, correct or delete your personal information, or withdraw your consent, by contacting us by ${c.reach}. We handle requests as required by applicable Indian law, including the Digital Personal Data Protection Act, 2023.

## Children
This website is not meant for children under 18.

## Questions and complaints
Please contact us by ${c.reach}${c.address ? `, or write to us at ${c.address}` : ''}.`;

const shipping = (c) => `## Delivery charges
${deliveryLine(c)}

## Processing and delivery time
We process your order after it is confirmed and hand it to our delivery partner. Delivery time depends on your address and the courier, so dates are estimates and not guarantees. You get an email and SMS when your order is shipped and when it is delivered, and the tracking details are added to your order when available.

## Tracking your order
Open My Orders after signing in, or use the Track Order page with your order number and the phone number or email used on the order. You do not need an account to track an order.

## Delivery area
We deliver to the addresses and pincodes our delivery partners serve. If we cannot deliver to your address, we will contact you and refund any payment you have made.

## If delivery fails
If the courier cannot deliver because the address is incomplete or nobody is available, the parcel may be attempted again or returned to us. Please contact us by ${c.reach} and we will help.

## Contact us
${operator(c)}. ${c.hours ? `Support hours: ${c.hours}.` : ''}`.trim();

const returns = (c) => {
  const returnsPart = c.returnDays > 0
    ? `## Returns
You can ask to return an item within ${c.returnDays} day${c.returnDays === 1 ? '' : 's'} of delivery if it is unused, in its original packaging and has all its tags and accessories. If an item arrives damaged, defective or different from what you ordered, tell us within the same period and include clear photos.

## How to ask for a return
Contact us by ${c.reach} with your order number and the reason. We will confirm the next steps and how the item should reach us.`
    : `## Returns
We do not accept returns for a change of mind. If an item arrives damaged, defective or different from what you ordered, contact us as soon as possible after delivery by ${c.reach} with your order number and clear photos, and we will make it right.`;

  return `${returnsPart}

## Cancellations
You can cancel an order from My Orders before it is shipped. If you paid online, the amount is refunded in full. If you ordered as a guest, please contact us to cancel.

## Refunds
Approved refunds go back to your original payment method. For online payments this usually takes 5 to 7 business days after approval, depending on your bank or payment provider. For cash on delivery orders, we will ask for the bank or UPI details to send the refund to.

## Items we may not accept back
Items that are used, damaged after delivery, or returned without their parts or packaging may not be accepted.

## Contact us
${operator(c)}. You can reach us by ${c.reach}.`;
};

const BUILDERS = { terms, privacy, shipping, returns };

export const buildDefaultPage = (key, settings) => BUILDERS[key](contextFrom(settings));

export const buildDefaultFaqs = (settings) => {
  const c = contextFrom(settings);
  return [
    {
      question: 'How do I track my order?',
      answer: 'Sign in and open My Orders, or use the Track Order page with your order number and the phone number or email used on the order. You will also get email and SMS updates when it ships and is delivered.',
    },
    {
      question: 'How much does delivery cost?',
      answer: deliveryLine(c),
    },
    {
      question: 'Which payment methods can I use?',
      answer: 'You can pay online with UPI, cards or net banking, or choose cash on delivery on eligible orders. The options available are shown at checkout.',
    },
    {
      question: 'Is my payment information safe?',
      answer: 'Online payments are handled by our payment providers. We never see or store your card, UPI or bank details.',
    },
    {
      question: 'Do I need an account to place an order?',
      answer: c.guest
        ? 'No. You can check out as a guest. An account lets you see your order history, save addresses and keep a wishlist.'
        : 'Yes. Please create a free account or sign in before you check out.',
    },
    {
      question: 'Can I cancel my order?',
      answer: 'Yes, from My Orders before the order is shipped. If you paid online, the amount is refunded to your original payment method. Guests can contact us to cancel.',
    },
    {
      question: 'What is your return policy?',
      answer: c.returnDays > 0
        ? `You can ask to return an item within ${c.returnDays} day${c.returnDays === 1 ? '' : 's'} of delivery if it is unused and in its original packaging. Please see the Return & Refund Policy for details.`
        : 'We do not accept returns for a change of mind, but if an item arrives damaged, defective or wrong, contact us and we will make it right. Please see the Return & Refund Policy.',
    },
    {
      question: 'How can I contact support?',
      answer: `You can reach us by ${c.reach}.${c.hours ? ` Our support hours are ${c.hours}.` : ''}`,
    },
  ];
};

// Settings doc se storefront ke liye final pages: admin ka custom text ho to wahi, warna default.
export const resolveStorePages = (settings = {}) => {
  const pages = {};
  for (const key of PAGE_KEYS) {
    const custom = String(settings[PAGE_META[key].field] || '').trim();
    pages[key] = {
      title: PAGE_META[key].title,
      content: custom || buildDefaultPage(key, settings),
      custom: !!custom,
    };
  }
  const customFaqs = Array.isArray(settings.faqs) ? settings.faqs.filter((f) => f?.question && f?.answer) : [];
  return {
    pages,
    faqs: customFaqs.length ? customFaqs.map((f) => ({ question: f.question, answer: f.answer })) : buildDefaultFaqs(settings),
    faqsCustom: customFaqs.length > 0,
  };
};

export const buildDefaultStorePages = (settings = {}) => {
  const pages = {};
  for (const key of PAGE_KEYS) {
    pages[key] = { title: PAGE_META[key].title, content: buildDefaultPage(key, settings), custom: false };
  }
  return { pages, faqs: buildDefaultFaqs(settings), faqsCustom: false };
};
