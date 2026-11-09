// Order ke paise ka hisaab — backend/src/utils/orderPricing.js ka EXACT mirror (checkout par dikhne wala total
// aur server par charge hone wala total match karna chahiye). backend/tests/order-pricing.test.mjs dono ko compare karta hai.
// Ek badlo to dusra bhi badlo (warna test fail hoga).
//
// Rules (standard ecommerce / GST practice; launch se pehle CA se final confirm karna hai, aur kuch badle
// to sirf yahi function badalna hai):
//  1. Discount pehle, tax uske baad: tax = (subtotal - discount) x rate.
//     Jo discount invoice par dikhta hai wo taxable value ghatata hai, customer us ghate hue hisse par tax nahi deta.
//  2. Free delivery ka threshold pre-discount cart subtotal par (policy choice, customer-friendly).
//  3. total = taxable amount + shipping + tax.
export const calculateOrderPricing = ({ subtotal, couponDiscount = 0, settings }) => {
  const discount = Math.min(Math.max(Number(couponDiscount) || 0, 0), subtotal);
  const taxableAmount = subtotal - discount;
  const shippingCharge = subtotal >= settings.freeDeliveryAbove ? 0 : settings.deliveryFee;
  const tax = Math.round(taxableAmount * (settings.taxRate / 100));
  const total = taxableAmount + shippingCharge + tax;
  return { subtotal, couponDiscount: discount, taxableAmount, shippingCharge, tax, total };
};
