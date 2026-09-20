async (page) => {
  const report = {};
  
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());

  await page.goto('https://ecommerce-platform-ashen-nine.vercel.app/');
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForTimeout(2000);
  
  await page.fill('input[type="email"]', 'kamallochansahu299@gmail.com');
  await page.fill('input[type="password"]', 'Krishna@2025');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.toLowerCase().includes('login') || b.innerText.toLowerCase().includes('sign in') || b.type === 'submit');
    if (btn) btn.click();
  });
  
  await page.waitForTimeout(3000);
  
  // Add item to cart
  const productLink = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href^="/products/"]'));
    return links.length > 0 ? links[0].href : null;
  });
  await page.goto(productLink);
  await page.waitForTimeout(2000);
  
  await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));
    const addBtn = elements.find(el => el.innerText && el.innerText.trim().toLowerCase() === 'add to cart' && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'DIV'));
    if (addBtn) addBtn.click();
  });
  await page.waitForTimeout(2000);
  
  // Go to checkout
  await page.evaluate(() => {
    window.history.pushState({}, '', '/checkout');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForTimeout(2000);
  
  // Fill address form
  await page.evaluate(() => {
    const fill = (name, val) => {
      const el = document.querySelector(`input[name="${name}"]`) || document.querySelector(`input[placeholder*="${name}"]`);
      if (el) el.value = val;
    };
    fill('fullName', 'Test User');
    fill('phone', '1234567890');
    fill('pincode', '123456');
    fill('city', 'Test City');
    fill('address', '123 Test Street');
    fill('state', 'Test State');
  });

  // Track order creation network request
  let orderReqUrl = null;
  let orderReqStatus = null;

  page.on('response', (res) => {
    if (res.url().includes('/api/orders') && res.request().method() === 'POST') {
      orderReqUrl = res.url();
      orderReqStatus = res.status();
    }
  });

  // Click proceed / place order
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const placeBtn = btns.find(b => b.innerText.toLowerCase().includes('continue to payment') || b.innerText.toLowerCase().includes('place order'));
    if (placeBtn) placeBtn.click();
  });
  
  await page.waitForTimeout(2000);
  
  // After continue to payment, might need to click Place Order
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const placeBtn = btns.find(b => b.innerText.toLowerCase().includes('place order'));
    if (placeBtn) placeBtn.click();
  });
  
  await page.waitForTimeout(4000);
  
  // Check if it hangs
  report.hangs = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const placeBtn = btns.find(b => b.innerText.toLowerCase().includes('placing...'));
    return !!placeBtn;
  });

  report.orderReqUrl = orderReqUrl;
  report.orderReqStatus = orderReqStatus;

  return report;
}
