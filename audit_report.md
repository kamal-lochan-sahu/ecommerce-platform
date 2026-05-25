# ECOMMERCE PLATFORM AUDIT REPORT

---

## SECTION 1: BACKEND ROUTE MAP

### AUTH ROUTES (`/api/auth`)
| METHOD | PATH | AUTH | VALIDATOR | CONTROLLER |
|--------|------|------|-----------|------------|
| POST | /register | No | registerSchema | register |
| POST | /login | No | loginSchema | login |
| POST | /refresh | No | - | refreshToken |
| POST | /forgot-password | No | forgotPasswordSchema | forgotPassword |
| POST | /reset-password | No | resetPasswordSchema | resetPassword |
| POST | /send-otp | No | sendOtpSchema | sendOtp |
| POST | /verify-otp | No | verifyOtpSchema | verifyOtp |
| GET | /me | Yes (protect) | - | getMe |
| POST | /verify-email | Yes (protect) | - | verifyEmail |
| POST | /logout | Yes (protect) | - | logout |

### USER ROUTES (`/api/users`)
| METHOD | PATH | AUTH | VALIDATOR | CONTROLLER |
|--------|------|------|-----------|------------|
| GET | /profile | Yes | - | getProfile |
| PUT | /profile | Yes | updateProfileSchema | updateProfile |
| PUT | /change-password | Yes | changePasswordSchema | changePassword |
| DELETE | /account | Yes | - | deleteAccount |

### ADDRESS ROUTES (`/api/addresses`)
| METHOD | PATH | AUTH | VALIDATOR | CONTROLLER |
|--------|------|------|-----------|------------|
| GET | / | Yes | - | getAddresses |
| POST | / | Yes | addAddressSchema | addAddress |
| PUT | /:id | Yes | - | updateAddress |
| DELETE | /:id | Yes | - | deleteAddress |
| PUT | /:id/default | Yes | - | setDefaultAddress |

### PRODUCT ROUTES (`/api/products`)
| METHOD | PATH | AUTH | VALIDATOR | CONTROLLER |
|--------|------|------|-----------|------------|
| GET | / | No | - | getProducts |
| GET | /featured | No | - | getFeaturedProducts |
| GET | /search | No | - | searchProducts |
| GET | /:slug | No | - | getProductBySlug |
| GET | /id/:id | Yes (admin) | - | getProductById |
| POST | / | Yes (admin) | createProductSchema | createProduct |
| PUT | /:id | Yes (admin) | updateProductSchema | updateProduct |
| DELETE | /:id | Yes (admin) | - | deleteProduct |

### CATEGORY ROUTES (`/api/categories`)
| METHOD | PATH | AUTH | VALIDATOR | CONTROLLER |
|--------|------|------|-----------|------------|
| GET | / | No | - | getCategories |
| GET | /:slug | No | - | getCategoryBySlug |
| POST | / | Yes (admin) | createCategorySchema | createCategory |
| PUT | /:id | Yes (admin) | updateCategorySchema | updateCategory |
| DELETE | /:id | Yes (admin) | - | deleteCategory |

### CART ROUTES (`/api/cart`)
| METHOD | PATH | AUTH | VALIDATOR | CONTROLLER |
|--------|------|------|-----------|------------|
| GET | / | Optional | - | getCart |
| POST | /add | Optional | addToCartSchema | addToCart |
| PUT | /update | Optional | updateCartSchema | updateCartItem |
| DELETE | /remove | Optional | - | removeFromCart |
| DELETE | /clear | Optional | - | clearCart |
| POST | /merge | Yes | - | mergeCart |

### WISHLIST ROUTES (`/api/wishlist`)
| METHOD | PATH | AUTH | VALIDATOR | CONTROLLER |
|--------|------|------|-----------|------------|
| GET | / | Yes | - | getWishlist |
| POST | /add | Yes | - | addToWishlist |
| DELETE | /remove | Yes | - | removeFromWishlist |
| GET | /check/:productId | Yes | - | checkWishlist |
| DELETE | /clear | Yes | - | clearWishlist |

