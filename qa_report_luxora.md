# Luxora Ecommerce App - QA Audit Report

**Date:** May 31, 2026
**Environment:** Production/Vercel (https://ecommerce-platform-ashen-nine.vercel.app)
**Tested Roles:** Admin & Customer

---

## 1. Critical Bugs
- **Admin Dashboard Stats Synchronization:** The main Admin Dashboard displays `0` for Total Revenue, Total Orders, Customers, and Products, even though there is active data in the database (e.g., at least 1 "Test Smartphone" product exists and an order was successfully placed during the audit).
- **Admin State Management (Categories):** When a new Category is created via the Admin panel (e.g., adding "Fashion"), the backend API successfully processes it and returns a `201 Created` status. However, the frontend UI does not update to reflect the newly created category unless a hard page refresh is performed.
- **PWA Prompt Z-Index Issue:** The "Install Luxora App" fixed banner at the bottom of the screen intercepts pointer events and completely blocks critical CTA buttons, specifically the "Proceed to Checkout" button in the Cart sidebar, rendering users unable to checkout until the prompt is dismissed manually.

## 2. UX Issues
- **Missing Assets:** There is a persistent `404 Not Found` error for `placeholder.jpg` on pages like `/admin/products`, which can result in broken image icons and a degraded visual experience.
- **Language / Localization:** The application uses conversational Hinglish (e.g., "Account nahi hai?", "Bahut accha! Tumhara order confirm ho gaya.", "Cart khali hai!"). While excellent for targeting the Indian consumer base (Bharat demographic), it must be verified if this aligns with the client's official brand voice or if a pure English toggle is required.

## 3. Missing Features (Observed)
- **Immediate Frontend State Refreshes:** Adding entities in the Admin panel requires better optimistic UI updates or automatic invalidation (e.g., React Query / Redux RTK invalidation) to show newly created data instantly.
- **Cart Empty State Action:** The empty cart button "Products Dekho" is a nice touch, but it should ensure smooth routing to the main product catalog without reload.

## 4. Client/Business Perception
- The overall aesthetic and responsiveness of the application are solid. The flow from product listing -> cart -> checkout -> success is unbroken (aside from the PWA overlay issue).
- The use of Hinglish adds a very welcoming, localized touch that will resonate well with tier-2/tier-3 Indian markets but might feel unprofessional if the client is targeting a premium/luxury segment (implied by the name "Luxora"). This needs clarification with the client.
- The Admin dashboard layout is clean and intuitive, but the `0` stats bug will cause immediate concern for stakeholders.

## 5. Ecommerce Market Readiness Score
**Score: 7.5 / 10**
- **Pros:** Full end-to-end purchasing flow works. Address collection, mock payment selection (COD/Stripe/Razorpay UI), and order success states are fully implemented.
- **Cons:** State management bugs in the admin panel and UI-blocking elements in the checkout process.

## 6. What to Improve Before Showing Clients
1. **Fix the Admin Dashboard Stats:** Ensure the dashboard fetches and calculates real-time data for Revenue, Orders, Products, and Customers.
2. **Fix the PWA Banner:** Adjust the z-index or the layout so the "Install App" banner does not overlap with sticky action buttons like "Proceed to Checkout". Alternatively, render it at the top or push the main content up.
3. **Fix Category Creation UI:** Add proper state invalidation so that when an admin creates a product or category, the list updates instantly.
4. **Fix Broken Images:** Provide a valid `placeholder.jpg` asset in the `public` directory to resolve the 404 errors.
5. **Brand Voice Check:** Confirm the Hinglish copy ("Apni favourite category choose karo") matches the "Luxora" brand identity.