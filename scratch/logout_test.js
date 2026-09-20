async (page) => {
  const report = {};
  await page.goto('https://ecommerce-platform-ashen-nine.vercel.app/');
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForTimeout(2000);
  
  await page.fill('input[type="email"]', 'kamallochansahu300@gmail.com');
  await page.fill('input[type="password"]', 'Luxora@2025');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.toLowerCase().includes('login') || b.innerText.toLowerCase().includes('sign in') || b.type === 'submit');
    if (btn) btn.click();
  });
  
  await page.waitForTimeout(3000);
  
  // Log out
  await page.evaluate(() => {
    window.history.pushState({}, '', '/profile');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForTimeout(2000);
  
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const logoutBtn = btns.find(b => b.innerText.toLowerCase().includes('log out') || b.innerText.toLowerCase().includes('logout'));
    if (logoutBtn) logoutBtn.click();
  });
  
  await page.waitForTimeout(2000);
  
  // check if session cleared
  report.lsKeys = await page.evaluate(() => {
    return Object.keys(localStorage);
  });
  
  // try to visit protected page
  await page.evaluate(() => {
    window.history.pushState({}, '', '/orders');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForTimeout(2000);
  
  report.redirectedToLogin = await page.evaluate(() => {
    return window.location.pathname === '/login' || document.body.innerText.includes('Login');
  });
  
  return report;
}