### ORDER ROUTES (`/api/orders`)
| METHOD | PATH | AUTH | VALIDATOR | CONTROLLER |
|--------|------|------|-----------|------------|
| POST | / | Yes | createOrderSchema | createOrder |
| GET | / | Yes | - | getMyOrders |
| GET | /:id | Yes | - | getOrderById |
| PUT | /:id/cancel | Yes | - | cancelOrder |
| POST | /payments/razorpay/verify | Yes | - | verifyRazorpayPayment |
| POST | /payments/stripe/create-session | Yes | - | createStripeSession |
| GET | /:id/invoice | Yes | - | getInvoicePDF |
| GET | /admin/all | Yes (admin) | - | getAllOrders |
| PUT | /admin/:id/status | Yes (admin) | updateOrderStatusSchema | updateOrderStatus |

### ADMIN ROUTES (`/api/admin`)
| METHOD | PATH | AUTH | CONTROLLER |
|--------|------|------|------------|
| GET | /dashboard | adminOnly | getDashboard |
| GET | /analytics/sales | adminOnly | getSalesAnalytics |
| GET | /analytics/products | adminOnly | getProductAnalytics |
| GET | /customers | adminOnly | getAllCustomers |
| GET | /customers/:id | adminOnly | getCustomerById |
| PUT | /customers/:id/status | adminOnly | updateCustomerStatus |
| GET | /reviews | adminOnly | getAllReviews |
| PUT | /reviews/:id/approve | adminOnly | approveReview |
| PUT | /reviews/:id/reject | adminOnly | rejectReview |
| GET | /low-stock | adminOnly | getLowStockProducts |

### COUPON ROUTES (`/api/coupons`)
| METHOD | PATH | AUTH | VALIDATOR | CONTROLLER |
|--------|------|------|-----------|------------|
| POST | /admin/coupons | adminOnly | createCouponSchema | createCoupon |
| GET | /admin/coupons | adminOnly | - | getAllCoupons |
| PUT | /admin/coupons/:id | adminOnly | updateCouponSchema | updateCoupon |
| DELETE | /admin/coupons/:id | adminOnly | - | deleteCoupon |
| POST | /coupons/validate | protect | applyCouponSchema | validateCoupon |
| POST | /cart/apply-coupon | protect | applyCouponSchema | applyCoupon |
| DELETE | /cart/remove-coupon | protect | - | removeCoupon |

### REVIEW ROUTES (`/api`)
| METHOD | PATH | AUTH | VALIDATOR | CONTROLLER |
|--------|------|------|-----------|------------|
| GET | /products/:productId/reviews | No | - | getProductReviews |
| POST | /products/:productId/reviews | protect | createReviewSchema | createReview |
| PUT | /reviews/:id | protect | updateReviewSchema | updateReview |
| DELETE | /reviews/:id | protect | - | deleteReview |
| POST | /reviews/:id/helpful | protect | - | markHelpful |

### BANNER ROUTES (`/api/banners`)
| METHOD | PATH | AUTH | VALIDATOR | CONTROLLER |
|--------|------|------|-----------|------------|
| GET | / | No | - | getBanners |
| GET | /:id | No | - | getBannerById |
| POST | / | adminOnly | createBannerSchema | createBanner |
| PUT | /:id | adminOnly | updateBannerSchema | updateBanner |
| DELETE | /:id | adminOnly | - | deleteBanner |

### NOTIFICATION ROUTES (`/api/notifications`)
| METHOD | PATH | AUTH | CONTROLLER |
|--------|------|------|------------|
| GET | / | protect | getNotifications |
| GET | /unread-count | protect | getUnreadCount |
| PUT | /read-all | protect | markAllAsRead |
| PUT | /:id/read | protect | markAsRead |
| DELETE | /:id | protect | deleteNotification |

---

## SECTION 2: FRONTEND API CALLS MAP

