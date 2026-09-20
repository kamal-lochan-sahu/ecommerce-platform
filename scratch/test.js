const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    loginSetCookieHeader: null,
    admin: { endpoints: {}, pages: {} },
    customer: { endpoints: {}, pages: {} }
  };

  const API_BASE = 'https://luxora-backend-2nyx.onrender.com';
  const ENDPOINTS = [
    '/api/wishlist',
    '/api/addresses',
    '/api/admin/dashboard',
    '/api/admin/settings',
    '/api/auth/refresh',
    '/api/orders'
  ];

  const recordedResponses = {};
  
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/api/auth/login') && res.request().method() === 'POST') {
      const headers = await res.headersArray();
      const setCookie = headers.find(h => h.name.toLowerCase() === 'set-cookie');
      if (setCookie) {
        results.loginSetCookieHeader = setCookie.value;
      }
    }
    for (const ep of ENDPOINTS) {
      if (url.includes(ep)) {
        recordedResponses[ep] = res.status();
      }
    }
  });

  const checkEndpoints = (role) => {
    for (const ep of Object.keys(recordedResponses)) {
      results[role].endpoints[ep] = recordedResponses[ep];
    }
  };

  const waitAndCheck = async () => {
    await page.waitForTimeout(3000);
  }

  const navigateViaClick = async (path) => {
    await page.goto('https://ecommerce-platform-ashen-nine.vercel.app/');
    await page.waitForTimeout(1000);
    // Since direct navigation might 404, we execute router navigation via JS
    await page.evaluate((p) => {
      window.history.pushState({}, '', p);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, path);
    await page.waitForTimeout(2000);
  };

  console.log('Navigating to frontend...');
  await navigateViaClick('/login');
  
  console.log('Logging in as admin...');
  await page.fill('input[type="email"]', 'kamallochansahu300@gmail.com');
  await page.fill('input[type="password"]', 'Luxora@2025');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(4000);
  await waitAndCheck();

  // Test admin dashboard
  await navigateViaClick('/admin/dashboard');
  await waitAndCheck();
  results.admin.pages['/admin/dashboard'] = await page.evaluate(() => {
    return !document.body.innerText.includes('Network Error') && !document.body.innerText.includes('Unauthorized') && !document.body.innerText.includes('401') && !document.body.innerText.includes('404: NOT_FOUND');
  });

  await navigateViaClick('/wishlist');
  await waitAndCheck();
  results.admin.pages['/wishlist'] = await page.evaluate(() => {
    return !document.body.innerText.includes('Network Error') && !document.body.innerText.includes('Unauthorized') && !document.body.innerText.includes('404: NOT_FOUND');
  });

  await navigateViaClick('/orders');
  await waitAndCheck();
  results.admin.pages['/orders'] = await page.evaluate(() => {
    return !document.body.innerText.includes('Network Error') && !document.body.innerText.includes('Unauthorized') && !document.body.innerText.includes('404: NOT_FOUND');
  });

  checkEndpoints('admin');

  // Log out
  console.log('Logging out...');
  await navigateViaClick('/profile');
  await waitAndCheck();
  try {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const logoutBtn = btns.find(b => b.innerText.toLowerCase().includes('log out') || b.innerText.toLowerCase().includes('logout'));
      if(logoutBtn) logoutBtn.click();
    });
  } catch(e) {}
  await page.waitForTimeout(2000);

  // Clear responses for customer
  for (const k of Object.keys(recordedResponses)) {
    delete recordedResponses[k];
  }

  // Log in as customer
  console.log('Logging in as customer...');
  await navigateViaClick('/login');
  await page.fill('input[type="email"]', 'kamallochansahu299@gmail.com');
  await page.fill('input[type="password"]', 'Krishna@2025');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(4000);
  await waitAndCheck();

  await navigateViaClick('/wishlist');
  await waitAndCheck();
  results.customer.pages['/wishlist'] = await page.evaluate(() => {
    return !document.body.innerText.includes('Network Error') && !document.body.innerText.includes('Unauthorized');
  });

  await navigateViaClick('/orders');
  await waitAndCheck();
  results.customer.pages['/orders'] = await page.evaluate(() => {
    return !document.body.innerText.includes('Network Error') && !document.body.innerText.includes('Unauthorized');
  });

  checkEndpoints('customer');

  console.log('RESULT_JSON_START');
  console.log(JSON.stringify(results, null, 2));
  console.log('RESULT_JSON_END');

  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
