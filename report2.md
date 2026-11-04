# Luxora Live Re-testing Report

Testing conducted on live deployment:
- Frontend: https://ecommerce-platform-ashen-nine.vercel.app
- Backend: https://luxora-backend-2nyx.onrender.com

---

## Step A - Starting Numbers

- **Location**: Admin -> Products (`/admin/products`)
- **Product**: 1000-Piece Jigsaw Puzzle
- **SKU**: LUX-1035
- **Stock**: 43 (Expected: 43)
- **Sold Count**: 63 (Expected: 63, verified via API `/api/products` response `totalSold`: 63)
- **Status**: PASS

---

## Step B - Customer Cancel of the Old Pending Order

- **Account**: Customer A (`kamallochansahu299@gmail.com`)
- **Action**: My Orders -> Open order `#ORD-63821905-070` -> Click "Cancel Order" -> Confirm "Yes, Cancel"
- **Network Request**:
  - `PUT https://luxora-backend-2nyx.onrender.com/api/orders/6ad54d2d4912744e57842f95/cancel`
  - HTTP Status: **200 OK** (Duration: 797ms)
  - Response Body: `{"statusCode":200,"data":null,"message":"Order cancelled successfully","success":true}`
- **Page Verification**: Order status updated from "Pending" to **"Cancelled"** (Badge: Cancelled, Timeline: Order Cancelled).
- **Status**: PASS

---

## Step C - Stock Came Back

- **Admin -> Products (`/admin/products`)**:
  - Product: 1000-Piece Jigsaw Puzzle (SKU: LUX-1035)
  - Stock: **45** (Expected: 45) - Increased from 43 by +2
  - Sold Count (`totalSold`): **61** (Expected: 61) - Decreased from 63 by -2
  - Updated At timestamp: `2026-10-18T23:44:53.157Z`
- **Admin -> Orders (`/admin/orders`)**:
  - Order `#ORD-63821905-070`: Status is **"cancelled"** (Status History message: "Cancelled by customer" at `2026-10-18T23:44:53.071Z`)
- **Status**: PASS

---

## Step D - Fresh Round Trip

1. **Place Order**:
   - Customer A (`kamallochansahu299@gmail.com`) added 1 x "1000-Piece Jigsaw Puzzle" (SKU LUX-1035) to cart.
   - Placed COD order -> Created order `#ORD-67517039-399` (`_id: 6ad55b9d8a7bd0652c580168`, total ₹825).
2. **Verify Stock Deduction**:
   - Admin -> Products (`/admin/products`):
     - Stock decreased from 45 to **44** (Expected: 44).
     - Sold count (`totalSold`) increased from 61 to **62**.
     - Timestamp `updatedAt`: `2026-10-18T23:51:56.947Z`.
3. **Cancel Order**:
   - Customer A went to My Orders -> Opened order `#ORD-67517039-399` -> Clicked "Cancel Order" -> Confirmed "Yes, Cancel".
   - Network Request:
     - `PUT https://luxora-backend-2nyx.onrender.com/api/orders/6ad55b9d8a7bd0652c580168/cancel`
     - HTTP Status: **200 OK** (Duration: 644ms)
     - Response Body: `{"statusCode":200,"data":null,"message":"Order cancelled successfully","success":true}`
   - Page Verification: Order status updated to **"Cancelled"**.
4. **Verify Stock Restored**:
   - Admin -> Products (`/admin/products`):
     - Stock restored from 44 back to **45** (Expected: 45).
     - Sold count (`totalSold`) decreased back to **61**.
     - Timestamp `updatedAt`: `2026-10-18T23:56:54.047Z`.
- **Status**: PASS

---

## Step E - Admin Review Reject

- **Location**: Admin -> Reviews (`/admin/reviews`)
- **API Request**: `GET https://luxora-backend-2nyx.onrender.com/api/admin/reviews?status=pending`
- **API Response**: `{"statusCode":200,"data":{"reviews":[],"pagination":{"total":0,"page":1,"limit":20,"totalPages":0}},"message":"pending reviews fetched","success":true}`
- **Page State**: Displays "No pending reviews"
- **Instruction**: "If there is no pending review, mark NOT TESTABLE. Do not create reviews."
- **Status**: **NOT TESTABLE**

---

## Cleanup & Order Summary

### Orders Created / Tested
| Order Number | Action | Initial Status | Final Status | Items |
| :--- | :--- | :--- | :--- | :--- |
| `#ORD-63821905-070` | Pre-existing old order cancelled by Customer A | `placed` / `pending` | `cancelled` | 2 x 1000-Piece Jigsaw Puzzle |
| `#ORD-67517039-399` | Fresh COD order placed & cancelled by Customer A | `placed` / `pending` | `cancelled` | 1 x 1000-Piece Jigsaw Puzzle |

### Final Inventory Status
- **Product**: 1000-Piece Jigsaw Puzzle (SKU: LUX-1035)
- **Final Stock**: **45** (Confirmed in Admin UI table and `/api/products` API response)
- **Final Sold Count (`totalSold`)**: **61**

---

## Final Results Table

| Step | Result | Evidence (Numbers Before/After, HTTP Statuses) |
| :--- | :--- | :--- |
| **Step A - Starting numbers** | **PASS** | SKU LUX-1035: Stock = 43, Sold count = 63 (verified via Admin UI table cell and `GET /api/products` response `totalSold: 63`). |
| **Step B - Customer cancel old pending order** | **PASS** | Customer A cancelled `#ORD-63821905-070`. `PUT /api/orders/6ad54d2d4912744e57842f95/cancel` returned **HTTP 200 OK** (previously HTTP 500). Page badge and timeline updated to "Cancelled". |
| **Step C - Stock came back** | **PASS** | SKU LUX-1035 stock restored from 43 to **45** (+2), sold count decreased from 63 to **61** (-2). Admin Orders confirmed `#ORD-63821905-070` status as "cancelled" with reason "Cancelled by customer". |
| **Step D - Fresh round trip** | **PASS** | Placed COD order `#ORD-67517039-399` (1x puzzle). Stock reduced to **44**, sold count increased to **62**. Customer A cancelled order via UI (`PUT .../cancel` returned **HTTP 200 OK**). Stock restored back to **45**, sold count back to **61**. |
| **Step E - Admin review Reject** | **NOT TESTABLE** | Navigated to `/admin/reviews`. `GET /api/admin/reviews?status=pending` returned 0 reviews (`reviews: []`). Page displays "No pending reviews". Per rules, marked NOT TESTABLE as reviews must not be created. |