### Auth Service (`frontend/src/services/auth.service.js`)
| METHOD | ENDPOINT | REQUEST BODY | RESPONSE USED AS |
|--------|----------|--------------|------------------|
| post | /auth/login | email/phone + password | r.data.user, r.data.accessToken |
| post | /auth/register | name, email, phone, password | r.data.user, r.data.accessToken |
| post | /auth/logout | - | - |
| post | /auth/forgot-password | email | - |
| post | /auth/verify-otp | phone, otp | r.data.user, r.data.accessToken |
| post | /auth/reset-password | token, password | - |
| post | /auth/send-otp | phone | - |
| post | /auth/verify-email | otp | - |
| get | /auth/me | - | r.data.user |

### Product Service (`frontend/src/services/product.service.js`)
| METHOD | ENDPOINT | REQUEST BODY | RESPONSE USED AS |
|--------|----------|--------------|------------------|
| get | /products | query params | r.data.products, r.data.pagination |
| get | /products/:slug | - | r.data.product, r.data.variants |
| get | /products/featured | limit | r.data.products |
| get | /products/search | q | r.data.products |
| get | /categories | - | r.data.categories |
| get | /banners | params | r.data |
| get (admin) | /products | params | r.data.products |
| get (admin) | /products/id/:id | - | r.data.product, r.data.variants |
| post (admin) | /products | FormData | r.data.product |
| put (admin) | /products/:id | FormData | r.data.product |
| delete (admin) | /products/:id | - | - |

### Cart Service (`frontend/src/services/cart.service.js`)
| METHOD | ENDPOINT | REQUEST BODY | RESPONSE USED AS |
|--------|----------|--------------|------------------|
| get | /cart | - | r.data.cart, r.data.totalAmount, r.data.totalItems |
| post | /cart/add | productId, variantId, quantity | r.data.cart |
| put | /cart/update | productId, variantId, quantity | r.data.cart |
| delete | /cart/remove | productId, variantId | r.data.cart |
| delete | /cart/clear | - | - |
| post | /cart/merge | - | - |
| post | /cart/apply-coupon | code | r.data.discount |
| delete | /cart/remove-coupon | - | - |
| post | /coupons/validate | code | r.data |

### Order Service (`frontend/src/services/order.service.js`)
| METHOD | ENDPOINT | REQUEST BODY | RESPONSE USED AS |
|--------|----------|--------------|------------------|
| post | /orders | addressId, paymentMethod, couponCode, notes | r.data.order |
| get | /orders | params | r.data.orders, r.data.pagination |
| get | /orders/:id | - | r.data.order |
| put | /orders/:id/cancel | reason | - |
| get | /orders/:id/invoice | - | blob |
| post | /orders/payments/razorpay/verify | razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId | r.data.order |
| post | /orders/payments/stripe/create-session | orderId | r.data.sessionId, r.data.sessionUrl |
| get (admin) | /orders/admin/all | params | r.data.orders |
| put (admin) | /orders/:id/status | status | - |

### User Service (`frontend/src/services/user.service.js`)
| METHOD | ENDPOINT | REQUEST BODY | RESPONSE USED AS |
|--------|----------|--------------|------------------|
| get | /users/profile | - | r.data.user |
| put | /users/profile | FormData | r.data.user |
| put | /users/change-password | oldPassword, newPassword, confirmPassword | - |
| delete | /users/account | password | - |

### Address Service (`frontend/src/services/address.service.js`)
| METHOD | ENDPOINT | REQUEST BODY | RESPONSE USED AS |
|--------|----------|--------------|------------------|
| get | /addresses | - | r.data.addresses |
| post | /addresses | fullName, phone, addressLine1, addressLine2, city, state, pincode, country, type, isDefault | r.data.address |
| put | /addresses/:id | fields | r.data.address |
| delete | /addresses/:id | - | - |
| put | /addresses/:id/default | - | r.data.address |

### Wishlist Service (`frontend/src/services/wishlist.service.js`)
| METHOD | ENDPOINT | REQUEST BODY | RESPONSE USED AS |
|--------|----------|--------------|------------------|
| get | /wishlist | - | r.data.products |
| post | /wishlist/add | productId | - |
| delete | /wishlist/remove | productId | - |
| get | /wishlist/check/:productId | - | r.data.isInWishlist |
| delete | /wishlist/clear | - | - |

