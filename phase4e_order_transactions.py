#!/usr/bin/env python3
"""
Phase 4(e) — MongoDB transactions for atomic stock updates in createOrder

Run this from the root of your ecommerce-platform repo:
    python3 phase4e_order_transactions.py

The problem this fixes:
  createOrder used to (1) read stock, (2) create the Order document,
  (3) THEN decrement stock in a separate, unguarded update — three
  separate, non-atomic steps. Two customers checking out the same
  product's last unit at the same moment could both pass the stock
  check and both succeed, oversell.

What it does:
  Wraps order creation + stock decrement + coupon-usage update + cart
  clear inside a single MongoDB transaction (mongoose session +
  withTransaction). The stock decrement itself is also a conditional
  atomic update (`stock: { $gte: quantity }` in the filter) so stock
  can never go negative even under a race, independent of the
  transaction. Loyalty points and the order-placed notification are
  deliberately left OUTSIDE the transaction (after commit) since
  they're non-critical side effects and keeping the transaction short
  reduces lock contention.

IMPORTANT — read before running:
  MongoDB transactions require a replica-set-enabled MongoDB. MongoDB
  Atlas (which you're deploying to on Render) already runs as a
  replica set by default, so production is fine. A bare standalone
  local `mongod` does NOT support transactions and will throw at
  runtime — if you test this locally against a standalone mongod,
  either point your local backend at your Atlas connection string, or
  run mongod with `--replSet` and initiate it. I could not verify this
  transaction actually commits against a real DB from my sandbox (no
  network path to Atlas there) — only `node --check` syntax and a full
  reading of the logic. Please smoke-test the checkout flow once
  before relying on this.

Safe to re-run: skips if already patched.
"""
import os
import sys

ROOT = os.getcwd()
ORDER_CONTROLLER_PATH = os.path.join(ROOT, "backend", "src", "controllers", "order.controller.js")

OLD_IMPORTS = """import crypto from 'crypto';
import { Order, Cart, Product, Address, Coupon, Transaction, LoyaltyPoints, Notification } from '../models/index.js';"""

NEW_IMPORTS = """import mongoose from 'mongoose';
import crypto from 'crypto';
import { Order, Cart, Product, ProductVariant, Address, Coupon, Transaction, LoyaltyPoints, Notification } from '../models/index.js';"""

OLD_STOCK_COMMENT = "  // Stock validate karo\n  for (const item of cart.items) {"
NEW_STOCK_COMMENT = (
    "  // Stock validate karo — friendly early error. NOT the authoritative check:\n"
    "  // stock can still change between this read and the atomic decrement below,\n"
    "  // so the real guard is the conditional $gte update inside the transaction.\n"
    "  for (const item of cart.items) {"
)

OLD_ORDER_BLOCK = """  // Order create karo
  const order = await Order.create({
    userId,
    items: orderItems,
    shippingAddress,
    pricing: {
      subtotal,
      shippingCharge,
      tax,
      couponDiscount,
      total,
    },
    couponCode: couponCode || null,
    paymentMethod,
    paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
    orderStatus: 'placed',
    statusHistory: [{ status: 'placed', message: 'Order placed successfully' }],
    notes,
    expectedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
  });

  // Stock reduce karo
  for (const item of cart.items) {
    if (item.variant) {
      await item.variant.updateOne({ $inc: { stock: -item.quantity } });
    } else {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity, totalSold: item.quantity },
      });
    }
  }

  // Coupon use mark karo
  if (appliedCoupon) {
    await Coupon.findByIdAndUpdate(appliedCoupon._id, {
      $inc: { usedCount: 1 },
      $push: { usedBy: { userId } },
    });
  }

  // Cart clear karo
  await Cart.findOneAndUpdate({ userId }, { items: [], couponCode: null, couponDiscount: 0 });"""

