// Cart item ka price add-to-cart ke waqt ka snapshot hota hai. Admin baad mein price badle
// (variant ya product) to customer ko purana price dikhta aur charge hota. Ye helper cart
// ko live price par la deta hai. Cart ke items.product / items.variant populated hone chahiye.
// Returns true agar koi price badla (caller cart.save() kar sake).
export const refreshCartItemPrices = (cart) => {
  let changed = false;
  for (const item of cart.items) {
    const live = item.variant ? item.variant.price : item.product?.price;
    if (typeof live === 'number' && item.price !== live) {
      item.price = live;
      changed = true;
    }
  }
  return changed;
};