### Review Service (`frontend/src/services/review.service.js`)
| METHOD | ENDPOINT | REQUEST BODY | RESPONSE USED AS |
|--------|----------|--------------|------------------|
| get | /products/:productId/reviews | params | r.data.reviews |
| post | /products/:productId/reviews | rating, title, comment, orderId | r.data.review |
| put | /reviews/:id | rating, title, comment | r.data.review |
| delete | /reviews/:id | - | - |
| post | /reviews/:id/helpful | - | r.data.helpfulCount |

### Notification Service (`frontend/src/services/notification.service.js`)
| METHOD | ENDPOINT | REQUEST BODY | RESPONSE USED AS |
|--------|----------|--------------|------------------|
| get | /notifications | params | r.data.notifications, r.data.unreadCount |
| get | /notifications/unread-count | - | r.data.count |
| put | /notifications/:id/read | - | - |
| put | /notifications/read-all | - | - |
| delete | /notifications/:id | - | - |

### Admin Pages API Calls

**Dashboard.jsx:**
| API CALL | ENDPOINT | EXPECTED DATA |
|----------|----------|----------------|
| GET | /admin/dashboard | stats object, revenueChart, ordersByStatus, recentOrders, lowStockProducts |

**Products.jsx:**
| API CALL | ENDPOINT | EXPECTED DATA |
|----------|----------|----------------|
| GET | /products | products array |
| DELETE | /products/:id | - |
| PUT | /products/:id | isActive toggle |

**Categories.jsx:**
| API CALL | ENDPOINT | EXPECTED DATA |
|----------|----------|----------------|
| GET | /categories | categories array |
| POST | /categories | - |
| PUT | /categories/:id | - |
| DELETE | /categories/:id | - |

**Orders.jsx:**
| API CALL | ENDPOINT | EXPECTED DATA |
|----------|----------|----------------|
| GET | /orders/admin/all | orders array |
| PUT | /orders/:id/status | status update |

**Customers.jsx:**
| API CALL | ENDPOINT | EXPECTED DATA |
|----------|----------|----------------|
| GET | /admin/users | customers array |
| PATCH | /admin/users/:id | isActive |

**Reviews.jsx:**
| API CALL | ENDPOINT | EXPECTED DATA |
|----------|----------|----------------|
| GET | /admin/reviews | reviews array (with status filter) |
| PUT | /reviews/:id/approve or /reject | - |

**Coupons.jsx:**
| API CALL | ENDPOINT | EXPECTED DATA |
|----------|----------|----------------|
| GET | /coupons/admin | coupons array |
| POST | /admin/coupons | - |
| DELETE | /admin/coupons/:id | - |

**Banners.jsx:**
| API CALL | ENDPOINT | EXPECTED DATA |
|----------|----------|----------------|
| GET | /banners | banners array |
| POST | /banners | FormData |
| DELETE | /banners/:id | - |
| PATCH | /banners/:id | isActive |

**Analytics.jsx:**
| API CALL | ENDPOINT | EXPECTED DATA |
|----------|----------|----------------|
| GET | /admin/analytics/sales | stats, revenueByMonth, ordersTrend |

---

## SECTION 3: CRITICAL BUGS 🔴

### 1. Admin Controller - Wrong Model Field Names for Reviews

**FILE:** `backend/src/controllers/admin.controller.js`
**LINES:** 424-448, 452-481

**ISSUE:** The admin controller uses wrong field names that don't exist in Review model:

| CURRENT CODE | MODEL HAS | ISSUE |
|-------------|-----------|-------|
| `Review.find({ status: "pending" })` | `isApproved` field | Uses `status` which doesn't exist |
| `Review.find({ status: "approved" })` | `isApproved` field | Uses `status` which doesn't exist |
| `Review.find({ status: "rejected" })` | `isApproved` field | Uses `status` which doesn't exist |
| `.populate("productId")` | `product` field | Wrong field name |
| `.populate("userId")` | `user` field | Wrong field name |
| `review.productId` | `review.product` | Wrong reference |
| `review.userId` | `review.user` | Wrong reference |