NEW_ORDER_BLOCK = """  // \u2500\u2500 Order create + stock decrement + coupon usage + cart clear \u2500 sab ek
  // MongoDB transaction mein karte hain, taaki concurrent orders same product
  // ko oversell na kar sakein. Stock decrement conditional hai ($gte guard) \u2500
  // isse race condition mein bhi stock kabhi negative nahi ho sakta, chahe
  // do requests exact same moment pe last unit ke liye race kar rahe hon.
  // NOTE: requires a replica-set MongoDB (MongoDB Atlas already is one;
  // a bare standalone local `mongod` does NOT support transactions).
  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      for (const item of cart.items) {
        if (item.variant) {
          const updated = await ProductVariant.findOneAndUpdate(
            { _id: item.variant._id, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { session, new: true }
          );
          if (!updated) {
            throw new ApiError(400, `"${item.product.name}" \u2500 not enough stock left`);
          }
        } else {
          const updated = await Product.findOneAndUpdate(
            { _id: item.product._id, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity, totalSold: item.quantity } },
            { session, new: true }
          );
          if (!updated) {
            throw new ApiError(400, `"${item.product.name}" \u2500 not enough stock left`);
          }
        }
      }

      const created = await Order.create([{
        userId,
        items: orderItems,
        shippingAddress,
        pricing: {
          subtotal,
          shippingCharge,
          tax,
          couponDiscount,
          total,
        },
        couponCode: couponCode || null,
        paymentMethod,
        paymentStatus: 'pending',
        orderStatus: 'placed',
        statusHistory: [{ status: 'placed', message: 'Order placed successfully' }],
        notes,
        expectedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
      }], { session });
      order = created[0];

      // Coupon use mark karo
      if (appliedCoupon) {
        await Coupon.findByIdAndUpdate(
          appliedCoupon._id,
          { $inc: { usedCount: 1 }, $push: { usedBy: { userId } } },
          { session }
        );
      }

      // Cart clear karo
      await Cart.findOneAndUpdate(
        { userId },
        { items: [], couponCode: null, couponDiscount: 0 },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }"""


def main():
    if not os.path.isfile(ORDER_CONTROLLER_PATH):
        print(f"[ERROR] {ORDER_CONTROLLER_PATH} not found. Run this script from the repo root "
              f"(the folder that contains 'frontend/' and 'backend/').")
        sys.exit(1)

    with open(ORDER_CONTROLLER_PATH, "r") as f:
        content = f.read()

    if "session.withTransaction" in content:
        print("[skip] order.controller.js already has the transaction — nothing to do.")
        return

    changed = False

    if OLD_IMPORTS in content:
        content = content.replace(OLD_IMPORTS, NEW_IMPORTS, 1)
        changed = True
    else:
        print("[WARN] import block not found as expected — check manually")

    if OLD_STOCK_COMMENT in content:
        content = content.replace(OLD_STOCK_COMMENT, NEW_STOCK_COMMENT, 1)
        changed = True

    if OLD_ORDER_BLOCK in content:
        content = content.replace(OLD_ORDER_BLOCK, NEW_ORDER_BLOCK, 1)
        changed = True
    else:
        print("[WARN] createOrder's order-creation block not found as expected — "
              "file may have changed since this script was written. Nothing risky was "
              "written; please check manually or ping me with the current file content.")

    if not changed:
        print("[WARN] nothing changed — see warnings above")
        return

    with open(ORDER_CONTROLLER_PATH, "w") as f:
        f.write(content)

    print(f"[OK] patched {ORDER_CONTROLLER_PATH}")
    print("\nNow verify with:")
    print("  node --check backend/src/controllers/order.controller.js")
    print("  git diff backend/src/controllers/order.controller.js")
    print()
    print("Then SMOKE-TEST the actual checkout flow against a real DB — place an")
    print("order (COD is easiest) and confirm: order is created, product stock")
    print("goes down by the right amount, cart empties, and (if you used one) the")
    print("coupon's usedCount increments. I could not run this against MongoDB")
    print("Atlas from my sandbox, so this needs your real-DB confirmation.")


if __name__ == "__main__":
    main()
