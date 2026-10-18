# Luxora Live Site Test Report (Group 2: Order/Stock Integrity)

Date: 19 Oct 2026
Frontend: https://ecommerce-platform-ashen-nine.vercel.app
Backend: https://luxora-backend-2nyx.onrender.com

| Test | Status | Evidence |
|------|--------|----------|
| **TEST 1 - Stock returns on CUSTOMER cancel** | **FAIL** | Initial stock: 45. After Customer A placed COD order for qty 2 (`ORD-63821905-070`), stock dropped to 43. When Customer A clicked "Cancel Order" -> "Yes, Cancel", backend request `PUT /api/orders/6ad54d2d4912744e57842f95/cancel` returned HTTP 500: `Cannot destructure property 'reason' of 'req.body' as it is undefined.`. Order remained `Pending` and stock remained 43 (did not return to 45). Screenshot: `test1_customer_cancel_fail.png`. |
| **TEST 2 - Stock returns on ADMIN cancel + cancelled order is locked** | **PASS** | Customer A placed COD order for 2 x P (`ORD-64149502-892`), stock dropped from 43 to 41 (totalSold 63 -> 65). Admin set status to "cancelled", backend returned 200, stock restored back to 43 (totalSold 63). Admin then attempted to change status of the cancelled order to "processing" -> rejected with HTTP 400: `This order is cancelled and cannot be changed`. Order remained cancelled. |
| **TEST 3 - Delivered order cannot be cancelled** | **PASS** | Selected delivered order `#ORD-82268725-707` in Admin Orders. Attempted to change status to "cancelled" -> rejected with HTTP 400: `Cannot cancel an order in "delivered" status`. Order stayed delivered, and product stock remained unchanged at 43 (totalSold: 63). |
| **TEST 4 - Coupon is given back on cancel** | **PASS** | Initial coupon `TESTG2` usedCount was 0 (0/5 used). Customer A placed order `#ORD-64811480-108` with `TESTG2` (10% discount applied: −₹70). Admin coupons page showed usedCount incremented to 1 (1/5 used). Order was then cancelled in Admin; `TESTG2` usedCount immediately reverted back to 0 (0/5 used) and product stock returned to 43. |
| **TEST 5 - COD needs verified phone** | **PASS** | Registered Customer B (`kb-test2@example.com`, phone not verified). At checkout, selecting Cash on Delivery displayed amber note: `Cash on Delivery needs a verified phone number. Verify it in your Profile or choose an online payment method.`. Selecting an online method (Razorpay) hid the note. Attempting to place COD order failed with HTTP 403: `{"success":false,"message":"Please verify your phone number in your Profile to place a Cash on Delivery order","errors":["PHONE_NOT_VERIFIED"]}`. Confirmed in My Orders that no order was created, and stock remained at 43. |
| **TEST 6 - Coupon validation (Admin)** | **PASS** | 1) Creating percentage coupon with value 150 rejected with HTTP 400: `Percentage discount cannot be more than 100`. 2) Percentage coupon with value 100 (`TEST100`) accepted with HTTP 201 (deleted afterward). 3) Updating existing percentage coupon (`TEST20`, id `6abac5937143e09972762325`) to value 150 rejected with HTTP 400: `Percentage discount cannot be more than 100`. |
| **TEST 7 - Auto-cancelled stale orders look right** | **PASS** | Found exactly 10 online-payment (Razorpay) orders auto-cancelled with status `cancelled`, payment status `failed`, and status history message `Payment was not completed in time` (updated at 2026-10-17T23:30:00Z - 23:30:02Z = 05:00 AM IST on 18 Oct 2026). Verified samples: `#ORD-82030034-940`, `#ORD-80796501-583`, `#ORD-80333493-247`. Checked all COD orders; 0 COD orders were auto-cancelled with this text. |
| **TEST 8 - Cart remove validation + cart still works** | **PASS** | 1) `curl -s -o /dev/null -w "%{http_code}\n" -X DELETE https://luxora-backend-2nyx.onrender.com/api/cart/remove -H "Content-Type: application/json" -d '{}'` returned HTTP `400` as required. 2) In the UI as Customer A, added P ("1000-Piece Jigsaw Puzzle") to cart, navigated to `/cart`, and clicked the remove button. Item was removed immediately with no error toast and cart displayed "Your cart is empty!". |
| **TEST 9 - Confirmation email (Render logs)** | **NOT TESTABLE** | No Render dashboard credentials or access provided to view live server container logs for service `luxora-backend`. Per test instructions, marked as NOT TESTABLE. |
| **TEST 10 - Quick regression** | **PASS** | Verified that Homepage (`/`), Product list (`/products`), Product detail page (`/products/1000-piece-jigsaw-puzzle-1035`), Login and Logout flows (Customer A), Cart (`/cart`), Checkout (`/checkout`), My Orders (`/orders`), and Order detail page (`/orders/:id`) all load properly with no blank pages or rendering crashes. |

## Cleanup & Final Status

- **Product P**: `1000-Piece Jigsaw Puzzle` (ID: `6a334959d16cc4ed90c73cb3`, SKU: `LUX-1035`)
  - **Initial Stock**: 45 (totalSold: 61)
  - **Final Stock**: 43 (totalSold: 63) — differs from initial stock by 2 because test order `ORD-63821905-070` (qty 2) remains active in `Pending` status due to the customer cancellation bug (HTTP 500).
- **Coupons Cleanup**:
  - `TESTG2`: Deleted from Admin.
  - `TEST100`: Deleted from Admin.
  - `TEST20`: Pre-existing coupon preserved.
- **Orders Created During Testing**:
  1. `#ORD-63821905-070` (Customer A, COD, 2 × P): Final Status: **`pending`** (Customer cancellation failed with 500 error).
  2. `#ORD-64149502-892` (Customer A, COD, 2 × P): Final Status: **`cancelled`** (Cancelled by Admin in Test 2; order locked).
  3. `#ORD-64811480-108` (Customer A, COD, 1 × P, Coupon `TESTG2`): Final Status: **`cancelled`** (Cancelled by Admin in Test 4; coupon reverted).