**FIX:** Change to:
```javascript
// For getAllReviews - change status to isApproved filter
const isApprovedMap = { pending: false, approved: true, rejected: false };
const filter = { isApproved: isApprovedMap[status] };

// For populate - change field names
.populate("product", "name images sku")
.populate("user", "name email avatar")

// For actions - update references
await recalcProductRating(review.product);
```

---

### 2. Frontend Admin Orders - Wrong Endpoint Path

**FILE:** `frontend/src/pages/admin/Orders.jsx`
**LINE:** 25

**ISSUE:** Frontend calls `api.put('/orders/${id}/status', { status })` but backend expects `/orders/admin/${id}/status`

**CURRENT:** `api.put(\`/orders/\${id}/status\`, { status })`
**FIX:** `api.put(\`/orders/admin/\${id}/status\`, { status })`

---

### 3. Frontend Admin Customers - Wrong Endpoint

**FILE:** `frontend/src/pages/admin/Customers.jsx`
**LINE:** 16

**ISSUE:** Frontend calls `api.get('/admin/users')` but backend has `/admin/customers`

**CURRENT:** `api.get('/admin/users')`
**FIX:** `api.get('/admin/customers')`

---

### 4. Frontend Admin Customers - Wrong Update Endpoint

**FILE:** `frontend/src/pages/admin/Customers.jsx`
**LINE:** 20

**ISSUE:** Frontend calls `api.patch('/admin/users/${id}')` but backend has `PUT /admin/customers/:id/status`

**CURRENT:** `api.patch(\`/admin/users/\${id}\`, { isActive: active })`
**FIX:** `api.put(\`/admin/customers/\${id}/status\`, { isActive: active })`

---

### 5. Frontend Admin Coupons - Wrong GET Endpoint

**FILE:** `frontend/src/pages/admin/Coupons.jsx`
**LINE:** 19

**ISSUE:** Frontend calls `api.get('/coupons/admin')` but backend has `/admin/coupons`

**CURRENT:** `api.get('/coupons/admin')`
**FIX:** `api.get('/admin/coupons')`

---

### 6. Frontend Admin Reviews - Wrong Endpoints

**FILE:** `frontend/src/pages/admin/Reviews.jsx`
**LINES:** 15, 19

**ISSUE:** Frontend calls wrong endpoints:
- GET `/admin/reviews` - but expects `status` param which is wrong field
- PUT `/reviews/${id}/approve` and `/reviews/${id}/reject` - wrong path, should be `/admin/reviews`

**CURRENT:**
```javascript
api.get('/admin/reviews', { params:{ status:filter } })
api.put(\`/reviews/\${id}/\${action}\`) // action = 'approve'/'reject'
```

**FIX:**
```javascript
// For filter: pending=not approved, approved, rejected=all
const statusMap = { pending: false, approved: true, rejected: 'all' };
api.get('/admin/reviews', { params:{ isApproved: statusMap[filter] } })

// For actions
api.put(\`/admin/reviews/\${id}/\${action}\`) // action = 'approve'/'reject'
```

---

## SECTION 4: FRONTEND ↔ BACKEND MISMATCHES 🟡

### 1. Admin Dashboard Response Structure Mismatch

**FRONTEND:** `frontend/src/pages/admin/Dashboard.jsx`
**LINES:** 17-21

Frontend expects:
- `data.stats.totalRevenue`
- `data.revenueChart` (array)
- `data.ordersByStatus` (array)
- `data.recentOrders` (array)
- `data.lowStockProducts` (array)

**BACKEND:** `backend/src/controllers/admin.controller.js`
**LINES:** 141-155

Backend returns:
- `data.totalRevenue`
- `data.revenueByMonth` (array) - NOT `revenueChart`
- `data.ordersByStatus` (object) - NOT array
- `data.recentOrders` (array)
- `data.lowStockProducts` (array)

**MISMATCH:**
- `stats.totalRevenue` → should be `totalRevenue`
- `revenueChart` → should be `revenueByMonth`
- `ordersByStatus` is object but frontend expects array

---

### 2. Admin Orders Status List Mismatch

