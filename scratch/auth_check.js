async (page) => {
  const report = {
    endpoints: {},
    setCookieHeader: null,
    cookieValid: false,
    pages: {}
  };

  const API_ENDPOINTS = [
    '/api/wishlist',
    '/api/addresses',
    '/api/admin/dashboard',
    '/api/admin/settings',
    '/api/auth/refresh',
    '/api/orders'
  ];

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/api/auth/login') && res.request().method() === 'POST') {
      const headers = await res.headersArray();
      const setCookie = headers.find(h => h.name.toLowerCase() === 'set-cookie');
      if (setCookie) {
        report.setCookieHeader = setCookie.value;
        report.cookieValid = setCookie.value.includes('SameSite=None') && setCookie.value.includes('Secure');
      }
    }
    for (const ep of API_ENDPOINTS) {
      if (url.includes(ep)) {
        // Record only the first one or if it was a 401
        if (!report.endpoints[ep] || report.endpoints[ep] === 200) {
          report.endpoints[ep] = res.status();
        }
      }
    }
  });

  const navigateViaClick = async (path) => {
    await page.goto('https://ecommerce-platform-ashen-nine.vercel.app/');
    await page.waitForTimeout(1000);
    await page.evaluate((p) => {
      window.history.pushState({}, '', p);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, path);
    await page.waitForTimeout(2000);
  };

  await navigateViaClick('/login');
  await page.fill('input[type="email"]', 'kamallochansahu300@gmail.com');
  await page.fill('input[type="password"]', 'Luxora@2025');
  
  // Submit
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.toLowerCase().includes('login') || b.innerText.toLowerCase().includes('sign in') || b.type === 'submit');
    if (btn) btn.click();
  });
  
  await page.waitForTimeout(4000);
  
  // Section 3 part 1: Admin pages
  await navigateViaClick('/wishlist');
  report.pages['/wishlist'] = await page.evaluate(() => {
    return !document.body.innerText.includes('Unauthorized') && !document.body.innerText.includes('Network Error');
  });

  await navigateViaClick('/orders');
  report.pages['/orders'] = await page.evaluate(() => {
    return !document.body.innerText.includes('Unauthorized') && !document.body.innerText.includes('Network Error');
  });

  await navigateViaClick('/admin/dashboard');
  report.pages['/admin/dashboard'] = await page.evaluate(() => {
    return !document.body.innerText.includes('Unauthorized') && !document.body.innerText.includes('Network Error');
  });

  await navigateViaClick('/admin/products');
  // Check if page 2 works
  report.adminProductsPage2 = await page.evaluate(async () => {
    const btns = Array.from(document.querySelectorAll('button'));
    const page2Btn = btns.find(b => b.innerText === '2' || b.innerText === 'Next');
    if (!page2Btn) return 'FAIL: No page 2 button found';
    const beforeText = document.body.innerText;
    page2Btn.click();
    await new Promise(r => setTimeout(r, 2000));
    const afterText = document.body.innerText;
    return beforeText !== afterText ? 'PASS' : 'FAIL: Results did not change';
  });

  return report;
}