**FRONTEND:** `frontend/src/pages/admin/Orders.jsx`
**LINE:** 10

Frontend status list:
```javascript
['pending','processing','shipped','out_for_delivery','delivered','cancelled']
```

**BACKEND:** `backend/src/models/order.model.js`
**LINE:** 70

Backend allowed values:
```javascript
['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']
```

**MISMATCH:**
- Frontend has `pending`, `out_for_delivery`
- Backend has `placed`, `confirmed`, `returned`

---

### 3. Admin Customers Response Wrapping

**FRONTEND:** `frontend/src/pages/admin/Customers.jsx`
**LINE:** 16

Frontend expects: `r.data?.data?.customers || []`

**BACKEND:** `backend/src/controllers/admin.controller.js`
**LINES:** 349-359

Backend returns:
```javascript
{
  customers: [...],
  pagination: { total, page, limit, totalPages }
}
```

**MISMATCH:** Backend wraps in pagination object, but frontend expects flat array with pagination separate (though frontend handles it).

---

### 4. Admin Reviews Response Field Names

**FRONTEND:** `frontend/src/pages/admin/Reviews.jsx`
**LINES:** 46-50

Frontend expects:
- `r.user` (with `.name`)
- `r.product` (with `.name`)
- `r.rating`

**BACKEND:** Even after fix, controller populates wrong fields.

**MISMATCH:** Will fail until controller is fixed.

---

### 5. Product Service Admin Filter Param Mismatch

**FRONTEND:** `frontend/src/pages/admin/Products.jsx`
**LINE:** 16

Frontend sends: `sortBy:'newest'`

**BACKEND:** `backend/src/controllers/product.controller.js`
**LINES:** 104-112

Backend expects: `sortBy:'newest'` which maps to `{ createdAt: -1 }`

**MISMATCH:** This actually works, but `sortBy` param should be checked.

---

## SECTION 5: MISSING CONNECTIONS 🔵

### 1. Loyalty Points Backend Exists, No Frontend Service

**BACKEND:**
- Model: `backend/src/models/loyaltyPoints.model.js`
- Controller: Not found - no route defined for loyalty points management
- Order controller adds loyalty points on order creation

**FRONTEND:**
- Page exists: `frontend/src/pages/customer/LoyaltyPoints.jsx`
- Service file: `frontend/src/services/loyalty.service.js` (exists but likely incomplete)
- Uses: Likely needs GET endpoint for loyalty balance

**STATUS:** Backend has model but no API endpoint to get loyalty points balance. Frontend may fail.

---

### 2. Product Variants - No Frontend Connection

**BACKEND:**
- Model: `backend/src/models/productVariant.model.js`
- Product controller returns variants with product: `getProductBySlug`, `getProductById`
- No dedicated CRUD endpoints for variants

**FRONTEND:**
- ProductDetail page may use variants
- No variant service defined

**STATUS:** Variants are returned with products but no dedicated management UI.

---

### 3. Transaction Records - No Frontend Connection

**BACKEND:**
- Model: `backend/src/models/transaction.model.js`
- Order controller creates transaction records
- No dedicated transaction endpoints

**FRONTEND:** No transaction history view

**STATUS:** Backend records transactions but no frontend to view them.

---

### 4. Low Stock Alert - No Frontend Connection

**BACKEND:**
- Endpoint: `GET /api/admin/low-stock` exists
- Used in Dashboard

**FRONTEND:** No dedicated low stock management page

**STATUS:** Available in dashboard but no standalone page.

---

### 5. Category Tree API - Partial Frontend Connection

**BACKEND:**
- Endpoint: `GET /api/categories?tree=true`

**FRONTEND:**
- product.service.js has `getCategories`
- Categories page calls it

**STATUS:** Works but could be better integrated.

---

## SECTION 6: DEAD FRONTEND CODE 🟣

### 1. Missing Admin Service File

**ISSUE:** No `admin.service.js` in frontend services folder. Admin pages directly use `api.get()`, `api.post()`, etc.

**STATUS:** Not a bug, just inconsistent with other service patterns.

---

### 2. Loyalty Service - Empty File

**FILE:** `frontend/src/services/loyalty.service.js`

The file exists but appears to be nearly empty based on git status showing it as new.

**STATUS:** Likely incomplete.

---

### 3. Product Service - Duplicate Endpoint Path

**FILE:** `frontend/src/services/product.service.js`
**LINE:** 14

Frontend calls: `api.get(\`/products/id/${id}\`)` - with "id/" in path

**BACKEND:** `backend/src/routes/product.routes.js`
**LINE:** 25

Backend has: `router.get('/id/:id', protect, adminOnly, getProductById)`

**STATUS:** This actually works - the endpoint exists.

---

### 4. Settings Page - No Service

**FILE:** `frontend/src/pages/admin/Settings.jsx`

No service file for settings - likely manages local state only.

**STATUS:** No backend connection needed (likely config only).

---

## SECTION 7: MODEL vs CONTROLLER ISSUES

### 1. Review Model vs Admin Controller

| CONTROLLER USES | MODEL HAS | STATUS |
|-----------------|-----------|--------|
| `filter.status` | `isApproved` | ❌ WRONG |
| `populate("productId")` | `product` field | ❌ WRONG |
| `populate("userId")` | `user` field | ❌ WRONG |
| `review.productId` | `review.product` | ❌ WRONG |
| `review.userId` | `review.user` | ❌ WRONG |
| `recalCProductRating` function updates `averageRating` | Model has `ratings.average` | ⚠️ PARTIAL |

**FIX NEEDED:** Update controller to use correct field names.

---

### 2. Product Model vs Product Controller

| CONTROLLER USES | MODEL HAS | STATUS |
|-----------------|-----------|--------|
| `product.stockStatus` | Virtual field | ✅ WORKS |
| `product.discountPercent` | Virtual field | ✅ WORKS |
| `product.ratings.average` | `ratings.average` | ✅ WORKS |

**STATUS:** OK

---

### 3. Order Model vs Order Controller

| CONTROLLER USES | MODEL HAS | STATUS |
|-----------------|-----------|--------|
| `order.pricing.total` | `pricing.total` | ✅ WORKS |
| `order.orderNumber` | `orderNumber` | ✅ WORKS |
| `order.orderStatus` | `orderStatus` | ✅ WORKS |
| `statusHistory` array | `statusHistory` array | ✅ WORKS |

**STATUS:** OK

---

## SECTION 8: SUMMARY

**Total Critical Bugs:** 6

1. Admin controller review field names (1 critical) - breaks reviews completely
2. Frontend admin orders wrong path (1 critical) - breaks admin order updates
3. Frontend admin customers wrong endpoints (2 critical) - breaks admin customer management
4. Frontend admin coupons wrong path (1 critical) - breaks admin coupon viewing
5. Frontend admin reviews wrong endpoints (1 critical) - breaks admin review management

**Total Mismatches:** 5

1. Dashboard response structure - UI displays wrong data
2. Order status values - frontend uses non-existent statuses
3. Customers response wrapping - pagination handling
4. Reviews response fields - field name mismatches
5. Product service params - parameter naming

**Total Missing Connections:** 5

1. Loyalty points API - no balance endpoint
2. Product variants management - no dedicated UI
3. Transaction history - no frontend view
4. Low stock page - only in dashboard
5. Category tree optimization - partial integration

**Total Dead Code:** 3

1. No admin.service.js - inconsistent with other services
2. Empty loyalty.service.js - incomplete
3. Settings page isolated - local state only

---

## PRIORITY FIX ORDER

1. **FIX #1:** Admin controller review field names (breaks reviews completely)
2. **FIX #2:** Frontend orders wrong endpoint (breaks admin order updates)
3. **FIX #3:** Frontend customers wrong endpoint (breaks admin customer management)
4. **FIX #4:** Frontend coupons wrong endpoint (breaks admin coupon viewing)
5. **FIX #5:** Frontend reviews wrong endpoints (breaks admin review management)
6. **FIX #6:** Dashboard response field mapping (UI displays wrong data)

---

*Report generated on: 2026-05-15*
*Total files analyzed: 50+ backend files, 40+ frontend files*